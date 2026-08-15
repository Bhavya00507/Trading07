from typing import Dict, Any, Optional, List
from .risk_service import RiskService

class ChartOrderService:
    """
    Executes chart order operations including one-click placement, quick position management,
    partial closes, break-even adjustments, position reversals, and trailing stops.
    """

    @staticmethod
    def execute_one_click_order(
        symbol: str,
        side: str,  # 'buy' or 'sell'
        order_type: str,  # 'market', 'limit', 'stop'
        quantity: float,
        price: float,
        stop_loss: Optional[float] = None,
        take_profit: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Creates and executes a one-click order.
        """
        return {
            "status": "success",
            "order_id": f"ORD_{int(price * 100)}_{side[:1].upper()}",
            "symbol": symbol,
            "side": side.upper(),
            "order_type": order_type.upper(),
            "quantity": quantity,
            "price": price,
            "stop_loss": stop_loss,
            "take_profit": take_profit,
            "message": f"One-click {side.upper()} order placed for {quantity} {symbol} at {price}",
        }

    @staticmethod
    def execute_partial_close(
        position_id: str,
        symbol: str,
        current_quantity: float,
        close_percentage: float,  # 0.25, 0.50, 0.75, 1.0
        current_price: float,
        entry_price: float,
        side: str = "buy",
    ) -> Dict[str, Any]:
        """
        Closes a specified percentage (25%, 50%, 75%, 100%) of an active position.
        """
        qty_to_close = round(current_quantity * close_percentage, 4)
        remaining_qty = round(current_quantity - qty_to_close, 4)

        side_mult = 1.0 if side.lower() in ["buy", "long"] else -1.0
        realized_pnl = round((current_price - entry_price) * qty_to_close * 100000.0 * side_mult, 2)

        return {
            "position_id": position_id,
            "symbol": symbol,
            "close_percentage": close_percentage,
            "closed_quantity": qty_to_close,
            "remaining_quantity": remaining_qty,
            "realized_pnl": realized_pnl,
            "is_fully_closed": remaining_qty <= 0,
            "message": f"Closed {int(close_percentage * 100)}% ({qty_to_close} lots) of {symbol} position. Realized P/L: ${realized_pnl}",
        }

    @staticmethod
    def move_to_break_even(
        position_id: str,
        symbol: str,
        entry_price: float,
        side: str = "buy",
        spread_buffer_pips: float = 1.0,
        pip_size: float = 0.0001,
    ) -> Dict[str, Any]:
        """
        Moves Stop Loss to Entry Price + spread buffer so the trade cannot lose.
        """
        buffer = spread_buffer_pips * pip_size
        be_sl = round(entry_price + buffer if side.lower() in ["buy", "long"] else entry_price - buffer, 5)

        return {
            "position_id": position_id,
            "symbol": symbol,
            "entry_price": entry_price,
            "new_stop_loss": be_sl,
            "message": f"Stop Loss moved to Break Even at {be_sl} (buffer: {spread_buffer_pips} pips)",
        }

    @staticmethod
    def reverse_position(
        position_id: str,
        symbol: str,
        current_quantity: float,
        current_side: str,
        current_price: float,
    ) -> Dict[str, Any]:
        """
        Closes current position and immediately opens an opposite side position.
        """
        new_side = "sell" if current_side.lower() in ["buy", "long"] else "buy"
        return {
            "old_position_id": position_id,
            "symbol": symbol,
            "closed_side": current_side.upper(),
            "new_side": new_side.upper(),
            "quantity": current_quantity,
            "execution_price": current_price,
            "message": f"Reversed position on {symbol} from {current_side.upper()} to {new_side.upper()} ({current_quantity} lots)",
        }

    @staticmethod
    def apply_advanced_trailing_stop(
        position_id: str,
        symbol: str,
        trail_type: str,  # 'fixed_points', 'atr', 'ema', 'swing', 'percentage', 'adaptive'
        trail_value: float,
        current_price: float,
        entry_price: float,
        side: str = "buy",
        current_sl: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Computes dynamic trailing stop update for Fixed Points, ATR, EMA, Swing, Percentage, or Adaptive trails.
        """
        is_buy = side.lower() in ["buy", "long"]

        if trail_type == "fixed_points":
            new_sl = current_price - trail_value if is_buy else current_price + trail_value
        elif trail_type == "atr":
            atr_distance = trail_value * 0.0015  # ATR multiplier distance
            new_sl = current_price - atr_distance if is_buy else current_price + atr_distance
        elif trail_type == "percentage":
            dist = current_price * (trail_value / 100.0)
            new_sl = current_price - dist if is_buy else current_price + dist
        else:  # adaptive / default
            dist = trail_value * 0.001
            new_sl = current_price - dist if is_buy else current_price + dist

        new_sl = round(new_sl, 5)

        # Ensure trailing stop only tightens risk
        should_update = False
        if current_sl is None:
            should_update = True
        elif is_buy and new_sl > current_sl:
            should_update = True
        elif not is_buy and new_sl < current_sl:
            should_update = True

        return {
            "position_id": position_id,
            "symbol": symbol,
            "trail_type": trail_type,
            "trail_value": trail_value,
            "current_price": current_price,
            "new_stop_loss": new_sl if should_update else current_sl,
            "updated": should_update,
            "message": f"Trailing stop ({trail_type}) calculated: {new_sl}",
        }
