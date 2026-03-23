from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Annotated, List, Dict, Any
from io import BytesIO
from datetime import datetime, date
from pydantic import BaseModel

from backend.app.database import get_db
from backend.app.dependencies import get_current_user
from backend.app.entidades.albaran import DeliveryNoteDB, DeliveryNote
from backend.app.entidades.cliente import CustomerDB
from backend.app.entidades.albaran_ruta import DeliveryNoteRouteDB
from backend.app.entidades.movimiento import MovementDB

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

router = APIRouter(
    prefix="/transporte", tags=["Transporte"], dependencies=[Depends(get_current_user)]
)


def _eur(n: float) -> str:
    try:
        return f"{float(n):.2f} €"
    except (TypeError, ValueError):
        return "0.00 €"


def _fmt_date(value) -> str:
    if value is None:
        return "-"
    if isinstance(value, (datetime, date)):
        return value.strftime("%d/%m/%Y")
    return str(value)


def generate_route_invoice_pdf(
    truck_id: int,
    delivery_notes: List[DeliveryNoteDB],
    customers_map: Dict[int, CustomerDB],
) -> bytes:
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=26 * mm,
        bottomMargin=18 * mm,
        title=f"Factura Ruta Camion {truck_id}",
        author="Tienda",
    )

    styles = getSampleStyleSheet()
    styles.add(
        ParagraphStyle(
            name="H1",
            parent=styles["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=16,
            leading=18,
            textColor=colors.HexColor("#111827"),
            spaceAfter=6,
        )
    )
    styles.add(
        ParagraphStyle(
            name="Muted",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=9,
            leading=12,
            textColor=colors.HexColor("#6B7280"),
        )
    )
    styles.add(
        ParagraphStyle(
            name="Body",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=10,
            leading=14,
            textColor=colors.HexColor("#111827"),
        )
    )

    total = sum(float(a.total or 0) for a in delivery_notes)
    commission = total * 0.07
    net_revenue = total - commission

    story = []
    story.append(Spacer(1, 10))
    story.append(Paragraph(f"Factura de ruta - Camion {truck_id}", styles["H1"]))
    story.append(
        Paragraph(f"Fecha de emision: {_fmt_date(date.today())}", styles["Muted"])
    )
    story.append(Spacer(1, 10))

    summary_table = Table(
        [
            ["Total albaranes", _eur(total)],
            ["Comision transportista (7%)", _eur(commission)],
            ["Importe tienda (Total - 7%)", _eur(net_revenue)],
        ],
        colWidths=[90 * mm, 70 * mm],
    )
    summary_table.setStyle(
        TableStyle(
            [
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
            ]
        )
    )
    story.append(summary_table)
    story.append(Spacer(1, 14))

    data = [["Albaran", "Fecha", "Cliente", "Total"]]
    for a in delivery_notes:
        c = customers_map.get(a.customer_id)
        customer_label = (
            "-"
            if not c
            else f"{(c.name or '').strip()} {(c.surnames or '').strip()}".strip()
            or f"Cliente #{a.customer_id}"
        )
        data.append([f"#{a.id}", _fmt_date(a.date), customer_label, _eur(a.total or 0)])

    tbl = Table(data, colWidths=[22 * mm, 28 * mm, 92 * mm, 28 * mm])
    tbl.setStyle(
        TableStyle(
            [
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
            ]
        )
    )
    story.append(tbl)
    story.append(Spacer(1, 10))
    story.append(Paragraph("Documento generado automaticamente.", styles["Muted"]))

    doc.build(story)
    return buf.getvalue()


@router.get("/rutas")
def get_routes(db: Annotated[Session, Depends(get_db)]) -> Dict[str, Any]:
    """
    Returns all delivery notes in RUTA status grouped by truck.
    Those without an assigned truck appear in the 'without_truck' list.
    """
    rows = (
        db.query(DeliveryNoteDB, DeliveryNoteRouteDB.truck_id)
        .outerjoin(
            DeliveryNoteRouteDB,
            DeliveryNoteRouteDB.delivery_note_id == DeliveryNoteDB.id,
        )
        .filter(DeliveryNoteDB.status == "RUTA")
        .order_by(
            DeliveryNoteRouteDB.truck_id.asc().nullsfirst(), DeliveryNoteDB.id.asc()
        )
        .all()
    )

    groups: Dict[int, List[DeliveryNoteDB]] = {}
    without_truck: List[DeliveryNoteDB] = []

    for dn, truck_id in rows:
        if truck_id is None:
            without_truck.append(dn)
        else:
            groups.setdefault(int(truck_id), []).append(dn)

    trucks = [
        {
            "camion_id": tid,
            "albaranes": [DeliveryNote.model_validate(x) for x in groups[tid]],
        }
        for tid in sorted(groups.keys())
    ]

    return {
        "camiones": trucks,
        "sin_camion": [DeliveryNote.model_validate(x) for x in without_truck],
    }


class AssignRouteBody(BaseModel):
    camion_id: int
    albaran_ids: List[int]


class RemoveRouteBody(BaseModel):
    albaran_ids: List[int]


class PendingBody(BaseModel):
    albaran_ids: List[int]


class SettleTruckOut(BaseModel):
    ok: bool
    camion_id: int
    n_albaranes: int
    base_total: float
    porcentaje: float
    importe: float
    movimiento_id: int


@router.post("/ruta/asignar")
def assign_route(body: AssignRouteBody, db: Annotated[Session, Depends(get_db)]):
    """
    Assigns one or more delivery notes to a specific truck. Notes in ALMACEN
    status move to RUTA. Also accepts reassigning notes already in RUTA.
    """
    if not body.albaran_ids:
        raise HTTPException(status_code=400, detail="albaran_ids vacio")
    if body.camion_id <= 0:
        raise HTTPException(status_code=400, detail="camion_id debe ser > 0")

    delivery_notes = (
        db.query(DeliveryNoteDB).filter(DeliveryNoteDB.id.in_(body.albaran_ids)).all()
    )
    found_ids = {a.id for a in delivery_notes}
    missing = [i for i in body.albaran_ids if i not in found_ids]
    if missing:
        raise HTTPException(status_code=404, detail=f"No existen albaranes: {missing}")

    invalid = [a.id for a in delivery_notes if a.status not in ("ALMACEN", "RUTA")]
    if invalid:
        raise HTTPException(
            status_code=400,
            detail=f"No se pueden asignar (no estan en ALMACEN/RUTA): {invalid}",
        )

    for a in delivery_notes:
        if a.status == "ALMACEN":
            a.status = "RUTA"

    existing = (
        db.query(DeliveryNoteRouteDB)
        .filter(DeliveryNoteRouteDB.delivery_note_id.in_(body.albaran_ids))
        .all()
    )
    existing_map = {r.delivery_note_id: r for r in existing}

    for dn_id in body.albaran_ids:
        r = existing_map.get(dn_id)
        if r:
            r.truck_id = body.camion_id
        else:
            db.add(DeliveryNoteRouteDB(delivery_note_id=dn_id, truck_id=body.camion_id))

    db.commit()
    return {"ok": True, "camion_id": body.camion_id, "n": len(delivery_notes)}


@router.post("/ruta/quitar")
def remove_route(body: RemoveRouteBody, db: Annotated[Session, Depends(get_db)]):
    """
    Removes delivery notes from their truck and returns them to ALMACEN status,
    also deleting their route table entry.
    """
    if not body.albaran_ids:
        raise HTTPException(status_code=400, detail="albaran_ids vacio")

    delivery_notes = (
        db.query(DeliveryNoteDB).filter(DeliveryNoteDB.id.in_(body.albaran_ids)).all()
    )
    found_ids = {a.id for a in delivery_notes}
    missing = [i for i in body.albaran_ids if i not in found_ids]
    if missing:
        raise HTTPException(status_code=404, detail=f"No existen albaranes: {missing}")

    for a in delivery_notes:
        a.status = "ALMACEN"

    db.query(DeliveryNoteRouteDB).filter(
        DeliveryNoteRouteDB.delivery_note_id.in_(body.albaran_ids)
    ).delete(synchronize_session=False)

    db.commit()
    return {"ok": True, "n": len(delivery_notes)}


@router.post("/ruta/pendiente")
def set_pending(body: PendingBody, db: Annotated[Session, Depends(get_db)]):
    """
    Marks delivery notes as 'in route without assigned truck' (keeps RUTA status
    but removes the truck assignment so they can be reassigned later).
    """
    if not body.albaran_ids:
        raise HTTPException(status_code=400, detail="albaran_ids vacio")

    delivery_notes = (
        db.query(DeliveryNoteDB).filter(DeliveryNoteDB.id.in_(body.albaran_ids)).all()
    )
    found_ids = {a.id for a in delivery_notes}
    missing = [i for i in body.albaran_ids if i not in found_ids]
    if missing:
        raise HTTPException(status_code=404, detail=f"No existen albaranes: {missing}")

    invalid = [a.id for a in delivery_notes if a.status not in ("ALMACEN", "RUTA")]
    if invalid:
        raise HTTPException(
            status_code=400,
            detail=f"No se pueden poner pendientes (no estan en ALMACEN/RUTA): {invalid}",
        )

    for a in delivery_notes:
        a.status = "RUTA"

    db.query(DeliveryNoteRouteDB).filter(
        DeliveryNoteRouteDB.delivery_note_id.in_(body.albaran_ids)
    ).delete(synchronize_session=False)

    db.commit()
    return {"ok": True, "n": len(delivery_notes)}


@router.post("/ruta/{truck_id}/liquidar", response_model=SettleTruckOut)
def settle_truck(truck_id: int, db: Annotated[Session, Depends(get_db)]):
    """
    Settles a truck: calculates 7% of the total value of its delivery notes and
    registers an EGRESO movement. Avoids duplicates if called multiple times the same day.
    """
    if truck_id <= 0:
        raise HTTPException(status_code=400, detail="truck_id invalido")

    delivery_notes = (
        db.query(DeliveryNoteDB)
        .join(
            DeliveryNoteRouteDB,
            DeliveryNoteRouteDB.delivery_note_id == DeliveryNoteDB.id,
        )
        .filter(
            DeliveryNoteDB.status == "RUTA", DeliveryNoteRouteDB.truck_id == truck_id
        )
        .order_by(DeliveryNoteDB.id.asc())
        .all()
    )

    if not delivery_notes:
        raise HTTPException(status_code=404, detail="No hay albaranes en ese camion.")

    base_total = round(sum(float(a.total or 0) for a in delivery_notes), 2)
    percentage = 0.07
    amount = round(base_total * percentage, 2)

    description_prefix = f"Transporte camion {truck_id}"
    today = date.today()

    existing = (
        db.query(MovementDB)
        .filter(
            MovementDB.type == "EGRESO",
            MovementDB.date == today,
            MovementDB.description.like(f"{description_prefix}%"),
        )
        .order_by(MovementDB.id.desc())
        .first()
    )

    if existing:
        mov = existing
    else:
        mov = MovementDB(
            date=today,
            description=f"{description_prefix} (7% de {base_total:.2f} € - {len(delivery_notes)} pedidos)",
            amount=float(amount),
            type="EGRESO",
        )
        db.add(mov)
        db.commit()
        db.refresh(mov)

    return SettleTruckOut(
        ok=True,
        camion_id=truck_id,
        n_albaranes=len(delivery_notes),
        base_total=base_total,
        porcentaje=7.0,
        importe=float(amount),
        movimiento_id=int(mov.id),
    )
