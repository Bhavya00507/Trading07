from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.session import get_db
from app.models.alert import DBPriceAlert
from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID
import uuid
import json

router = APIRouter(prefix="/alerts", tags=["alerts"])

from app.api.auth import get_current_user_id

class AlertBase(BaseModel):
    symbol: str
    type: str
    value: float
    condition: Optional[str] = None
    is_active: bool = True
    is_triggered: bool = False
    created_at: Optional[str] = None
    extra_params: Optional[str] = None # JSON string

class AlertResponse(AlertBase):
    id: UUID
    user_id: UUID

    class Config:
        orm_mode = True
        from_attributes = True

@router.get("", response_model=List[AlertResponse])
async def get_alerts(db: AsyncSession = Depends(get_db), user_id: UUID = Depends(get_current_user_id)):
    stmt = select(DBPriceAlert).where(DBPriceAlert.user_id == user_id)
    res = await db.execute(stmt)
    return res.scalars().all()

@router.post("", response_model=AlertResponse)
async def create_alert(alert: AlertBase, db: AsyncSession = Depends(get_db), user_id: UUID = Depends(get_current_user_id)):
    db_alert = DBPriceAlert(
        id=uuid.uuid4(),
        user_id=user_id,
        **alert.dict()
    )
    db.add(db_alert)
    await db.commit()
    await db.refresh(db_alert)
    return db_alert

@router.put("/{alert_id}", response_model=AlertResponse)
async def update_alert(alert_id: UUID, updates: AlertBase, db: AsyncSession = Depends(get_db), user_id: UUID = Depends(get_current_user_id)):
    stmt = select(DBPriceAlert).where(DBPriceAlert.id == alert_id, DBPriceAlert.user_id == user_id)
    res = await db.execute(stmt)
    db_alert = res.scalar_one_or_none()
    if not db_alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    for k, v in updates.dict(exclude_unset=True).items():
        setattr(db_alert, k, v)

    await db.commit()
    await db.refresh(db_alert)
    return db_alert

@router.delete("/{alert_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_alert(alert_id: UUID, db: AsyncSession = Depends(get_db), user_id: UUID = Depends(get_current_user_id)):
    stmt = select(DBPriceAlert).where(DBPriceAlert.id == alert_id, DBPriceAlert.user_id == user_id)
    res = await db.execute(stmt)
    db_alert = res.scalar_one_or_none()
    if not db_alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    await db.delete(db_alert)
    await db.commit()
    return None
