from fastapi import APIRouter, Query, HTTPException, Body
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from app.services.smart_order_router import smart_order_router, TWAPEngine, VWAPEngine, IcebergEngine

router = APIRouter(prefix="/api/router", tags=["router"])

class OrderExecuteRequest(BaseModel):
    symbol: str = "BTCUSDT"
    side: str = "buy"
    quantity: float = 1.0
    order_type: str = "MARKET"
    price: Optional[float] = None
    time_in_force: str = "GTC"
    algo_type: Optional[str] = None
    algo_params: Optional[Dict[str, Any]] = None

class TWAPRequest(BaseModel):
    symbol: str = "BTCUSDT"
    side: str = "buy"
    total_quantity: float = 10.0
    duration_minutes: int = 15

class VWAPRequest(BaseModel):
    symbol: str = "BTCUSDT"
    side: str = "buy"
    total_quantity: float = 10.0

class IcebergRequest(BaseModel):
    symbol: str = "BTCUSDT"
    side: str = "buy"
    total_quantity: float = 10.0
    visible_quantity: float = 1.0

@router.get("/status")
async def get_router_status():
    return smart_order_router.get_execution_metrics()

@router.post("/execute")
async def execute_order(req: OrderExecuteRequest):
    return smart_order_router.route_and_execute(
        symbol=req.symbol,
        side=req.side,
        quantity=req.quantity,
        order_type=req.order_type,
        price=req.price,
        algo_type=req.algo_type,
        algo_params=req.algo_params,
        time_in_force=req.time_in_force
    )

@router.post("/twap")
async def execute_twap(req: TWAPRequest):
    return smart_order_router.route_and_execute(
        symbol=req.symbol,
        side=req.side,
        quantity=req.total_quantity,
        order_type="TWAP",
        algo_type="TWAP",
        algo_params={"duration_minutes": req.duration_minutes}
    )

@router.post("/vwap")
async def execute_vwap(req: VWAPRequest):
    return smart_order_router.route_and_execute(
        symbol=req.symbol,
        side=req.side,
        quantity=req.total_quantity,
        order_type="VWAP",
        algo_type="VWAP"
    )

@router.post("/iceberg")
async def execute_iceberg(req: IcebergRequest):
    return smart_order_router.route_and_execute(
        symbol=req.symbol,
        side=req.side,
        quantity=req.total_quantity,
        order_type="ICEBERG",
        algo_type="ICEBERG",
        algo_params={"visible_qty": req.visible_quantity}
    )

@router.get("/orders")
async def get_active_router_orders():
    return {"active_orders": smart_order_router.get_working_orders()}

@router.get("/fills")
async def get_execution_fills():
    return {"fills": smart_order_router.execution_fills}

@router.get("/slippage")
async def get_slippage_metrics():
    metrics = smart_order_router.get_execution_metrics()
    return {
        "average_slippage_bps": metrics["average_slippage_bps"],
        "average_routing_speed_ms": metrics["average_routing_speed_ms"],
        "fill_rate_pct": metrics["fill_rate_pct"]
    }
