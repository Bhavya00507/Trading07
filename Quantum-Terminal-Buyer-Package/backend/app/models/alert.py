import uuid
from sqlalchemy import Column, Numeric, String, Text, Boolean, JSON, DateTime, Enum
from sqlalchemy.sql import func
from app.models import Base, GUID
class DBPriceAlert(Base):
    __tablename__ = "alerts"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), nullable=False, index=True)
    symbol = Column(String(20), nullable=False)
    type = Column(String(50), nullable=False)
    value = Column(Numeric(20, 8), nullable=False)
    condition = Column(JSON, nullable=True)  # Nested condition tree
    actions = Column(JSON, nullable=True)    # List of actions e.g., [{"type":"desktop"}, {"type":"email", "to":"user@example.com"}]
    repeat = Column(String(20), nullable=True)  # e.g., "once", "every_tick", "every_minute"
    expiry_type = Column(String(20), nullable=True)  # e.g., "never", "after_time", "after_date", "after_count"
    expiry_value = Column(String(50), nullable=True)  # value depending on type
    status = Column(Enum('active','paused','triggered','expired','disabled', name='alert_status'), default='active')
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    is_active = Column(Boolean, nullable=False, default=True)
    is_triggered = Column(Boolean, nullable=False, default=False)

    extra_params = Column(Text) # JSON serialized parameters
