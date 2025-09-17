# backend/app/api/analytics.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from datetime import date, datetime, timedelta
from typing import Optional, Dict, Any, List, Tuple
import json, os, math, logging

from backend.app.database import SessionLocal
from backend.app.entidades.albaran import AlbaranDB
from backend.app.entidades.linea_albaran import LineaAlbaranDB
from backend.app.entidades.producto import ProductoDB
from backend.app.entidades.cliente import ClienteDB

router = APIRouter(prefix="/analytics", tags=["analytics"])
log = logging.getLogger("analytics")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ---------- Utilidades ----------
def daterange_defaults(dfrom: Optional[date], dto: Optional[date]) -> Tuple[date, date]:
    if not dto: dto = date.today()
    if not dfrom:
        # por defecto últimos 180 días
        dfrom = dto - timedelta(days=180)
    if dfrom > dto:
        raise HTTPException(400, "date_from no puede ser posterior a date_to")
    return dfrom, dto

def to_iso(d: date) -> str:
    return d.isoformat() if isinstance(d, (date, datetime)) else str(d)

# ---------- Cálculos ----------
def sales_by_day(db: Session, dfrom: date, dto: date):
    rows = (
        db.query(
            AlbaranDB.fecha.label("fecha"),
            func.count(AlbaranDB.id).label("orders"),
            func.coalesce(func.sum(AlbaranDB.total), 0.0).label("revenue"),
        )
        .filter(AlbaranDB.fecha >= dfrom, AlbaranDB.fecha <= dto)
        .group_by(AlbaranDB.fecha)
        .order_by(AlbaranDB.fecha)
        .all()
    )
    return [{"date": to_iso(r.fecha), "orders": int(r.orders), "revenue": float(r.revenue)} for r in rows]

def top_products(db: Session, dfrom: date, dto: date, limit: int = 10):
    rows = (
        db.query(
            LineaAlbaranDB.producto_id,
            func.sum(LineaAlbaranDB.cantidad).label("qty"),
            func.sum(LineaAlbaranDB.cantidad * LineaAlbaranDB.precio_unitario).label("revenue"),
        )
        .join(AlbaranDB, AlbaranDB.id == LineaAlbaranDB.albaran_id)
        .filter(AlbaranDB.fecha >= dfrom, AlbaranDB.fecha <= dto)
        .group_by(LineaAlbaranDB.producto_id)
        .order_by(desc("revenue"))
        .limit(limit)
        .all()
    )
    # nombres
    prod_map = {p.id: p.nombre for p in db.query(ProductoDB).filter(ProductoDB.id.in_([r.producto_id for r in rows])).all()}
    return [{
        "product_id": r.producto_id,
        "name": prod_map.get(r.producto_id, f"Producto {r.producto_id}"),
        "qty": float(r.qty or 0),
        "revenue": float(r.revenue or 0.0),
    } for r in rows]

def averages(db: Session, dfrom: date, dto: date):
    q = db.query(AlbaranDB).filter(AlbaranDB.fecha >= dfrom, AlbaranDB.fecha <= dto)
    orders = q.count()
    total = float(db.query(func.coalesce(func.sum(AlbaranDB.total), 0.0)).filter(AlbaranDB.fecha >= dfrom, AlbaranDB.fecha <= dto).scalar() or 0.0)
    aov = total / orders if orders else 0.0

    # ticket medio por cliente (promedio de gasto por cliente sobre el rango)
    rows = (
        db.query(AlbaranDB.cliente_id, func.coalesce(func.sum(AlbaranDB.total), 0.0).label("spent"))
        .filter(AlbaranDB.fecha >= dfrom, AlbaranDB.fecha <= dto)
        .group_by(AlbaranDB.cliente_id).all()
    )
    avg_per_customer = (sum(float(r.spent) for r in rows) / len(rows)) if rows else 0.0
    return {"orders": orders, "revenue": total, "aov": aov, "avg_per_customer": avg_per_customer}

def basket_pairs(db: Session, dfrom: date, dto: date, min_support: int = 2, limit: int = 10):
    # pares de productos más co-comprados en el mismo albarán
    rows = (
        db.query(LineaAlbaranDB.albaran_id, LineaAlbaranDB.producto_id)
        .join(AlbaranDB, AlbaranDB.id == LineaAlbaranDB.albaran_id)
        .filter(AlbaranDB.fecha >= dfrom, AlbaranDB.fecha <= dto)
        .all()
    )
    from collections import defaultdict
    by_alb = defaultdict(list)
    for r in rows: by_alb[r.albaran_id].append(r.producto_id)
    from itertools import combinations
    pair_count, prod_count = defaultdict(int), defaultdict(int)
    for _, prods in by_alb.items():
        uniq = sorted(set(prods))
        for p in uniq: prod_count[p] += 1
        for a, b in combinations(uniq, 2):
            pair_count[(a, b)] += 1
    # nombres
    prod_ids = list(set([p for pair in pair_count.keys() for p in pair]))
    name_map = {p.id: p.nombre for p in db.query(ProductoDB).filter(ProductoDB.id.in_(prod_ids)).all()}
    pairs = []
    for (a, b), supp in pair_count.items():
        if supp < min_support: continue
        conf = supp / prod_count[a] if prod_count[a] else 0.0
        lift = conf / (prod_count[b] / max(1, len(by_alb))) if len(by_alb) else 0.0
        pairs.append({
            "a_id": a, "a_name": name_map.get(a, f"Producto {a}"),
            "b_id": b, "b_name": name_map.get(b, f"Producto {b}"),
            "support": int(supp), "confidence": conf, "lift": lift
        })
    pairs.sort(key=lambda x: (x["support"], x["confidence"]), reverse=True)
    return pairs[:limit]

