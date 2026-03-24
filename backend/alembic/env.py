# ruff: noqa: E402
"""
Alembic environment for FurniGest.

- DATABASE_URL is read from the environment variable (same as the app).
- All SQLAlchemy models are imported so that Base.metadata is complete
  before autogenerate or upgrade runs.

E402 is suppressed because Alembic's env.py requires initialising
`context.config` before the app models can be safely imported.
"""

import os
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from alembic import context

# ── Logging ───────────────────────────────────────────────────────────────────
config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# ── Database URL (from environment, same default as database.py) ──────────────
DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql://postgres:root@localhost:5432/TFG"
)

# ── Models ─────────────────────────────────────────────────────────────────────
# Import all entity modules so that Base.metadata is populated.
from backend.app.database import Base  # noqa: E402

import backend.app.entidades.albaran  # noqa: F401
import backend.app.entidades.albaran_ruta  # noqa: F401
import backend.app.entidades.cliente  # noqa: F401
import backend.app.entidades.linea_albaran  # noqa: F401
import backend.app.entidades.movimiento  # noqa: F401
import backend.app.entidades.producto  # noqa: F401
import backend.app.entidades.proveedor  # noqa: F401
import backend.app.entidades.stripe_checkout  # noqa: F401
import backend.app.entidades.usuario  # noqa: F401
import backend.app.entidades.configuracion  # noqa: F401
import backend.app.entidades.incidencia  # noqa: F401

target_metadata = Base.metadata


# ── Migration helpers ──────────────────────────────────────────────────────────


def run_migrations_offline() -> None:
    """Run migrations without a live DB connection (SQL script output)."""
    context.configure(
        url=DATABASE_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations against a live DB connection."""
    connectable = engine_from_config(
        {"sqlalchemy.url": DATABASE_URL},
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
