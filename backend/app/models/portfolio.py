import uuid
from sqlalchemy import Column, Numeric, DateTime, func, String, Text, Float, Boolean, ForeignKey
from app.models import Base, GUID

class PortfolioAccount(Base):
    __tablename__ = "portfolio_accounts"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), nullable=False, index=True)
    account_name = Column(String(100), nullable=False)
    broker = Column(String(50), nullable=False) # MT5, Binance, Bybit, Alpaca, IBKR, Zerodha, Upstox
    account_type = Column(String(20), default="live") # live, demo, paper
    account_group = Column(String(50), default="Personal") # Personal, Prop Firm, Retirement, Crypto, Swing, Scalping, Institutional
    currency = Column(String(10), default="USD")
    balance = Column(Numeric(20, 4), default=10000.0)
    equity = Column(Numeric(20, 4), default=10000.0)
    unrealized_pnl = Column(Numeric(20, 4), default=0.0)
    realized_pnl = Column(Numeric(20, 4), default=0.0)
    margin_used = Column(Numeric(20, 4), default=0.0)
    free_margin = Column(Numeric(20, 4), default=10000.0)
    leverage = Column(Numeric(10, 2), default=10.0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class PortfolioPosition(Base):
    __tablename__ = "portfolio_positions"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), nullable=False, index=True)
    account_id = Column(GUID(), nullable=False, index=True)
    broker = Column(String(50), nullable=False)
    symbol = Column(String(20), nullable=False, index=True)
    asset_class = Column(String(30), default="Crypto") # Stocks, Forex, Crypto, Commodities, Indices, ETFs, Options, Futures
    side = Column(String(10), nullable=False) # buy / sell
    quantity = Column(Numeric(20, 8), nullable=False)
    entry_price = Column(Numeric(20, 8), nullable=False)
    current_price = Column(Numeric(20, 8), nullable=False)
    pnl = Column(Numeric(20, 4), default=0.0)
    pnl_pct = Column(Numeric(10, 2), default=0.0)
    sl = Column(Numeric(20, 8), nullable=True)
    tp = Column(Numeric(20, 8), nullable=True)
    margin = Column(Numeric(20, 4), default=0.0)
    exposure = Column(Numeric(20, 4), default=0.0)
    sector = Column(String(50), default="Technology")
    country = Column(String(50), default="US")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class DividendEntry(Base):
    __tablename__ = "portfolio_dividends"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), nullable=False, index=True)
    symbol = Column(String(20), nullable=False)
    amount = Column(Numeric(20, 4), nullable=False)
    yield_pct = Column(Numeric(10, 2), default=2.5)
    ex_date = Column(String(20), nullable=False)
    pay_date = Column(String(20), nullable=False)
    status = Column(String(20), default="Received") # Upcoming / Received
