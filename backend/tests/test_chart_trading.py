import pytest
from app.services.chart_trading.risk_service import RiskService
from app.services.chart_trading.drag_service import DragService
from app.services.chart_trading.preview_service import PreviewService
from app.services.chart_trading.chart_order_service import ChartOrderService
from app.services.chart_trading.position_overlay_service import PositionOverlayService
from app.services.chart_trading.hotkey_service import HotkeyService


def test_risk_metrics_calculation():
    metrics = RiskService.calculate_risk_metrics(
        entry_price=100.0,
        current_price=102.0,
        stop_loss=95.0,
        take_profit=110.0,
        quantity=1.0,
        side="buy",
        account_equity=10000.0,
        contract_size=100.0,
        tick_size=0.1,
    )
    assert metrics["entry_price"] == 100.0
    assert metrics["risk_usd"] == 500.0  # (100 - 95) * 1.0 * 100
    assert metrics["reward_usd"] == 1000.0  # (110 - 100) * 1.0 * 100
    assert metrics["risk_reward_numeric"] == 2.0
    assert metrics["risk_reward_ratio"] == "1 : 2.0"
    assert metrics["risk_pct"] == 5.0
    assert metrics["reward_pct"] == 10.0


def test_drag_service_validation():
    # Valid Stop Loss for Buy
    valid_drag = DragService.validate_and_calculate_drag(
        target_type="sl",
        new_price=95.0,
        entry_price=100.0,
        side="buy",
        tick_size=0.5,
    )
    assert valid_drag["is_valid"] is True
    assert valid_drag["new_price"] == 95.0

    # Invalid Stop Loss for Buy (above entry price)
    invalid_drag = DragService.validate_and_calculate_drag(
        target_type="sl",
        new_price=105.0,
        entry_price=100.0,
        side="buy",
    )
    assert invalid_drag["is_valid"] is False
    assert "must be below" in invalid_drag["error"]


def test_order_preview_calculations():
    preview = PreviewService.generate_order_preview(
        symbol="BTCUSDT",
        side="buy",
        order_type="limit",
        quantity=1.0,
        entry_price=65000.0,
        current_price=65100.0,
        stop_loss=64000.0,
        take_profit=67000.0,
        account_balance=10000.0,
        leverage=100.0,
    )

    assert preview["symbol"] == "BTCUSDT"
    assert preview["side"] == "BUY"
    assert preview["required_margin"] > 0
    assert preview["estimated_commission"] > 0
    assert preview["can_execute"] is True


def test_one_click_and_partial_close():
    one_click = ChartOrderService.execute_one_click_order(
        symbol="BTCUSDT",
        side="buy",
        order_type="market",
        quantity=2.0,
        price=65000.0,
    )
    assert one_click["status"] == "success"
    assert one_click["quantity"] == 2.0

    # Partial close 50%
    partial = ChartOrderService.execute_partial_close(
        position_id="POS_1",
        symbol="BTCUSDT",
        current_quantity=2.0,
        close_percentage=0.50,
        current_price=65500.0,
        entry_price=65000.0,
    )
    assert partial["closed_quantity"] == 1.0
    assert partial["remaining_quantity"] == 1.0
    assert partial["is_fully_closed"] is False


def test_break_even_and_reverse():
    be = ChartOrderService.move_to_break_even(
        position_id="POS_1",
        symbol="BTCUSDT",
        entry_price=65000.0,
        side="buy",
        spread_buffer_pips=2.0,
    )
    assert be["new_stop_loss"] > 65000.0

    rev = ChartOrderService.reverse_position(
        position_id="POS_1",
        symbol="BTCUSDT",
        current_quantity=1.0,
        current_side="buy",
        current_price=65200.0,
    )
    assert rev["new_side"] == "SELL"


def test_trailing_stop():
    ts = ChartOrderService.apply_advanced_trailing_stop(
        position_id="POS_1",
        symbol="BTCUSDT",
        trail_type="fixed_points",
        trail_value=500.0,
        current_price=66000.0,
        entry_price=65000.0,
        side="buy",
        current_sl=64500.0,
    )
    assert ts["new_stop_loss"] == 65500.0
    assert ts["updated"] is True


def test_hotkey_service():
    res_buy = HotkeyService.dispatch_hotkey_action(key_code="KeyB")
    assert res_buy["action"] == "buy_market"

    res_undo = HotkeyService.dispatch_hotkey_action(
        key_code="KeyZ",
        modifiers={"ctrl": True},
    )
    assert res_undo["action"] == "undo"


def test_position_overlays():
    positions = [
        {"id": "P1", "symbol": "BTCUSDT", "quantity": 1.0, "average_price": 65000.0}
    ]
    overlays = PositionOverlayService.format_position_overlay(
        positions, current_prices={"BTCUSDT": 65500.0}
    )
    assert len(overlays) == 1
    assert overlays[0]["floating_pnl"] > 0
    assert overlays[0]["color_state"] == "profit_green"
