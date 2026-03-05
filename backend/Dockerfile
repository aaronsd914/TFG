# ── Backend — FastAPI ──────────────────────────────────────────────────────────
FROM python:3.12-slim

WORKDIR /app

# Dependencias del sistema (para psycopg2, reportlab, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Instalar dependencias Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el código
COPY . .

# Puerto que expone uvicorn (Railway inyecta $PORT dinámicamente)
EXPOSE 8000

# Arrancar la app
CMD ["bash", "backend/start.sh"]
