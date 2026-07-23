import uuid
import json
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.order import Order, OrderStatus, OrderSide, OrderType
from app.models.position import Position
from app.models.account import Account
from app.models.trade_history import TradeHistory
from app.websocket.manager import manager
from pydantic import BaseModel

class OrderCreatedResponse(BaseModel):
    id: uuid.UUID
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
    is_reduce_only: bool = False
    is_post_only: bool = False
    time_in_force: str = "GTC"
    gtd_timestamp: datetime | None = None
    iceberg_visible_qty: float | None = None
    oco_link_id: str | None = None
    algo_type: str | None = None
    algo_params: str | None = None

    class Config:
        orm_mode = True
        from_attributes = True

def get_symbol_spread_and_commission(symbol: str, price: float, quantity: float, side: str) -> tuple[float, float]:
    from app.services.instrument_registry import get_instrument_spec
    spec = get_instrument_spec(symbol)
    category = spec.get("category", "crypto").lower()
    contract_size = spec.get("contract_size", 1.0)
    
    import os
    try:
        crypto_spread = float(os.getenv("SPREAD_CRYPTO", "0.5"))
        forex_spread = float(os.getenv("SPREAD_FOREX", "0.00001"))
        metals_spread = float(os.getenv("SPREAD_METALS", "0.05"))
        indices_spread = float(os.getenv("SPREAD_INDICES", "0.2"))
        stocks_spread = float(os.getenv("SPREAD_STOCKS", "0.005"))
    except ValueError:
        crypto_spread = 0.5
        forex_spread = 0.00001
        metals_spread = 0.05
        indices_spread = 0.2
        stocks_spread = 0.005

    spread = 0.0
    if category == "crypto":
        spread = crypto_spread
    elif category == "forex":
        spread = forex_spread
    elif category == "metals":
        spread = metals_spread
    elif category == "indices":
        spread = indices_spread
    else:
        spread = stocks_spread

    adj_price = price
    if side == "buy" or side == OrderSide.BUY:
        adj_price += spread / 2.0
    else:
        adj_price -= spread / 2.0

    comm_rate = float(os.getenv("COMMISSION_RATE", "0.00005"))
    commission = quantity * contract_size * adj_price * comm_rate
    
    return adj_price, commission

async def recalculate_user_metrics(db: AsyncSession, user_id: uuid.UUID, account: Account, in_liquidation: bool = False):
    """Recalculate margins, unrealized P&L, equity, peak, and drawdown for a user account.
    Also handles trailing stops, margin calls, and Stop Out liquidations.
    """
    from app.services.market_data import _latest_prices
    
    pos_all_stmt = select(Position).where(Position.user_id == user_id, Position.account_type == account.account_type)
    pos_all_res = await db.execute(pos_all_stmt)
    all_positions = pos_all_res.scalars().all()
    
    total_unrealized_pnl = 0.0
    total_margin_used = 0.0
    
    for pos in all_positions:
        if pos.quantity == 0:
            pos.unrealized_pnl = 0.0
            continue
            
        # Get live price from memory or fallback to entry price
        curr_price = _latest_prices.get(pos.symbol, pos.average_price)

        # Update trailing stop if configured
        if pos.trailing_stop and pos.trailing_stop > 0:
            if pos.quantity > 0:  # Long
                candidate_sl = curr_price - pos.trailing_stop
                if pos.stop_loss is None or candidate_sl > pos.stop_loss:
                    pos.stop_loss = candidate_sl
                    pos.updated_at = datetime.now(timezone.utc)
                    db.add(pos)
                    # Broadcast position_update for trailing stop adjustment
                    from app.api.positions import PositionResponse
                    pos_data = PositionResponse.model_validate(pos).model_dump(mode='json')
                    await manager.broadcast_event("position_update", pos_data, user_id=user_id)
            elif pos.quantity < 0:  # Short
                candidate_sl = curr_price + pos.trailing_stop
                if pos.stop_loss is None or candidate_sl < pos.stop_loss:
                    pos.stop_loss = candidate_sl
                    pos.updated_at = datetime.now(timezone.utc)
                    db.add(pos)
                    # Broadcast position_update for trailing stop adjustment
                    from app.api.positions import PositionResponse
                    pos_data = PositionResponse.model_validate(pos).model_dump(mode='json')
                    await manager.broadcast_event("position_update", pos_data, user_id=user_id)
            
        from app.services.instrument_registry import get_instrument_spec
        spec = get_instrument_spec(pos.symbol)
        contract_size = spec.get("contract_size", 1.0)

        if pos.quantity > 0:
            pos_pnl = (curr_price - pos.average_price) * pos.quantity * contract_size
        else:
            pos_pnl = (pos.average_price - curr_price) * abs(pos.quantity) * contract_size
            
        pos.unrealized_pnl = pos_pnl
        total_unrealized_pnl += pos_pnl
        
        # Margin calculated using 20x leverage
        pos_value = abs(pos.quantity) * contract_size * curr_price
        total_margin_used += pos_value / 20.0
        
    account.equity = float(account.balance) + total_unrealized_pnl
    account.margin_used = total_margin_used
    account.free_margin = float(account.equity) - total_margin_used
    
    account.peak_balance = max(float(account.peak_balance or 0.0), float(account.balance), float(account.equity))
    if account.peak_balance > 0:
        account.drawdown = (float(account.peak_balance) - float(account.equity)) / float(account.peak_balance)
    else:
        account.drawdown = 0.0
        
    account.daily_pnl = float(account.equity) - 10000.0

    # Handle Margin Warning (Margin Call) & Stop Out (Liquidation)
    if total_margin_used > 0:
        margin_level = (float(account.equity) / total_margin_used) * 100.0
        
        # 1. Margin Call Warning (if margin level < 100%)
        if margin_level < 100.0:
            await manager.broadcast_event("margin_call", {
                "user_id": str(user_id),
                "margin_level": margin_level,
                "equity": float(account.equity),
                "margin_used": total_margin_used
            }, user_id=user_id)
            
        # 2. Stop Out / Liquidation (if margin level < 50%)
        if not in_liquidation and margin_level < 50.0:
            # Broadcast stop_out event
            await manager.broadcast_event("stop_out", {
                "user_id": str(user_id),
                "margin_level": margin_level,
                "equity": float(account.equity),
                "margin_used": total_margin_used
            }, user_id=user_id)
            
            # Start liquidating positions one-by-one, worst to best
            while total_margin_used > 0 and (float(account.equity) / total_margin_used) * 100.0 < 50.0:
                pos_all_stmt = select(Position).where(Position.user_id == user_id, Position.account_type == account.account_type, Position.quantity != 0.0)
                pos_all_res = await db.execute(pos_all_stmt)
                active_positions = pos_all_res.scalars().all()
                if not active_positions:
                    break
                
                # Recalculate P&L for sorting
                for p in active_positions:
                    curr_price = _latest_prices.get(p.symbol, p.average_price)
                    if p.quantity > 0:
                        p.unrealized_pnl = (curr_price - p.average_price) * p.quantity
                    else:
                        p.unrealized_pnl = (p.average_price - curr_price) * abs(p.quantity)
                        
                active_positions.sort(key=lambda p: p.unrealized_pnl or 0.0)
                worst_pos = active_positions[0]
                
                exit_price = _latest_prices.get(worst_pos.symbol, worst_pos.average_price)
                
                # Close the worst position
                await close_position_sltp_internal(db, worst_pos, exit_price, "Stop Out / Liquidation")
                
                # Re-query all positions of the user to recalculate updated account metrics
                pos_all_res2 = await db.execute(select(Position).where(Position.user_id == user_id, Position.account_type == account.account_type))
                all_positions = pos_all_res2.scalars().all()
                
                total_unrealized_pnl = 0.0
                total_margin_used = 0.0
                for pos in all_positions:
                    if pos.quantity == 0:
                        pos.unrealized_pnl = 0.0
                        continue
                    curr_price = _latest_prices.get(pos.symbol, pos.average_price)
                    if pos.quantity > 0:
                        pos.unrealized_pnl = (curr_price - pos.average_price) * pos.quantity
                    else:
                        pos.unrealized_pnl = (pos.average_price - curr_price) * abs(pos.quantity)
                    total_unrealized_pnl += pos.unrealized_pnl
                    total_margin_used += (abs(pos.quantity) * curr_price) / 20.0
                    
                account.equity = float(account.balance) + total_unrealized_pnl
                account.margin_used = total_margin_used
                account.free_margin = float(account.equity) - total_margin_used
                account.peak_balance = max(float(account.peak_balance or 0.0), float(account.balance), float(account.equity))
                if account.peak_balance > 0:
                    account.drawdown = (float(account.peak_balance) - float(account.equity)) / float(account.peak_balance)
                else:
                    account.drawdown = 0.0
                account.daily_pnl = float(account.equity) - 10000.0


