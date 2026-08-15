from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from typing import List
import asyncio
from uuid import UUID
import uuid
import json
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.session import get_db
from app.models.position import Position
from app.models.account import Account
from app.models.order import Order, OrderSide, OrderType, OrderStatus
from app.services.order_engine import recalculate_user_metrics, close_position_sltp, process_new_order
from app.services.market_data import get_price
from app.websocket.manager import manager
from pydantic import BaseModel
from app.api.auth import get_current_user_id
class DummyOrder:
    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)
        self.price = getattr(self, "price", None)
        self.stop_loss = getattr(self, "stop_loss", None)
        self.take_profit = getattr(self, "take_profit", None)

router = APIRouter(prefix="/positions", tags=["positions"])

class PositionResponse(BaseModel):
    id: UUID
    symbol: str
    quantity: float
    average_price: float
    unrealized_pnl: float | None = None
    realized_pnl: float | None = None
    stop_loss: float | None = None
    take_profit: float | None = None
    trailing_stop: float | None = None
    account_type: str = "live"
    updated_at: datetime | None = None

    class Config:
        orm_mode = True
        from_attributes = True

class ModifySLTPRequest(BaseModel):
    symbol: str | None = None
    stop_loss: float | None = None
    take_profit: float | None = None
    account_type: str = "live"
    position_id: UUID | None = None

class TrailingStopRequest(BaseModel):
    symbol: str | None = None
    distance: float | None = None
    account_type: str = "live"
    position_id: UUID | None = None

class PartialCloseRequest(BaseModel):
    symbol: str | None = None
    quantity: float
    account_type: str = "live"
    position_id: UUID | None = None

class CloseSymbolRequest(BaseModel):
    symbol: str | None = None
    account_type: str = "live"
    position_id: UUID | None = None
    positionId: UUID | None = None
    volume: float | None = None
    price: float | None = None

class ReverseRequest(BaseModel):
    symbol: str | None = None
    account_type: str = "live"
    position_id: UUID | None = None

class BreakEvenRequest(BaseModel):
    symbol: str | None = None
    account_type: str = "live"
    position_id: UUID | None = None

@router.get("", response_model=List[PositionResponse])
async def list_positions(account_type: str = "live", db: AsyncSession = Depends(get_db), user_id: UUID = Depends(get_current_user_id)):
    result = await db.execute(select(Position).where(
        Position.user_id == user_id, 
        Position.quantity != 0.0,
        Position.account_type == account_type
    ))
    positions = result.scalars().all()
    return positions

@router.post("/modify-sltp", response_model=PositionResponse)
async def modify_sltp(req: ModifySLTPRequest, db: AsyncSession = Depends(get_db), user_id: UUID = Depends(get_current_user_id), background_tasks: BackgroundTasks = None):
    async with db.begin():
        if req.position_id:
            stmt = select(Position).where(Position.id == req.position_id, Position.user_id == user_id).with_for_update()
        else:
            stmt = select(Position).where(
                Position.user_id == user_id,
                Position.symbol == req.symbol.upper() if req.symbol else None,
                Position.account_type == req.account_type,
                Position.quantity != 0.0
            ).order_by(Position.updated_at.asc()).limit(1).with_for_update()
        res = await db.execute(stmt)
        pos = res.scalar_one_or_none()
        if not pos or pos.quantity == 0:
            raise HTTPException(status_code=404, detail="Active position not found")
        
        pos.stop_loss = req.stop_loss
        pos.take_profit = req.take_profit
        pos.updated_at = datetime.now(timezone.utc)
        
        acc_stmt = select(Account).where(Account.user_id == user_id, Account.account_type == req.account_type).with_for_update()
        acc_res = await db.execute(acc_stmt)
        account = acc_res.scalar_one_or_none()
        if account:
            await recalculate_user_metrics(db, user_id, account)
            
    # Broadcast updates outside transaction
    from app.api.positions import PositionResponse as PR
    pos_data = PR.model_validate(pos).model_dump(mode="json")
    
    if account:
        from app.api.sync import AccountResponse
        acc_data = AccountResponse.model_validate(account).model_dump(mode="json")
    else:
        acc_data = None
        
    if background_tasks:
        background_tasks.add_task(manager.broadcast_event, "position_update", pos_data, user_id=user_id)
        if acc_data:
            background_tasks.add_task(manager.broadcast_event, "account_update", acc_data, user_id=user_id)
    else:
        asyncio.create_task(manager.broadcast_event("position_update", pos_data, user_id=user_id))
        if acc_data:
            asyncio.create_task(manager.broadcast_event("account_update", acc_data, user_id=user_id))
        
    return pos

