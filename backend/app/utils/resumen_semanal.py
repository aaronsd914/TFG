"""
resumen_semanal.py — Genera y envía el resumen periódico de actividad.

El APScheduler lo invoca cada día a las 08:30. La función comprueba si
han transcurrido `resumen_intervalo_dias` días desde el último envío; si
no toca, retorna sin hacer nada.
"""
import logging
from datetime import date, timedelta

from sqlalchemy.orm import Session

from backend.app.database import SessionLocal
from backend.app.entidades.movimiento import MovimientoDB
from backend.app.entidades.albaran import AlbaranDB
from backend.app.entidades.configuracion import ConfiguracionDB
from backend.app.utils.groq_llm import groq_chat
from backend.app.utils.emailer import send_email_simple

log = logging.getLogger("resumen_semanal")

_DEFAULTS = {
    "resumen_intervalo_dias": "7",
    "resumen_email_destino": "",
    "resumen_ultima_vez": "",
    "tienda_nombre": "FurniGest",
}


def _get(db: Session, key: str) -> str:
    row = db.query(ConfiguracionDB).filter(ConfiguracionDB.key == key).first()
    return row.value if row and row.value else _DEFAULTS.get(key, "")


def _set(db: Session, key: str, value: str) -> None:
    row = db.query(ConfiguracionDB).filter(ConfiguracionDB.key == key).first()
    if row:
        row.value = value
    else:
        db.add(ConfiguracionDB(key=key, value=value))
    db.commit()


def job_resumen_semanal() -> None:
    """Entry point invocado por APScheduler (hilo de background)."""
    db = SessionLocal()
    try:
        _run(db)
    except Exception as exc:
        log.exception("[resumen] Error en job_resumen_semanal: %s", exc)
    finally:
        db.close()


def _run(db: Session) -> None:
    email_destino = _get(db, "resumen_email_destino")
    if not email_destino:
        log.info("[resumen] Sin email configurado — omitido.")
        return

    intervalo = max(1, int(_get(db, "resumen_intervalo_dias") or "7"))
    ultima_vez_str = _get(db, "resumen_ultima_vez")
    hoy = date.today()

    if ultima_vez_str:
        try:
            last = date.fromisoformat(ultima_vez_str)
            dias_desde = (hoy - last).days
            if dias_desde < intervalo:
                log.info(
                    "[resumen] Aún no toca (%d/%d días). Omitido.", dias_desde, intervalo
                )
                return
        except ValueError:
            pass

    desde = hoy - timedelta(days=intervalo)
    movs = db.query(MovimientoDB).filter(MovimientoDB.fecha >= desde).all()
    albs = db.query(AlbaranDB).filter(AlbaranDB.fecha >= desde).all()

    ingresos = sum(float(m.cantidad or 0) for m in movs if m.tipo == "INGRESO")
    egresos = sum(float(m.cantidad or 0) for m in movs if m.tipo == "EGRESO")
    balance = ingresos - egresos
    n_albs = len(albs)
    total_ventas = sum(float(a.total or 0) for a in albs)
    tienda = _get(db, "tienda_nombre") or "FurniGest"

    data_text = (
        f"Período: {desde.strftime('%d/%m/%Y')} – {hoy.strftime('%d/%m/%Y')}\n"
        f"Ingresos: {ingresos:.2f} €\n"
        f"Gastos: {egresos:.2f} €\n"
        f"Balance neto: {balance:.2f} €\n"
        f"Albaranes emitidos: {n_albs}\n"
        f"Valor total ventas: {total_ventas:.2f} €\n"
    )

    insight = ""
    try:
        insight = groq_chat(
            [
                {
                    "role": "system",
                    "content": (
                        "Eres un asistente de análisis empresarial para una tienda de muebles. "
                        "Responde siempre en español. Sé conciso."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Analiza la actividad de los últimos {intervalo} días de la tienda {tienda}:\n\n"
                        f"{data_text}\n"
                        "Proporciona: 1) Valoración del rendimiento financiero, "
                        "2) Un punto clave positivo, 3) Un área de mejora. "
                        "Máximo 120 palabras."
                    ),
                },
            ]
        )
    except Exception as exc:
        log.warning("[resumen] No se pudo generar insight IA: %s", exc)

    html = _build_html(
        tienda, desde, hoy, ingresos, egresos, balance, n_albs, total_ventas, insight, intervalo
    )
    subject = f"📊 Resumen {tienda} · {desde.strftime('%d/%m')}–{hoy.strftime('%d/%m/%Y')}"
    send_email_simple(email_destino, subject, html)

    _set(db, "resumen_ultima_vez", hoy.isoformat())
    log.info("[resumen] Resumen enviado a %s", email_destino)


