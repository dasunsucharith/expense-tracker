"""initial tables

Revision ID: 6834fed72300
Revises: 
Create Date: 2025-06-08 16:20:48.785956
"""

from alembic import op
import sqlalchemy as sa

revision = '6834fed72300'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('username', sa.String(length=80), nullable=False, unique=True),
        sa.Column('email', sa.String(length=120), nullable=False, unique=True),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('currency', sa.String(length=10), nullable=False, server_default='USD'),
    )

    op.create_table(
        'categories',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('name', sa.String(length=50), nullable=False),
        sa.Column('color', sa.String(length=20), nullable=False, server_default='#3498db'),
        sa.Column('icon', sa.String(length=50), nullable=True),
    )

    op.create_table(
        'budgets',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('category_id', sa.Integer(), sa.ForeignKey('categories.id'), nullable=True),
    )

    op.create_table(
        'expenses',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.Column('payment_method', sa.String(length=20), nullable=True),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('category_id', sa.Integer(), sa.ForeignKey('categories.id'), nullable=False),
    )

    op.create_table(
        'incomes',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.Column('income_type', sa.String(length=50), nullable=False),
        sa.Column('other_source', sa.String(length=100), nullable=True),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
    )

    op.create_table(
        'savings',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
    )


def downgrade():
    op.drop_table('savings')
    op.drop_table('incomes')
    op.drop_table('expenses')
    op.drop_table('budgets')
    op.drop_table('categories')
    op.drop_table('users')