@router.post("/trailing-stop", response_model=PositionResponse)
async def modify_trailing_stop(req: TrailingStopRequest, db: AsyncSession = Depends(get_db), user_id: UUID = Depends(get_current_user_id), background_tasks: BackgroundTasks = None):
    async with db.begin():
        if req.position_id:
            stmt = select(Position).where(Position.id == req.position_id, Position.user_id == user_id).with_for_update()
        else:
            stmt = select(Position).where(
                Position.user_id == user_id,
                Position.symbol == req.symbol.upper() if req.symbol else None,
                Position.account_type == req.account_type,
                Position.quantity != 0.0
            ).order_by(Position.updated_at.asc()).limit(1).with_for_update()
        res = await db.execute(stmt)
        pos = res.scalar_one_or_none()
        if not pos or pos.quantity == 0:
            raise HTTPException(status_code=404, detail="Active position not found")
        
        pos.trailing_stop = req.distance
        pos.updated_at = datetime.now(timezone.utc)
        
        # Initialize Stop Loss if not set
        if req.distance and req.distance > 0 and not pos.stop_loss:
            price = await get_price(pos.symbol)
            if pos.quantity > 0:
                pos.stop_loss = price - req.distance
            else:
                pos.stop_loss = price + req.distance

        acc_stmt = select(Account).where(Account.user_id == user_id, Account.account_type == req.account_type).with_for_update()
        acc_res = await db.execute(acc_stmt)
        account = acc_res.scalar_one_or_none()
        if account:
            await recalculate_user_metrics(db, user_id, account)
            
    # Broadcast updates
    from app.api.positions import PositionResponse as PR
    pos_data = PR.model_validate(pos).model_dump(mode="json")
    
    if account:
        from app.api.sync import AccountResponse
        acc_data = AccountResponse.model_validate(account).model_dump(mode="json")
    else:
        acc_data = None
        
    if background_tasks:
        background_tasks.add_task(manager.broadcast_event, "position_update", pos_data, user_id=user_id)
        if acc_data:
            background_tasks.add_task(manager.broadcast_event, "account_update", acc_data, user_id=user_id)
    else:
        asyncio.create_task(manager.broadcast_event("position_update", pos_data, user_id=user_id))
        if acc_data:
            asyncio.create_task(manager.broadcast_event("account_update", acc_data, user_id=user_id))
        
    return pos

@router.post("/partial-close")
async def partial_close(req: PartialCloseRequest, db: AsyncSession = Depends(get_db), user_id: UUID = Depends(get_current_user_id)):
    async with db.begin():
        if req.position_id:
            stmt = select(Position).where(Position.id == req.position_id, Position.user_id == user_id).with_for_update()
        else:
            stmt = select(Position).where(
                Position.user_id == user_id,
                Position.symbol == req.symbol.upper() if req.symbol else None,
                Position.account_type == req.account_type,
                Position.quantity != 0.0
            ).order_by(Position.updated_at.asc()).limit(1).with_for_update()
        res = await db.execute(stmt)
        pos = res.scalar_one_or_none()
        if not pos or pos.quantity == 0:
            raise HTTPException(status_code=404, detail="Active position not found")
        
        if req.quantity <= 0 or req.quantity > abs(pos.quantity):
            raise HTTPException(status_code=400, detail="Invalid partial close quantity")
            
        side = OrderSide.SELL if pos.quantity > 0 else OrderSide.BUY
        pos_id_str = str(pos.id)
        sym = pos.symbol
 
    order_obj = DummyOrder(
        symbol=sym,
        side=side,
        type=OrderType.MARKET,
        quantity=req.quantity,
        account_type=req.account_type,
        position_ticket=pos_id_str
    )

    res_order = await process_new_order(db, order_obj, user_id)
    return {"status": "success", "order": res_order}

