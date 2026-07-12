from sqlalchemy import Column, Float, DateTime, String, func
import uuid
from app.models import Base, GUID

class TradeHistory(Base):
    __tablename__ = "trade_history"
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), nullable=False, index=True)

    symbol = Column(String, nullable=False, index=True)
    side = Column(String, nullable=False) # "buy" or "sell"
    entry_price = Column(Float, nullable=False)
    exit_price = Column(Float, nullable=False)
    quantity = Column(Float, nullable=False)
    pnl = Column(Float, nullable=False)
    account_type = Column(String, nullable=False, default="live")
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
