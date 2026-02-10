# backend/app/api/analytics.py
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from datetime import date, datetime, timedelta
from typing import Optional, Dict, Any, Tuple
import json, logging

from backend.app.database import SessionLocal
from backend.app.entidades.albaran import AlbaranDB
from backend.app.entidades.linea_albaran import LineaAlbaranDB
from backend.app.entidades.producto import ProductoDB
from backend.app.entidades.cliente import ClienteDB

from backend.app.utils.groq_llm import groq_chat
from backend.app.utils.tendencias_pdf import generar_pdf_tendencias

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
    if not dto:
        dto = date.today()
    if not dfrom:
        dfrom = dto - timedelta(days=180)
    if dfrom > dto:
        raise HTTPException(400, "date_from no puede ser posterior a date_to")
    return dfrom, dto


def to_iso(d: date) -> str:
    return d.isoformat() if isinstance(d, (date, datetime)) else str(d)


def _json_compact(obj: Any) -> str:
    # separators reduce bastante el tamaño del payload
    return json.dumps(obj, ensure_ascii=False, separators=(",", ":"))


def _aggregate_sales_weekly(sales: list[dict]) -> list[dict]:
    """Agrega sales_by_day a semanas ISO para reducir tamaño."""
    if not sales:
        return []
    buckets: dict[str, dict] = {}
    for r in sales:
        ds = r.get("date")
        try:
            dt = datetime.fromisoformat(ds).date()  # YYYY-MM-DD
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
    """Recorta métricas para evitar 413 de Groq."""
    avg = metrics.get("averages") or {}
    top = (metrics.get("top_products") or [])[:10]
    pairs = (metrics.get("basket_pairs") or [])[:10]
    rfm_summary = (metrics.get("rfm") or {}).get("summary", {})

    sales = metrics.get("sales_by_day") or []
    # Si hay muchos días, agregamos por semana.
    if len(sales) > 120:
        sales_compact = {"mode": "weekly", "series": _aggregate_sales_weekly(sales)}
    else:
        # si no, mandamos daily pero recortado por seguridad
        sales_compact = {"mode": "daily", "series": sales[-120:]}

    return {
        "range": metrics.get("range"),
        "averages": avg,
        "sales": sales_compact,
        "top_products": top,
        "basket_pairs": pairs,
        "rfm_summary": rfm_summary,
        "notes": "Los importes están en EUR. Si necesitas más detalle, pide qué dato exacto calcular.",
    }


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
    prod_map = {
        p.id: p.nombre
        for p in db.query(ProductoDB).filter(ProductoDB.id.in_([r.producto_id for r in rows])).all()
    }
    return [
        {
            "product_id": r.producto_id,
            "name": prod_map.get(r.producto_id, f"Producto {r.producto_id}"),
            "qty": float(r.qty or 0),
            "revenue": float(r.revenue or 0.0),
        }
        for r in rows
    ]


def averages(db: Session, dfrom: date, dto: date):
    q = db.query(AlbaranDB).filter(AlbaranDB.fecha >= dfrom, AlbaranDB.fecha <= dto)
    orders = q.count()
    total = float(
        db.query(func.coalesce(func.sum(AlbaranDB.total), 0.0))
        .filter(AlbaranDB.fecha >= dfrom, AlbaranDB.fecha <= dto)
        .scalar()
        or 0.0
    )
    aov = total / orders if orders else 0.0

    rows = (
        db.query(AlbaranDB.cliente_id, func.coalesce(func.sum(AlbaranDB.total), 0.0).label("spent"))
        .filter(AlbaranDB.fecha >= dfrom, AlbaranDB.fecha <= dto)
        .group_by(AlbaranDB.cliente_id)
        .all()
    )
    avg_per_customer = (sum(float(r.spent) for r in rows) / len(rows)) if rows else 0.0
    return {"orders": orders, "revenue": total, "aov": aov, "avg_per_customer": avg_per_customer}