async def execute_order_fill(db: AsyncSession, order: Order, exec_price: float):
    """Process position updates, P&L calculations, trade history logs, and account metrics for an order execution."""
    # Lock user account row
    acc_stmt = select(Account).where(Account.user_id == order.user_id, Account.account_type == order.account_type).with_for_update()
    acc_res = await db.execute(acc_stmt)
    account = acc_res.scalars().first()
    if not account:
        return

    # Lock targeted position row (support multiple positions)
    position_ticket = getattr(order, "position_ticket", None)
    position = None
    if position_ticket:
        try:
            ticket_uuid = uuid.UUID(position_ticket) if isinstance(position_ticket, str) else position_ticket
            pos_stmt = select(Position).where(Position.id == ticket_uuid, Position.user_id == order.user_id).with_for_update()
            pos_res = await db.execute(pos_stmt)
            position = pos_res.scalar_one_or_none()
        except ValueError:
            pass

    if not position and getattr(order, "is_reduce_only", False):
        opp_side_qty_filter = Position.quantity < 0 if order.side == OrderSide.BUY else Position.quantity > 0
        pos_stmt = select(Position).where(
            Position.user_id == order.user_id,
            Position.symbol == order.symbol,
            Position.account_type == order.account_type,
            opp_side_qty_filter
        ).order_by(Position.updated_at.asc()).with_for_update()
        pos_res = await db.execute(pos_stmt)
        position = pos_res.scalar_one_or_none()
    
    current_qty = position.quantity if position else 0.0
    current_avg_price = position.average_price if position else 0.0
    
    # Mark order as filled
    order.status = OrderStatus.FILLED
    db.add(order)

    # OCO Linkage Cancel
    if order.oco_link_id:
        cancel_stmt = select(Order).where(
            Order.user_id == order.user_id,
            Order.oco_link_id == order.oco_link_id,
            Order.id != order.id,
            Order.status.in_([OrderStatus.PENDING, OrderStatus.PARTIAL])
        )
        cancel_res = await db.execute(cancel_stmt)
        other_orders = cancel_res.scalars().all()
        for other_ord in other_orders:
            other_ord.status = OrderStatus.CANCELLED
            db.add(other_ord)
            from app.api.orders import OrderResponse
            other_json = OrderResponse.model_validate(other_ord).model_dump_json()
            await manager.broadcast_event("order_updated", json.loads(other_json), user_id=order.user_id)

    # Algorithmic Order Slice Logic
    if order.algo_type and order.algo_params:
        try:
            params = json.loads(order.algo_params)
            remaining = params.get("remaining_qty", 0.0)
            if remaining > 0.0:
                if order.algo_type == "iceberg":
                    visible = params.get("visible_qty", 0.0)
                    slice_qty = min(visible, remaining)
                else:  # twap / vwap
                    original = params.get("original_qty", order.quantity / 0.2)
                    slice_qty = original * 0.2
                    slice_qty = min(slice_qty, remaining)
                
                params["remaining_qty"] = remaining - slice_qty
                params["slice_no"] = params.get("slice_no", 1) + 1
                
                from app.api.orders import OrderCreate
                next_order_create = OrderCreate(
                    symbol=order.symbol,
                    side=order.side,
                    type=OrderType.MARKET if order.algo_type in ["twap", "vwap"] else OrderType.LIMIT,
                    quantity=slice_qty,
                    price=order.price,
                    stop_loss=order.stop_loss,
                    take_profit=order.take_profit,
                    account_type=order.account_type,
                    algo_type=order.algo_type,
                    algo_params=json.dumps(params)
                )
                
                async def spawn_next_slice():
                    await asyncio.sleep(1.0)  # brief delay to simulate interval
                    from app.database.session import AsyncSessionLocal
                    async with AsyncSessionLocal() as next_session:
                        await process_new_order(next_session, next_order_create, order.user_id)
                asyncio.create_task(spawn_next_slice())
        except Exception as e:
            print("Failed to spawn next algo slice:", e)
    
    side_multiplier = 1.0 if order.side == OrderSide.BUY else -1.0
    order_qty = order.quantity
    realized_pnl = 0.0
    closed_qty = 0.0
    
    from app.services.instrument_registry import get_instrument_spec
    spec = get_instrument_spec(order.symbol)
    contract_size = spec.get("contract_size", 1.0)

    # Adjust execution price by spread and calculate commission
    exec_price, commission_val = get_symbol_spread_and_commission(
        order.symbol, exec_price, order.quantity, order.side
    )
    
    # Netting calculations
    if position:
        old_qty = position.quantity
        old_avg = position.average_price
        is_increasing = (old_qty >= 0 and order.side == OrderSide.BUY) or (old_qty <= 0 and order.side == OrderSide.SELL)
        
        if is_increasing:
            new_qty = old_qty + (order_qty * side_multiplier)
            new_avg = ((old_avg * abs(old_qty)) + (exec_price * order_qty)) / abs(new_qty)
            position.quantity = new_qty
            position.average_price = new_avg
            position.updated_at = datetime.now(timezone.utc)
            # Inherit SL/TP
            position.stop_loss = order.stop_loss
            position.take_profit = order.take_profit
            position.commission = float(position.commission or 0.0) + commission_val
        else:
            abs_old_qty = abs(old_qty)
            pnl_multiplier = 1.0 if old_qty > 0 else -1.0
            
            if order_qty < abs_old_qty:
                # Partial Close
                realized_pnl = (exec_price - old_avg) * order_qty * pnl_multiplier * contract_size
                closed_qty = order_qty
                position.quantity = old_qty + (order_qty * side_multiplier)
                position.updated_at = datetime.now(timezone.utc)
                position.commission = float(position.commission or 0.0) + commission_val
            elif order_qty == abs_old_qty:
                # Complete Close
                realized_pnl = (exec_price - old_avg) * order_qty * pnl_multiplier * contract_size
                closed_qty = order_qty
                position.quantity = 0.0
                position.average_price = 0.0
                position.stop_loss = None
                position.take_profit = None
                position.updated_at = datetime.now(timezone.utc)
                position.commission = float(position.commission or 0.0) + commission_val
            else:
                # Reversal
                realized_pnl = (exec_price - old_avg) * abs_old_qty * pnl_multiplier * contract_size
                closed_qty = abs_old_qty
                excess_qty = order_qty - abs_old_qty
                
                position.quantity = 0.0
                position.average_price = 0.0
                position.stop_loss = None
                position.take_profit = None
                position.updated_at = datetime.now(timezone.utc)
                position.commission = float(position.commission or 0.0) + (commission_val * (abs_old_qty / order_qty))
                
                # Open brand new position for the excess
                _, excess_comm = get_symbol_spread_and_commission(order.symbol, exec_price, excess_qty, order.side)
                new_pos = Position(
                    id=uuid.uuid4(),
                    user_id=order.user_id,
                    symbol=order.symbol,
                    quantity=excess_qty * side_multiplier,
                    average_price=exec_price,
                    unrealized_pnl=0.0,
                    realized_pnl=0.0,
                    stop_loss=order.stop_loss,
                    take_profit=order.take_profit,
                    commission=excess_comm,
                    account_type=order.account_type,
                    updated_at=datetime.now(timezone.utc)
                )
                db.add(new_pos)
    else:
        # Open brand new position
        position = Position(
            id=uuid.uuid4(),
            user_id=order.user_id,
            symbol=order.symbol,
            quantity=order_qty * side_multiplier,
            average_price=exec_price,
            unrealized_pnl=0.0,
            realized_pnl=0.0,
            stop_loss=order.stop_loss,
            take_profit=order.take_profit,
            commission=commission_val,
            account_type=order.account_type,
            updated_at=datetime.now(timezone.utc),
        )
        db.add(position)
        
    # Apply P&L and commission to account balance
    account.balance = float(account.balance) + realized_pnl - commission_val
    if position:
        position.realized_pnl = float(position.realized_pnl or 0.0) + realized_pnl
        
    # Save TradeHistory record if position closed partially or fully
    if closed_qty > 0.0:
        original_side = "buy" if (old_qty > 0) else "sell"
        trade = TradeHistory(
            id=uuid.uuid4(),
            user_id=order.user_id,
            symbol=order.symbol,
            side=original_side,
            entry_price=old_avg,
            exit_price=exec_price,
            quantity=closed_qty,
            pnl=realized_pnl,
            account_type=order.account_type,
            timestamp=datetime.now(timezone.utc)
        )
        db.add(trade)
        await db.flush()
        
        # Broadcast trade history to frontend
        from app.api.history import TradeHistoryResponse
        trade_data = TradeHistoryResponse.model_validate(trade).model_dump(mode='json')
        await manager.broadcast_event("trade_closed", trade_data, user_id=order.user_id)
        
    # Recalculate margins and equity
    await recalculate_user_metrics(db, order.user_id, account)
    
    # Broadcast WS updates
    from app.api.orders import OrderResponse
    order_data = OrderResponse.model_validate(order).model_dump(mode='json')
    await manager.broadcast_event("order_updated", order_data, user_id=order.user_id)
    
    if position:
        from app.api.positions import PositionResponse
        pos_data = PositionResponse.model_validate(position).model_dump(mode='json')
        await manager.broadcast_event("position_update", pos_data, user_id=order.user_id)
        
    from app.api.sync import AccountResponse
    acc_data = AccountResponse.model_validate(account).model_dump(mode='json')
    await manager.broadcast_event("account_update", acc_data, user_id=order.user_id)


