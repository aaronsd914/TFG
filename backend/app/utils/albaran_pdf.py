# backend/app/utils/albaran_pdf.py
import logging
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.units import mm
from io import BytesIO

log = logging.getLogger("albaran_pdf")

def eur(n: float) -> str:
    return f"{n:.2f} €"

def generar_pdf_albaran(albaran, cliente, lineas_con_nombre):
    log.info("[pdf] Generando PDF para albarán #%s", getattr(albaran, "id", "?"))
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    y = height - 20*mm

    # Cabecera
    c.setFont("Helvetica-Bold", 14)
    c.drawString(20*mm, y, f"Albarán #{albaran.id}")
    y -= 8*mm
    c.setFont("Helvetica", 10)
    c.drawString(20*mm, y, f"Fecha: {albaran.fecha.isoformat()}")
    y -= 6*mm

    # Cliente
    c.setFont("Helvetica-Bold", 11)
    c.drawString(20*mm, y, "Cliente")
    y -= 6*mm
    c.setFont("Helvetica", 10)
    c.drawString(20*mm, y, f"{cliente.nombre} {cliente.apellidos or ''}".strip())
    y -= 5*mm
    if getattr(cliente, "dni", None):
        c.drawString(20*mm, y, f"DNI: {cliente.dni}")
        y -= 5*mm
    if getattr(cliente, "email", None):
        c.drawString(20*mm, y, f"Email: {cliente.email}")
        y -= 5*mm
    dir_ = " · ".join([x for x in [
        getattr(cliente, "calle", None),
        getattr(cliente, "numero_vivienda", None),
        f"({cliente.piso_portal})" if getattr(cliente, "piso_portal", None) else None,
        getattr(cliente, "codigo_postal", None),
        getattr(cliente, "ciudad", None)
    ] if x])
    if dir_:
        c.drawString(20*mm, y, dir_)
        y -= 6*mm

    y -= 6*mm

    # Tabla
    c.setFont("Helvetica-Bold", 10)
    c.drawString(20*mm, y, "Producto")
    c.drawRightString(140*mm, y, "Cantidad")
    c.drawRightString(170*mm, y, "P. Unitario")
    c.drawRightString(190*mm, y, "Subtotal")
    y -= 5*mm
    c.line(20*mm, y, 190*mm, y)
    y -= 5*mm
    c.setFont("Helvetica", 10)

    total = 0.0
    for ln in lineas_con_nombre:
        if y < 30*mm:
            c.showPage()
            y = height - 20*mm
            c.setFont("Helvetica-Bold", 10)
            c.drawString(20*mm, y, "Producto")
            c.drawRightString(140*mm, y, "Cantidad")
            c.drawRightString(170*mm, y, "P. Unitario")
            c.drawRightString(190*mm, y, "Subtotal")
            y -= 5*mm
            c.line(20*mm, y, 190*mm, y)
            y -= 5*mm
            c.setFont("Helvetica", 10)

        subtotal = ln["subtotal"]
        total += subtotal
        c.drawString(20*mm, y, ln["producto_nombre"])
        c.drawRightString(140*mm, y, str(ln["cantidad"]))
        c.drawRightString(170*mm, y, eur(ln["precio_unitario"]))
        c.drawRightString(190*mm, y, eur(subtotal))
        y -= 6*mm

    # Total
    y -= 4*mm
    c.setFont("Helvetica-Bold", 11)
    c.drawRightString(170*mm, y, "TOTAL")
    c.drawRightString(190*mm, y, eur(total))

    c.showPage()
    c.save()
    pdf = buffer.getvalue()
    buffer.close()
    log.info("[pdf] PDF generado (%d bytes)", len(pdf))
    return pdf
