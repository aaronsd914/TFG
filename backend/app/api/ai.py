# backend/app/api/ai.py
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any, List
from datetime import date
import json, re, logging, requests

from backend.app.database import SessionLocal
from backend.app.api.analytics import (
    sales_by_day, top_products, averages, basket_pairs, rfm_segments,
    daterange_defaults, to_iso
)
from backend.app.ia_settings import (
    LLM_PROVIDER,
    GROQ_API_KEY, GROQ_BASE_URL, GROQ_MODEL,
    GITHUB_TOKEN, GITHUB_MODELS_BASE, GITHUB_MODEL,
    OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_MODEL,
    REQUEST_TIMEOUT
)

router = APIRouter(prefix="/ai", tags=["ai"])
log = logging.getLogger("ai")

# -------- infra --------
def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

class AskPayload(BaseModel):
    question: str
    date_from: Optional[date] = None
    date_to: Optional[date] = None

class AskResponse(BaseModel):
    answer: str
    charts: List[Dict[str, Any]]
    metrics: Dict[str, Any]

# -------- helpers --------
def json_from_text(s: str) -> Optional[dict]:
    m = re.search(r"```json\s*(\{.*\})\s*```", s, re.S)
    if m:
        try: return json.loads(m.group(1))
        except Exception: return None
    try: return json.loads(s)
    except Exception: return None

def default_charts(metrics: Dict[str, Any]) -> List[Dict[str, Any]]:
    return [
        {"type": "line", "title": "Ingresos por día", "xKey": "date", "yKey": "revenue", "data": metrics.get("sales_by_day", [])},
        {"type": "bar",  "title": "Top productos por facturación", "xKey": "name", "yKey": "revenue", "data": metrics.get("top_products", [])},
    ]

def fallback_answer(metrics: Dict[str, Any], question: str) -> str:
    avg = metrics["averages"]
    top = metrics["top_products"][:3]
    tops = ", ".join([f"{t['name']} ({t['revenue']:.2f}€)" for t in top]) or "—"
    return (
        f"Resumen (básico):\n"
        f"- Ingresos: {avg['revenue']:.2f} € en {avg['orders']} pedidos. AOV: {avg['aov']:.2f} €.\n"
        f"- Top productos: {tops}.\n"
        f"- Pregunta: “{question}”."
    )

def build_metrics(db: Session, dfrom: date, dto: date) -> Dict[str, Any]:
    return {
        "range": {"from": to_iso(dfrom), "to": to_iso(dto)},
        "sales_by_day": sales_by_day(db, dfrom, dto),
        "top_products": top_products(db, dfrom, dto, limit=10),
        "averages": averages(db, dfrom, dto),
        "basket_pairs": basket_pairs(db, dfrom, dto, min_support=2, limit=10),
        "rfm": rfm_segments(db, dto),
    }

