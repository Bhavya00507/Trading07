import asyncio
import json
from fastapi import APIRouter, Query, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from app.services.mbo_service import mbo_engine

router = APIRouter(prefix="/api/mbo", tags=["mbo"])
ws_router = APIRouter(prefix="/ws", tags=["mbo-ws"])

class AddMBOOrderRequest(BaseModel):
    symbol: str = "BTCUSDT"
    price: float
    quantity: float
    side: str  # "bid" or "ask"
    is_hidden: bool = False
    is_user_order: bool = False
    user_order_id: Optional[str] = None

class ModifyMBOOrderRequest(BaseModel):
    new_quantity: float

@router.get("/orders")
async def get_all_mbo_orders(symbol: str = Query("BTCUSDT")):
    mbo_engine._ensure_symbol(symbol)
    orders = [o.to_dict() for o in mbo_engine._orders_by_id.values() if o.symbol == symbol.upper()]
    return {"symbol": symbol.upper(), "total": len(orders), "orders": orders}

@router.get("/queue")
async def get_queue_level(
    symbol: str = Query("BTCUSDT"),
    side: str = Query("bid"),
    price: float = Query(65000.0)
):
    return mbo_engine.get_queue_at_level(symbol, side, price)

@router.get("/position/{order_id}")
async def get_order_position(order_id: str):
    res = mbo_engine.get_order_queue_position(order_id)
    if not res.get("found"):
        raise HTTPException(status_code=404, detail=res.get("message", "Order not found"))
    return res

@router.get("/statistics")
async def get_mbo_statistics(symbol: str = Query("BTCUSDT")):
    return mbo_engine.get_statistics(symbol)

@router.get("/history")
async def get_mbo_history(limit: int = Query(100, ge=1, le=1000)):
    return {"events": mbo_engine.get_event_history(limit)}

@router.post("/order")
async def create_mbo_order(req: AddMBOOrderRequest):
    import uuid
    oid = f"mbo-{uuid.uuid4().hex[:8]}"
    order = mbo_engine.add_order(
        symbol=req.symbol,
        order_id=oid,
        price=req.price,
        quantity=req.quantity,
        side=req.side,
        is_hidden=req.is_hidden,
        is_user_order=req.is_user_order,
        user_order_id=req.user_order_id
    )
    return order.to_dict()

@router.delete("/order/{order_id}")
async def cancel_mbo_order(order_id: str):
    cancelled = mbo_engine.cancel_order(order_id)
    if not cancelled:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"status": "cancelled", "order_id": order_id}


@ws_router.websocket("/mbo")
async def websocket_mbo_endpoint(websocket: WebSocket, symbol: str = "BTCUSDT"):
    await websocket.accept()
    sym = symbol.upper()
    mbo_engine._ensure_symbol(sym)

    try:
        while True:
            # Simulate real-time orderbook microstructure ticks
            mbo_engine.simulate_microstructure_tick(sym, current_price=65000.0 if "BTC" in sym else 1.0850)
            stats = mbo_engine.get_statistics(sym)
            history = mbo_engine.get_event_history(limit=10)

            payload = {
                "type": "mbo_snapshot",
                "symbol": sym,
                "statistics": stats,
                "recent_events": history
            }
            await websocket.send_text(json.dumps(payload))
            await asyncio.sleep(0.1)  # 10 updates / sec
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"MBO WebSocket disconnect/error: {e}")
