from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.session import get_db
from app.models.playbook import SetupPatternModel
from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID
import uuid

router = APIRouter(prefix="/playbooks", tags=["playbooks"])

from app.api.auth import get_current_user_id

class PlaybookBase(BaseModel):
    name: str
    type: str
    win_rate: float = 0.0
    trade_count: float = 0.0
    avg_return: float = 0.0
    tags: Optional[str] = None

class PlaybookResponse(PlaybookBase):
    id: UUID
    user_id: UUID

    class Config:
        orm_mode = True
        from_attributes = True

@router.get("", response_model=List[PlaybookResponse])
async def get_playbooks(db: AsyncSession = Depends(get_db), user_id: UUID = Depends(get_current_user_id)):
    stmt = select(SetupPatternModel).where(SetupPatternModel.user_id == user_id)
    res = await db.execute(stmt)
    return res.scalars().all()

@router.post("", response_model=PlaybookResponse)
async def create_playbook(playbook: PlaybookBase, db: AsyncSession = Depends(get_db), user_id: UUID = Depends(get_current_user_id)):
    db_playbook = SetupPatternModel(
        id=uuid.uuid4(),
        user_id=user_id,
        **playbook.dict()
    )
    db.add(db_playbook)
    await db.commit()
    await db.refresh(db_playbook)
    return db_playbook

@router.delete("/{playbook_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_playbook(playbook_id: UUID, db: AsyncSession = Depends(get_db), user_id: UUID = Depends(get_current_user_id)):
    stmt = select(SetupPatternModel).where(SetupPatternModel.id == playbook_id, SetupPatternModel.user_id == user_id)
    res = await db.execute(stmt)
    db_playbook = res.scalar_one_or_none()
    if not db_playbook:
        raise HTTPException(status_code=404, detail="Playbook not found")
    
    await db.delete(db_playbook)
    await db.commit()
    return None
