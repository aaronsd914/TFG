# backend/app/utils/emailer.py
import smtplib, ssl, logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders

from backend.app.settings_email import (
    EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASSWORD, EMAIL_FROM, EMAIL_SENDER_NAME
)

log = logging.getLogger("emailer")

def send_email_with_pdf(to_email: str, subject: str, html_body: str, pdf_bytes: bytes, pdf_filename: str):
    log.info("[emailer] Preparando email → to=%s subject=%s host=%s port=%s user=%s",
             to_email, subject, EMAIL_HOST, EMAIL_PORT, EMAIL_USER)

    msg = MIMEMultipart("mixed")
    msg["From"] = f"{EMAIL_SENDER_NAME} <{EMAIL_FROM}>"
    msg["To"] = to_email
    msg["Subject"] = subject

    # Alternativa HTML
    alt = MIMEMultipart("alternative")
    alt.attach(MIMEText(html_body, "html", "utf-8"))
    msg.attach(alt)

    # PDF adjunto
    if pdf_bytes:
        part = MIMEBase('application', 'pdf')
        part.set_payload(pdf_bytes)
        encoders.encode_base64(part)
        part.add_header('Content-Disposition', f'attachment; filename="{pdf_filename}"')
        msg.attach(part)
        log.debug("[emailer] PDF adjunto: %s (%d bytes)", pdf_filename, len(pdf_bytes))
    else:
        log.warning("[emailer] pdf_bytes es None: se enviará sin adjunto")

    context = ssl.create_default_context()
    try:
        with smtplib.SMTP(EMAIL_HOST, EMAIL_PORT, timeout=30) as smtp:
            smtp.set_debuglevel(1)  # ← imprime diálogo SMTP en la consola
            log.info("[emailer] Conectando a SMTP...")
            smtp.starttls(context=context)
            log.info("[emailer] TLS OK. Autenticando como %s ...", EMAIL_USER)
            smtp.login(EMAIL_USER, EMAIL_PASSWORD)
            log.info("[emailer] Login OK. Enviando mensaje...")
            smtp.send_message(msg)
            log.info("[emailer] Email enviado correctamente a %s", to_email)
    except Exception as e:
        log.exception("[emailer] Error enviando el email: %s", e)
        raise
