# backend/app/utils/albaran_pdf.py
import logging
from io import BytesIO
from datetime import date, datetime

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

log = logging.getLogger("albaran_pdf")


def eur(n: float) -> str:
    try:
        return f"{float(n):.2f} €"
    except Exception:
        return "0.00 €"


def _fmt_fecha(value) -> str:
    if value is None:
        return ""
    if isinstance(value, (datetime, date)):
        return value.strftime("%d/%m/%Y")
    try:
        return str(value)
    except Exception:
        return ""


def _safe(s) -> str:
    if s is None:
        return ""
    return str(s).strip()


def _build_header_footer(canvas, doc, tienda_nombre: str, right_text: str):
    """
    Header + footer en todas las páginas.
    - Izquierda: nombre de tienda
    - Derecha: #albaran · fecha
    """
    canvas.saveState()

    # Separación superior: bajamos un poco todo el header para que no quede pegado
    header_y = doc.height + doc.topMargin - 16  # antes estaba prácticamente pegado

    # Línea del header
    canvas.setStrokeColor(colors.HexColor("#E5E7EB"))
    canvas.setLineWidth(1)
    canvas.line(doc.leftMargin, header_y - 8, doc.pagesize[0] - doc.rightMargin, header_y - 8)

    # Texto header (izq: tienda)
    canvas.setFillColor(colors.HexColor("#111827"))
    canvas.setFont("Helvetica-Bold", 11)
    canvas.drawString(doc.leftMargin, header_y, tienda_nombre)

    # Texto header (dcha)
    canvas.setFillColor(colors.HexColor("#6B7280"))
    canvas.setFont("Helvetica", 9)
    canvas.drawRightString(doc.pagesize[0] - doc.rightMargin, header_y, right_text)

    # Footer
    canvas.setStrokeColor(colors.HexColor("#E5E7EB"))
    canvas.setLineWidth(1)
    canvas.line(doc.leftMargin, doc.bottomMargin - 8, doc.pagesize[0] - doc.rightMargin, doc.bottomMargin - 8)

    canvas.setFillColor(colors.HexColor("#6B7280"))
    canvas.setFont("Helvetica", 8)
    canvas.drawString(doc.leftMargin, doc.bottomMargin - 18, "Documento generado automáticamente.")
    canvas.drawRightString(
        doc.pagesize[0] - doc.rightMargin,
        doc.bottomMargin - 18,
        f"Página {canvas.getPageNumber()}",
    )

    canvas.restoreState()


