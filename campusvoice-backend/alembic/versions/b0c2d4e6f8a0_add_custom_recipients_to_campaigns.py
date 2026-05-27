"""add custom_recipients to campaigns

Revision ID: b0c2d4e6f8a0
Revises: f7e8d9c0b1a2
Create Date: 2026-05-27 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ARRAY


revision: str = 'b0c2d4e6f8a0'
down_revision: Union[str, Sequence[str], None] = 'f7e8d9c0b1a2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('campaigns', sa.Column('custom_recipients', ARRAY(sa.String(20)), nullable=True))


def downgrade() -> None:
    op.drop_column('campaigns', 'custom_recipients')
