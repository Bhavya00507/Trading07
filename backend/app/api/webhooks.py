import time
import secrets
import hashlib
import json
import uuid
from collections import defaultdict
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Request, Header
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, desc

from app.database.session import get_db
from app.models.webhook import WebhookKey, WebhookLog
from app.models.user import User
from app.models.position import Position
from app.models.order import OrderSide, OrderType
from app.api.auth import get_current_user_id
from app.services.order_engine import process_new_order, close_position_sltp
from app.services.market_data import get_price

router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])

# Simple in-memory rate limiter: 100 requests per 60 seconds per API key
RATE_LIMIT = 100
RATE_WINDOW = 60
request_history = defaultdict(list)

def check_rate_limit(key_id: str):
    now = time.time()
    timestamps = request_history[key_id]
    request_history[key_id] = [t for t in timestamps if now - t < RATE_WINDOW]
    if len(request_history[key_id]) >= RATE_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded: Maximum 100 requests per minute per webhook key."
        )
    request_history[key_id].append(now)

class WebhookDummyOrder:
    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)
        self.price = getattr(self, "price", None)
        self.stop_loss = getattr(self, "sl", getattr(self, "stop_loss", None))
        self.take_profit = getattr(self, "tp", getattr(self, "take_profit", None))
        self.stop_price = getattr(self, "stop_price", None)
        self.is_reduce_only = False
        self.is_post_only = False
        self.time_in_force = "GTC"
        self.gtd_timestamp = None
        self.iceberg_visible_qty = None
        self.oco_link_id = None
        self.algo_type = None
        self.algo_params = None
        self.position_ticket = None
        self.account_type = getattr(self, "account_type", "paper")

# Pydantic Schemas
class WebhookExecuteRequest(BaseModel):
    api_key: Optional[str] = None
    broker: Optional[str] = "paper"
    symbol: str
    action: str  # buy, sell, close, reverse, partial_close, modify, cancel
    type: Optional[str] = "market"  # market, limit, stop, stop_limit
    volume: Optional[float] = Field(default=None, alias="quantity")
    quantity: Optional[float] = None
    price: Optional[float] = None
    sl: Optional[float] = None
    tp: Optional[float] = None
    order_id: Optional[str] = None
    comment: Optional[str] = "TradingView Automation"

    class Config:
        allow_population_by_field_name = True

class WebhookCreateRequest(BaseModel):
    name: str
    broker: Optional[str] = "paper"

class WebhookKeyResponse(BaseModel):
    id: str
    name: str
    api_key_prefix: str
    broker: str
    enabled: bool
    created_at: datetime
    last_used: Optional[datetime] = None
    raw_api_key: Optional[str] = None

class WebhookLogResponse(BaseModel):
    id: str
    timestamp: datetime
    symbol: str
    action: str
    status: str
    broker: str
    latency_ms: int
    error: Optional[str] = None
    request_payload: Optional[str] = None
    response_payload: Optional[str] = None

