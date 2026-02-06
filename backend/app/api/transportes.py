from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any
from io import BytesIO
from datetime import datetime, date

from backend.app.database import SessionLocal
from backend.app.entidades.albaran import AlbaranDB, Albaran
from backend.app.entidades.cliente import ClienteDB
from backend.app.entidades.albaran_ruta import AlbaranRutaDB
from backend.app.entidades.movimiento import MovimientoDB

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

router = APIRouter(prefix="/transporte", tags=["Transporte"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# -----------------------
# Helpers PDF
# -----------------------
def _eur(n: float) -> str:
    try:
        return f"{float(n):.2f} €"
    except Exception:
        return "0.00 €"

def _fmt_fecha(value) -> str:
    if value is None:
        return "—"
    if isinstance(value, (datetime, date)):
        return value.strftime("%d/%m/%Y")
    return str(value)

def generar_pdf_factura_ruta(camion_id: int, albaranes: List[AlbaranDB], clientes_map: Dict[int, ClienteDB]) -> bytes:
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=26 * mm,
        bottomMargin=18 * mm,
        title=f"Factura Ruta Camión {camion_id}",
        author="Tienda",
    )

    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(
        name="H1",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=16,
        leading=18,
        textColor=colors.HexColor("#111827"),
        spaceAfter=6,
    ))
    styles.add(ParagraphStyle(
        name="Muted",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#6B7280"),
    ))
    styles.add(ParagraphStyle(
        name="Body",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#111827"),
    ))

    total = sum(float(a.total or 0) for a in albaranes)
    comision = total * 0.07
    neto_tienda = total - comision

    story = []
    story.append(Spacer(1, 10))
    story.append(Paragraph(f"Factura de ruta · Camión {camion_id}", styles["H1"]))
    story.append(Paragraph(f"Fecha de emisión: {_fmt_fecha(date.today())}", styles["Muted"]))
    story.append(Spacer(1, 10))

    # Resumen
    resumen = Table(
        [
            ["Total albaranes", _eur(total)],
            ["Comisión transportista (7%)", _eur(comision)],
            ["Importe tienda (Total - 7%)", _eur(neto_tienda)],
        ],
        colWidths=[90 * mm, 70 * mm],
    )
    resumen.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#E5E7EB")),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F9FAFB")),
        ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#111827")),
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LINEBELOW", (0, 0), (-1, 0), 1, colors.HexColor("#E5E7EB")),
    ]))
    story.append(resumen)
    story.append(Spacer(1, 14))

    # Tabla albaranes
    data = [["Albarán", "Fecha", "Cliente", "Total"]]
    for a in albaranes:
        c = clientes_map.get(a.cliente_id)
        cliente = "—" if not c else f"{(c.nombre or '').strip()} {(c.apellidos or '').strip()}".strip() or f"Cliente #{a.cliente_id}"
        data.append([f"#{a.id}", _fmt_fecha(a.fecha), cliente, _eur(a.total or 0)])

    tbl = Table(data, colWidths=[22 * mm, 28 * mm, 92 * mm, 28 * mm])
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#111827")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 9),

        ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#E5E7EB")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 1), (-1, -1), 9),
        ("TEXTCOLOR", (0, 1), (-1, -1), colors.HexColor("#111827")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (3, 1), (3, -1), "RIGHT"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(tbl)
    story.append(Spacer(1, 10))
    story.append(Paragraph("Documento generado automáticamente.", styles["Muted"]))

    doc.build(story)
    return buf.getvalue()


# -----------------------
# Endpoints
# -----------------------

@router.get("/almacen", response_model=List[Albaran])
def get_almacen(db: Session = Depends(get_db)):
    albs = (
        db.query(AlbaranDB)
        .filter(AlbaranDB.estado == "ALMACEN")
        .order_by(AlbaranDB.id.desc())
        .all()
    )
    return albs


@router.get("/rutas")
def get_rutas(db: Session = Depends(get_db)) -> Dict[str, Any]:
    rows = (
        db.query(AlbaranDB, AlbaranRutaDB.camion_id)
        .outerjoin(AlbaranRutaDB, AlbaranRutaDB.albaran_id == AlbaranDB.id)
        .filter(AlbaranDB.estado == "RUTA")
        .order_by(AlbaranRutaDB.camion_id.asc().nullsfirst(), AlbaranDB.id.asc())
        .all()
    )

    grupos: Dict[int, List[AlbaranDB]] = {}
    sin_camion: List[AlbaranDB] = []

    for alb, cid in rows:
        if cid is None:
            sin_camion.append(alb)
        else:
            grupos.setdefault(int(cid), []).append(alb)

    camiones = [
        {"camion_id": cid, "albaranes": [Albaran.model_validate(x) for x in grupos[cid]]}
        for cid in sorted(grupos.keys())
    ]

    return {
        "camiones": camiones,
        "sin_camion": [Albaran.model_validate(x) for x in sin_camion],
    }


from pydantic import BaseModel

class AsignarRutaBody(BaseModel):
    camion_id: int
    albaran_ids: List[int]

class QuitarRutaBody(BaseModel):
    albaran_ids: List[int]

class PendienteBody(BaseModel):
    albaran_ids: List[int]

class LiquidarCamionOut(BaseModel):
    ok: bool
    camion_id: int
    n_albaranes: int
    base_total: float
    porcentaje: float
    importe: float
    movimiento_id: int


@router.post("/ruta/asignar")
def asignar_ruta(body: AsignarRutaBody, db: Session = Depends(get_db)):
    if not body.albaran_ids:
        raise HTTPException(status_code=400, detail="albaran_ids vacío")
    if body.camion_id <= 0:
        raise HTTPException(status_code=400, detail="camion_id debe ser > 0")

    albs = db.query(AlbaranDB).filter(AlbaranDB.id.in_(body.albaran_ids)).all()
    found_ids = {a.id for a in albs}
    missing = [i for i in body.albaran_ids if i not in found_ids]
    if missing:
        raise HTTPException(status_code=404, detail=f"No existen albaranes: {missing}")

    invalid = [a.id for a in albs if a.estado not in ("ALMACEN", "RUTA")]
    if invalid:
        raise HTTPException(status_code=400, detail=f"No se pueden asignar (no están en ALMACEN/RUTA): {invalid}")

    for a in albs:
        if a.estado == "ALMACEN":
            a.estado = "RUTA"

    existentes = (
        db.query(AlbaranRutaDB)
        .filter(AlbaranRutaDB.albaran_id.in_(body.albaran_ids))
        .all()
    )
    map_exist = {r.albaran_id: r for r in existentes}

    for aid in body.albaran_ids:
        r = map_exist.get(aid)
        if r:
            r.camion_id = body.camion_id
        else:
            db.add(AlbaranRutaDB(albaran_id=aid, camion_id=body.camion_id))

    db.commit()
    return {"ok": True, "camion_id": body.camion_id, "n": len(albs)}


@router.post("/ruta/quitar")
def quitar_ruta(body: QuitarRutaBody, db: Session = Depends(get_db)):
    if not body.albaran_ids:
        raise HTTPException(status_code=400, detail="albaran_ids vacío")

    albs = db.query(AlbaranDB).filter(AlbaranDB.id.in_(body.albaran_ids)).all()
    found_ids = {a.id for a in albs}
    missing = [i for i in body.albaran_ids if i not in found_ids]
    if missing:
        raise HTTPException(status_code=404, detail=f"No existen albaranes: {missing}")

    for a in albs:
        a.estado = "ALMACEN"

    db.query(AlbaranRutaDB).filter(AlbaranRutaDB.albaran_id.in_(body.albaran_ids)).delete(synchronize_session=False)

    db.commit()
    return {"ok": True, "n": len(albs)}


@router.post("/ruta/pendiente")
def poner_pendiente(body: PendienteBody, db: Session = Depends(get_db)):
    if not body.albaran_ids:
        raise HTTPException(status_code=400, detail="albaran_ids vacío")

    albs = db.query(AlbaranDB).filter(AlbaranDB.id.in_(body.albaran_ids)).all()
    found_ids = {a.id for a in albs}
    missing = [i for i in body.albaran_ids if i not in found_ids]
    if missing:
        raise HTTPException(status_code=404, detail=f"No existen albaranes: {missing}")

    invalid = [a.id for a in albs if a.estado not in ("ALMACEN", "RUTA")]
    if invalid:
        raise HTTPException(status_code=400, detail=f"No se pueden poner pendientes (no están en ALMACEN/RUTA): {invalid}")

    for a in albs:
        a.estado = "RUTA"

    db.query(AlbaranRutaDB).filter(AlbaranRutaDB.albaran_id.in_(body.albaran_ids)).delete(synchronize_session=False)

    db.commit()
    return {"ok": True, "n": len(albs)}


# -----------------------
# NUEVO: Liquidar camión (registrar gasto 7%)
# -----------------------
@router.post("/ruta/{camion_id}/liquidar", response_model=LiquidarCamionOut)
def liquidar_camion(camion_id: int, db: Session = Depends(get_db)):
    if camion_id <= 0:
        raise HTTPException(status_code=400, detail="camion_id inválido")

    albs = (
        db.query(AlbaranDB)
        .join(AlbaranRutaDB, AlbaranRutaDB.albaran_id == AlbaranDB.id)
        .filter(AlbaranDB.estado == "RUTA", AlbaranRutaDB.camion_id == camion_id)
        .order_by(AlbaranDB.id.asc())
        .all()
    )

    if not albs:
        raise HTTPException(status_code=404, detail="No hay albaranes en ese camión.")

    base_total = round(sum(float(a.total or 0) for a in albs), 2)
    porcentaje = 0.07
    importe = round(base_total * porcentaje, 2)

    concepto_prefix = f"Transporte camión {camion_id}"
    hoy = date.today()

    # Evitar duplicados si el usuario liquida varias veces en el mismo día.
    existente = (
        db.query(MovimientoDB)
        .filter(
            MovimientoDB.tipo == "EGRESO",
            MovimientoDB.fecha == hoy,
            MovimientoDB.concepto.like(f"{concepto_prefix}%"),
        )
        .order_by(MovimientoDB.id.desc())
        .first()
    )

    if existente:
        mov = existente
    else:
        mov = MovimientoDB(
            fecha=hoy,
            concepto=f"{concepto_prefix} (7% de {base_total:.2f} € · {len(albs)} pedidos)",
            cantidad=float(importe),
            tipo="EGRESO",
        )
        db.add(mov)
        db.commit()
        db.refresh(mov)

    return LiquidarCamionOut(
        ok=True,
        camion_id=camion_id,
        n_albaranes=len(albs),
        base_total=base_total,
        porcentaje=7.0,
        importe=float(importe),
        movimiento_id=int(mov.id),
    )


@router.get("/ruta/{camion_id}/factura")
def factura_ruta(camion_id: int, db: Session = Depends(get_db)):
    if camion_id <= 0:
        raise HTTPException(status_code=400, detail="camion_id inválido")

    albs = (
        db.query(AlbaranDB)
        .join(AlbaranRutaDB, AlbaranRutaDB.albaran_id == AlbaranDB.id)
        .filter(AlbaranDB.estado == "RUTA", AlbaranRutaDB.camion_id == camion_id)
        .order_by(AlbaranDB.id.asc())
        .all()
    )

    if not albs:
        raise HTTPException(status_code=404, detail="No hay albaranes en ese camión.")

    cliente_ids = list({a.cliente_id for a in albs})
    clientes = db.query(ClienteDB).filter(ClienteDB.id.in_(cliente_ids)).all()
    clientes_map = {c.id: c for c in clientes}

    pdf_bytes = generar_pdf_factura_ruta(camion_id, albs, clientes_map)
    filename = f"factura_ruta_camion_{camion_id}.pdf"

    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
