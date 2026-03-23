"""
resumen_semanal.py — Genera y envía el resumen periódico de actividad.

El APScheduler lo invoca cada minuto. La función comprueba si la hora
actual coincide con `resumen_hora_envio` (Europe/Madrid) y si han
transcurrido `resumen_intervalo_dias` días desde el último envío.
"""

import logging
import re
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session

from backend.app.database import SessionLocal
from backend.app.entidades.movimiento import MovementDB
from backend.app.entidades.albaran import DeliveryNoteDB
from backend.app.entidades.configuracion import ConfigDB
from backend.app.utils.groq_llm import groq_chat
from backend.app.utils.emailer import send_email_simple

log = logging.getLogger("resumen_semanal")


def _md_to_html(text: str) -> str:
    """Convert minimal markdown (bold, italic, line breaks) to inline HTML for emails."""
    # Escape HTML entities first
    text = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    # **bold** → <strong>bold</strong>
    text = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", text)
    # *italic* → <em>italic</em>
    text = re.sub(r"\*(.+?)\*", r"<em>\1</em>", text)
    # Numbered list items (1) ... → paragraph with bold number
    text = re.sub(r"(?m)^(\d+)\)\s+", r"<br><strong>\1)</strong> ", text)
    # Double newlines → paragraph break
    text = re.sub(r"\n{2,}", "<br><br>", text)
    # Single newline → space
    text = text.replace("\n", " ")
    return text.strip()


_DEFAULTS = {
    "resumen_intervalo_dias": "7",
    "resumen_email_destino": "",
    "resumen_ultima_vez": "",
    "resumen_hora_envio": "08:30",
    "tienda_nombre": "FurniGest",
}


def _get(db: Session, key: str) -> str:
    row = db.query(ConfigDB).filter(ConfigDB.key == key).first()
    return row.value if row and row.value else _DEFAULTS.get(key, "")


def _set(db: Session, key: str, value: str) -> None:
    row = db.query(ConfigDB).filter(ConfigDB.key == key).first()
    if row:
        row.value = value
    else:
        db.add(ConfigDB(key=key, value=value))
    db.commit()


def job_resumen_semanal() -> None:
    """Entry point invocado por APScheduler (cada minuto)."""
    db = SessionLocal()
    try:
        hora_envio = _get(db, "resumen_hora_envio") or "08:30"
        now_hhmm = datetime.now(tz=ZoneInfo("Europe/Madrid")).strftime("%H:%M")
        if now_hhmm != hora_envio:
            return
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
    last_time_str = _get(db, "resumen_ultima_vez")
    today = date.today()

    if last_time_str:
        try:
            last = date.fromisoformat(last_time_str)
            days_since = (today - last).days
            if days_since < intervalo:
                log.info(
                    "[resumen] Aun no toca (%d/%d dias). Omitido.",
                    days_since,
                    intervalo,
                )
                return
        except ValueError:
            pass

    from_date = today - timedelta(days=intervalo)
    movements = db.query(MovementDB).filter(MovementDB.date >= from_date).all()
    delivery_notes = (
        db.query(DeliveryNoteDB).filter(DeliveryNoteDB.date >= from_date).all()
    )

    income = sum(float(m.amount or 0) for m in movements if m.type == "INGRESO")
    expenses = sum(float(m.amount or 0) for m in movements if m.type == "EGRESO")
    balance = income - expenses
    delivery_note_count = len(delivery_notes)
    total_revenue = sum(float(a.total or 0) for a in delivery_notes)
    store_name = _get(db, "tienda_nombre") or "FurniGest"

    data_text = (
        f"Periodo: {from_date.strftime('%d/%m/%Y')} - {today.strftime('%d/%m/%Y')}\n"
        f"Ingresos: {income:.2f} EUR\n"
        f"Gastos: {expenses:.2f} EUR\n"
        f"Balance neto: {balance:.2f} EUR\n"
        f"Albaranes emitidos: {delivery_note_count}\n"
        f"Valor total ventas: {total_revenue:.2f} EUR\n"
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
                        f"Analiza la actividad de los ultimos {intervalo} dias de la tienda {store_name}:\n\n"
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
        store_name,
        from_date,
        today,
        income,
        expenses,
        balance,
        delivery_note_count,
        total_revenue,
        insight,
        intervalo,
        db=db,
    )
    subject = f"Resumen {store_name} - {from_date.strftime('%d/%m')}-{today.strftime('%d/%m/%Y')}"
    send_email_simple(email_destino, subject, html)

    _set(db, "resumen_ultima_vez", today.isoformat())
    log.info("[resumen] Resumen enviado a %s", email_destino)


