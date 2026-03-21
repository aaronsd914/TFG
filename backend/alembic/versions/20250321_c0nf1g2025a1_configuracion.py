"""add configuracion table

Revision ID: c0nf1g2025a1
Revises: a1b2c3d4e5f6
Create Date: 2025-03-21 00:00:00.000000

Crea la tabla de configuración clave-valor para FurniGest.
"""

from alembic import op
import sqlalchemy as sa

revision = "c0nf1g2025a1"
down_revision = "a1b2c3d4e5f6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "configuracion",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("key", sa.String(), nullable=False),
        sa.Column("value", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("key"),
    )
    op.create_index(op.f("ix_configuracion_id"), "configuracion", ["id"], unique=False)
    op.create_index(op.f("ix_configuracion_key"), "configuracion", ["key"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_configuracion_key"), table_name="configuracion")
    op.drop_index(op.f("ix_configuracion_id"), table_name="configuracion")
    op.drop_table("configuracion")
