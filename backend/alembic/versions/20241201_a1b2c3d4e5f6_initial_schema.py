"""initial schema

Revision ID: a1b2c3d4e5f6
Revises:
Create Date: 2024-12-01 00:00:00.000000

Crea todas las tablas del esquema inicial de FurniGest tal y como
quedan definidas por los modelos SQLAlchemy en backend/app/entidades/.
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "a1b2c3d4e5f6"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── proveedores ──────────────────────────────────────────────────────────
    op.create_table(
        "proveedores",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("nombre", sa.String(), nullable=True),
        sa.Column("contacto", sa.String(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_proveedores_id"), "proveedores", ["id"], unique=False)
    op.create_index(
        op.f("ix_proveedores_nombre"), "proveedores", ["nombre"], unique=False
    )

    # ── clientes ─────────────────────────────────────────────────────────────
    op.create_table(
        "clientes",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("nombre", sa.String(), nullable=False),
        sa.Column("apellidos", sa.String(), nullable=False),
        sa.Column("dni", sa.String(), nullable=True),
        sa.Column("email", sa.String(), nullable=True),
        sa.Column("telefono1", sa.String(), nullable=True),
        sa.Column("telefono2", sa.String(), nullable=True),
        sa.Column("calle", sa.String(), nullable=True),
        sa.Column("numero_vivienda", sa.String(), nullable=True),
        sa.Column("piso_portal", sa.String(), nullable=True),
        sa.Column("ciudad", sa.String(), nullable=True),
        sa.Column("codigo_postal", sa.String(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("dni"),
    )
    op.create_index(
        op.f("ix_clientes_apellidos"), "clientes", ["apellidos"], unique=False
    )
    op.create_index(op.f("ix_clientes_ciudad"), "clientes", ["ciudad"], unique=False)
    op.create_index(
        op.f("ix_clientes_codigo_postal"), "clientes", ["codigo_postal"], unique=False
    )
    op.create_index(op.f("ix_clientes_dni"), "clientes", ["dni"], unique=False)
    op.create_index(op.f("ix_clientes_email"), "clientes", ["email"], unique=False)
    op.create_index(op.f("ix_clientes_id"), "clientes", ["id"], unique=False)
    op.create_index(op.f("ix_clientes_nombre"), "clientes", ["nombre"], unique=False)

    # ── productos ─────────────────────────────────────────────────────────────
    op.create_table(
        "productos",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("nombre", sa.String(), nullable=True),
        sa.Column("descripcion", sa.String(), nullable=True),
        sa.Column("precio", sa.Float(), nullable=True),
        sa.Column("proveedor_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["proveedor_id"], ["proveedores.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_productos_id"), "productos", ["id"], unique=False)
    op.create_index(op.f("ix_productos_nombre"), "productos", ["nombre"], unique=False)

    # ── movimientos ───────────────────────────────────────────────────────────
    op.create_table(
        "movimientos",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("fecha", sa.Date(), nullable=False),
        sa.Column("concepto", sa.String(), nullable=True),
        sa.Column("cantidad", sa.Float(), nullable=True),
        sa.Column("tipo", sa.String(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_movimientos_id"), "movimientos", ["id"], unique=False)

    # ── usuarios ──────────────────────────────────────────────────────────────
    op.create_table(
        "usuarios",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("username", sa.String(), nullable=False),
        sa.Column("hashed_password", sa.String(), nullable=False),
        sa.Column("role", sa.String(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("username"),
    )
    op.create_index(op.f("ix_usuarios_id"), "usuarios", ["id"], unique=False)
    op.create_index(
        op.f("ix_usuarios_username"), "usuarios", ["username"], unique=False
    )

    # ── stripe_checkouts ─────────────────────────────────────────────────────
    op.create_table(
        "stripe_checkouts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("session_id", sa.String(), nullable=False),
        sa.Column("payment_intent_id", sa.String(), nullable=True),
        sa.Column("amount", sa.Float(), nullable=False),
        sa.Column("currency", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_stripe_checkouts_id"), "stripe_checkouts", ["id"], unique=False
    )
    op.create_index(
        op.f("ix_stripe_checkouts_session_id"),
        "stripe_checkouts",
        ["session_id"],
        unique=True,
    )

    # ── albaranes ─────────────────────────────────────────────────────────────
    op.create_table(
        "albaranes",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("fecha", sa.Date(), nullable=False),
        sa.Column("descripcion", sa.String(), nullable=True),
        sa.Column("total", sa.Float(), nullable=True),
        sa.Column("estado", sa.String(), nullable=False),
        sa.Column("cliente_id", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["cliente_id"], ["clientes.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_albaranes_id"), "albaranes", ["id"], unique=False)

    # ── lineas_albaran ────────────────────────────────────────────────────────
    op.create_table(
        "lineas_albaran",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("albaran_id", sa.Integer(), nullable=False),
        sa.Column("producto_id", sa.Integer(), nullable=False),
        sa.Column("cantidad", sa.Integer(), nullable=False),
        sa.Column("precio_unitario", sa.Float(), nullable=False),
        sa.ForeignKeyConstraint(["albaran_id"], ["albaranes.id"]),
        sa.ForeignKeyConstraint(["producto_id"], ["productos.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_lineas_albaran_albaran_id"),
        "lineas_albaran",
        ["albaran_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_lineas_albaran_id"), "lineas_albaran", ["id"], unique=False
    )
    op.create_index(
        op.f("ix_lineas_albaran_producto_id"),
        "lineas_albaran",
        ["producto_id"],
        unique=False,
    )

    # ── albaran_rutas ─────────────────────────────────────────────────────────
    op.create_table(
        "albaran_rutas",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("albaran_id", sa.Integer(), nullable=False),
        sa.Column("camion_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["albaran_id"], ["albaranes.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("albaran_id", name="uq_albaran_rutas_albaran_id"),
    )
    op.create_index(op.f("ix_albaran_rutas_id"), "albaran_rutas", ["id"], unique=False)


def downgrade() -> None:
    op.drop_table("albaran_rutas")
    op.drop_table("lineas_albaran")
    op.drop_table("albaranes")
    op.drop_table("stripe_checkouts")
    op.drop_table("usuarios")
    op.drop_table("movimientos")
    op.drop_table("productos")
    op.drop_table("clientes")
    op.drop_table("proveedores")
