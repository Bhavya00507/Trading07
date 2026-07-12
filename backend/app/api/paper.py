from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from uuid import UUID
import json

from app.database.session import get_db
from app.api.auth import get_current_user_id
from app.models.account import Account
from app.models.position import Position
from app.models.order import Order
from app.models.trade_history import TradeHistory
from app.websocket.manager import manager

router = APIRouter(prefix="/paper", tags=["paper"])

@router.post("/reset")
async def reset_paper_account(db: AsyncSession = Depends(get_db), user_id: UUID = Depends(get_current_user_id)):
    print(f"[Reset Paper] Resetting account for user {user_id}...")
    
    # Reset all demo/paper-like accounts for this user: "paper", "live", "demo"
    for acct_type in ["paper", "live", "demo"]:
        stmt = select(Account).where(Account.user_id == user_id, Account.account_type == acct_type)
        res = await db.execute(stmt)
        account = res.scalar_one_or_none()
        if account:
            account.balance = 10000.0
            account.equity = 10000.0
            account.peak_balance = 10000.0
            account.margin_used = 0.0
            account.free_margin = 10000.0
            account.daily_pnl = 0.0
            account.drawdown = 0.0
            db.add(account)

        # Delete positions, orders, trade history
        await db.execute(delete(Position).where(Position.user_id == user_id, Position.account_type == acct_type))
        await db.execute(delete(Order).where(Order.user_id == user_id, Order.account_type == acct_type))
        await db.execute(delete(TradeHistory).where(TradeHistory.user_id == user_id, TradeHistory.account_type == acct_type))

    await db.commit()

    # Broadcast updates via WebSocket
    for acct_type in ["paper", "live"]:
        stmt = select(Account).where(Account.user_id == user_id, Account.account_type == acct_type)
        res = await db.execute(stmt)
        account = res.scalar_one_or_none()
        if account:
            acc_data = AccountResponse.model_validate(account).model_dump(mode="json")
            await manager.broadcast_event("account_update", acc_data, user_id=user_id)

    # Broadcast cleared positions and orders so UI updates
    await manager.broadcast_event("positions_cleared", {}, user_id=user_id)
    await manager.broadcast_event("orders_cleared", {}, user_id=user_id)

    return {"message": "Paper account reset successfully", "drawdown": 0.0}