async def close_position_sltp_internal(db: AsyncSession, position: Position, exit_price: float, reason: str):
    """Internal helper to close a position and record trade history. Does not recalculate metrics."""
    acc_stmt = select(Account).where(Account.user_id == position.user_id, Account.account_type == position.account_type).with_for_update()
    acc_res = await db.execute(acc_stmt)
    account = acc_res.scalars().first()
    if not account:
        return
        
    from app.services.instrument_registry import get_instrument_spec
    spec = get_instrument_spec(position.symbol)
    contract_size = spec.get("contract_size", 1.0)

    old_qty = position.quantity
    old_avg = position.average_price
    pnl_multiplier = 1.0 if old_qty > 0 else -1.0
    abs_qty = abs(old_qty)
    
    realized_pnl = (exit_price - old_avg) * abs_qty * pnl_multiplier * contract_size
    import os
    comm_rate = float(os.getenv("COMMISSION_RATE", "0.00005"))
    close_commission = abs_qty * contract_size * exit_price * comm_rate
    
    # Create close order for audit trail
    close_order = Order(
        id=uuid.uuid4(),
        user_id=position.user_id,
        symbol=position.symbol,
        side=OrderSide.SELL if old_qty > 0 else OrderSide.BUY,
        type=OrderType.MARKET,
        quantity=abs_qty,
        price=exit_price,
        status=OrderStatus.FILLED,
        account_type=position.account_type,
        created_at=datetime.now(timezone.utc)
    )
    db.add(close_order)
    await db.flush()
    
    # Close position metrics
    position.quantity = 0.0
    position.average_price = 0.0
    position.stop_loss = None
    position.take_profit = None
    position.trailing_stop = None
    position.realized_pnl = float(position.realized_pnl or 0.0) + realized_pnl
    position.commission = float(position.commission or 0.0) + close_commission
    position.unrealized_pnl = 0.0
    position.updated_at = datetime.now(timezone.utc)
    
    account.balance = float(account.balance) + realized_pnl - close_commission
    
    # Create TradeHistory record
    trade = TradeHistory(
        id=uuid.uuid4(),
        user_id=position.user_id,
        symbol=position.symbol,
        side="buy" if old_qty > 0 else "sell",
        entry_price=old_avg,
        exit_price=exit_price,
        quantity=abs_qty,
        pnl=realized_pnl,
        account_type=position.account_type,
        timestamp=datetime.now(timezone.utc)
    )
    db.add(trade)
    await db.flush()
    
    # Broadcast trade closed event
    from app.api.history import TradeHistoryResponse
    trade_data = TradeHistoryResponse.model_validate(trade).model_dump(mode='json')
    await manager.broadcast_event("trade_closed", trade_data, user_id=position.user_id)
    
    # Broadcast order fill
    from app.api.orders import OrderResponse
    order_data = OrderResponse.model_validate(close_order).model_dump(mode='json')
    await manager.broadcast_event("order_updated", order_data, user_id=position.user_id)
    
    # Broadcast position update
    from app.api.positions import PositionResponse
    pos_data = PositionResponse.model_validate(position).model_dump(mode='json')
    await manager.broadcast_event("position_update", pos_data, user_id=position.user_id)


