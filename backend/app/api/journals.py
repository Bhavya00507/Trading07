from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.session import get_db
from app.models.journal import JournalEntry, DailyJournal
from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID
import uuid

router = APIRouter(prefix="/journals", tags=["journals"])

from app.api.auth import get_current_user_id

class JournalEntryBase(BaseModel):
    trade_id: str
    symbol: str
    side: str
    entry_price: float
    exit_price: float
    quantity: float
    pnl: float
    fees: float = 0.0
    open_time: Optional[str] = None
    close_time: Optional[str] = None
    duration_ms: Optional[float] = None
    session: Optional[str] = None
    setup_type: Optional[str] = None
    emotion: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[str] = None
    grade: Optional[str] = None
    mistakes: Optional[str] = None
    screenshot_before: Optional[str] = None
    screenshot_during: Optional[str] = None
    screenshot_after: Optional[str] = None
    entry_reason: Optional[str] = None
    exit_reason: Optional[str] = None
    confidence_score: Optional[float] = None

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

class DailyJournalResponse(DailyJournalBase):
    id: UUID
    user_id: UUID

    class Config:
        orm_mode = True
        from_attributes = True

@router.get("", response_model=List[JournalEntryResponse])
async def get_journal_entries(db: AsyncSession = Depends(get_db), user_id: UUID = Depends(get_current_user_id)):
    stmt = select(JournalEntry).where(JournalEntry.user_id == user_id)
    res = await db.execute(stmt)
    return res.scalars().all()

@router.post("", response_model=JournalEntryResponse)
async def upsert_journal_entry(entry: JournalEntryBase, db: AsyncSession = Depends(get_db), user_id: UUID = Depends(get_current_user_id)):
    # Check if entry already exists
    stmt = select(JournalEntry).where(JournalEntry.user_id == user_id, JournalEntry.trade_id == entry.trade_id)
    res = await db.execute(stmt)
    db_entry = res.scalar_one_or_none()

    if db_entry:
        for k, v in entry.dict(exclude_unset=True).items():
            setattr(db_entry, k, v)
    else:
        db_entry = JournalEntry(
            id=uuid.uuid4(),
            user_id=user_id,
            **entry.dict()
        )
        db.add(db_entry)

    await db.commit()
    await db.refresh(db_entry)
    return db_entry

@router.get("/daily", response_model=List[DailyJournalResponse])
async def get_daily_journals(db: AsyncSession = Depends(get_db), user_id: UUID = Depends(get_current_user_id)):
    stmt = select(DailyJournal).where(DailyJournal.user_id == user_id)
    res = await db.execute(stmt)
    return res.scalars().all()

@router.post("/daily", response_model=DailyJournalResponse)
async def upsert_daily_journal(journal: DailyJournalBase, db: AsyncSession = Depends(get_db), user_id: UUID = Depends(get_current_user_id)):
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
