# backend/app/settings_email.py
import os

EMAIL_HOST = os.getenv("EMAIL_HOST", "smtp.office365.com")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_USER = os.getenv("EMAIL_USER", "aaronsv2003@hotmail.com")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD", "qjckwnpwjbcuujju")
EMAIL_FROM = os.getenv("EMAIL_FROM", EMAIL_USER)
EMAIL_SENDER_NAME = os.getenv("EMAIL_SENDER_NAME", "Financias")