async def close_position_sltp(db: AsyncSession, position: Position, exit_price: float, reason: str):
    """Close a position automatically due to Stop Loss or Take Profit execution."""
    await close_position_sltp_internal(db, position, exit_price, reason)
    
    # Recalculate margins and equity
    acc_stmt = select(Account).where(Account.user_id == position.user_id, Account.account_type == position.account_type).with_for_update()
    acc_res = await db.execute(acc_stmt)
    account = acc_res.scalars().first()
    if account:
        await recalculate_user_metrics(db, position.user_id, account)
        
        # Broadcast account update
        from app.api.sync import AccountResponse
        acc_data = AccountResponse.model_validate(account).model_dump(mode='json')
        await manager.broadcast_event("account_update", acc_data, user_id=position.user_id)


async def process_new_order(db: AsyncSession, order_data, user_id: uuid.UUID, start_time: float = None, background_tasks = None) -> OrderCreatedResponse:
    """Create an order, execute if possible, update position, broadcast events.
    Uses database row-level locks and executes within an atomic ACID transaction.
    """
    from app.services.market_session import is_market_open
    from fastapi import HTTPException
    if not is_market_open(order_data.symbol):
        raise HTTPException(status_code=400, detail=f"Market is closed for {order_data.symbol}")

    import time
    t_start = start_time or time.time()
    t_enter = time.time()
    timings = {}
    
    from app.services.market_data import get_price

    async with db.begin():
        t_locks_start = time.time()
        order_id = getattr(order_data, "id", None) or uuid.uuid4()
        
        # Idempotency Check
        existing_stmt = select(Order).where(Order.id == order_id)
        existing_res = await db.execute(existing_stmt)
        existing_order = existing_res.scalar_one_or_none()
        if existing_order:
            return OrderCreatedResponse.model_validate(existing_order)
            
        acct_type = getattr(order_data, "account_type", "live")
        # Lock user account row
        acc_stmt = select(Account).where(Account.user_id == user_id, Account.account_type == acct_type).with_for_update()
        acc_res = await db.execute(acc_stmt)
        account = acc_res.scalars().first()
        
        if not account:
            account = Account(
                id=uuid.uuid4(),
                user_id=user_id,
                balance=10000.0,
                equity=10000.0,
                peak_balance=10000.0,
                margin_used=0.0,
                free_margin=10000.0,
                daily_pnl=0.0,
                drawdown=0.0,
                account_type=acct_type
            )
            db.add(account)
            await db.flush()

        # Determine execution price
        try:
            exec_price = await get_price(order_data.symbol)
        except KeyError:
            exec_price = 0.0
            
        if order_data.type in [OrderType.LIMIT, OrderType.STOP]:
            exec_price = order_data.price

        # Adjust execution price by spread and calculate commission
        exec_price, commission_val = get_symbol_spread_and_commission(
            order_data.symbol, exec_price, order_data.quantity, order_data.side
        )

        # Lock position row (support multiple positions)
        position_ticket = getattr(order_data, "position_ticket", None)
        position = None
        if position_ticket:
            try:
                ticket_uuid = uuid.UUID(position_ticket) if isinstance(position_ticket, str) else position_ticket
                pos_stmt = select(Position).where(Position.id == ticket_uuid, Position.user_id == user_id).with_for_update()
                pos_res = await db.execute(pos_stmt)
                position = pos_res.scalar_one_or_none()
            except ValueError:
                pass

        if not position and getattr(order_data, "is_reduce_only", False):
            opp_side_qty_filter = Position.quantity < 0 if order_data.side == OrderSide.BUY else Position.quantity > 0
            pos_stmt = select(Position).where(
                Position.user_id == user_id,
                Position.symbol == order_data.symbol,
                Position.account_type == acct_type,
                opp_side_qty_filter
            ).order_by(Position.updated_at.asc()).with_for_update()
            pos_res = await db.execute(pos_stmt)
            position = pos_res.scalar_one_or_none()

        t_pos_lookup = time.time()
        timings["position_lookup"] = (t_pos_lookup - t_locks_start) * 1000.0

        # 1. Reduce Only validation
        if getattr(order_data, "is_reduce_only", False):
            from app.services.risk_engine import RiskException
            if not position or position.quantity == 0.0:
                raise RiskException(
                    code="REDUCE_ONLY_REJECTED",
                    reason="NO_ACTIVE_POSITION",
                    message="Reduce Only order rejected: no open position exists to reduce."
                )
            is_same_dir = (position.quantity > 0 and order_data.side == OrderSide.BUY) or \
                          (position.quantity < 0 and order_data.side == OrderSide.SELL)
            if is_same_dir:
                raise RiskException(
                    code="REDUCE_ONLY_REJECTED",
                    reason="CANNOT_INCREASE_POSITION",
                    message="Reduce Only order rejected: cannot increase position size."
                )
            if order_data.quantity > abs(position.quantity):
                order_data.quantity = abs(position.quantity)

        # 2. Post Only validation
        if getattr(order_data, "is_post_only", False):
            from app.services.risk_engine import RiskException
            if order_data.type != OrderType.LIMIT:
                raise RiskException(
                    code="POST_ONLY_REJECTED",
                    reason="INVALID_ORDER_TYPE",
                    message="Post Only order must be a LIMIT order."
                )
            if exec_price > 0.0:
                if order_data.side == OrderSide.BUY and exec_price <= order_data.price:
                    raise RiskException(
                        code="POST_ONLY_REJECTED",
                        reason="WOULD_EXECUTE_IMMEDIATELY",
                        message="Post Only order rejected: would execute immediately."
                    )
                if order_data.side == OrderSide.SELL and exec_price >= order_data.price:
                    raise RiskException(
                        code="POST_ONLY_REJECTED",
                        reason="WOULD_EXECUTE_IMMEDIATELY",
                        message="Post Only order rejected: would execute immediately."
                    )

        # 3. GTD validation
        tif = getattr(order_data, "time_in_force", "GTC") or "GTC"
        gtd_ts = getattr(order_data, "gtd_timestamp", None)
        if tif == "GTD":
            from app.services.risk_engine import RiskException
            if not gtd_ts:
                raise RiskException(
                    code="GTD_REJECTED",
                    reason="MISSING_GTD_TIMESTAMP",
                    message="Good Till Date order requires a gtd_timestamp."
                )
            if gtd_ts < datetime.now(timezone.utc):
                raise RiskException(
                    code="GTD_REJECTED",
                    reason="GTD_TIMESTAMP_IN_PAST",
                    message="Good Till Date timestamp must be in the future."
                )

        # Get total quantity of all active positions on this symbol for exposure limit checks
        tot_pos_stmt = select(Position).where(
            Position.user_id == user_id,
            Position.symbol == order_data.symbol,
            Position.account_type == acct_type,
            Position.quantity != 0.0
        )
        tot_pos_res = await db.execute(tot_pos_stmt)
        active_pos_list = tot_pos_res.scalars().all()
        total_qty_on_symbol = sum(p.quantity for p in active_pos_list)

        current_qty = total_qty_on_symbol
        current_avg_price = position.average_price if position else exec_price

        # Validate Order against Risk Engine rules
        t_risk_start = time.time()
        from app.services.risk_engine import validate_order_risk
        await validate_order_risk(account, order_data, exec_price, current_qty, current_avg_price, timings)
        t_risk_end = time.time()
        timings["risk_checks"] = (t_risk_end - t_risk_start) * 1000.0

        # Determine initial status
        initial_status = OrderStatus.PENDING
        if order_data.type == OrderType.MARKET:
            initial_status = OrderStatus.FILLED
        elif tif in ["IOC", "FOK"]:
            can_fill = False
            if order_data.type == OrderType.LIMIT:
                if order_data.side == OrderSide.BUY and exec_price <= order_data.price:
                    can_fill = True
                elif order_data.side == OrderSide.SELL and exec_price >= order_data.price:
                    can_fill = True
            if can_fill:
                initial_status = OrderStatus.FILLED
            else:
                if tif == "FOK":
                    from app.services.risk_engine import RiskException
                    raise RiskException(
                        code="FOK_REJECTED",
                        reason="CANNOT_FILL_IMMEDIATELY",
                        message="Fill or Kill order rejected: cannot be filled immediately in entirety."
                    )
                initial_status = OrderStatus.CANCELLED

        # Handle Algorithmic Orders: TWAP / VWAP / Iceberg slices
        target_qty = order_data.quantity
        visible_qty = getattr(order_data, "iceberg_visible_qty", None)
        algo_params_dict = {}
        if order_data.type in [OrderType.TWAP, OrderType.VWAP]:
            slice_qty = target_qty * 0.2
            target_qty = slice_qty
            initial_status = OrderStatus.FILLED
            algo_params_dict = {
                "remaining_qty": order_data.quantity - slice_qty,
                "slice_no": 1,
                "total_slices": 5,
                "original_qty": order_data.quantity
            }
        elif order_data.type == OrderType.ICEBERG:
            slice_qty = visible_qty or (target_qty * 0.1)
            target_qty = slice_qty
            initial_status = OrderStatus.FILLED
            algo_params_dict = {
                "remaining_qty": order_data.quantity - slice_qty,
                "visible_qty": slice_qty,
                "original_qty": order_data.quantity
            }

        # Insert Order Record
        new_order = Order(
            id=order_id,
            user_id=user_id,
            symbol=order_data.symbol,
            side=order_data.side,
            type=order_data.type,
            quantity=target_qty,
            price=order_data.price,
            stop_price=getattr(order_data, "stop_price", None),
            stop_loss=order_data.stop_loss,
            take_profit=order_data.take_profit,
            status=initial_status,
            account_type=acct_type,
            created_at=datetime.now(timezone.utc),
            is_reduce_only=getattr(order_data, "is_reduce_only", False) or False,
            is_post_only=getattr(order_data, "is_post_only", False) or False,
            time_in_force=tif,
            gtd_timestamp=gtd_ts,
            iceberg_visible_qty=visible_qty,
            oco_link_id=getattr(order_data, "oco_link_id", None),
            algo_type=order_data.type.value if order_data.type in [OrderType.TWAP, OrderType.VWAP, OrderType.ICEBERG] else None,
            algo_params=json.dumps(algo_params_dict) if algo_params_dict else None
        )
        db.add(new_order)
        await db.flush()
        t_order_created = time.time()
        timings["order_creation"] = (t_order_created - t_risk_end) * 1000.0

        # If Market order, execute immediately
        if new_order.status == OrderStatus.FILLED:
            # We defer execution and call execute_order_fill.
            # To handle it cleanly inside the transaction, we do it directly.
            side_multiplier = 1.0 if new_order.side == OrderSide.BUY else -1.0
            order_qty = new_order.quantity
            realized_pnl = 0.0
            closed_qty = 0.0
            
            from app.services.instrument_registry import get_instrument_spec
            spec = get_instrument_spec(new_order.symbol)
            contract_size = spec.get("contract_size", 1.0)
            
            if position:
                old_qty = position.quantity
                old_avg = position.average_price
                is_increasing = (old_qty >= 0 and new_order.side == OrderSide.BUY) or (old_qty <= 0 and new_order.side == OrderSide.SELL)
                
                if is_increasing:
                    new_qty = old_qty + (order_qty * side_multiplier)
                    new_avg = ((old_avg * abs(old_qty)) + (exec_price * order_qty)) / abs(new_qty)
                    position.quantity = new_qty
                    position.average_price = new_avg
                    position.updated_at = datetime.now(timezone.utc)
                    position.stop_loss = new_order.stop_loss
                    position.take_profit = new_order.take_profit
                    position.commission = float(position.commission or 0.0) + commission_val
                else:
                    abs_old_qty = abs(old_qty)
                    pnl_multiplier = 1.0 if old_qty > 0 else -1.0
                    
                    if order_qty < abs_old_qty:
                        realized_pnl = (exec_price - old_avg) * order_qty * pnl_multiplier * contract_size
                        closed_qty = order_qty
                        position.quantity = old_qty + (order_qty * side_multiplier)
                        position.updated_at = datetime.now(timezone.utc)
                        position.commission = float(position.commission or 0.0) + commission_val
                    elif order_qty == abs_old_qty:
                        realized_pnl = (exec_price - old_avg) * order_qty * pnl_multiplier * contract_size
                        closed_qty = order_qty
                        position.quantity = 0.0
                        position.average_price = 0.0
                        position.stop_loss = None
                        position.take_profit = None
                        position.updated_at = datetime.now(timezone.utc)
                        position.commission = float(position.commission or 0.0) + commission_val
                    else:
                        # Reversal
                        realized_pnl = (exec_price - old_avg) * abs_old_qty * pnl_multiplier * contract_size
                        closed_qty = abs_old_qty
                        excess_qty = order_qty - abs_old_qty
                        
                        position.quantity = 0.0
                        position.average_price = 0.0
                        position.stop_loss = None
                        position.take_profit = None
                        position.updated_at = datetime.now(timezone.utc)
                        position.commission = float(position.commission or 0.0) + (commission_val * (abs_old_qty / order_qty))
                        
                        # Open new position for the excess
                        _, excess_comm = get_symbol_spread_and_commission(new_order.symbol, exec_price, excess_qty, new_order.side)
                        new_pos = Position(
                            id=uuid.uuid4(),
                            user_id=user_id,
                            symbol=new_order.symbol,
                            quantity=excess_qty * side_multiplier,
                            average_price=exec_price,
                            unrealized_pnl=0.0,
                            realized_pnl=0.0,
                            stop_loss=new_order.stop_loss,
                            take_profit=new_order.take_profit,
                            commission=excess_comm,
                            account_type=acct_type,
                            updated_at=datetime.now(timezone.utc)
                        )
                        db.add(new_pos)
            else:
                position = Position(
                    id=uuid.uuid4(),
                    user_id=user_id,
                    symbol=new_order.symbol,
                    quantity=order_qty * side_multiplier,
                    average_price=exec_price,
                    unrealized_pnl=0.0,
                    realized_pnl=0.0,
                    stop_loss=new_order.stop_loss,
                    take_profit=new_order.take_profit,
                    commission=commission_val,
                    account_type=acct_type,
                    updated_at=datetime.now(timezone.utc),
                )
                db.add(position)
                
            account.balance = float(account.balance) + realized_pnl - commission_val
            if position:
                position.realized_pnl = float(position.realized_pnl or 0.0) + realized_pnl

            # Save TradeHistory record if position closed partially or fully
            if closed_qty > 0.0:
                original_side = "buy" if (old_qty > 0) else "sell"
                trade = TradeHistory(
                    id=uuid.uuid4(),
                    user_id=user_id,
                    symbol=new_order.symbol,
                    side=original_side,
                    entry_price=old_avg,
                    exit_price=exec_price,
                    quantity=closed_qty,
                    pnl=realized_pnl,
                    account_type=acct_type,
                    timestamp=datetime.now(timezone.utc)
                )
                db.add(trade)
                await db.flush()
                broadcast_trade = trade
            else:
                broadcast_trade = None
        else:
            broadcast_trade = None

        t_netting = time.time()
        timings["position_update"] = (t_netting - t_order_created) * 1000.0

        # Recalculate margins and equity
        t_recalc_start = time.time()
        await recalculate_user_metrics(db, user_id, account)
        t_recalc_end = time.time()
        timings["metrics_recalculation"] = (t_recalc_end - t_recalc_start) * 1000.0
        
        t_ser_start = time.time()
        # Serialize objects inside transaction
        from app.api.orders import OrderResponse
        from app.api.positions import PositionResponse
        from app.api.sync import AccountResponse
        from app.api.history import TradeHistoryResponse

        order_data = OrderResponse.model_validate(new_order).model_dump(mode='json')
        pos_data = PositionResponse.model_validate(position).model_dump(mode='json') if position else None
        acc_data = AccountResponse.model_validate(account).model_dump(mode='json')
        trade_data = TradeHistoryResponse.model_validate(broadcast_trade).model_dump(mode='json') if broadcast_trade else None
        
        committed_order_res = OrderCreatedResponse.model_validate(new_order)
        t_ser_end = time.time()
        timings["response_serialization"] = (t_ser_end - t_ser_start) * 1000.0
        t_commit_start = time.time()

    t_commit_end = time.time()
    timings["database_commit"] = (t_commit_end - t_commit_start) * 1000.0

    t_ws_start = time.time()
    # Broadcasting WebSocket updates outside transaction
    event_type = "order_updated" if committed_order_res.status == OrderStatus.FILLED else "order_created"
    
    import asyncio
    if background_tasks:
        background_tasks.add_task(manager.broadcast_event, event_type, order_data, user_id=user_id)
        if trade_data:
            background_tasks.add_task(manager.broadcast_event, "trade_closed", trade_data, user_id=user_id)
        if pos_data:
            background_tasks.add_task(manager.broadcast_event, "position_update", pos_data, user_id=user_id)
        background_tasks.add_task(manager.broadcast_event, "account_update", acc_data, user_id=user_id)
    else:
        asyncio.create_task(manager.broadcast_event(event_type, order_data, user_id=user_id))
        if trade_data:
            asyncio.create_task(manager.broadcast_event("trade_closed", trade_data, user_id=user_id))
        if pos_data:
            asyncio.create_task(manager.broadcast_event("position_update", pos_data, user_id=user_id))
        asyncio.create_task(manager.broadcast_event("account_update", acc_data, user_id=user_id))
    t_ws_end = time.time()
    timings["websocket_broadcast"] = (t_ws_end - t_ws_start) * 1000.0

    # Timing analysis
    total_time = (time.time() - t_start) * 1000.0
    val_ms = (t_enter - t_start) * 1000.0
    risk_ms = timings.get("risk_checks", 0.0)
    drawdown_ms = timings.get("drawdown_check", 0.0)
    margin_ms = timings.get("margin_calculation", 0.0)
    leverage_ms = timings.get("leverage_calculation", 0.0)
    pos_lookup_ms = timings.get("position_lookup", 0.0)
    pos_update_ms = timings.get("position_update", 0.0)
    order_create_ms = timings.get("order_creation", 0.0)
    commit_ms = timings.get("database_commit", 0.0)
    broadcast_ms = timings.get("websocket_broadcast", 0.0)
    serialization_ms = timings.get("response_serialization", 0.0)

    timings_map = {
        "Validation": val_ms,
        "Risk": risk_ms,
        "Drawdown Check": drawdown_ms,
        "Margin": margin_ms,
        "Leverage": leverage_ms,
        "Position Lookup": pos_lookup_ms,
        "Position Update": pos_update_ms,
        "Order Creation": order_create_ms,
        "DB Save": commit_ms,
        "Broadcast": broadcast_ms,
        "Serialization": serialization_ms
    }
    slowest_section = max(timings_map, key=timings_map.get)
    slowest_ms = timings_map[slowest_section]

    print("\n--- ORDER EXECUTION PROFILE ---")
    print(f"Validation .......... {val_ms:.2f} ms")
    print(f"Risk ............... {risk_ms:.2f} ms")
    print(f"Drawdown Check ...... {drawdown_ms:.2f} ms")
    print(f"Margin .............. {margin_ms:.2f} ms")
    print(f"Leverage ............ {leverage_ms:.2f} ms")
    print(f"Position Lookup ..... {pos_lookup_ms:.2f} ms")
    print(f"Position Update ..... {pos_update_ms:.2f} ms")
    print(f"Order Creation ...... {order_create_ms:.2f} ms")
    print(f"DB Save ............ {commit_ms:.2f} ms")
    print(f"Broadcast .......... {broadcast_ms:.2f} ms")
    print(f"Serialization ....... {serialization_ms:.2f} ms")
    print(f"Total .............. {total_time:.2f} ms")
    print(f"Slowest Section ..... {slowest_section} ({slowest_ms:.2f} ms)")
    print("-------------------------------\n")

    return committed_order_res


