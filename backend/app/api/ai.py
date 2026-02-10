# backend/app/api/ai.py
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any, List, Literal
from datetime import date, datetime
import json, re, logging

from backend.app.database import SessionLocal
from backend.app.api.analytics import (
    sales_by_day,
    top_products,
    averages,
    basket_pairs,
    rfm_segments,
    daterange_defaults,
    to_iso,
)
from backend.app.utils.groq_llm import groq_chat

router = APIRouter(prefix="/ai", tags=["ai"])
log = logging.getLogger("ai")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class AskPayload(BaseModel):
    question: str
    date_from: Optional[date] = None
    date_to: Optional[date] = None


class AskResponse(BaseModel):
    answer: str
    charts: List[Dict[str, Any]]
    metrics: Dict[str, Any]


class ChatMessage(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str


class ChatPayload(BaseModel):
    messages: List[ChatMessage]
    mode: Literal["general", "analytics"] = "general"
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    temperature: float = 0.2


class ChatResponse(BaseModel):
    answer: str


def _json_compact(obj: Any) -> str:
    return json.dumps(obj, ensure_ascii=False, separators=(",", ":"))


def _aggregate_sales_weekly(sales: list[dict]) -> list[dict]:
    if not sales:
        return []
    buckets: dict[str, dict] = {}
    for r in sales:
        ds = r.get("date")
        try:
            dt = datetime.fromisoformat(ds).date()
        except Exception:
            continue
        year, week, _ = dt.isocalendar()
        key = f"{year}-W{week:02d}"
        b = buckets.get(key)
        if not b:
            b = {"week": key, "orders": 0, "revenue": 0.0}
            buckets[key] = b
        b["orders"] += int(r.get("orders") or 0)
        b["revenue"] += float(r.get("revenue") or 0.0)
    out = list(buckets.values())
    out.sort(key=lambda x: x["week"])
    return out


def _metrics_for_llm(metrics: Dict[str, Any]) -> Dict[str, Any]:
    avg = metrics.get("averages") or {}
    top = (metrics.get("top_products") or [])[:10]
    pairs = (metrics.get("basket_pairs") or [])[:10]
    rfm_summary = (metrics.get("rfm") or {}).get("summary", {})

    sales = metrics.get("sales_by_day") or []
    if len(sales) > 120:
        sales_compact = {"mode": "weekly", "series": _aggregate_sales_weekly(sales)}
    else:
        sales_compact = {"mode": "daily", "series": sales[-120:]}

    return {
        "range": metrics.get("range"),
        "averages": avg,
        "sales": sales_compact,
        "top_products": top,
        "basket_pairs": pairs,
        "rfm_summary": rfm_summary,
    }


def default_charts(metrics: Dict[str, Any]) -> List[Dict[str, Any]]:
    return [
        {"type": "line", "title": "Ingresos por día", "xKey": "date", "yKey": "revenue", "data": metrics.get("sales_by_day", [])},
        {"type": "bar", "title": "Top productos por facturación", "xKey": "name", "yKey": "revenue", "data": metrics.get("top_products", [])},
    ]


def fallback_answer(metrics: Dict[str, Any], question: str) -> str:
    avg = metrics["averages"]
    top = metrics.get("top_products", [])[:3]
    tops = ", ".join([f"{t['name']} ({t['revenue']:.2f}€)" for t in top]) or "—"
    return (
        "Resumen (fallback):\n"
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


def call_llm_ask(question: str, metrics_full: Dict[str, Any]) -> tuple[str, List[Dict[str, Any]]]:
    metrics_small = _metrics_for_llm(metrics_full)

    system_msg = (
        "Eres analista de datos retail de una tienda de muebles. Responde en español, claro y accionable. "
        "Si propones un gráfico, devuelve SOLO JSON estricto válido: {\"charts\":[...]} "
        "y usa números con punto decimal, sin separador de miles."
    )

    user_msg = (
        f"Rango: {metrics_small['range']['from']} → {metrics_small['range']['to']}\n"
        f"Pregunta: {question}\n\n"
        f"MÉTRICAS JSON (compacto):\n{_json_compact(metrics_small)}"
    )

    answer = groq_chat(
        [{"role": "system", "content": system_msg}, {"role": "user", "content": user_msg}],
        temperature=0.2,
    )

    charts: List[Dict[str, Any]] = []

    def extract_charts(match):
        text = match.group(0)
        clean = text.replace("```json", "").replace("```", "").strip()
        try:
            data = json.loads(clean)
            if isinstance(data, dict) and isinstance(data.get("charts"), list):
                charts.extend(data["charts"])
                return ""
        except Exception:
            pass
        return text

    answer = re.sub(r"(\{\s*\"charts\"\s*:\s*\[.*?\]\s*\})", extract_charts, answer, flags=re.S)
    answer = re.sub(r"```json\s*(.*?)\s*```", lambda m: extract_charts(m), answer, flags=re.S)
    answer = re.sub(r"\n\s*\n", "\n\n", answer).strip()

    return answer, charts


@router.post("/ask", response_model=AskResponse)
def ask_ai(payload: AskPayload, db: Session = Depends(get_db)):
    dfrom, dto = daterange_defaults(payload.date_from, payload.date_to)
    metrics = build_metrics(db, dfrom, dto)
    try:
        answer_text, charts = call_llm_ask(payload.question, metrics)
        if not charts:
            charts = default_charts(metrics)
    except Exception as e:
        log.warning("IA no disponible (%s). Fallback básico.", e)
        answer_text = fallback_answer(metrics, payload.question)
        charts = default_charts(metrics)
    return {"answer": answer_text, "charts": charts, "metrics": metrics}


@router.post("/chat", response_model=ChatResponse)
def chat(payload: ChatPayload, db: Session = Depends(get_db)):
    if not payload.messages:
        raise HTTPException(400, "messages no puede estar vacío")

    msgs = [{"role": m.role, "content": m.content} for m in payload.messages]

    if payload.mode == "analytics":
        dfrom, dto = daterange_defaults(payload.date_from, payload.date_to)
        m_full = build_metrics(db, dfrom, dto)
        m = _metrics_for_llm(m_full)

        avg = m.get("averages", {})
        top = (m.get("top_products") or [])[:5]
        top_txt = ", ".join([f"{t.get('name')} ({float(t.get('revenue') or 0):.2f}€)" for t in top]) or "—"
        ctx = (
            "Contexto Tendencias (tienda de muebles):\n"
            f"- Rango: {m['range']['from']} → {m['range']['to']}\n"
            f"- Ingresos: {float(avg.get('revenue') or 0):.2f}€ | Pedidos: {int(avg.get('orders') or 0)} | AOV: {float(avg.get('aov') or 0):.2f}€\n"
            f"- Top productos: {top_txt}\n"
            "Responde en español, claro y accionable."
        )
        msgs = [{"role": "system", "content": ctx}, *msgs]

    answer = groq_chat(msgs, temperature=payload.temperature)
    return {"answer": answer}
