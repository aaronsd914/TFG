#!/usr/bin/env bash
# Crea ficheros de configuración vacíos para que el backend arranque en CI.
set -euo pipefail

echo 'EMAIL_HOST=""; EMAIL_PORT=587; EMAIL_USER=""; EMAIL_PASSWORD=""; EMAIL_FROM="test@test.com"; EMAIL_SENDER_NAME="Test"; RESEND_API_KEY=""; RESEND_FROM=""' \
  > backend/app/settings_email.py

echo 'GROQ_API_KEY=""; GROQ_MODEL="llama-3.1-8b-instant"; GROQ_BASE_URL="https://api.groq.com/openai/v1"; REQUEST_TIMEOUT=60' \
  > backend/app/ia_settings.py

echo 'STRIPE_SECRET_KEY=""; STRIPE_PUBLISHABLE_KEY=""; STRIPE_SUCCESS_URL=""; STRIPE_CANCEL_URL=""; STRIPE_CURRENCY="eur"' \
  > backend/app/stripe_config.py

echo 'STRIPE_SECRET_KEY=""; STRIPE_PUBLISHABLE_KEY=""; STRIPE_SUCCESS_URL=""; STRIPE_CANCEL_URL=""; STRIPE_CURRENCY="eur"' \
  > backend/app/stripe_settings.py

echo 'CAIXA_CLIENT_ID=""; CAIXA_CLIENT_SECRET=""; CAIXA_REDIRECT_URI=""; HUB_OAUTH_BASE=""; HUB_API_BASE=""; ASPSP_CODE="2100"; REQUEST_TIMEOUT=30; CAIXA_ENV="sandbox"; DEMO=True' \
  > backend/app/bank_settings.py