def basket_pairs(db: Session, dfrom: date, dto: date, min_support: int = 2, limit: int = 10):
    rows = (
        db.query(LineaAlbaranDB.albaran_id, LineaAlbaranDB.producto_id)
        .join(AlbaranDB, AlbaranDB.id == LineaAlbaranDB.albaran_id)
        .filter(AlbaranDB.fecha >= dfrom, AlbaranDB.fecha <= dto)
        .all()
    )
    from collections import defaultdict
    from itertools import combinations

    by_alb = defaultdict(list)
    for r in rows:
        by_alb[r.albaran_id].append(r.producto_id)

    pair_count, prod_count = defaultdict(int), defaultdict(int)
    for _, prods in by_alb.items():
        uniq = sorted(set(prods))
        for p in uniq:
            prod_count[p] += 1
        for a, b in combinations(uniq, 2):
            pair_count[(a, b)] += 1

    prod_ids = list(set([p for pair in pair_count.keys() for p in pair]))
    name_map = {p.id: p.nombre for p in db.query(ProductoDB).filter(ProductoDB.id.in_(prod_ids)).all()}

    pairs = []
    for (a, b), supp in pair_count.items():
        if supp < min_support:
            continue
        conf = supp / prod_count[a] if prod_count[a] else 0.0
        lift = conf / (prod_count[b] / max(1, len(by_alb))) if len(by_alb) else 0.0
        pairs.append(
            {
                "a_id": a,
                "a_name": name_map.get(a, f"Producto {a}"),
                "b_id": b,
                "b_name": name_map.get(b, f"Producto {b}"),
                "support": int(supp),
                "confidence": conf,
                "lift": lift,
            }
        )
    pairs.sort(key=lambda x: (x["support"], x["confidence"]), reverse=True)
    return pairs[:limit]


def rfm_segments(db: Session, ref_date: date):
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
    if not rows:
        return {"summary": {}, "by_customer": []}

    recencies = []
    for r in rows:
        rec_days = (ref_date - r.last_date).days if r.last_date else 99999
        recencies.append(rec_days)

    import numpy as np

    def quantiles(series):
        if len(series) >= 4:
            return np.quantile(series, [0.25, 0.5, 0.75]).tolist()
        return [min(series), float(np.median(series)), max(series)]

    Rq = quantiles(recencies)
    Fq = quantiles([float(r.freq) for r in rows])
    Mq = quantiles([float(r.monetary) for r in rows])

    def score_r(rec_days):
        if rec_days <= Rq[0]:
            return 4
        if rec_days <= Rq[1]:
            return 3
        if rec_days <= Rq[2]:
            return 2
        return 1

    def score(val, qs):
        if val <= qs[0]:
            return 1
        if val <= qs[1]:
            return 2
        if val <= qs[2]:
            return 3
        return 4

    by_customer = []
    for r in rows:
        rec_days = (ref_date - r.last_date).days if r.last_date else 99999
        sR, sF, sM = score_r(rec_days), score(float(r.freq), Fq), score(float(r.monetary), Mq)
        seg = (
            "VIP"
            if (sR >= 3 and sF == 4 and sM == 4)
            else "En crecimiento"
            if (sF >= 3 and sM >= 3)
            else "En riesgo"
            if (sR == 1 and sF <= 2)
            else "Ocasional"
        )
        by_customer.append(
            {
                "cliente_id": r.cid,
                "recency_days": rec_days,
                "frequency": int(r.freq),
                "monetary": float(r.monetary),
                "R": sR,
                "F": sF,
                "M": sM,
                "segment": seg,
            }
        )
    seg_summary = {}
    for c in by_customer:
        seg_summary[c["segment"]] = seg_summary.get(c["segment"], 0) + 1
    return {"summary": seg_summary, "by_customer": by_customer}


