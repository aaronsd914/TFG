import logging
from io import BytesIO
from datetime import date, datetime

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak


log = logging.getLogger("tendencias_pdf")


def _safe(s):
    if s is None:
        return ""
    return str(s)


def eur(n: float) -> str:
    try:
        return f"{float(n):.2f} €"
    except Exception:
        return "0.00 €"


def fmt_date(value) -> str:
    if value is None:
        return ""
    if isinstance(value, (datetime, date)):
        return value.strftime("%d/%m/%Y")
    return _safe(value)


def _header_footer(canvas, doc, tienda_nombre: str, right_text: str):
    canvas.saveState()

    header_y = doc.height + doc.topMargin - 16

    canvas.setStrokeColor(colors.HexColor("#E5E7EB"))
    canvas.setLineWidth(1)
    canvas.line(doc.leftMargin, header_y - 8, doc.pagesize[0] - doc.rightMargin, header_y - 8)

    canvas.setFillColor(colors.HexColor("#111827"))
    canvas.setFont("Helvetica-Bold", 11)
    canvas.drawString(doc.leftMargin, header_y, tienda_nombre)

    canvas.setFillColor(colors.HexColor("#6B7280"))
    canvas.setFont("Helvetica", 9)
    canvas.drawRightString(doc.pagesize[0] - doc.rightMargin, header_y, right_text)

    canvas.setStrokeColor(colors.HexColor("#E5E7EB"))
    canvas.setLineWidth(1)
    canvas.line(doc.leftMargin, doc.bottomMargin - 8, doc.pagesize[0] - doc.rightMargin, doc.bottomMargin - 8)

    canvas.setFillColor(colors.HexColor("#6B7280"))
    canvas.setFont("Helvetica", 8)
    canvas.drawString(doc.leftMargin, doc.bottomMargin - 18, "Documento generado automáticamente.")
    canvas.drawRightString(doc.pagesize[0] - doc.rightMargin, doc.bottomMargin - 18, f"Página {canvas.getPageNumber()}")

    canvas.restoreState()


