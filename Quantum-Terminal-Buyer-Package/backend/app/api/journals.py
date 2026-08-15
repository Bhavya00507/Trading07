from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.database.session import get_db
from app.models.journal import JournalEntry, DailyJournal
from app.services.journal_service import JournalService
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from uuid import UUID
import uuid

router = APIRouter(prefix="/journals", tags=["journals"])

from app.api.auth import get_current_user_id

class JournalEntryBase(BaseModel):
    trade_id: str
    symbol: str
    broker: Optional[str] = "Paper Trading"
    account: Optional[str] = "Main Account"
    side: str
    direction: Optional[str] = "long"
    entry_price: float
    exit_price: float
    quantity: float
    sl: Optional[float] = None
    tp: Optional[float] = None
    pnl: float
    net_pnl: Optional[float] = None
    commission: Optional[float] = 0.0
    swap: Optional[float] = 0.0
    spread: Optional[float] = 0.0
    fees: float = 0.0
    rr: Optional[float] = 0.0
    open_time: Optional[str] = None
    close_time: Optional[str] = None
    duration_sec: Optional[float] = 0.0
    duration_ms: Optional[float] = 0.0
    session: Optional[str] = "New York"
    setup_type: Optional[str] = "Breakout"
    strategy_tag: Optional[str] = "Trend"
    emotion: Optional[str] = "Neutral"
    notes: Optional[str] = None
    tags: Optional[str] = None
    grade: Optional[str] = "B"
    mistakes: Optional[str] = None
    screenshot_before: Optional[str] = None
    screenshot_during: Optional[str] = None
    screenshot_after: Optional[str] = None
    entry_reason: Optional[str] = None
    exit_reason: Optional[str] = None
    confidence_score: Optional[float] = 80.0
    risk_pct: Optional[float] = 1.0
    leverage: Optional[float] = 1.0
    indicators: Optional[str] = None
    news_event: Optional[str] = None
    ai_analysis: Optional[str] = None

class JournalEntryResponse(JournalEntryBase):
    id: UUID
    user_id: UUID

    class Config:
        orm_mode = True
        from_attributes = True

class DailyJournalBase(BaseModel):
    date_str: str
    morning_plan: Optional[str] = None
    lessons_learned: Optional[str] = None
    end_of_day_summary: Optional[str] = None
    performance_rating: Optional[float] = 5.0

class DailyJournalResponse(DailyJournalBase):
    id: UUID
    user_id: UUID

    class Config:
        orm_mode = True
        from_attributes = True

@router.get("", response_model=List[JournalEntryResponse])
async def get_journal_entries(
    limit: int = Query(1000, ge=1, le=100000),
    symbol: Optional[str] = None,
    broker: Optional[str] = None,
    session: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id)
):
    stmt = select(JournalEntry).where(JournalEntry.user_id == user_id)
    if symbol:
        stmt = stmt.where(JournalEntry.symbol == symbol.upper())
    if broker:
        stmt = stmt.where(JournalEntry.broker == broker)
    if session:
        stmt = stmt.where(JournalEntry.session == session)
    stmt = stmt.limit(limit)

    res = await db.execute(stmt)
    return res.scalars().all()

@router.post("", response_model=JournalEntryResponse)
async def upsert_journal_entry(
    entry: JournalEntryBase,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id)
):
    stmt = select(JournalEntry).where(JournalEntry.user_id == user_id, JournalEntry.trade_id == entry.trade_id)
    res = await db.execute(stmt)
    db_entry = res.scalar_one_or_none()

    entry_data = entry.dict()
    if entry_data.get("net_pnl") is None:
        entry_data["net_pnl"] = entry_data["pnl"] - entry_data.get("commission", 0.0) - entry_data.get("swap", 0.0)

    if db_entry:
        for k, v in entry_data.items():
            if v is not None:
                setattr(db_entry, k, v)
    else:
        db_entry = JournalEntry(
            id=uuid.uuid4(),
            user_id=user_id,
            **entry_data
        )
        db.add(db_entry)

    await db.commit()
    await db.refresh(db_entry)
    return db_entry