# ---------- IA: informe narrativo (Groq) ----------
def generate_ai_report(metrics_full: Dict[str, Any]) -> str:
    """Genera informe narrativo usando Groq, evitando payloads gigantes (413)."""
    try:
        metrics_small = _metrics_for_llm(metrics_full)

        prompt = (
            "Eres analista de datos retail de una tienda de muebles. "
            "Con el JSON de métricas (compacto) redacta un informe MUY detallado en español, "
            "claro y accionable, con secciones y bullets. Incluye:\n"
            "- evolución/estacionalidad, anomalías y posibles causas\n"
            "- ticket medio y palancas para mejorarlo\n"
            "- productos estrella y productos con potencial\n"
            "- oportunidades de cross-sell usando pares co-comprados\n"
            "- lectura de RFM y acciones por segmento\n"
            "- un plan de 5 acciones priorizadas (impacto/esfuerzo)\n\n"
            f"MÉTRICAS JSON:\n{_json_compact(metrics_small)}"
        )

        return groq_chat(
            [
                {"role": "system", "content": "Eres un experto en analítica de retail."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
        )
    except Exception as e:
        log.warning("IA no disponible (%s). Usando informe básico.", e)
        m = metrics_full
        top = m.get("top_products", [])[:5]
        top_txt = ", ".join([f"{t['name']} ({t['revenue']:.2f}€)" for t in top]) or "—"
        seg = (m.get("rfm") or {}).get("summary", {})
        seg_txt = ", ".join([f"{k}: {v}" for k, v in seg.items()]) or "—"
        return (
            "Informe de tendencias (básico):\n"
            f"- Ventas totales: {m['averages']['revenue']:.2f} € en {m['averages']['orders']} pedidos.\n"
            f"- Ticket medio (AOV): {m['averages']['aov']:.2f} €; gasto medio por cliente: {m['averages']['avg_per_customer']:.2f} €.\n"
            f"- Top productos por facturación: {top_txt}.\n"
            f"- Segmentación RFM: {seg_txt}.\n"
            "- Sugerencias: potenciar bundles de los top productos y campañas a clientes 'En riesgo'."
        )


def _pct(diff: float, prev: float) -> str:
    if prev == 0:
        return "—"
    return f"{(diff / prev) * 100:.1f}%"


def compare_periods(db: Session, dfrom: date, dto: date) -> Dict[str, Any]:
    """Compara el rango actual con el periodo anterior de la misma duración."""
    days = (dto - dfrom).days + 1
    prev_to = dfrom - timedelta(days=1)
    prev_from = prev_to - timedelta(days=days - 1)

    current = {
        "range": {"from": to_iso(dfrom), "to": to_iso(dto)},
        "sales_by_day": sales_by_day(db, dfrom, dto),
        "top_products": top_products(db, dfrom, dto, limit=10),
        "averages": averages(db, dfrom, dto),
        "basket_pairs": basket_pairs(db, dfrom, dto, min_support=2, limit=10),
        "rfm": rfm_segments(db, dto),
    }
    previous = {
        "range": {"from": to_iso(prev_from), "to": to_iso(prev_to)},
        "sales_by_day": sales_by_day(db, prev_from, prev_to),
        "top_products": top_products(db, prev_from, prev_to, limit=10),
        "averages": averages(db, prev_from, prev_to),
        "basket_pairs": basket_pairs(db, prev_from, prev_to, min_support=2, limit=10),
        "rfm": rfm_segments(db, prev_to),
    }

    ca, pa = current["averages"], previous["averages"]
    delta = {
        "revenue": {"current": float(ca.get("revenue", 0) or 0), "previous": float(pa.get("revenue", 0) or 0)},
        "orders": {"current": int(ca.get("orders", 0) or 0), "previous": int(pa.get("orders", 0) or 0)},
        "aov": {"current": float(ca.get("aov", 0) or 0), "previous": float(pa.get("aov", 0) or 0)},
    }
    for k in ("revenue", "orders", "aov"):
        cur = float(delta[k]["current"])
        prev = float(delta[k]["previous"])
        diff = cur - prev
        delta[k]["diff"] = diff
        delta[k]["pct"] = _pct(diff, prev)

    return {"current": current, "previous": previous, "delta": delta}


def generate_ai_compare_report(compare_obj_full: Dict[str, Any]) -> str:
    """Informe IA corto para explicar la comparativa, usando payload compacto."""
    try:
        # compactamos: delta + top5 actuales/anteriores + ventas semanales (si hace falta)
        cur = compare_obj_full.get("current", {})
        prev = compare_obj_full.get("previous", {})
        delta = compare_obj_full.get("delta", {})

        compact = {
            "current_range": (cur.get("range") or {}),
            "previous_range": (prev.get("range") or {}),
            "delta": delta,
            "current_top_products": (cur.get("top_products") or [])[:5],
            "previous_top_products": (prev.get("top_products") or [])[:5],
            "current_sales": _metrics_for_llm(cur).get("sales"),
            "previous_sales": _metrics_for_llm(prev).get("sales"),
        }

        prompt = (
            "Eres analista de datos retail. Con el JSON de comparativa (compacto), "
            "explica en español: qué sube/baja, posibles causas, y 3 acciones. Sé concreto.\n\n"
            f"COMPARATIVA JSON:\n{_json_compact(compact)}"
        )

        return groq_chat(
            [
                {"role": "system", "content": "Eres un experto en analítica de retail."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
        )
    except Exception as e:
        log.warning("IA comparativa no disponible (%s)", e)
        return ""


# ---------- Endpoints ----------
@router.get("/summary")
def analytics_summary(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: Session = Depends(get_db),
):
    dfrom, dto = daterange_defaults(date_from, date_to)

    metrics = {
        "range": {"from": to_iso(dfrom), "to": to_iso(dto)},
        "sales_by_day": sales_by_day(db, dfrom, dto),
        "top_products": top_products(db, dfrom, dto, limit=10),
        "averages": averages(db, dfrom, dto),
        "basket_pairs": basket_pairs(db, dfrom, dto, min_support=2, limit=10),
        "rfm": rfm_segments(db, dto),
    }
    report = generate_ai_report(metrics)
    return {"metrics": metrics, "ai_report": report}


@router.get("/compare")
def analytics_compare(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: Session = Depends(get_db),
):
    dfrom, dto = daterange_defaults(date_from, date_to)
    compare_obj = compare_periods(db, dfrom, dto)
    compare_obj["ai_compare_report"] = generate_ai_compare_report(compare_obj)
    return compare_obj


@router.get("/export/pdf")
def analytics_export_pdf(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    include_compare: bool = Query(True),
    db: Session = Depends(get_db),
):
    dfrom, dto = daterange_defaults(date_from, date_to)

    metrics_actual = {
        "range": {"from": to_iso(dfrom), "to": to_iso(dto)},
        "sales_by_day": sales_by_day(db, dfrom, dto),
        "top_products": top_products(db, dfrom, dto, limit=10),
        "averages": averages(db, dfrom, dto),
        "basket_pairs": basket_pairs(db, dfrom, dto, min_support=2, limit=10),
        "rfm": rfm_segments(db, dto),
    }
    ai_report = generate_ai_report(metrics_actual)

    rango_prev = None
    metrics_prev = None
    delta = None
    ai_compare = None

    if include_compare:
        comp = compare_periods(db, dfrom, dto)
        rango_prev = comp["previous"]["range"]
        metrics_prev = comp["previous"]
        delta = comp["delta"]
        ai_compare = generate_ai_compare_report(comp)

    buffer = generar_pdf_tendencias(
        tienda_nombre="Tienda",
        rango_actual=metrics_actual["range"],
        metrics_actual=metrics_actual,
        ai_report=ai_report,
        rango_prev=rango_prev,
        metrics_prev=metrics_prev,
        compare_delta=delta,
        ai_compare_report=ai_compare,
    )

    filename = f"tendencias_{to_iso(dfrom)}_a_{to_iso(dto)}.pdf"
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=\"{filename}\""},
    )
