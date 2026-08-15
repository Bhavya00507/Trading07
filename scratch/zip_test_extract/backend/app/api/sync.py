from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
import sys, traceback, time
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.session import get_db
from app.models.order import Order, OrderStatus, OrderSide, OrderType
from app.models.position import Position
from app.models.account import Account
from app.models.trade_history import TradeHistory
from app.services.market_data import _latest_prices
from uuid import UUID
from pydantic import BaseModel
from typing import List
from app.api.orders import OrderResponse, OrderCreate
from app.api.positions import PositionResponse
from app.api.history import TradeHistoryResponse
import uuid

router = APIRouter(tags=["sync"])

class AccountResponse(BaseModel):
    id: UUID
    user_id: UUID
    balance: float
    equity: float
    peak_balance: float
    margin_used: float
    free_margin: float
    daily_pnl: float
    drawdown: float
    account_type: str

    class Config:
        orm_mode = True
        from_attributes = True

class SyncStateResponse(BaseModel):
    account: AccountResponse | None = None
    accounts: List[AccountResponse]
    active_account: AccountResponse | None
    orders: List[OrderResponse]
    positions: List[PositionResponse]
    history: List[TradeHistoryResponse]
    market_snapshot: dict

from app.api.auth import get_current_user_id

@router.get("/sync-state", response_model=SyncStateResponse)
async def sync_state(account_type: str = "live", db: AsyncSession = Depends(get_db), user_id: UUID = Depends(get_current_user_id)):
    import sys
    print("SYNC STEP 1: Route entered", file=sys.stderr)
    print(f"SYNC STEP 2: received account_type={account_type!r}", file=sys.stderr)
    print(f"SYNC STEP 3: authenticated user_id={user_id}", file=sys.stderr)
    try:
        # Fetch all user accounts
        print("SYNC STEP 4: Before account database query", file=sys.stderr)
        account_stmt = select(Account).where(Account.user_id == user_id)
        account_res = await db.execute(account_stmt)
        print("SYNC STEP 5: After account database query", file=sys.stderr)
        accounts = list(account_res.scalars().all())
        print(f"SYNC STEP 6: Query result accounts count={len(accounts)}", file=sys.stderr)

        if not accounts or len(accounts) < 6:
            print("SYNC STEP 7: Seeding missing accounts", file=sys.stderr)
            existing_types = {a.account_type for a in accounts}
            for acct_type in ["paper", "binance", "bybit", "mt5", "live", "demo"]:
                if acct_type not in existing_types:
                    db.add(Account(
                        id=uuid.uuid4(),
                        user_id=user_id,
                        balance=10000.0,
                        equity=10000.0,
                        peak_balance=10000.0,
                        margin_used=0.0,
                        free_margin=10000.0,
                        daily_pnl=0.0,
                        drawdown=0.0,
                        account_type=acct_type,
                    ))
            await db.commit()
            print("SYNC STEP 8: Seed commit completed", file=sys.stderr)
            account_res = await db.execute(account_stmt)
            accounts = list(account_res.scalars().all())
            print(f"SYNC STEP 9: Re-queried accounts count={len(accounts)}", file=sys.stderr)

        print("SYNC STEP 10: Before active account lookup", file=sys.stderr)
        active_account = next((a for a in accounts if a.account_type == account_type), accounts[0] if accounts else None)
        print(f"SYNC STEP 11: Active account lookup result: {active_account}", file=sys.stderr)

        print("SYNC STEP 12: Before active account balance lookup", file=sys.stderr)
        if active_account:
            print(f"SYNC STEP 13: Balance={active_account.balance} Equity={active_account.equity}", file=sys.stderr)

        print("SYNC STEP 14: Before orders database query", file=sys.stderr)
        orders_stmt = select(Order).where(
            Order.user_id == user_id,
            Order.account_type == account_type,
            Order.status.in_([OrderStatus.PENDING, OrderStatus.PARTIAL])
        )
        orders_res = await db.execute(orders_stmt)
        orders = list(orders_res.scalars().all())
        print(f"SYNC STEP 15: After orders query, count={len(orders)}", file=sys.stderr)

        print("SYNC STEP 16: Before positions database query", file=sys.stderr)
        positions_stmt = select(Position).where(
            Position.user_id == user_id,
            Position.account_type == account_type,
            Position.quantity != 0.0
        )
        positions_res = await db.execute(positions_stmt)
        positions = list(positions_res.scalars().all())
        print(f"SYNC STEP 17: After positions query, count={len(positions)}", file=sys.stderr)

        print("SYNC STEP 18: Before history database query", file=sys.stderr)
        history_stmt = select(TradeHistory).where(
            TradeHistory.user_id == user_id,
            TradeHistory.account_type == account_type
        ).order_by(TradeHistory.timestamp.desc())
        history_res = await db.execute(history_stmt)
        history = list(history_res.scalars().all())
        print(f"SYNC STEP 19: After history query, count={len(history)}", file=sys.stderr)

        print("SYNC STEP 20: Preparing market snapshot", file=sys.stderr)
        market_snapshot = {symbol: float(price) for symbol, price in _latest_prices.items()}
        print(f"SYNC STEP 21: Market snapshot count={len(market_snapshot)}", file=sys.stderr)

        response_obj = {
          "account": active_account,
          "accounts": accounts,
          "active_account": active_account,
          "orders": orders,
          "positions": positions,
          "history": history,
          "market_snapshot": market_snapshot,
        }
        print("SYNC STEP 22: Prepared response object", file=sys.stderr)
        print(f"SYNC STEP 23: Response object account={response_obj['account']}", file=sys.stderr)
        print("SYNC STEP 24: Before return statement", file=sys.stderr)
        return response_obj
    except Exception as exc:
        print("SYNC STEP ERROR: Exception caught!", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        raise exc

@router.get("/portfolio", response_model=List[PositionResponse])
async def get_portfolio(db: AsyncSession = Depends(get_db), user_id: UUID = Depends(get_current_user_id)):
    stmt = select(Position).where(Position.user_id == user_id, Position.quantity != 0.0)
    res = await db.execute(stmt)
    return list(res.scalars().all())

@router.get("/accounts", response_model=List[AccountResponse])
async def get_accounts(db: AsyncSession = Depends(get_db), user_id: UUID = Depends(get_current_user_id)):
    stmt = select(Account).where(Account.user_id == user_id)
    res = await db.execute(stmt)
    return list(res.scalars().all())

class SimpleOrderCreate(BaseModel):
    symbol: str
    quantity: float
    price: float | None = None
    stop_loss: float | None = None
    take_profit: float | None = None
    account_type: str = "paper"

@router.post("/buy", response_model=OrderResponse)
async def post_buy(
    request: Request,
    order: SimpleOrderCreate,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
    background_tasks: BackgroundTasks = None
):
    from app.services.order_engine import process_new_order
    full_order = OrderCreate(
        symbol=order.symbol,
        side=OrderSide.BUY,
        type=OrderType.MARKET if order.price is None else OrderType.LIMIT,
        quantity=order.quantity,
        price=order.price,
        stop_loss=order.stop_loss,
        take_profit=order.take_profit,
        account_type=order.account_type
    )
    start_time = getattr(request.state, "start_time", None) or time.time()
    created = await process_new_order(db, full_order, user_id, start_time, background_tasks)
    return created

@router.post("/sell", response_model=OrderResponse)
async def post_sell(
    request: Request,
    order: SimpleOrderCreate,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
    background_tasks: BackgroundTasks = None
):
    from app.services.order_engine import process_new_order
    full_order = OrderCreate(
        symbol=order.symbol,
        side=OrderSide.SELL,
        type=OrderType.MARKET if order.price is None else OrderType.LIMIT,
        quantity=order.quantity,
        price=order.price,
        stop_loss=order.stop_loss,
        take_profit=order.take_profit,
        account_type=order.account_type
    )
    start_time = getattr(request.state, "start_time", None) or time.time()
    created = await process_new_order(db, full_order, user_id, start_time, background_tasks)
    return created

from fastapi import Query
from typing import Optional
from app.services.market_data import get_candles_async
from app.api.market import CandleResponse

@router.get("/watchlist", response_model=List[str])
async def get_watchlist(user_id: UUID = Depends(get_current_user_id)):
    return ["BTCUSDT", "ETHUSDT", "EURUSD", "GBPUSD", "USDJPY", "US30", "NAS100", "SPX500", "GER40", "XAUUSD", "XAGUSD"]

@router.get("/candles", response_model=List[CandleResponse])
async def get_candles_route(
    symbol: str = Query(..., description="The symbol name, e.g. BTCUSDT"),
    timeframe: str = Query("1m", description="The timeframe, e.g. 1m"),
    limit: int = Query(1000, description="Number of candles to load"),
    before: Optional[int] = Query(None, description="Load candles before this timestamp (ms)"),
    after: Optional[int] = Query(None, description="Load candles after this timestamp (ms)")
):
    candles = await get_candles_async(symbol, timeframe, limit, before, after)
    resp = []
    for c in candles:
        ts = c.get("timestamp")
        t_sec = int(ts // 1000) if ts > 30000000000 else int(ts)
        resp.append(CandleResponse(
            time=t_sec,
            open=c.get("open"),
            high=c.get("high"),
            low=c.get("low"),
            close=c.get("close"),
            volume=c.get("volume", 0.0)
        ))
    resp.sort(key=lambda x: x.time)
    
    unique_resp = []
    seen_times = set()
    for c in resp:
        if c.time not in seen_times:
            seen_times.add(c.time)
            unique_resp.append(c)
    return unique_resp

@router.get("/account", response_model=AccountResponse)
async def get_active_account(
    account_type: str = "paper",
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id)
):
    stmt = select(Account).where(Account.user_id == user_id, Account.account_type == account_type)
    res = await db.execute(stmt)
    account = res.scalar_one_or_none()
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
            account_type=account_type
        )
        db.add(account)
        await db.commit()
        await db.refresh(account)
    return account

@router.get("/paper/account", response_model=AccountResponse)
async def get_paper_account(
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id)
):
    return await get_active_account(account_type="paper", db=db, user_id=user_id)

@router.get("/live/account", response_model=AccountResponse)
async def get_live_account(
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id)
):
    return await get_active_account(account_type="live", db=db, user_id=user_id)