@router.post("/close-symbol")
async def close_symbol(req: CloseSymbolRequest, db: AsyncSession = Depends(get_db), user_id: UUID = Depends(get_current_user_id)):
    pos_id = req.position_id or req.positionId
    
    async with db.begin():
        if pos_id:
            stmt = select(Position).where(Position.id == pos_id, Position.user_id == user_id).with_for_update()
        else:
            stmt = select(Position).where(
                Position.user_id == user_id,
                Position.symbol == req.symbol.upper() if req.symbol else None,
                Position.account_type == req.account_type,
                Position.quantity != 0.0
            ).order_by(Position.updated_at.asc()).limit(1).with_for_update()
        
        res = await db.execute(stmt)
        pos = res.scalar_one_or_none()
        if not pos or pos.quantity == 0:
            raise HTTPException(status_code=404, detail="Active position not found")
        
        exit_price = req.price if (req.price and req.price > 0) else None
        if not exit_price:
            try:
                exit_price = await get_price(pos.symbol)
            except Exception:
                exit_price = pos.average_price
                
        close_qty = req.volume if (req.volume and req.volume > 0) else abs(pos.quantity)
        
        if close_qty >= abs(pos.quantity):
            await close_position_sltp(db, pos, exit_price, "Manual Close")
        else:
            acc_stmt = select(Account).where(Account.user_id == user_id, Account.account_type == pos.account_type).with_for_update()
            acc_res = await db.execute(acc_stmt)
            account = acc_res.scalar_one_or_none()
            if not account:
                raise HTTPException(status_code=404, detail="Account not found")
                
            from app.services.instrument_registry import get_instrument_spec
            spec = get_instrument_spec(pos.symbol)
            contract_size = spec.get("contract_size", 1.0)
            
            pnl_multiplier = 1.0 if pos.quantity > 0 else -1.0
            realized_pnl = (exit_price - pos.average_price) * close_qty * pnl_multiplier * contract_size
            
            import os
            comm_rate = float(os.getenv("COMMISSION_RATE", "0.00005"))
            close_commission = close_qty * contract_size * exit_price * comm_rate
            
            # Create close order for audit trail
            close_order = Order(
                id=uuid.uuid4(),
                user_id=user_id,
                symbol=pos.symbol,
                side=OrderSide.SELL if pos.quantity > 0 else OrderSide.BUY,
                type=OrderType.MARKET,
                quantity=close_qty,
                price=exit_price,
                status=OrderStatus.FILLED,
                account_type=pos.account_type,
                created_at=datetime.now(timezone.utc)
            )
            db.add(close_order)
            await db.flush()
            
            # Update position
            pos.quantity = pos.quantity - (close_qty if pos.quantity > 0 else -close_qty)
            pos.realized_pnl = float(pos.realized_pnl or 0.0) + realized_pnl
            pos.commission = float(pos.commission or 0.0) + close_commission
            pos.updated_at = datetime.now(timezone.utc)
            
            account.balance = float(account.balance) + realized_pnl - close_commission
            
            # Recalculate margins and equity
            await recalculate_user_metrics(db, user_id, account)
            
            # Create TradeHistory record
            trade = TradeHistory(
                id=uuid.uuid4(),
                user_id=user_id,
                symbol=pos.symbol,
                side="buy" if pos.quantity > 0 else "sell",
                entry_price=pos.average_price,
                exit_price=exit_price,
                quantity=close_qty,
                pnl=realized_pnl,
                account_type=pos.account_type,
                timestamp=datetime.now(timezone.utc)
            )
            db.add(trade)
            await db.flush()
            
            # Broadcast updates
            from app.api.history import TradeHistoryResponse
            trade_data = TradeHistoryResponse.model_validate(trade).model_dump(mode='json')
            await manager.broadcast_event("trade_closed", trade_data, user_id=user_id)
            
            from app.api.orders import OrderResponse
            order_data = OrderResponse.model_validate(close_order).model_dump(mode='json')
            await manager.broadcast_event("order_updated", order_data, user_id=user_id)
            
            from app.api.positions import PositionResponse
            pos_data = PositionResponse.model_validate(pos).model_dump(mode='json')
            await manager.broadcast_event("position_update", pos_data, user_id=user_id)
            
            from app.api.sync import AccountResponse
            acc_data = AccountResponse.model_validate(account).model_dump(mode='json')
            await manager.broadcast_event("account_update", acc_data, user_id=user_id)
            
    return {"success": True, "status": "success"}

# Deprecated endpoint removed to avoid unintended bulk closing of positions. Use /close-symbol with position_id instead.

