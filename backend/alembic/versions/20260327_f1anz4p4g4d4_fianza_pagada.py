"""add fianza_pagada to albaranes
Revision ID: f1anz4p4g4d4
Revises: inc1d3nc1as01
Create Date: 2026-03-27
"""

from alembic import op
import sqlalchemy as sa

revision = "f1anz4p4g4d4"
down_revision = "inc1d3nc1as01"


def upgrade() -> None:
    op.add_column(
        "albaranes",
        sa.Column("fianza_pagada", sa.Float(), nullable=True, server_default="0"),
    )


def downgrade() -> None:
    op.drop_column("albaranes", "fianza_pagada")
