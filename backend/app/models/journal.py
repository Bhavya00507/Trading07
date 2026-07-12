import uuid
from sqlalchemy import Column, Numeric, DateTime, func, String, Text
from app.models import Base, GUID

class JournalEntry(Base):
    __tablename__ = "journals"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), nullable=False, index=True)
    trade_id = Column(String(50), nullable=False, index=True)
    symbol = Column(String(20), nullable=False)
    side = Column(String(10), nullable=False)
    entry_price = Column(Numeric(20, 8), nullable=False)
    exit_price = Column(Numeric(20, 8), nullable=False)
    quantity = Column(Numeric(20, 8), nullable=False)
    pnl = Column(Numeric(20, 4), nullable=False)
    fees = Column(Numeric(20, 4), nullable=False, default=0)
    open_time = Column(String(50))
    close_time = Column(String(50))
    duration_ms = Column(Numeric(20, 0))
    session = Column(String(20))
    setup_type = Column(String(50))
    emotion = Column(String(20))
    notes = Column(Text)
    tags = Column(Text) # Comma-separated
    grade = Column(String(5))
    mistakes = Column(Text) # Comma-separated
    screenshot_before = Column(Text)
    screenshot_during = Column(Text)
    screenshot_after = Column(Text)
    entry_reason = Column(Text)
    exit_reason = Column(Text)
    confidence_score = Column(Numeric(5, 2))

class DailyJournal(Base):
    __tablename__ = "daily_journals"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), nullable=False, index=True)
    date_str = Column(String(20), nullable=False, index=True)
    morning_plan = Column(Text)
    lessons_learned = Column(Text)
    end_of_day_summary = Column(Text)