def generar_pdf_tendencias(
    *,
    tienda_nombre: str,
    rango_actual: dict,
    metrics_actual: dict,
    ai_report: str,
    rango_prev: dict | None = None,
    metrics_prev: dict | None = None,
    compare_delta: dict | None = None,
    ai_compare_report: str | None = None,
):
    """Genera un PDF de tendencias con:
    - KPIs
    - Ventas por día
    - Top productos
    - RFM
    - Co-compras
    - (opcional) Comparativa con periodo anterior + deltas
    - Informe IA (detallado)
    """

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=26 * mm,
        bottomMargin=18 * mm,
        title="Tendencias",
        author=tienda_nombre,
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
            name="H2",
            parent=styles["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=12,
            leading=14,
            textColor=colors.HexColor("#111827"),
            spaceBefore=10,
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

    story = []
    story.append(Spacer(1, 10))
    story.append(Paragraph("Informe de Tendencias", styles["H1"]))
    story.append(
        Paragraph(
            f"Rango: {_safe(rango_actual.get('from'))} → {_safe(rango_actual.get('to'))}",
            styles["Muted"],
        )
    )
    story.append(Spacer(1, 10))

    # KPIs
    avg = metrics_actual.get("averages", {})
    kpi_tbl = Table(
        [
            ["Ingresos", "Pedidos", "Ticket medio (AOV)", "Gasto medio/cliente"],
            [
                eur(avg.get("revenue", 0)),
                _safe(avg.get("orders", 0)),
                eur(avg.get("aov", 0)),
                eur(avg.get("avg_per_customer", 0)),
            ],
        ],
        colWidths=[(doc.width / 4.0)] * 4,
    )
    kpi_tbl.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F9FAFB")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#374151")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, 0), 9),
                ("GRID", (0, 0), (-1, -1), 1, colors.HexColor("#E5E7EB")),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("PADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    story.append(kpi_tbl)

    # Comparativa
    if metrics_prev and rango_prev:
        story.append(Spacer(1, 8))
        story.append(Paragraph("Comparativa", styles["H2"]))
        story.append(
            Paragraph(
                f"Periodo anterior: {_safe(rango_prev.get('from'))} → {_safe(rango_prev.get('to'))}",
                styles["Muted"],
            )
        )
        delta = compare_delta or {}
        comp_tbl = Table(
            [
                ["Métrica", "Actual", "Anterior", "Δ", "%"],
                [
                    "Ingresos",
                    eur(delta.get("revenue", {}).get("current", 0)),
                    eur(delta.get("revenue", {}).get("previous", 0)),
                    eur(delta.get("revenue", {}).get("diff", 0)),
                    _safe(delta.get("revenue", {}).get("pct", "—")),
                ],
                [
                    "Pedidos",
                    _safe(delta.get("orders", {}).get("current", 0)),
                    _safe(delta.get("orders", {}).get("previous", 0)),
                    _safe(delta.get("orders", {}).get("diff", 0)),
                    _safe(delta.get("orders", {}).get("pct", "—")),
                ],
                [
                    "AOV",
                    eur(delta.get("aov", {}).get("current", 0)),
                    eur(delta.get("aov", {}).get("previous", 0)),
                    eur(delta.get("aov", {}).get("diff", 0)),
                    _safe(delta.get("aov", {}).get("pct", "—")),
                ],
            ],
            colWidths=[doc.width * 0.26, doc.width * 0.18, doc.width * 0.18, doc.width * 0.18, doc.width * 0.20],
        )
        comp_tbl.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F9FAFB")),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("GRID", (0, 0), (-1, -1), 1, colors.HexColor("#E5E7EB")),
                    ("ALIGN", (1, 1), (-1, -1), "RIGHT"),
                    ("PADDING", (0, 0), (-1, -1), 6),
                ]
            )
        )
        story.append(comp_tbl)

        if ai_compare_report:
            story.append(Spacer(1, 6))
            story.append(Paragraph("Lectura de la comparativa (IA)", styles["H2"]))
            for para in _safe(ai_compare_report).split("\n"):
                para = para.strip()
                if not para:
                    continue
                story.append(Paragraph(para, styles["Body"]))

    # Ventas por día (tabla resumida)
    story.append(Paragraph("Ventas por día (resumen)", styles["H2"]))
    sbd = metrics_actual.get("sales_by_day", [])
    sbd_tbl_data = [["Fecha", "Pedidos", "Ingresos"]]
    for row in sbd[-60:]:  # últimas 60 filas para que no sea infinito
        sbd_tbl_data.append([_safe(row.get("date")), _safe(row.get("orders")), eur(row.get("revenue", 0))])
    sbd_tbl = Table(sbd_tbl_data, colWidths=[doc.width * 0.35, doc.width * 0.25, doc.width * 0.40])
    sbd_tbl.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F9FAFB")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("GRID", (0, 0), (-1, -1), 1, colors.HexColor("#E5E7EB")),
                ("ALIGN", (1, 1), (-1, -1), "RIGHT"),
                ("PADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story.append(sbd_tbl)

    # Top productos
    story.append(Paragraph("Top productos", styles["H2"]))
    tp = metrics_actual.get("top_products", [])
    tp_data = [["Producto", "Unidades", "Facturación"]]
    for t in tp[:12]:
        tp_data.append([_safe(t.get("name")), f"{float(t.get('qty') or 0):.0f}", eur(t.get("revenue", 0))])
    tp_tbl = Table(tp_data, colWidths=[doc.width * 0.55, doc.width * 0.15, doc.width * 0.30])
    tp_tbl.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F9FAFB")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("GRID", (0, 0), (-1, -1), 1, colors.HexColor("#E5E7EB")),
                ("ALIGN", (1, 1), (-1, -1), "RIGHT"),
                ("PADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story.append(tp_tbl)

    # RFM
    story.append(Paragraph("Segmentación RFM", styles["H2"]))
    seg = (metrics_actual.get("rfm") or {}).get("summary", {})
    if seg:
        seg_data = [["Segmento", "Clientes"]] + [[_safe(k), _safe(v)] for k, v in seg.items()]
        seg_tbl = Table(seg_data, colWidths=[doc.width * 0.70, doc.width * 0.30])
        seg_tbl.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F9FAFB")),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("GRID", (0, 0), (-1, -1), 1, colors.HexColor("#E5E7EB")),
                    ("ALIGN", (1, 1), (-1, -1), "RIGHT"),
                    ("PADDING", (0, 0), (-1, -1), 5),
                ]
            )
        )
        story.append(seg_tbl)
    else:
        story.append(Paragraph("Sin datos suficientes para segmentar.", styles["Muted"]))

    # Co-compras
    story.append(Paragraph("Co-compras (pares)", styles["H2"]))
    pairs = metrics_actual.get("basket_pairs", [])
    if pairs:
        pairs_data = [["Producto A", "Producto B", "Support", "Confidence", "Lift"]]
        for p in pairs[:12]:
            pairs_data.append(
                [
                    _safe(p.get("a_name")),
                    _safe(p.get("b_name")),
                    _safe(p.get("support")),
                    f"{float(p.get('confidence') or 0):.2f}",
                    f"{float(p.get('lift') or 0):.2f}",
                ]
            )
        pairs_tbl = Table(
            pairs_data,
            colWidths=[doc.width * 0.30, doc.width * 0.30, doc.width * 0.12, doc.width * 0.14, doc.width * 0.14],
        )
        pairs_tbl.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F9FAFB")),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("GRID", (0, 0), (-1, -1), 1, colors.HexColor("#E5E7EB")),
                    ("ALIGN", (2, 1), (-1, -1), "RIGHT"),
                    ("PADDING", (0, 0), (-1, -1), 5),
                ]
            )
        )
        story.append(pairs_tbl)
    else:
        story.append(Paragraph("No hay pares con suficiente soporte.", styles["Muted"]))

    # Informe IA (detallado)
    story.append(PageBreak())
    story.append(Paragraph("Informe detallado (IA)", styles["H1"]))
    story.append(
        Paragraph("Este apartado está generado por la IA a partir de todas las métricas del rango.", styles["Muted"])
    )
    story.append(Spacer(1, 8))
    for para in _safe(ai_report).split("\n"):
        para = para.strip()
        if not para:
            continue
        story.append(Paragraph(para, styles["Body"]))

    right_text = f"Tendencias · {_safe(rango_actual.get('from'))} → {_safe(rango_actual.get('to'))}"
    doc.build(
        story,
        onFirstPage=lambda c, d: _header_footer(c, d, tienda_nombre, right_text),
        onLaterPages=lambda c, d: _header_footer(c, d, tienda_nombre, right_text),
    )

    buffer.seek(0)
    return buffer