def generar_pdf_albaran(albaran, cliente, lineas_con_nombre):
    """
    PDF profesional:
    - Header con nombre de tienda ("Tienda")
    - Más separación arriba para que no se pise con el título
    """
    log.info("[pdf] Generando PDF para albarán #%s", getattr(albaran, "id", "?"))

    buffer = BytesIO()

    # ✅ Aumentamos margen superior para que haya más aire bajo el header
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=26 * mm,     # antes 18mm
        bottomMargin=18 * mm,
        title=f"Albarán {getattr(albaran, 'id', '')}",
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
    styles.add(
        ParagraphStyle(
            name="Label",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=9,
            leading=12,
            textColor=colors.HexColor("#374151"),
        )
    )

    albaran_id = _safe(getattr(albaran, "id", ""))
    fecha = _fmt_fecha(getattr(albaran, "fecha", None))

    # ---- Datos cliente
    c_nombre = f"{_safe(getattr(cliente, 'nombre', ''))} {_safe(getattr(cliente, 'apellidos', ''))}".strip()
    c_dni = _safe(getattr(cliente, "dni", ""))
    c_email = _safe(getattr(cliente, "email", ""))
    c_tel1 = _safe(getattr(cliente, "telefono1", ""))
    c_tel2 = _safe(getattr(cliente, "telefono2", ""))

    dir_parts = [
        _safe(getattr(cliente, "calle", "")),
        _safe(getattr(cliente, "numero_vivienda", "")),
        _safe(getattr(cliente, "piso_portal", "")),
        _safe(getattr(cliente, "codigo_postal", "")),
        _safe(getattr(cliente, "ciudad", "")),
    ]
    direccion = " ".join([p for p in dir_parts if p]).strip()

    # ---- Calcular total
    total = 0.0
    for ln in lineas_con_nombre:
        total += float(ln.get("subtotal", 0) or 0)

    story = []

    # ✅ Más aire antes del título para evitar que quede pegado al header
    story.append(Spacer(1, 10))

    # Cabecera principal
    story.append(Paragraph(f"Albarán #{albaran_id}", styles["H1"]))
    story.append(Paragraph(f"Fecha: {fecha}", styles["Muted"]))
    story.append(Spacer(1, 12))

    # Bloques superiores (cliente + resumen)
    left_block = [
        [Paragraph("Cliente", styles["Label"])],
        [Paragraph(_safe(c_nombre) or "-", styles["Body"])],
    ]
    if c_dni:
        left_block.append([Paragraph(f"DNI: {_safe(c_dni)}", styles["Body"])])
    if c_email:
        left_block.append([Paragraph(f"Email: {c_email}", styles["Body"])])
    if c_tel1:
        extra = f"Tel: {c_tel1}" + (f" · {c_tel2}" if c_tel2 else "")
        left_block.append([Paragraph(extra, styles["Body"])])
    if direccion:
        left_block.append([Paragraph(direccion, styles["Body"])])

    left_tbl = Table(left_block, colWidths=[90 * mm])
    left_tbl.setStyle(
        TableStyle(
            [
                ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#E5E7EB")),
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F9FAFB")),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )

    right_block = [
        [Paragraph("Resumen", styles["Label"])],
        [Paragraph(f"<b>Total</b>: {eur(total)}", styles["Body"])],
        [Paragraph(f"<b>Albarán</b>: #{albaran_id}", styles["Body"])],
        [Paragraph(f"<b>Fecha</b>: {fecha}", styles["Body"])],
    ]
    right_tbl = Table(right_block, colWidths=[70 * mm])
    right_tbl.setStyle(
        TableStyle(
            [
                ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#E5E7EB")),
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F9FAFB")),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )

    top = Table([[left_tbl, right_tbl]], colWidths=[doc.width - 70 * mm - 10, 70 * mm])
    top.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    story.append(top)
    story.append(Spacer(1, 14))

    # Tabla de líneas
    data = [
        [
            Paragraph("Producto", styles["Label"]),
            Paragraph("Cantidad", styles["Label"]),
            Paragraph("P. Unitario", styles["Label"]),
            Paragraph("Subtotal", styles["Label"]),
        ]
    ]

    for ln in lineas_con_nombre:
        prod = _safe(ln.get("producto_nombre", ""))
        cant = _safe(ln.get("cantidad", ""))
        punit = eur(ln.get("precio_unitario", 0))
        subt = eur(ln.get("subtotal", 0))
        data.append(
            [
                Paragraph(prod or "-", styles["Body"]),
                Paragraph(str(cant), styles["Body"]),
                Paragraph(punit, styles["Body"]),
                Paragraph(subt, styles["Body"]),
            ]
        )

    col_widths = [doc.width * 0.52, doc.width * 0.16, doc.width * 0.16, doc.width * 0.16]
    tbl = Table(data, colWidths=col_widths, repeatRows=1)
    table_style = [
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F3F4F6")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#111827")),
        ("LINEBELOW", (0, 0), (-1, 0), 1, colors.HexColor("#E5E7EB")),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#EEF2F7")),
        ("ALIGN", (1, 1), (-1, -1), "RIGHT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]
    for r in range(1, len(data)):
        if r % 2 == 0:
            table_style.append(("BACKGROUND", (0, r), (-1, r), colors.HexColor("#FAFAFA")))
    tbl.setStyle(TableStyle(table_style))

    story.append(tbl)
    story.append(Spacer(1, 12))

    # Total final
    total_tbl = Table(
        [[Paragraph("TOTAL", styles["Label"]), Paragraph(f"<b>{eur(total)}</b>", styles["Body"])]],
        colWidths=[doc.width * 0.80, doc.width * 0.20],
    )
    total_tbl.setStyle(
        TableStyle(
            [
                ("ALIGN", (0, 0), (-1, -1), "RIGHT"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LINEABOVE", (0, 0), (-1, -1), 1, colors.HexColor("#E5E7EB")),
                ("TOPPADDING", (0, 0), (-1, -1), 10),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ]
        )
    )
    story.append(total_tbl)

    # Observaciones
    descripcion = _safe(getattr(albaran, "descripcion", ""))
    if descripcion:
        story.append(Spacer(1, 10))
        obs_tbl = Table(
            [[Paragraph("<b>Observaciones</b>", styles["Body"])], [Paragraph(descripcion, styles["Body"])]],
            colWidths=[doc.width],
        )
        obs_tbl.setStyle(
            TableStyle(
                [
                    ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#FED7AA")),
                    ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#FFF7ED")),
                    ("LEFTPADDING", (0, 0), (-1, -1), 10),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                    ("TOPPADDING", (0, 0), (-1, -1), 8),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ]
            )
        )
        story.append(obs_tbl)

    # Header/footer en cada página
    tienda_nombre = "Tienda"  # ✅ nombre de la tienda por ahora
    right_text = f"#{albaran_id} · {fecha}"

    doc.build(
        story,
        onFirstPage=lambda canv, d: _build_header_footer(canv, d, tienda_nombre, right_text),
        onLaterPages=lambda canv, d: _build_header_footer(canv, d, tienda_nombre, right_text),
    )

    pdf = buffer.getvalue()
    buffer.close()

    log.info("[pdf] PDF generado (%d bytes)", len(pdf))
    return pdf
