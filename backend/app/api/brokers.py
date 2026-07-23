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
    broker_id: str # 'paper' | 'binance' | 'bybit' | 'mt5' | 'zerodha' | 'alpaca' | 'ibkr' | 'angelone' | 'upstox'
    account: Optional[str] = None # login number for MT5
    password: Optional[str] = None # password for MT5 or PIN for Angel One
    server: Optional[str] = None # server for MT5
    path: Optional[str] = None # path for MT5 terminal
    api_key: Optional[str] = None
    api_secret: Optional[str] = None
    passphrase: Optional[str] = None
    environment: str = "demo" # 'demo' | 'live'
    host: Optional[str] = None # for IBKR
    port: Optional[int] = None # for IBKR
    client_id: Optional[str] = None # for IBKR
    client_code: Optional[str] = None # for Angel One
    pin: Optional[str] = None # for Angel One
    totp_secret: Optional[str] = None # for Angel One
    request_token: Optional[str] = None # for Zerodha
    redirect_uri: Optional[str] = None # for Upstox
    testnet: Optional[bool] = False

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
        BrokerInfo(id="mt5", name="MetaTrader 5 Terminal Gateway", connected=False, status="disconnected", supported_assets=["forex", "indices", "metals"]),
        BrokerInfo(id="binance", name="Binance Exchange (Spot & Futures)", connected=False, status="disconnected", supported_assets=["crypto"]),
        BrokerInfo(id="bybit", name="Bybit Perpetual Derivatives", connected=False, status="disconnected", supported_assets=["crypto"]),
        BrokerInfo(id="ibkr", name="Interactive Brokers TWS Client", connected=False, status="disconnected", supported_assets=["global_all"]),
        BrokerInfo(id="alpaca", name="Alpaca Equities & Crypto", connected=False, status="disconnected", supported_assets=["stocks", "crypto"]),
        BrokerInfo(id="zerodha", name="Zerodha Kite Connect API", connected=False, status="disconnected", supported_assets=["stocks", "fno"]),
        BrokerInfo(id="angelone", name="Angel One SmartAPI", connected=False, status="disconnected", supported_assets=["stocks", "fno"]),
        BrokerInfo(id="upstox", name="Upstox Pro API", connected=False, status="disconnected", supported_assets=["stocks", "fno"])
    ]

@router.post("/connect")
async def connect_broker(req: BrokerConnectRequest, user_id: UUID = Depends(get_current_user_id)):
    """Authenticate and establish session connection to broker API gateway."""
    from app.services.broker_service import get_broker_service

    # Task 3: Precise Required Field Validation per Broker
    if req.broker_id == "mt5":
        if not req.account:
            raise HTTPException(status_code=400, detail="Account Login required")
        if not req.password:
            raise HTTPException(status_code=400, detail="Password required")
        if not req.server:
            raise HTTPException(status_code=400, detail="Server required")
    elif req.broker_id in ["binance", "bybit", "alpaca"]:
        if not req.api_key:
            raise HTTPException(status_code=400, detail="API Key required")
        if not req.api_secret:
            raise HTTPException(status_code=400, detail="Secret Key required")
    elif req.broker_id in ["ibkr", "ib"]:
        if not req.host:
            raise HTTPException(status_code=400, detail="Host required")
        if not req.port:
            raise HTTPException(status_code=400, detail="Port required")
    elif req.broker_id == "zerodha":
        if not req.api_key:
            raise HTTPException(status_code=400, detail="API Key required")
        if not req.api_secret:
            raise HTTPException(status_code=400, detail="API Secret required")
    elif req.broker_id == "angelone":
        if not req.api_key:
            raise HTTPException(status_code=400, detail="API Key required")
        if not req.client_code:
            raise HTTPException(status_code=400, detail="Client Code required")
        if not req.password and not req.pin:
            raise HTTPException(status_code=400, detail="PIN/Password required")
    elif req.broker_id == "upstox":
        if not req.api_key:
            raise HTTPException(status_code=400, detail="API Key required")
        if not req.api_secret:
            raise HTTPException(status_code=400, detail="Secret Key required")

    service = get_broker_service(req.broker_id)
    try:
        success = await service.connect(
            api_key=req.api_key,
            api_secret=req.api_secret,
            account=req.account,
            password=req.password,
            server=req.server,
            path=req.path,
            host=req.host,
            port=req.port,
            client_id=req.client_id,
            client_code=req.client_code,
            pin=req.pin or req.password,
            totp_secret=req.totp_secret,
            request_token=req.request_token,
            redirect_uri=req.redirect_uri,
            testnet=req.testnet,
            environment=req.environment
        )
        return {
            "status": "success" if success else "failed",
            "broker_id": req.broker_id,
            "environment": req.environment,
            "session_token": f"sess-{uuid.uuid4().hex[:12]}",
            "message": f"Successfully connected to {req.broker_id.upper()} broker gateway."
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

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
    try:
        balances = await service.get_balances()
        return {
            "broker_id": broker_id,
            "balances": balances
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/positions")
async def get_broker_positions(broker_id: str = "mt5", user_id: UUID = Depends(get_current_user_id)):
    """Fetch open positions from connected broker API."""
    from app.services.broker_service import get_broker_service
    service = get_broker_service(broker_id)
    try:
        positions = await service.get_positions()
        return positions
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/orders")
async def get_broker_orders(broker_id: str = "mt5", user_id: UUID = Depends(get_current_user_id)):
    """Fetch pending open orders from connected broker API."""
    from app.services.broker_service import get_broker_service
    service = get_broker_service(broker_id)
    try:
        orders = await service.get_orders()
        return orders
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

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
    try:
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
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/order/{order_id}")
async def cancel_broker_order(order_id: str, broker_id: str = "mt5", symbol: str = "EURUSD", user_id: UUID = Depends(get_current_user_id)):
    """Cancel open order on connected broker gateway."""
    from app.services.broker_service import get_broker_service
    service = get_broker_service(broker_id)
    try:
        res = await service.cancel_order(order_id=order_id, symbol=symbol)
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
