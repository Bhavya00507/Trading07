import uuid
from sqlalchemy import Column, Numeric, String, Text
from app.models import Base, GUID

class SetupPatternModel(Base):
    __tablename__ = "playbooks"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    type = Column(String(50), nullable=False)
    win_rate = Column(Numeric(5, 2), default=0.0)
    trade_count = Column(Numeric(10, 0), default=0)
    avg_return = Column(Numeric(10, 4), default=0.0)
    tags = Column(Text) # Comma-separated tags
