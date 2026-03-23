"""Incidencias migration
Revision ID: inc1d3nc1as01
Revises: c0nf1g2025a1
Create Date: 2026-03-23
"""
from alembic import op
import sqlalchemy as sa

revision = "inc1d3nc1as01"
down_revision = "c0nf1g2025a1"


def upgrade() -> None:
    op.create_table(
        "incidencias",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("albaran_id", sa.Integer(), nullable=False),
        sa.Column("descripcion", sa.String(), nullable=False),
        sa.Column("fecha_creacion", sa.Date(), nullable=False),
        sa.ForeignKeyConstraint(["albaran_id"], ["albaranes.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_incidencias_id"), "incidencias", ["id"], unique=False)
    op.create_index(
        op.f("ix_incidencias_albaran_id"), "incidencias", ["albaran_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_incidencias_albaran_id"), table_name="incidencias")
    op.drop_index(op.f("ix_incidencias_id"), table_name="incidencias")
    op.drop_table("incidencias")
