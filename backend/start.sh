#!/bin/bash
# Railway startup script
# Generates Python config files from environment variables, then starts the server.

set -e

echo ">>> Generating config files from environment variables..."

cat > backend/app/settings_email.py << EOF
EMAIL_HOST = "${EMAIL_HOST}"
EMAIL_PORT = ${EMAIL_PORT:-587}
EMAIL_USER = "${EMAIL_USER}"
EMAIL_PASSWORD = "${EMAIL_PASSWORD}"
EMAIL_FROM = "${EMAIL_FROM}"
EMAIL_SENDER_NAME = "${EMAIL_SENDER_NAME:-FurniGest}"
EOF

cat > backend/app/ia_settings.py << EOF
GROQ_API_KEY = "${GROQ_API_KEY}"
GROQ_MODEL = "${GROQ_MODEL:-llama-3.1-8b-instant}"
GROQ_BASE_URL = "${GROQ_BASE_URL:-https://api.groq.com/openai/v1}"
REQUEST_TIMEOUT = ${REQUEST_TIMEOUT:-60}
EOF

cat > backend/app/stripe_config.py << EOF
STRIPE_SECRET_KEY = "${STRIPE_SECRET_KEY}"
STRIPE_PUBLISHABLE_KEY = "${STRIPE_PUBLISHABLE_KEY}"
STRIPE_SUCCESS_URL = "${STRIPE_SUCCESS_URL}"
STRIPE_CANCEL_URL = "${STRIPE_CANCEL_URL}"
STRIPE_CURRENCY = "${STRIPE_CURRENCY:-eur}"
EOF

cat > backend/app/stripe_settings.py << EOF
STRIPE_SECRET_KEY = "${STRIPE_SECRET_KEY}"
STRIPE_PUBLISHABLE_KEY = "${STRIPE_PUBLISHABLE_KEY}"
STRIPE_SUCCESS_URL = "${STRIPE_SUCCESS_URL}"
STRIPE_CANCEL_URL = "${STRIPE_CANCEL_URL}"
STRIPE_CURRENCY = "${STRIPE_CURRENCY:-eur}"
EOF

cat > backend/app/bank_settings.py << EOF
CAIXA_CLIENT_ID = "${CAIXA_CLIENT_ID}"
CAIXA_CLIENT_SECRET = "${CAIXA_CLIENT_SECRET}"
HUB_OAUTH_BASE = "${HUB_OAUTH_BASE}"
EOF

echo ">>> Config files generated. Starting server..."

exec uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