def rfm_segments(db: Session, ref_date: date):
    # RFM simple sobre TODO el histórico hasta ref_date
    rows = (
        db.query(
            ClienteDB.id.label("cid"),
            func.max(AlbaranDB.fecha).label("last_date"),
            func.count(AlbaranDB.id).label("freq"),
            func.coalesce(func.sum(AlbaranDB.total), 0.0).label("monetary"),
        )
        .join(AlbaranDB, AlbaranDB.cliente_id == ClienteDB.id)
        .filter(AlbaranDB.fecha <= ref_date)
        .group_by(ClienteDB.id)
        .all()
    )
    if not rows: return {"summary": {}, "by_customer": []}

    recencies = []
    for r in rows:
        rec_days = (ref_date - r.last_date).days if r.last_date else 99999
        recencies.append(rec_days)
    import numpy as np
    def quantiles(series):
        q = np.quantile(series, [0.25, 0.5, 0.75]).tolist() if len(series) >= 4 else [min(series), np.median(series), max(series)]
        return q
    Rq = quantiles(recencies)
    Fq = quantiles([float(r.freq) for r in rows])
    Mq = quantiles([float(r.monetary) for r in rows])

    def score_r(rec_days):
        # menor recencia = mejor
        if rec_days <= Rq[0]: return 4
        if rec_days <= Rq[1]: return 3
        if rec_days <= Rq[2]: return 2
        return 1
    def score(val, qs):
        if val <= qs[0]: return 1
        if val <= qs[1]: return 2
        if val <= qs[2]: return 3
        return 4

    by_customer = []
    for r in rows:
        rec_days = (ref_date - r.last_date).days if r.last_date else 99999
        sR, sF, sM = score_r(rec_days), score(float(r.freq), Fq), score(float(r.monetary), Mq)
        seg = "VIP" if (sR >= 3 and sF == 4 and sM == 4) else \
              "En crecimiento" if (sF >= 3 and sM >= 3) else \
              "En riesgo" if (sR == 1 and sF <= 2) else \
              "Ocasional"
        by_customer.append({
            "cliente_id": r.cid, "recency_days": rec_days, "frequency": int(r.freq), "monetary": float(r.monetary),
            "R": sR, "F": sF, "M": sM, "segment": seg
        })
    seg_summary = {}
    for c in by_customer:
        seg_summary[c["segment"]] = seg_summary.get(c["segment"], 0) + 1
    return {"summary": seg_summary, "by_customer": by_customer}

# ---------- IA: informe narrativo ----------
def generate_ai_report(metrics: Dict[str, Any]) -> str:
    """
    Intenta usar un LLM (OpenAI) si OPENAI_API_KEY está definido. Si no, genera un fallback explicativo.
    """
    try:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise RuntimeError("No OPENAI_API_KEY")
        # OpenAI SDK >= 1.0
        from openai import OpenAI
        client = OpenAI(api_key=api_key)
        prompt = (
            "Eres analista de datos retail. Con el JSON de métricas que te paso, redacta un informe en español, "
            "claro y accionable, con títulos, bullets y conclusiones. Incluye insights sobre estacionalidad, "
            "evolución de ventas, ticket medio, segmentación RFM, productos estrella y oportunidades de cross-sell.\n\n"
            f"MÉTRICAS JSON:\n{json.dumps(metrics, ensure_ascii=False)}"
        )
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            temperature=0.2,
            messages=[
                {"role":"system","content":"Eres un experto en analítica de e-commerce."},
                {"role":"user","content": prompt}
            ]
        )
        return resp.choices[0].message.content.strip()
    except Exception as e:
        log.warning("IA no disponible (%s). Usando informe básico.", e)
        m = metrics
        # Informe básico sin IA
        top = m.get("top_products", [])[:5]
        top_txt = ", ".join([f"{t['name']} ({t['revenue']:.2f}€)" for t in top]) or "—"
        seg = m.get("rfm", {}).get("summary", {})
        seg_txt = ", ".join([f"{k}: {v}" for k,v in seg.items()]) or "—"
        return (
            "Informe de tendencias (básico):\n"
            f"- Ventas totales: {m['averages']['revenue']:.2f} € en {m['averages']['orders']} pedidos.\n"
            f"- Ticket medio (AOV): {m['averages']['aov']:.2f} €; gasto medio por cliente: {m['averages']['avg_per_customer']:.2f} €.\n"
            f"- Top productos por facturación: {top_txt}.\n"
            f"- Segmentación RFM: {seg_txt}.\n"
            "- Sugerencias: potenciar bundles de los top productos y campañas a clientes 'En riesgo'."
        )

# ---------- Endpoint principal ----------
@router.get("/summary")
def analytics_summary(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: Session = Depends(get_db)
):
    dfrom, dto = daterange_defaults(date_from, date_to)
    sbd = sales_by_day(db, dfrom, dto)
    tp = top_products(db, dfrom, dto, limit=10)
    avg = averages(db, dfrom, dto)
    pairs = basket_pairs(db, dfrom, dto, min_support=2, limit=10)
    rfm = rfm_segments(db, dto)

    metrics = {
        "range": {"from": to_iso(dfrom), "to": to_iso(dto)},
        "sales_by_day": sbd,
        "top_products": tp,
        "averages": avg,
        "basket_pairs": pairs,
        "rfm": rfm,
    }
    report = generate_ai_report(metrics)
    return {"metrics": metrics, "ai_report": report}
