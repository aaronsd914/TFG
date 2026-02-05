# backend/app/utils/emailer.py
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
    EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASSWORD, EMAIL_FROM, EMAIL_SENDER_NAME
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
    text = text.replace("&nbsp;", " ").replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")
    # Limpia líneas
    text = "\n".join([ln.strip() for ln in text.splitlines()])
    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    return text


def send_email_with_pdf(to_email: str, subject: str, html_body: str, pdf_bytes: bytes, pdf_filename: str):
    log.info("[emailer] Preparando email → to=%s subject=%s host=%s port=%s user=%s",
             to_email, subject, EMAIL_HOST, EMAIL_PORT, EMAIL_USER)

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

    context = ssl.create_default_context()

    try:
        with smtplib.SMTP(EMAIL_HOST, EMAIL_PORT, timeout=30) as smtp:
            # En producción suele ser mejor NO imprimir el diálogo SMTP
            # (si quieres, puedes activarlo vía logging config)
            # smtp.set_debuglevel(1)

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
        log.exception("[emailer] Error enviando el email: %s", e)
        raise
