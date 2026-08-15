from sqlalchemy import Column, Numeric, DateTime, func, String
import uuid
from app.models import Base, GUID

class Account(Base):
    __tablename__ = "accounts"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), nullable=False, index=True)

    balance = Column(Numeric(20, 4), nullable=False, default=0)  # INR
    equity = Column(Numeric(20, 4), nullable=False, default=0)
    peak_balance = Column(Numeric(20, 4), nullable=False, default=10000.0)
    margin_used = Column(Numeric(20, 4), nullable=False, default=0)
    free_margin = Column(Numeric(20, 4), nullable=False, default=0)
    daily_pnl = Column(Numeric(20, 4), nullable=False, default=0)
    drawdown = Column(Numeric(20, 4), nullable=False, default=0)
    account_type = Column(String(20), nullable=False, default="live") # 'live', 'paper', 'demo'
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
