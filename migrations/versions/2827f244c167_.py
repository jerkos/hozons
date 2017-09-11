"""empty message

Revision ID: 2827f244c167
Revises: 84fa8ced90eb
Create Date: 2017-09-02 15:14:07.951249

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '2827f244c167'
down_revision = '84fa8ced90eb'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('actions', sa.Column('image_url', sa.Text(), nullable=True))
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_column('actions', 'image_url')
    # ### end Alembic commands ###