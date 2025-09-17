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
    system_msg = (
        "Eres analista de datos retail. Responde en español, claro y accionable. "
        "Usa solo el JSON. Si procede, añade un bloque ```json con "
        "{\"charts\":[{\"type\":\"line|bar\",\"title\":\"...\",\"xKey\":\"...\",\"yKey\":\"...\",\"data\":[...]}]}."
    )
    user_msg = (
        f"Rango: {metrics['range']['from']} → {metrics['range']['to']}\n"
        f"Pregunta: {question}\n\n"
        f"DATOS:\n{json.dumps(metrics, ensure_ascii=False)}"
    )

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

    charts: List[Dict[str, Any]] = []
    parsed = json_from_text(answer)
    if isinstance(parsed, dict) and isinstance(parsed.get("charts"), list):
        charts = parsed["charts"]
        answer = re.sub(r"```json.*?```", "", answer, flags=re.S).strip()
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
