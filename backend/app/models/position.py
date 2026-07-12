from sqlalchemy import Column, String, Float, DateTime, func
import uuid
from app.models import Base, GUID

class Position(Base):
    __tablename__ = "positions"
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), nullable=False, index=True)

    symbol = Column(String, nullable=False, index=True)
    quantity = Column(Float, nullable=False)
    average_price = Column(Float, nullable=False)
    unrealized_pnl = Column(Float, default=0.0)
    realized_pnl = Column(Float, default=0.0)
    stop_loss = Column(Float, nullable=True)
    take_profit = Column(Float, nullable=True)
    trailing_stop = Column(Float, nullable=True)  # trailing stop distance in points/USD
    commission = Column(Float, default=0.0, nullable=False)
    swap = Column(Float, default=0.0, nullable=False)
    account_type = Column(String, nullable=False, default="live")
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
