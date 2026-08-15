import uuid
from sqlalchemy import Column, Numeric, DateTime, func, String, Text, Float, Integer
from app.models import Base, GUID

class JournalEntry(Base):
    __tablename__ = "journals"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), nullable=False, index=True)
    trade_id = Column(String(50), nullable=False, index=True)
    symbol = Column(String(20), nullable=False, index=True)
    broker = Column(String(50), default="Paper Trading")
    account = Column(String(50), default="Main Account")
    side = Column(String(10), nullable=False) # buy / sell
    direction = Column(String(10), default="long") # long / short
    entry_price = Column(Numeric(20, 8), nullable=False)
    exit_price = Column(Numeric(20, 8), nullable=False)
    quantity = Column(Numeric(20, 8), nullable=False)
    sl = Column(Numeric(20, 8), nullable=True)
    tp = Column(Numeric(20, 8), nullable=True)
    pnl = Column(Numeric(20, 4), nullable=False)
    net_pnl = Column(Numeric(20, 4), nullable=False)
    commission = Column(Numeric(20, 4), default=0)
    swap = Column(Numeric(20, 4), default=0)
    spread = Column(Numeric(20, 4), default=0)
    fees = Column(Numeric(20, 4), default=0)
    rr = Column(Numeric(10, 2), default=0)
    open_time = Column(String(50), index=True)
    close_time = Column(String(50), index=True)
    duration_sec = Column(Numeric(20, 0), default=0)
    duration_ms = Column(Numeric(20, 0), default=0)
    session = Column(String(20), default="NY") # Asian, London, New York
    setup_type = Column(String(50), default="Breakout")
    strategy_tag = Column(String(50), default="Trend")
    emotion = Column(String(20), default="Neutral")
    notes = Column(Text, nullable=True)
    tags = Column(Text, nullable=True) # Comma-separated
    grade = Column(String(5), default="B")
    mistakes = Column(Text, nullable=True) # Comma-separated
    screenshot_before = Column(Text, nullable=True)
    screenshot_during = Column(Text, nullable=True)
    screenshot_after = Column(Text, nullable=True)
    entry_reason = Column(Text, nullable=True)
    exit_reason = Column(Text, nullable=True)
    confidence_score = Column(Numeric(5, 2), default=80.0)
    risk_pct = Column(Numeric(5, 2), default=1.0)
    leverage = Column(Numeric(5, 2), default=1.0)
    indicators = Column(Text, nullable=True)
    news_event = Column(Text, nullable=True)
    ai_analysis = Column(Text, nullable=True)

class DailyJournal(Base):
    __tablename__ = "daily_journals"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), nullable=False, index=True)
    date_str = Column(String(20), nullable=False, index=True)
    morning_plan = Column(Text, nullable=True)
    lessons_learned = Column(Text, nullable=True)
    end_of_day_summary = Column(Text, nullable=True)
    performance_rating = Column(Numeric(5, 2), default=5.0)
