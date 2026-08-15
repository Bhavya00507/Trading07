from fastapi import APIRouter, Depends
from typing import List
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.session import get_db
from app.models.trade_history import TradeHistory
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(prefix="/history", tags=["history"])

class TradeHistoryResponse(BaseModel):
    id: UUID
    user_id: UUID
    symbol: str
    side: str
    entry_price: float
    exit_price: float
    quantity: float
    pnl: float
    timestamp: datetime

    class Config:
        orm_mode = True
        from_attributes = True

from app.api.auth import get_current_user_id

@router.get("", response_model=List[TradeHistoryResponse])
async def list_history(db: AsyncSession = Depends(get_db), user_id: UUID = Depends(get_current_user_id)):
    result = await db.execute(select(TradeHistory).where(TradeHistory.user_id == user_id).order_by(TradeHistory.timestamp.desc()))
    history = result.scalars().all()
    return history