@router.post("/batch", response_model=Dict[str, Any])
async def batch_upsert_entries(
    entries: List[JournalEntryBase],
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id)
):
    added_count = 0
    for entry in entries:
        stmt = select(JournalEntry).where(JournalEntry.user_id == user_id, JournalEntry.trade_id == entry.trade_id)
        res = await db.execute(stmt)
        db_entry = res.scalar_one_or_none()

        entry_data = entry.dict()
        if entry_data.get("net_pnl") is None:
            entry_data["net_pnl"] = entry_data["pnl"] - entry_data.get("commission", 0.0) - entry_data.get("swap", 0.0)

        if db_entry:
            for k, v in entry_data.items():
                if v is not None:
                    setattr(db_entry, k, v)
        else:
            db_entry = JournalEntry(
                id=uuid.uuid4(),
                user_id=user_id,
                **entry_data
            )
            db.add(db_entry)
        added_count += 1

    await db.commit()
    return {"status": "success", "count": added_count}

@router.get("/analytics")
async def get_journal_analytics(
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id)
):
    stmt = select(JournalEntry).where(JournalEntry.user_id == user_id)
    res = await db.execute(stmt)
    entries = [e.__dict__ for e in res.scalars().all()]

    metrics = JournalService.calculate_metrics(entries)
    sessions = JournalService.analyze_sessions(entries)
    symbols = JournalService.analyze_symbols(entries)
    strategies = JournalService.analyze_strategies(entries)
    psychology = JournalService.analyze_psychology_and_risks(entries)

    return {
        "metrics": metrics,
        "sessions": sessions,
        "symbols": symbols,
        "strategies": strategies,
        "psychology": psychology,
    }

@router.get("/ai-coach")
async def get_ai_coach_insights(
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id)
):
    stmt = select(JournalEntry).where(JournalEntry.user_id == user_id)
    res = await db.execute(stmt)
    entries = [e.__dict__ for e in res.scalars().all()]
    return JournalService.generate_ai_coaching_report(entries, timeframe="Monthly")

@router.get("/ai-report")
async def get_ai_report(
    timeframe: str = Query("Monthly", regex="^(Daily|Weekly|Monthly|Quarterly|Yearly)$"),
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id)
):
    stmt = select(JournalEntry).where(JournalEntry.user_id == user_id)
    res = await db.execute(stmt)
    entries = [e.__dict__ for e in res.scalars().all()]
    return JournalService.generate_ai_coaching_report(entries, timeframe=timeframe)

@router.post("/import")
async def import_csv_statement(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id)
):
    content = (await file.read()).decode("utf-8", errors="ignore")
    parsed_trades = JournalService.parse_mt5_or_csv_statement(content)

    added_count = 0
    for trade_dict in parsed_trades:
        stmt = select(JournalEntry).where(JournalEntry.user_id == user_id, JournalEntry.trade_id == trade_dict["trade_id"])
        res = await db.execute(stmt)
        db_entry = res.scalar_one_or_none()

        if db_entry:
            for k, v in trade_dict.items():
                setattr(db_entry, k, v)
        else:
            db_entry = JournalEntry(
                id=uuid.uuid4(),
                user_id=user_id,
                **trade_dict
            )
            db.add(db_entry)
        added_count += 1

    await db.commit()
    return {"status": "success", "imported": added_count}

@router.get("/daily", response_model=List[DailyJournalResponse])
async def get_daily_journals(
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id)
):
    stmt = select(DailyJournal).where(DailyJournal.user_id == user_id)
    res = await db.execute(stmt)
    return res.scalars().all()

@router.post("/daily", response_model=DailyJournalResponse)
async def upsert_daily_journal(
    journal: DailyJournalBase,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id)
):
    stmt = select(DailyJournal).where(DailyJournal.user_id == user_id, DailyJournal.date_str == journal.date_str)
    res = await db.execute(stmt)
    db_journal = res.scalar_one_or_none()

    if db_journal:
        for k, v in journal.dict(exclude_unset=True).items():
            setattr(db_journal, k, v)
    else:
        db_journal = DailyJournal(
            id=uuid.uuid4(),
            user_id=user_id,
            **journal.dict()
        )
        db.add(db_journal)

    await db.commit()
    await db.refresh(db_journal)
    return db_journal
