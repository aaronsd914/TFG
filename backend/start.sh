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
RESEND_API_KEY = "${RESEND_API_KEY}"
RESEND_FROM = "${RESEND_FROM}"
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

echo ">>> Config files generated. Running database migrations..."

# If the DB already has tables (created before Alembic was added) but has no
# alembic_version table, stamp it as head so the initial migration is skipped.
python3 - <<'PYEOF'
import os, sys
try:
    import sqlalchemy as sa
    engine = sa.create_engine(os.environ["DATABASE_URL"])
    with engine.connect() as conn:
        has_alembic = conn.execute(sa.text(
            "SELECT to_regclass('public.alembic_version')"
        )).scalar() is not None
        has_tables = conn.execute(sa.text(
            "SELECT count(*) FROM information_schema.tables "
            "WHERE table_schema='public' AND table_name != 'alembic_version'"
        )).scalar() > 0
        if has_tables and not has_alembic:
            conn.execute(sa.text(
                "CREATE TABLE IF NOT EXISTS alembic_version "
                "(version_num VARCHAR(32) NOT NULL, PRIMARY KEY (version_num))"
            ))
            conn.execute(sa.text(
                "INSERT INTO alembic_version VALUES ('a1b2c3d4e5f6') "
                "ON CONFLICT DO NOTHING"
            ))
            conn.commit()
            print(">>> Auto-stamped existing DB as a1b2c3d4e5f6 (skipping initial migration)")
except Exception as e:
    print(f">>> Warning: auto-stamp check failed: {e}", file=sys.stderr)
PYEOF

alembic upgrade head

echo ">>> Migrations done. Starting server..."

exec uvicorn backend.app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
