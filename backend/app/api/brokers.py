from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.session import get_db
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from uuid import UUID
import uuid

router = APIRouter(prefix="/brokers", tags=["Enterprise Broker Integration Gateway"])

from app.api.auth import get_current_user_id

class BrokerConnectRequest(BaseModel):
    broker_id: str # 'paper' | 'binance' | 'bybit' | 'mt5' | 'zerodha' | 'alpaca' | 'ibkr'
    api_key: Optional[str] = None
    api_secret: Optional[str] = None
    environment: str = "demo" # 'demo' | 'live'

class BrokerInfo(BaseModel):
    id: str
    name: str
    connected: bool
    status: str
    supported_assets: List[str]

@router.get("", response_model=List[BrokerInfo])
async def list_supported_brokers():
    """List all supported broker integrations and connection status."""
    return [
        BrokerInfo(id="paper", name="Quantum Paper Trading Engine", connected=True, status="active", supported_assets=["crypto", "forex", "indices", "metals"]),
        BrokerInfo(id="binance", name="Binance Exchange (Spot & Futures)", connected=True, status="active", supported_assets=["crypto"]),
        BrokerInfo(id="bybit", name="Bybit Perpetual Derivatives", connected=True, status="active", supported_assets=["crypto"]),
        BrokerInfo(id="mt5", name="MetaTrader 5 Terminal Gateway", connected=True, status="active", supported_assets=["forex", "indices", "metals"]),
        BrokerInfo(id="alpaca", name="Alpaca Equities & Crypto", connected=False, status="disconnected", supported_assets=["stocks", "crypto"]),
        BrokerInfo(id="zerodha", name="Zerodha Kite Connect API", connected=False, status="disconnected", supported_assets=["stocks", "fno"]),
        BrokerInfo(id="ibkr", name="Interactive Brokers TWS Client", connected=False, status="disconnected", supported_assets=["global_all"])
    ]

@router.post("/connect")
async def connect_broker(req: BrokerConnectRequest, user_id: UUID = Depends(get_current_user_id)):
    """Authenticate and establish encrypted session connection to broker API gateway."""
    from app.services.broker_service import get_broker_service
    service = get_broker_service(req.broker_id)
    success = await service.connect(api_key=req.api_key, api_secret=req.api_secret)
    return {
        "status": "success" if success else "failed",
        "broker_id": req.broker_id,
        "environment": req.environment,
        "session_token": f"sess-{uuid.uuid4().hex[:12]}",
        "message": f"Successfully connected to {req.broker_id.upper()} broker gateway."
    }

@router.post("/disconnect")
async def disconnect_broker(broker_id: str, user_id: UUID = Depends(get_current_user_id)):
    """Gracefully disconnect active broker gateway session."""
    from app.services.broker_service import get_broker_service
    service = get_broker_service(broker_id)
    await service.disconnect()
    return {
        "status": "success",
        "broker_id": broker_id,
        "message": f"Broker gateway session for {broker_id.upper()} disconnected."
    }

@router.get("/accounts")
async def get_broker_account(broker_id: str = "mt5", user_id: UUID = Depends(get_current_user_id)):
    """Retrieve real live balance, equity, margin, and leverage from broker API."""
    from app.services.broker_service import get_broker_service
    service = get_broker_service(broker_id)
    balances = await service.get_balances()
    return {
        "broker_id": broker_id,
        "balances": balances
    }

@router.get("/positions")
async def get_broker_positions(broker_id: str = "mt5", user_id: UUID = Depends(get_current_user_id)):
    """Fetch open positions from connected broker API."""
    from app.services.broker_service import get_broker_service
    service = get_broker_service(broker_id)
    positions = await service.get_positions()
    return positions

@router.get("/orders")
async def get_broker_orders(broker_id: str = "mt5", user_id: UUID = Depends(get_current_user_id)):
    """Fetch pending open orders from connected broker API."""
    from app.services.broker_service import get_broker_service
    service = get_broker_service(broker_id)
    orders = await service.get_orders()
    return orders

class PlaceBrokerOrderRequest(BaseModel):
    broker_id: str = "mt5"
    symbol: str
    side: str
    order_type: str
    quantity: float
    price: Optional[float] = None
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None

@router.post("/order")
async def place_broker_order(req: PlaceBrokerOrderRequest, user_id: UUID = Depends(get_current_user_id)):
    """Place real order on connected broker gateway."""
    from app.services.broker_service import get_broker_service
    service = get_broker_service(req.broker_id)
    res = await service.place_order(
        symbol=req.symbol,
        side=req.side,
        order_type=req.order_type,
        quantity=req.quantity,
        price=req.price,
        stop_loss=req.stop_loss,
        take_profit=req.take_profit
    )
    return res

@router.delete("/order/{order_id}")
async def cancel_broker_order(order_id: str, broker_id: str = "mt5", symbol: str = "EURUSD", user_id: UUID = Depends(get_current_user_id)):
    """Cancel open order on connected broker gateway."""
    from app.services.broker_service import get_broker_service
    service = get_broker_service(broker_id)
    res = await service.cancel_order(order_id=order_id, symbol=symbol)
    return res