async def process_market_tick(db: AsyncSession, symbol: str, price: float):
    """Check pending orders, Stop Loss, and Take Profit levels when a symbol price updates."""
    # 0. Check and expire GTD orders (Throttled to once every 5 seconds)
    import time
    now_time = time.time()
    last_gtd_check = getattr(process_market_tick, "_last_gtd_check", 0.0)
    if now_time - last_gtd_check > 5.0:
        process_market_tick._last_gtd_check = now_time
        gtd_stmt = select(Order).where(
            Order.status.in_([OrderStatus.PENDING, OrderStatus.PARTIAL]),
            Order.time_in_force == "GTD",
            Order.gtd_timestamp <= datetime.now(timezone.utc)
        )
        gtd_res = await db.execute(gtd_stmt)
        expired_orders = gtd_res.scalars().all()
        for exp_order in expired_orders:
            exp_order.status = OrderStatus.CANCELLED
            db.add(exp_order)
            from app.api.orders import OrderResponse
            exp_data = OrderResponse.model_validate(exp_order).model_dump(mode='json')
            await manager.broadcast_event("order_updated", exp_data, user_id=exp_order.user_id)

    # 1. Check and trigger PENDING orders
    orders_stmt = select(Order).where(Order.symbol == symbol, Order.status == OrderStatus.PENDING).with_for_update()
    orders_res = await db.execute(orders_stmt)
    pending_orders = orders_res.scalars().all()
    for order in pending_orders:
        trigger = False
        if order.side == OrderSide.BUY:
            if order.type == OrderType.LIMIT and price <= order.price:
                trigger = True
            elif order.type == OrderType.STOP and price >= order.price:
                trigger = True
            elif order.type == OrderType.STOP_LIMIT:
                if order.stop_price is not None and price >= order.stop_price:
                    # Trigger STOP_LIMIT -> Convert to pending LIMIT order
                    order.type = OrderType.LIMIT
                    db.add(order)
                    # Broadcast order_updated
                    from app.api.orders import OrderResponse
                    order_data = OrderResponse.model_validate(order).model_dump(mode='json')
                    await manager.broadcast_event("order_updated", order_data, user_id=order.user_id)
        elif order.side == OrderSide.SELL:
            if order.type == OrderType.LIMIT and price >= order.price:
                trigger = True
            elif order.type == OrderType.STOP and price <= order.price:
                trigger = True
            elif order.type == OrderType.STOP_LIMIT:
                if order.stop_price is not None and price <= order.stop_price:
                    # Trigger STOP_LIMIT -> Convert to pending LIMIT order
                    order.type = OrderType.LIMIT
                    db.add(order)
                    # Broadcast order_updated
                    from app.api.orders import OrderResponse
                    order_data = OrderResponse.model_validate(order).model_dump(mode='json')
                    await manager.broadcast_event("order_updated", order_data, user_id=order.user_id)
                
        if trigger:
            await execute_order_fill(db, order, price)
            
    # 2. Check and trigger Stop Loss / Take Profit on active positions
    positions_stmt = select(Position).where(Position.symbol == symbol, Position.quantity != 0.0).with_for_update()
    positions_res = await db.execute(positions_stmt)
    active_positions = positions_res.scalars().all()
    
    user_keys_to_recalc = set()
    
    for pos in active_positions:
        user_keys_to_recalc.add((pos.user_id, pos.account_type))
        
        # A. Update trailing stop if configured
        if pos.trailing_stop and pos.trailing_stop > 0:
            if pos.quantity > 0:  # Long
                candidate_sl = price - pos.trailing_stop
                if pos.stop_loss is None or candidate_sl > pos.stop_loss:
                    pos.stop_loss = candidate_sl
                    pos.updated_at = datetime.now(timezone.utc)
                    db.add(pos)
                    # Broadcast position_update for trailing stop adjustment
                    from app.api.positions import PositionResponse
                    pos_data = PositionResponse.model_validate(pos).model_dump(mode='json')
                    await manager.broadcast_event("position_update", pos_data, user_id=pos.user_id)
            elif pos.quantity < 0:  # Short
                candidate_sl = price + pos.trailing_stop
                if pos.stop_loss is None or candidate_sl < pos.stop_loss:
                    pos.stop_loss = candidate_sl
                    pos.updated_at = datetime.now(timezone.utc)
                    db.add(pos)
                    # Broadcast position_update for trailing stop adjustment
                    from app.api.positions import PositionResponse
                    pos_data = PositionResponse.model_validate(pos).model_dump(mode='json')
                    await manager.broadcast_event("position_update", pos_data, user_id=pos.user_id)

        # B. Check SL/TP triggers
        sl_triggered = False
        tp_triggered = False
        
        if pos.quantity > 0:
            if pos.stop_loss and price <= pos.stop_loss:
                sl_triggered = True
            elif pos.take_profit and price >= pos.take_profit:
                tp_triggered = True
        elif pos.quantity < 0:
            if pos.stop_loss and price >= pos.stop_loss:
                sl_triggered = True
            elif pos.take_profit and price <= pos.take_profit:
                tp_triggered = True
                
        if sl_triggered or tp_triggered:
            exit_price = pos.stop_loss if sl_triggered else pos.take_profit
            if not exit_price or exit_price <= 0:
                exit_price = price
            await close_position_sltp(db, pos, exit_price, "Stop Loss" if sl_triggered else "Take Profit")
            # Account metrics will be recalculated inside close_position_sltp, so remove user from pending recalculations
            if (pos.user_id, pos.account_type) in user_keys_to_recalc:
                user_keys_to_recalc.remove((pos.user_id, pos.account_type))

    # 3. For any users whose positions were NOT closed, recalculate their account metrics to update live P&L, equity, etc.
    for uid, acct_type in user_keys_to_recalc:
        acc_stmt = select(Account).where(Account.user_id == uid, Account.account_type == acct_type).with_for_update()
        acc_res = await db.execute(acc_stmt)
        account = acc_res.scalar_one_or_none()
        if account:
            await recalculate_user_metrics(db, uid, account)
            # Broadcast account_update
            from app.api.sync import AccountResponse
            acc_data = AccountResponse.model_validate(account).model_dump(mode='json')
            await manager.broadcast_event("account_update", acc_data, user_id=uid)
            
            # Broadcast position_update for each active position of this user to reflect new unrealized P&L
            pos_stmt = select(Position).where(Position.user_id == uid, Position.quantity != 0.0, Position.account_type == acct_type)
            pos_res = await db.execute(pos_stmt)
            user_positions = pos_res.scalars().all()
            for upos in user_positions:
                from app.api.positions import PositionResponse
                pos_data = PositionResponse.model_validate(upos).model_dump(mode='json')
                await manager.broadcast_event("position_update", pos_data, user_id=uid)
