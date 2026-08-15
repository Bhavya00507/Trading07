from fastapi import APIRouter, Depends, HTTPException, status, Request, BackgroundTasks
from typing import List
import time
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.session import get_db
from app.models.order import Order, OrderStatus, OrderSide, OrderType
from app.models.trade_history import TradeHistory
from app.models.position import Position
from pydantic import BaseModel, Field
from datetime import datetime

router = APIRouter(prefix="/orders", tags=["orders"])

class OrderCreate(BaseModel):
    symbol: str
    side: OrderSide
    type: OrderType
    quantity: float
    price: float | None = None
    stop_price: float | None = None
    stop_loss: float | None = None
    take_profit: float | None = None
    is_reduce_only: bool | None = False
    is_post_only: bool | None = False
    time_in_force: str | None = "GTC"
    gtd_timestamp: datetime | None = None
    iceberg_visible_qty: float | None = None
    oco_link_id: str | None = None
    algo_type: str | None = None
    algo_params: str | None = None
    position_ticket: str | None = None
    account_type: str = "live"

class OrderResponse(BaseModel):
    id: UUID
    symbol: str
    side: OrderSide
    type: OrderType
    quantity: float
    price: float | None
    stop_price: float | None = None
    stop_loss: float | None = None
    take_profit: float | None = None
    status: OrderStatus
    created_at: datetime
    is_reduce_only: bool
    is_post_only: bool
    time_in_force: str
    gtd_timestamp: datetime | None = None
    iceberg_visible_qty: float | None = None
    oco_link_id: str | None = None
    algo_type: str | None = None
    algo_params: str | None = None
    position_ticket: str | None = None

    class Config:
        orm_mode = True
        from_attributes = True

from app.api.auth import get_current_user_id

@router.post("", response_model=OrderResponse)
async def create_order(
    request: Request,
    order: OrderCreate,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
    background_tasks: BackgroundTasks = None
):
    print("Incoming Order:", order.model_dump())
    from app.services.order_engine import process_new_order
    start_time = getattr(request.state, "start_time", None) or time.time()
    created = await process_new_order(db, order, user_id, start_time, background_tasks)
    return created

@router.get("", response_model=List[OrderResponse])
async def list_orders(db: AsyncSession = Depends(get_db), user_id: UUID = Depends(get_current_user_id)):
    result = await db.execute(select(Order).where(Order.user_id == user_id))
    orders = result.scalars().all()
    return orders

class OrderModify(BaseModel):
    price: float | None = None
    quantity: float | None = None
    stop_price: float | None = None
    stop_loss: float | None = None
    take_profit: float | None = None

@router.delete("/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_order(order_id: UUID, db: AsyncSession = Depends(get_db), user_id: UUID = Depends(get_current_user_id)):
    result = await db.execute(
        select(Order).where(Order.id == order_id, Order.user_id == user_id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status not in (OrderStatus.PENDING, OrderStatus.PARTIAL):
        raise HTTPException(status_code=400, detail="Cannot cancel processed order")
    order.status = OrderStatus.CANCELLED
    await db.commit()
    
    # Broadcast order cancellation/update
    try:
        from app.websocket.manager import manager
        order_data = OrderResponse.model_validate(order).model_dump(mode="json")
        await manager.broadcast_event("order_updated", order_data, user_id=user_id)
    except Exception as e:
        print(f"Error broadcasting cancel_order event: {e}")
        
    return None

@router.patch("/{order_id}", response_model=OrderResponse)
async def modify_order(order_id: UUID, updates: OrderModify, db: AsyncSession = Depends(get_db), user_id: UUID = Depends(get_current_user_id)):
    result = await db.execute(
        select(Order).where(Order.id == order_id, Order.user_id == user_id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status not in (OrderStatus.PENDING, OrderStatus.PARTIAL):
        raise HTTPException(status_code=400, detail="Cannot modify processed order")
    
    if updates.price is not None:
        order.price = updates.price
    if updates.quantity is not None:
        order.quantity = updates.quantity
    if updates.stop_price is not None:
        order.stop_price = updates.stop_price
    if updates.stop_loss is not None:
        order.stop_loss = updates.stop_loss
    if updates.take_profit is not None:
        order.take_profit = updates.take_profit
        
    await db.commit()
    
    # Broadcast order update
    from app.websocket.manager import manager
    order_data = OrderResponse.model_validate(order).model_dump(mode="json")
    await manager.broadcast_event("order_updated", order_data, user_id=user_id)
    
    return order
