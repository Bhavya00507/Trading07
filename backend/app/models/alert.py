import uuid
from sqlalchemy import Column, Numeric, String, Text, Boolean
from app.models import Base, GUID

class DBPriceAlert(Base):
    __tablename__ = "alerts"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), nullable=False, index=True)
    symbol = Column(String(20), nullable=False)
    type = Column(String(50), nullable=False)
    value = Column(Numeric(20, 8), nullable=False)
    condition = Column(String(50))
    is_active = Column(Boolean, nullable=False, default=True)
    is_triggered = Column(Boolean, nullable=False, default=False)
    created_at = Column(String(50))
    extra_params = Column(Text) # JSON serialized parameters