def _next_month_label(ref: date) -> str:
    """Return YYYY-MM for the month after ref."""
    m = ref.month + 1
    y = ref.year
    if m > 12:
        m = 1
        y += 1
    return f"{y:04d}-{m:02d}"


def _eur(n: float) -> str:
    return f"{n:,.2f} €".replace(",", "X").replace(".", ",").replace("X", ".")


def _build_html(
    store_name,
    from_date,
    until_date,
    income,
    expenses,
    balance,
    delivery_note_count,
    total_revenue,
    insight,
    intervalo,
    db=None,
) -> str:
    bal_color = "#16a34a" if balance >= 0 else "#dc2626"
    bal_sign = "+" if balance >= 0 else ""

    # Prediction block (next-month forecast)
    prediction_html = ""
    if db is not None:
        try:
            from backend.app.api.analytics import monthly_sales, _holt_forecast  # noqa: PLC0415

            hist_from = from_date - timedelta(days=365)
            monthly = monthly_sales(db, hist_from, until_date)
            revenues = [m["revenue"] for m in monthly]
            if len(revenues) >= 2:
                forecasts, lower_80, upper_80 = _holt_forecast(revenues, 1)
                next_month = _next_month_label(until_date)
                prediction_html = f"""
      <tr>
        <td style="background:#ffffff;padding:0 24px 16px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
          <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:14px 16px;">
            <div style="font-size:12px;font-weight:700;color:#15803d;margin-bottom:8px;">📈 Previsión próximo mes ({next_month})</div>
            <div style="font-size:14px;color:#14532d;line-height:1.6;">
              Ingresos estimados: <strong>{_eur(forecasts[0])}</strong><br>
              Intervalo 80&#37;: {_eur(lower_80[0])} – {_eur(upper_80[0])}<br>
              <span style="font-size:11px;color:#6b7280;">Modelo: Suavizado exponencial doble (Holt)</span>
            </div>
          </div>
        </td>
      </tr>"""
        except Exception as exc:
            log.warning("[resumen] No se pudo generar previsión: %s", exc)

    insight_html = ""
    if insight:
        insight_as_html = _md_to_html(insight)
        insight_html = f"""
      <tr>
        <td style="background:#ffffff;padding:0 24px 16px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
          <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:14px 16px;">
            <div style="font-size:12px;font-weight:700;color:#0369a1;margin-bottom:8px;">💡 Análisis IA</div>
            <div style="font-size:14px;color:#1e3a5f;line-height:1.6;">{insight_as_html}</div>
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
          <div style="color:#fff;font-size:17px;font-weight:700;">{store_name}</div>
          <div style="color:#94a3b8;font-size:12px;margin-top:4px;">
            Resumen de actividad · últimos {intervalo} días
          </div>
          <div style="color:#64748b;font-size:11px;margin-top:2px;">
            {from_date.strftime("%d/%m/%Y")} – {until_date.strftime("%d/%m/%Y")}
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
                {_eur(income)}
              </td>
            </tr>
            <tr>
              <td style="color:#6b7280;border-bottom:1px solid #f3f4f6;">📉 Gastos</td>
              <td align="right" style="font-weight:700;color:#dc2626;border-bottom:1px solid #f3f4f6;">
                {_eur(expenses)}
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
                {delivery_note_count}
              </td>
            </tr>
            <tr style="background:#f9fafb;">
              <td style="color:#6b7280;">💼 Valor total ventas</td>
              <td align="right" style="font-weight:700;color:#111827;">{_eur(total_revenue)}</td>
            </tr>
          </table>
        </td>
      </tr>
      {prediction_html}
      {insight_html}
      <tr>
        <td style="background:#ffffff;padding:12px 24px 20px;border:1px solid #e5e7eb;
          border-top:0;border-radius:0 0 14px 14px;text-align:center;">
          <div style="font-size:11px;color:#9ca3af;">
            Generado automáticamente por {store_name} · FurniGest
          </div>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body></html>"""
