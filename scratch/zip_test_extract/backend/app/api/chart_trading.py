from fastapi import APIRouter, HTTPException, Query, Body
from typing import Dict, Any, Optional, List
from pydantic import BaseModel

from app.services.chart_trading import (
    ChartOrderService,
    DragService,
    RiskService,
    PreviewService,
    PositionOverlayService,
    HotkeyService,
)

router = APIRouter(prefix="/api/chart-trading", tags=["Chart Trading"])


class OneClickOrderRequest(BaseModel):
    symbol: str = "BTCUSDT"
    side: str = "buy"  # 'buy' or 'sell'
    order_type: str = "market"  # 'market', 'limit', 'stop'
    quantity: float = 1.0
    price: float = 65000.0
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None


class DragModifyRequest(BaseModel):
    target_type: str = "sl"  # 'sl', 'tp', 'entry', 'pending'
    new_price: float = 64500.0
    entry_price: float = 65000.0
    side: str = "buy"
    tick_size: float = 0.5
    quantity: float = 1.0
    account_equity: float = 10000.0


class QuickActionRequest(BaseModel):
    action: str  # 'partial_close', 'break_even', 'reverse', 'duplicate'
    position_id: str
    symbol: str = "BTCUSDT"
    current_quantity: float = 1.0
    close_percentage: Optional[float] = 0.50  # 0.25, 0.50, 0.75, 1.0
    current_price: float = 65000.0
    entry_price: float = 64500.0
    side: str = "buy"


class OrderPreviewRequest(BaseModel):
    symbol: str = "BTCUSDT"
    side: str = "buy"
    order_type: str = "limit"
    quantity: float = 1.0
    entry_price: float = 65000.0
    current_price: float = 65100.0
    stop_loss: Optional[float] = 64500.0
    take_profit: Optional[float] = 66000.0
    account_balance: float = 10000.0
    leverage: float = 100.0


class TrailingStopRequest(BaseModel):
    position_id: str
    symbol: str = "BTCUSDT"
    trail_type: str = "fixed_points"  # 'fixed_points', 'atr', 'ema', 'swing', 'percentage', 'adaptive'
    trail_value: float = 50.0
    current_price: float = 65500.0
    entry_price: float = 65000.0
    side: str = "buy"
    current_sl: Optional[float] = 64500.0


class HotkeyRequest(BaseModel):
    key_code: str
    modifiers: Optional[Dict[str, bool]] = None


@router.post("/one-click")
async def execute_one_click(req: OneClickOrderRequest):
    return ChartOrderService.execute_one_click_order(
        symbol=req.symbol,
        side=req.side,
        order_type=req.order_type,
        quantity=req.quantity,
        price=req.price,
        stop_loss=req.stop_loss,
        take_profit=req.take_profit,
    )


@router.post("/drag-modify")
async def drag_modify(req: DragModifyRequest):
    return DragService.validate_and_calculate_drag(
        target_type=req.target_type,
        new_price=req.new_price,
        entry_price=req.entry_price,
        side=req.side,
        tick_size=req.tick_size,
        quantity=req.quantity,
        account_equity=req.account_equity,
    )


@router.post("/quick-action")
async def quick_action(req: QuickActionRequest):
    if req.action == "partial_close":
        return ChartOrderService.execute_partial_close(
            position_id=req.position_id,
            symbol=req.symbol,
            current_quantity=req.current_quantity,
            close_percentage=req.close_percentage or 0.50,
            current_price=req.current_price,
            entry_price=req.entry_price,
            side=req.side,
        )
    elif req.action == "break_even":
        return ChartOrderService.move_to_break_even(
            position_id=req.position_id,
            symbol=req.symbol,
            entry_price=req.entry_price,
            side=req.side,
        )
    elif req.action == "reverse":
        return ChartOrderService.reverse_position(
            position_id=req.position_id,
            symbol=req.symbol,
            current_quantity=req.current_quantity,
            current_side=req.side,
            current_price=req.current_price,
        )
    elif req.action == "duplicate":
        return ChartOrderService.execute_one_click_order(
            symbol=req.symbol,
            side=req.side,
            order_type="market",
            quantity=req.current_quantity,
            price=req.current_price,
        )
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported quick action: {req.action}")


@router.post("/order-preview")
async def order_preview(req: OrderPreviewRequest):
    return PreviewService.generate_order_preview(
        symbol=req.symbol,
        side=req.side,
        order_type=req.order_type,
        quantity=req.quantity,
        entry_price=req.entry_price,
        current_price=req.current_price,
        stop_loss=req.stop_loss,
        take_profit=req.take_profit,
        account_balance=req.account_balance,
        leverage=req.leverage,
    )


@router.post("/trailing-stop")
async def update_trailing_stop(req: TrailingStopRequest):
    return ChartOrderService.apply_advanced_trailing_stop(
        position_id=req.position_id,
        symbol=req.symbol,
        trail_type=req.trail_type,
        trail_value=req.trail_value,
        current_price=req.current_price,
        entry_price=req.entry_price,
        side=req.side,
        current_sl=req.current_sl,
    )


@router.post("/hotkey")
async def process_hotkey(req: HotkeyRequest):
    return HotkeyService.dispatch_hotkey_action(
        key_code=req.key_code,
        modifiers=req.modifiers,
    )


@router.get("/overlays")
async def get_overlays(symbol: str = Query("BTCUSDT")):
    # Demo snapshot data for overlays
    sample_positions = [
        {
            "id": f"POS_{symbol}_01",
            "symbol": symbol,
            "quantity": 1.5,
            "average_price": 65000.0,
            "stop_loss": 64200.0,
            "take_profit": 66800.0,
            "leverage": 100.0,
        }
    ]
    sample_pending = [
        {
            "id": f"ORD_{symbol}_LIMIT_01",
            "symbol": symbol,
            "side": "buy",
            "type": "limit",
            "price": 64000.0,
            "quantity": 1.0,
            "stop_loss": 63500.0,
            "take_profit": 65500.0,
            "expiry": "GTC",
            "status": "pending",
        }
    ]
    current_prices = {symbol: 65250.0}

    positions_overlay = PositionOverlayService.format_position_overlay(
        sample_positions, current_prices
    )
    pending_overlay = PositionOverlayService.format_pending_order_overlay(
        sample_pending, current_prices
    )

    return {
        "symbol": symbol,
        "positions": positions_overlay,
        "pending_orders": pending_overlay,
    }