def call_llm(question: str, metrics: Dict[str, Any]) -> tuple[str, List[Dict[str, Any]]]:
    provider = (LLM_PROVIDER or "").lower()

    # --- 1. PREPARACIÓN DE DATOS ---
    rfm_raw = metrics.get("rfm", {})
    rfm_clean = rfm_raw["summary"] if (isinstance(rfm_raw, dict) and "summary" in rfm_raw) else "Sin datos"

    metrics_for_llm = {
        "range": metrics.get("range"),
        "top_products": (metrics.get("top_products") or [])[:5],
        "averages": metrics.get("averages"),
        "basket_pairs": (metrics.get("basket_pairs") or [])[:3],
        "rfm_summary": rfm_clean, 
        "note": "Datos diarios omitidos. Usa los agregados."
    }
    
    metrics_json = json.dumps(metrics_for_llm, ensure_ascii=False)
    
    system_msg = (
        "Eres analista de datos retail. Responde en español. "
        "IMPORTANTE: Si generas un gráfico, devuélvelo SOLO en formato JSON estricto: {\"charts\": [...]}. "
        "Para listar datos, usa listas de texto o tablas markdown, evita bloques JSON para datos."
    )
    
    user_msg = (
        f"Rango: {metrics['range']['from']} → {metrics['range']['to']}\n"
        f"Pregunta: {question}\n\n"
        f"DATOS:\n{metrics_json}"
    )

    # --- 2. LLAMADA A LA API ---
    if provider == "groq":
        if not GROQ_API_KEY: raise RuntimeError("GROQ_API_KEY no configurado")
        url = f"{GROQ_BASE_URL.rstrip('/')}/chat/completions"
        headers = {"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"}
        payload = {"model": GROQ_MODEL, "temperature": 0.2,
                   "messages":[{"role":"system","content":system_msg},{"role":"user","content":user_msg}]}
        r = requests.post(url, headers=headers, json=payload, timeout=REQUEST_TIMEOUT)
        r.raise_for_status()
        answer = r.json()["choices"][0]["message"]["content"].strip()

    elif provider == "github":
        if not GITHUB_TOKEN: raise RuntimeError("GITHUB_TOKEN no configurado")
        url = f"{GITHUB_MODELS_BASE.rstrip('/')}/chat/completions"
        headers = {"Authorization": f"Bearer {GITHUB_TOKEN}", "Content-Type": "application/json"}
        payload = {"model": GITHUB_MODEL, "temperature": 0.2,
                   "messages":[{"role":"system","content":system_msg},{"role":"user","content":user_msg}]}
        r = requests.post(url, headers=headers, json=payload, timeout=REQUEST_TIMEOUT)
        r.raise_for_status()
        answer = r.json()["choices"][0]["message"]["content"].strip()

    elif provider == "openai":
        if not OPENAI_API_KEY: raise RuntimeError("OPENAI_API_KEY no configurado")
        url = f"{OPENAI_BASE_URL.rstrip('/')}/chat/completions"
        headers = {"Authorization": f"Bearer {OPENAI_API_KEY}", "Content-Type": "application/json"}
        payload = {"model": OPENAI_MODEL, "temperature": 0.2,
                   "messages":[{"role":"system","content":system_msg},{"role":"user","content":user_msg}]}
        r = requests.post(url, headers=headers, json=payload, timeout=REQUEST_TIMEOUT)
        r.raise_for_status()
        answer = r.json()["choices"][0]["message"]["content"].strip()
    
    else:
        raise RuntimeError(f"Proveedor LLM no soportado: {provider}")

    # --- 3. PROCESAMIENTO INTELIGENTE DE LA RESPUESTA ---
    charts: List[Dict[str, Any]] = []

    # PASO A: Extraer gráficos "desnudos" o en bloques
    # Buscamos cualquier cosa que parezca {"charts": [...]} incluso si no tiene ```json
    def extract_charts(match):
        text = match.group(0)
        # Intentamos limpiar un poco por si atrapó comillas de markdown
        clean_text = text.replace("```json", "").replace("```", "").strip()
        try:
            data = json.loads(clean_text)
            if isinstance(data, dict) and "charts" in data and isinstance(data["charts"], list):
                charts.extend(data["charts"])
                return "" # Lo borramos del texto
        except:
            pass
        return text # Si falla, lo dejamos como estaba

    # Regex: Busca {"charts": ... hasta el cierre de llave }
    # Nota: Esta regex es básica, asume que el JSON de charts no tiene llaves anidadas complejas, 
    # lo cual suele ser cierto para estos gráficos simples.
    answer = re.sub(r'(\{ ?"charts":\s*\[.*?\]\s*\})', extract_charts, answer, flags=re.S)


    # PASO B: Formatear otros bloques JSON (datos) a Texto Bonito
    def format_data_blocks(match):
        content = match.group(1) # Lo de dentro de ```json ... ```
        try:
            data = json.loads(content)
            # Si por casualidad es un chart que se nos escapó en el Paso A
            if isinstance(data, dict) and "charts" in data:
                charts.extend(data["charts"])
                return ""
            
            # Si son datos normales, los convertimos a lista markdown
            text_out = "\n"
            if isinstance(data, list):
                for item in data:
                    # Si es un objeto simple (ej: producto)
                    if isinstance(item, dict):
                        line = ", ".join([f"{k}: {v}" for k,v in item.items() if k != 'product_id'])
                        text_out += f"- {line}\n"
                    else:
                        text_out += f"- {item}\n"
            elif isinstance(data, dict):
                for k, v in data.items():
                    text_out += f"- **{k}**: {v}\n"
            return text_out
        except:
            return match.group(0)

    # Reemplazamos los bloques de código restantes
    answer = re.sub(r"```json\s*(.*?)\s*```", format_data_blocks, answer, flags=re.S)
    
    # PASO C: Limpieza final de basura
    # A veces quedan líneas como "* **Productos más vendidos**: " vacías porque borramos el JSON de al lado.
    # Borramos líneas que terminan en dos puntos y no tienen nada después (opcional, estético).
    lines = [line for line in answer.split('\n') if not line.strip().endswith(':')]
    # O simplemente limpiamos saltos de línea dobles
    answer = re.sub(r"\n\s*\n", "\n\n", answer).strip()

    return answer, charts

# -------- endpoint --------
@router.post("/ask", response_model=AskResponse)
def ask_ai(payload: AskPayload, db: Session = Depends(get_db)):
    dfrom, dto = daterange_defaults(payload.date_from, payload.date_to)
    metrics = build_metrics(db, dfrom, dto)
    try:
        answer_text, charts = call_llm(payload.question, metrics)
        if not charts: charts = default_charts(metrics)
    except Exception as e:
        log.warning("IA no disponible (%s). Fallback básico.", e)
        answer_text = fallback_answer(metrics, payload.question)
        charts = default_charts(metrics)
    return {"answer": answer_text, "charts": charts, "metrics": metrics}