# 1. Create Webhook Key
@router.post("", response_model=WebhookKeyResponse)
async def create_webhook_key(
    req: WebhookCreateRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    raw_key = f"qt_wh_{secrets.token_hex(28)}"
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    prefix = raw_key[:12]

    webhook_obj = WebhookKey(
        name=req.name,
        api_key_hash=key_hash,
        api_key_prefix=prefix,
        broker=req.broker or "paper",
        enabled=True,
        user_id=str(user_id)
    )
    db.add(webhook_obj)
    await db.commit()
    await db.refresh(webhook_obj)

    return WebhookKeyResponse(
        id=webhook_obj.id,
        name=webhook_obj.name,
        api_key_prefix=webhook_obj.api_key_prefix,
        broker=webhook_obj.broker,
        enabled=webhook_obj.enabled,
        created_at=webhook_obj.created_at,
        last_used=webhook_obj.last_used,
        raw_api_key=raw_key
    )

# 2. Get User Webhook Keys
@router.get("", response_model=List[WebhookKeyResponse])
async def get_webhook_keys(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(WebhookKey).where(WebhookKey.user_id == str(user_id)).order_by(desc(WebhookKey.created_at))
    res = await db.execute(stmt)
    keys = res.scalars().all()
    return [
        WebhookKeyResponse(
            id=k.id,
            name=k.name,
            api_key_prefix=k.api_key_prefix,
            broker=k.broker,
            enabled=k.enabled,
            created_at=k.created_at,
            last_used=k.last_used
        )
        for k in keys
    ]

# 3. Toggle Webhook Key State
@router.put("/{key_id}/toggle")
async def toggle_webhook_key(
    key_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(WebhookKey).where(WebhookKey.id == key_id, WebhookKey.user_id == str(user_id))
    res = await db.execute(stmt)
    key_obj = res.scalars().first()
    if not key_obj:
        raise HTTPException(status_code=404, detail="Webhook key not found.")
    
    key_obj.enabled = not key_obj.enabled
    await db.commit()
    return {"status": "success", "enabled": key_obj.enabled}

# 4. Delete Webhook Key
@router.delete("/{key_id}")
async def delete_webhook_key(
    key_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    stmt = delete(WebhookKey).where(WebhookKey.id == key_id, WebhookKey.user_id == str(user_id))
    await db.execute(stmt)
    await db.commit()
    return {"status": "deleted", "id": key_id}

# 5. Get Webhook Logs
@router.get("/logs", response_model=List[WebhookLogResponse])
async def get_webhook_logs(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
    limit: int = 50
):
    stmt = select(WebhookLog).where(WebhookLog.user_id == str(user_id)).order_by(desc(WebhookLog.timestamp)).limit(limit)
    res = await db.execute(stmt)
    logs = res.scalars().all()
    return [
        WebhookLogResponse(
            id=l.id,
            timestamp=l.timestamp,
            symbol=l.symbol,
            action=l.action,
            status=l.status,
            broker=l.broker,
            latency_ms=l.latency_ms,
            error=l.error,
            request_payload=l.request_payload,
            response_payload=l.response_payload
        )
        for l in logs
    ]

# 6. Test Webhook Endpoint
@router.post("/test")
async def test_webhook(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    start_t = time.time()
    user_guid = uuid.UUID(str(user_id)) if isinstance(user_id, str) else user_id
    test_dummy = WebhookDummyOrder(
        symbol="BTCUSDT",
        side=OrderSide.BUY,
        type=OrderType.MARKET,
        quantity=0.01,
        account_type="paper"
    )
    result = await process_new_order(db, test_dummy, user_guid, start_t)
    elapsed_ms = int((time.time() - start_t) * 1000)

    res_dict = {"order_id": str(result.id), "status": str(result.status)}

    log_entry = WebhookLog(
        symbol="BTCUSDT",
        action="test_buy",
        status="success",
        broker="paper",
        latency_ms=elapsed_ms,
        request_payload=json.dumps({"symbol": "BTCUSDT", "side": "buy", "type": "market"}),
        response_payload=json.dumps(res_dict),
        user_id=str(user_id)
    )
    db.add(log_entry)
    await db.commit()

    return {
        "status": "success",
        "latency_ms": elapsed_ms,
        "broker_response": res_dict
    }

# 7. Core Public Webhook Execution Endpoint (Used by TradingView / External Bots)
@router.post("/execute")
async def execute_webhook(
    req_body: WebhookExecuteRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    x_api_key: Optional[str] = Header(None, alias="X-API-Key")
):
    start_time = time.time()

    raw_api_key = req_body.api_key or x_api_key or request.query_params.get("api_key")
    if not raw_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing API Key. Pass 'api_key' in JSON payload, query string, or 'X-API-Key' header."
        )

    key_hash = hashlib.sha256(raw_api_key.encode()).hexdigest()
    stmt = select(WebhookKey).where(WebhookKey.api_key_hash == key_hash)
    res = await db.execute(stmt)
    key_obj = res.scalars().first()

    if not key_obj:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API Key.")

    if not key_obj.enabled:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Webhook key is disabled.")

    check_rate_limit(key_obj.id)
    key_obj.last_used = datetime.utcnow()
    await db.commit()

    action = req_body.action.lower()
    symbol = req_body.symbol.upper()
    qty = req_body.volume if req_body.volume is not None else req_body.quantity
    broker = req_body.broker or key_obj.broker or "paper"
    user_id = key_obj.user_id
    user_guid = uuid.UUID(str(user_id)) if isinstance(user_id, str) else user_id

    result = {}
    err_msg = None
    status_str = "success"

    try:
        if action in ["buy", "sell"]:
            if not qty or qty <= 0:
                raise HTTPException(status_code=400, detail="Volume / quantity must be greater than 0.")
            
            side_enum = OrderSide.BUY if action == "buy" else OrderSide.SELL
            type_enum = OrderType.MARKET
            if req_body.type:
                t_str = req_body.type.lower()
                if t_str == "limit": type_enum = OrderType.LIMIT
                elif t_str == "stop": type_enum = OrderType.STOP

            dummy_order = WebhookDummyOrder(
                symbol=symbol,
                side=side_enum,
                type=type_enum,
                quantity=qty,
                price=req_body.price,
                sl=req_body.sl,
                tp=req_body.tp,
                account_type=broker
            )
            created = await process_new_order(db, dummy_order, user_guid, start_time)
            result = {"order_id": str(created.id), "status": str(created.status), "symbol": created.symbol, "quantity": created.quantity}

        elif action in ["close", "reverse"]:
            stmt_pos = select(Position).where(Position.user_id == user_guid, Position.symbol == symbol, Position.account_type == broker)
            res_pos = await db.execute(stmt_pos)
            pos = res_pos.scalars().first()
            if not pos:
                result = {"message": f"No open position found for {symbol} under {broker}."}
            else:
                curr_price = await get_price(symbol)
                await close_position_sltp(db, pos, curr_price, f"Webhook {action.upper()}")
                result = {"status": f"Position {action}d", "symbol": symbol, "exit_price": curr_price}

                if action == "reverse":
                    opp_side = OrderSide.SELL if pos.quantity > 0 else OrderSide.BUY
                    dummy_order = WebhookDummyOrder(
                        symbol=symbol,
                        side=opp_side,
                        type=OrderType.MARKET,
                        quantity=abs(pos.quantity),
                        account_type=broker
                    )
                    rev_created = await process_new_order(db, dummy_order, user_guid, start_time)
                    result["reversed_order_id"] = str(rev_created.id)

        else:
            raise HTTPException(status_code=400, detail=f"Action '{action}' is not supported. Permitted: buy, sell, close, reverse.")

    except Exception as e:
        status_str = "failed"
        err_msg = str(e)
        if isinstance(e, HTTPException):
            err_msg = e.detail
        print(f"WEBHOOK EXECUTION EXCEPTION: {err_msg}")
        import traceback
        traceback.print_exc()

    elapsed_ms = int((time.time() - start_time) * 1000)

    log_entry = WebhookLog(
        symbol=symbol,
        action=action,
        status=status_str,
        broker=broker,
        latency_ms=elapsed_ms,
        error=err_msg,
        request_payload=json.dumps(req_body.dict(exclude_none=True)),
        response_payload=json.dumps(result) if result else None,
        user_id=str(user_id)
    )
    db.add(log_entry)
    await db.commit()

    if status_str == "failed":
        raise HTTPException(status_code=400, detail=err_msg)

    return {
        "status": "success",
        "latency_ms": elapsed_ms,
        "broker": broker,
        "action": action,
        "symbol": symbol,
        "execution_result": result
    }