@router.delete("/{id}")
async def close_position_delete(id: UUID, db: AsyncSession = Depends(get_db), user_id: UUID = Depends(get_current_user_id)):
    async with db.begin():
        stmt = select(Position).where(Position.id == id, Position.user_id == user_id).with_for_update()
        res = await db.execute(stmt)
        pos = res.scalar_one_or_none()
        if not pos or pos.quantity == 0:
            raise HTTPException(status_code=404, detail="Active position not found")
        price = await get_price(pos.symbol)
        
        print(f"Closing Position ID: {pos.id}")
        print(f"Symbol: {pos.symbol}")
        
        await close_position_sltp(db, pos, price, "Manual Close by ID via DELETE")
        
        # Query remaining active positions
        rem_stmt = select(Position).where(Position.user_id == user_id, Position.quantity != 0.0, Position.account_type == pos.account_type)
        rem_res = await db.execute(rem_stmt)
        rem_count = len(rem_res.scalars().all())
        print(f"Remaining Open Positions: {rem_count}")
        
    return {"status": "success"}

@router.post("/close-all")
async def close_all(account_type: str = "live", db: AsyncSession = Depends(get_db), user_id: UUID = Depends(get_current_user_id)):
    async with db.begin():
        stmt = select(Position).where(Position.user_id == user_id, Position.quantity != 0.0, Position.account_type == account_type).with_for_update()
        res = await db.execute(stmt)
        active_positions = res.scalars().all()
        
        for pos in active_positions:
            price = await get_price(pos.symbol)
            await close_position_sltp(db, pos, price, "Manual Close All")
            
    return {"status": "success", "closed_count": len(active_positions)}

@router.post("/reverse")
async def reverse_position(req: ReverseRequest, db: AsyncSession = Depends(get_db), user_id: UUID = Depends(get_current_user_id)):
    async with db.begin():
        if req.position_id:
            stmt = select(Position).where(Position.id == req.position_id, Position.user_id == user_id).with_for_update()
        else:
            stmt = select(Position).where(
                Position.user_id == user_id,
                Position.symbol == req.symbol.upper() if req.symbol else None,
                Position.account_type == req.account_type,
                Position.quantity != 0.0
            ).order_by(Position.updated_at.asc()).limit(1).with_for_update()
        res = await db.execute(stmt)
        pos = res.scalar_one_or_none()
        if not pos or pos.quantity == 0:
            raise HTTPException(status_code=404, detail="Active position not found")
        
        qty = abs(pos.quantity) * 2.0
        side = OrderSide.SELL if pos.quantity > 0 else OrderSide.BUY
        pos_id_str = str(pos.id)
        sym = pos.symbol

    order_obj = DummyOrder(
        symbol=sym,
        side=side,
        type=OrderType.MARKET,
        quantity=qty,
        account_type=req.account_type,
        position_ticket=pos_id_str
    )

    res_order = await process_new_order(db, order_obj, user_id)
    return {"status": "success", "order": res_order}

@router.post("/break-even", response_model=PositionResponse)
async def set_break_even(req: BreakEvenRequest, db: AsyncSession = Depends(get_db), user_id: UUID = Depends(get_current_user_id), background_tasks: BackgroundTasks = None):
    async with db.begin():
        if req.position_id:
            stmt = select(Position).where(Position.id == req.position_id, Position.user_id == user_id).with_for_update()
        else:
            stmt = select(Position).where(
                Position.user_id == user_id,
                Position.symbol == req.symbol.upper() if req.symbol else None,
                Position.account_type == req.account_type,
                Position.quantity != 0.0
            ).order_by(Position.updated_at.asc()).limit(1).with_for_update()
        res = await db.execute(stmt)
        pos = res.scalar_one_or_none()
        if not pos or pos.quantity == 0:
            raise HTTPException(status_code=404, detail="Active position not found")
        
        pos.stop_loss = pos.average_price
        pos.updated_at = datetime.now(timezone.utc)
        
        acc_stmt = select(Account).where(Account.user_id == user_id, Account.account_type == req.account_type).with_for_update()
        acc_res = await db.execute(acc_stmt)
        account = acc_res.scalar_one_or_none()
        if account:
            await recalculate_user_metrics(db, user_id, account)
            
    # Broadcast updates
    from app.api.positions import PositionResponse as PR
    pos_data = PR.model_validate(pos).model_dump(mode="json")
    
    if account:
        from app.api.sync import AccountResponse
        acc_data = AccountResponse.model_validate(account).model_dump(mode="json")
    else:
        acc_data = None
        
    if background_tasks:
        background_tasks.add_task(manager.broadcast_event, "position_update", pos_data, user_id=user_id)
        if acc_data:
            background_tasks.add_task(manager.broadcast_event, "account_update", acc_data, user_id=user_id)
    else:
        asyncio.create_task(manager.broadcast_event("position_update", pos_data, user_id=user_id))
        if acc_data:
            asyncio.create_task(manager.broadcast_event("account_update", acc_data, user_id=user_id))
        
    return pos
