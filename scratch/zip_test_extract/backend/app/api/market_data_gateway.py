from fastapi import APIRouter, Query, HTTPException, Body
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from app.services.market_data_gateway import market_data_gateway, SymbolMapperEngine

router = APIRouter(prefix="/api/provider", tags=["provider"])

class ConnectRequest(BaseModel):
    provider_id: str

@router.get("s")
@router.get("/status")
async def get_providers_status():
    return {
        "active_route": market_data_gateway.get_active_provider().name,
        "failover_active": market_data_gateway.failover_active,
        "total_dropped_packets": market_data_gateway.dropped_packets_total,
        "providers": market_data_gateway.get_all_provider_statuses()
    }

@router.post("/connect")
async def connect_provider(req: ConnectRequest):
    prov = market_data_gateway.providers.get(req.provider_id)
    if not prov:
        raise HTTPException(status_code=404, detail="Provider not found")
    prov.connect()
    return {"status": "connected", "provider": prov.name}

@router.post("/disconnect")
async def disconnect_provider(req: ConnectRequest):
    prov = market_data_gateway.providers.get(req.provider_id)
    if not prov:
        raise HTTPException(status_code=404, detail="Provider not found")
    prov.disconnect()
    return {"status": "disconnected", "provider": prov.name}

@router.get("/depth")
async def get_market_depth(
    symbol: str = Query("BTCUSDT"),
    price: float = Query(65000.0)
):
    return market_data_gateway.get_level2(symbol=symbol, price=price)

@router.get("/trades")
async def get_market_trades(symbol: str = Query("BTCUSDT")):
    return {"symbol": SymbolMapperEngine.resolve_symbol(symbol), "trades": market_data_gateway.get_trades(symbol)}

@router.get("/history")
async def get_provider_history(
    symbol: str = Query("BTCUSDT"),
    timeframe: str = Query("1m"),
    limit: int = Query(100)
):
    return market_data_gateway.get_history(symbol=symbol, timeframe=timeframe, limit=limit)

@router.get("/latency")
async def get_provider_latency():
    statuses = market_data_gateway.get_all_provider_statuses()
    return {
        "active_provider_latency_ms": market_data_gateway.get_active_provider().latency(),
        "providers_latency": [{p["name"]: p["latency_ms"]} for p in statuses]
    }

@router.get("/resolve-symbol")
async def resolve_symbol(symbol: str = Query("EURUSD.c")):
    canonical = SymbolMapperEngine.resolve_symbol(symbol)
    return {"raw_symbol": symbol, "canonical_symbol": canonical}