def _eur(n: float) -> str:
    return f"{n:,.2f} €".replace(",", "X").replace(".", ",").replace("X", ".")


def _build_html(
    tienda, desde, hasta, ingresos, egresos, balance, n_albs, total_ventas, insight, intervalo
) -> str:
    bal_color = "#16a34a" if balance >= 0 else "#dc2626"
    bal_sign = "+" if balance >= 0 else ""

    insight_html = ""
    if insight:
        insight_html = f"""
      <tr>
        <td style="background:#ffffff;padding:0 24px 16px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
          <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:14px 16px;">
            <div style="font-size:12px;font-weight:700;color:#0369a1;margin-bottom:8px;">💡 Análisis IA</div>
            <div style="font-size:14px;color:#1e3a5f;line-height:1.6;">{insight}</div>
          </div>
        </td>
      </tr>"""

    return f"""<!doctype html>
<html lang="es">
<body style="margin:0;padding:0;background:#f6f7fb;font-family:system-ui,-apple-system,sans-serif;color:#111;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
  style="background:#f6f7fb;padding:24px 12px;">
  <tr><td align="center">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600"
      style="max-width:600px;width:100%;">
      <tr>
        <td style="padding:18px 24px;background:#111827;border-radius:14px 14px 0 0;">
          <div style="color:#fff;font-size:17px;font-weight:700;">{tienda}</div>
          <div style="color:#94a3b8;font-size:12px;margin-top:4px;">
            Resumen de actividad · últimos {intervalo} días
          </div>
          <div style="color:#64748b;font-size:11px;margin-top:2px;">
            {desde.strftime('%d/%m/%Y')} – {hasta.strftime('%d/%m/%Y')}
          </div>
        </td>
      </tr>
      <tr>
        <td style="background:#ffffff;padding:20px 24px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
          <table cellpadding="8" cellspacing="0" border="0" width="100%"
            style="border-collapse:collapse;font-size:14px;">
            <tr>
              <td style="color:#6b7280;border-bottom:1px solid #f3f4f6;">💰 Ingresos</td>
              <td align="right" style="font-weight:700;color:#16a34a;border-bottom:1px solid #f3f4f6;">
                {_eur(ingresos)}
              </td>
            </tr>
            <tr>
              <td style="color:#6b7280;border-bottom:1px solid #f3f4f6;">📉 Gastos</td>
              <td align="right" style="font-weight:700;color:#dc2626;border-bottom:1px solid #f3f4f6;">
                {_eur(egresos)}
              </td>
            </tr>
            <tr style="background:#f9fafb;">
              <td style="font-weight:700;color:#111827;border-bottom:1px solid #f3f4f6;">⚖️ Balance neto</td>
              <td align="right"
                style="font-size:16px;font-weight:800;color:{bal_color};border-bottom:1px solid #f3f4f6;">
                {bal_sign}{_eur(balance)}
              </td>
            </tr>
            <tr>
              <td style="color:#6b7280;border-bottom:1px solid #f3f4f6;">🧾 Albaranes emitidos</td>
              <td align="right" style="font-weight:700;color:#111827;border-bottom:1px solid #f3f4f6;">
                {n_albs}
              </td>
            </tr>
            <tr style="background:#f9fafb;">
              <td style="color:#6b7280;">💼 Valor total ventas</td>
              <td align="right" style="font-weight:700;color:#111827;">{_eur(total_ventas)}</td>
            </tr>
          </table>
        </td>
      </tr>
      {insight_html}
      <tr>
        <td style="background:#ffffff;padding:12px 24px 20px;border:1px solid #e5e7eb;
          border-top:0;border-radius:0 0 14px 14px;text-align:center;">
          <div style="font-size:11px;color:#9ca3af;">
            Generado automáticamente por {tienda} · FurniGest
          </div>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body></html>"""
