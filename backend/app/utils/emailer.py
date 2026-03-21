# backend/app/utils/emailer.py
import base64
import logging
import smtplib
import ssl
import re
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from email.utils import formatdate, make_msgid

from backend.app.settings_email import (
    EMAIL_HOST,
    EMAIL_PORT,
    EMAIL_USER,
    EMAIL_PASSWORD,
    EMAIL_FROM,
    EMAIL_SENDER_NAME,
    RESEND_API_KEY,
    RESEND_FROM,
)

log = logging.getLogger("emailer")


def _html_to_text(html: str) -> str:
    """Fallback sencillo a texto plano (para clientes de correo que no renderizan HTML)."""
    if not html:
        return ""
    # Quita scripts/styles
    html = re.sub(r"<(script|style)[^>]*>.*?</\1>", "", html, flags=re.S | re.I)
    # Saltos razonables
    html = re.sub(r"</(p|div|br|tr|h1|h2|h3|li)>", "\n", html, flags=re.I)
    # Quita tags
    text = re.sub(r"<[^>]+>", "", html)
    # Entidades mínimas
    text = (
        text.replace("&nbsp;", " ")
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
    )
    # Limpia líneas
    text = "\n".join([ln.strip() for ln in text.splitlines()])
    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    return text


def send_email_simple(to_email: str, subject: str, html_body: str) -> None:
    """Envía un email HTML sin adjunto PDF."""
    log.info("[emailer] Email simple → to=%s subject=%s", to_email, subject)
    if RESEND_API_KEY:
        _send_via_resend(to_email, subject, html_body, None, "")
        return

    msg = MIMEMultipart("mixed")
    msg["From"] = f"{EMAIL_SENDER_NAME} <{EMAIL_FROM}>"
    msg["To"] = to_email
    msg["Subject"] = subject
    msg["Date"] = formatdate(localtime=True)
    msg["Message-ID"] = make_msgid()
    alt = MIMEMultipart("alternative")
    alt.attach(MIMEText(_html_to_text(html_body), "plain", "utf-8"))
    alt.attach(MIMEText(html_body, "html", "utf-8"))
    msg.attach(alt)
    _send_via_smtp(msg, to_email)


def send_email_with_pdf(
    to_email: str, subject: str, html_body: str, pdf_bytes: bytes, pdf_filename: str
):
    log.info(
        "[emailer] Preparando email → to=%s subject=%s host=%s port=%s user=%s",
        to_email,
        subject,
        EMAIL_HOST,
        EMAIL_PORT,
        EMAIL_USER,
    )

    msg = MIMEMultipart("mixed")
    msg["From"] = f"{EMAIL_SENDER_NAME} <{EMAIL_FROM}>"
    msg["To"] = to_email
    msg["Subject"] = subject
    msg["Date"] = formatdate(localtime=True)
    msg["Message-ID"] = make_msgid()
    msg["Reply-To"] = f"{EMAIL_SENDER_NAME} <{EMAIL_FROM}>"

    # Parte alternativa: texto + html
    alt = MIMEMultipart("alternative")

    text_body = _html_to_text(html_body)
    alt.attach(MIMEText(text_body, "plain", "utf-8"))
    alt.attach(MIMEText(html_body, "html", "utf-8"))

    msg.attach(alt)

    # PDF adjunto
    if pdf_bytes:
        part = MIMEBase("application", "pdf")
        part.set_payload(pdf_bytes)
        encoders.encode_base64(part)
        part.add_header("Content-Disposition", f'attachment; filename="{pdf_filename}"')
        msg.attach(part)
        log.debug("[emailer] PDF adjunto: %s (%d bytes)", pdf_filename, len(pdf_bytes))
    else:
        log.warning("[emailer] pdf_bytes es None: se enviará sin adjunto")

    if RESEND_API_KEY:
        _send_via_resend(to_email, subject, html_body, pdf_bytes, pdf_filename)
    else:
        _send_via_smtp(msg, to_email)


def _send_via_resend(
    to_email: str,
    subject: str,
    html_body: str,
    pdf_bytes: bytes | None,
    pdf_filename: str,
):
    """Envía usando la API HTTP de Resend (no usa SMTP — funciona en Railway)."""
    try:
        import resend  # type: ignore
    except ImportError:
        log.error(
            "[emailer] Paquete 'resend' no instalado. Ejecuta: pip install resend"
        )
        raise

    resend.api_key = RESEND_API_KEY
    from_addr = RESEND_FROM or "onboarding@resend.dev"

    params: dict = {
        "from": f"{EMAIL_SENDER_NAME} <{from_addr}>",
        "to": [to_email],
        "subject": subject,
        "html": html_body,
    }

    if pdf_bytes:
        params["attachments"] = [
            {
                "filename": pdf_filename,
                "content": base64.b64encode(pdf_bytes).decode(),
            }
        ]

    try:
        response = resend.Emails.send(params)
        log.info(
            "[emailer] Email enviado via Resend a %s (id=%s)",
            to_email,
            response.get("id"),
        )
    except Exception as e:
        log.exception("[emailer] Error enviando el email via Resend: %s", e)
        raise


def _send_via_smtp(msg: MIMEMultipart, to_email: str):
    """Envía usando SMTP (Gmail por defecto). Para desarrollo local."""
    context = ssl.create_default_context()
    try:
        with smtplib.SMTP(EMAIL_HOST, EMAIL_PORT, timeout=30) as smtp:
            log.info("[emailer] Conectando a SMTP...")
            smtp.ehlo()
            smtp.starttls(context=context)
            smtp.ehlo()
            log.info("[emailer] TLS OK. Autenticando como %s ...", EMAIL_USER)
            smtp.login(EMAIL_USER, EMAIL_PASSWORD)
            log.info("[emailer] Enviando mensaje...")
            smtp.send_message(msg)
            log.info("[emailer] Email enviado correctamente a %s", to_email)
    except Exception as e:
        log.exception("[emailer] Error enviando el email via SMTP: %s", e)
        raise
