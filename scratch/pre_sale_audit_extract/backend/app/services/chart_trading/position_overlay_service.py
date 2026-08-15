from typing import Dict, Any, List, Optional
from .risk_service import RiskService

class PositionOverlayService:
    """
    Formats positions and pending orders into interactive chart overlay payloads.
    """

    @staticmethod
    def format_position_overlay(
        positions: List[Dict[str, Any]],
        current_prices: Dict[str, float],
        account_equity: float = 10000.0,
    ) -> List[Dict[str, Any]]:
        """
        Builds position overlay cards with live floating P/L, color states, risk/reward, leverage & margin used.
        """
        overlays = []
        for pos in positions:
            symbol = pos.get("symbol", "BTCUSDT")
            price = current_prices.get(symbol, pos.get("average_price", pos.get("entry_price", 100.0)))
            entry = pos.get("average_price", pos.get("entry_price", price))
            qty = pos.get("quantity", 1.0)
            side = "buy" if qty > 0 else "sell"
            abs_qty = abs(qty)

            sl = pos.get("stop_loss")
            tp = pos.get("take_profit")
            leverage = pos.get("leverage", 100.0)

            notional = entry * abs_qty * 100000.0
            margin_used = round(notional / max(leverage, 1.0), 2)

            side_mult = 1.0 if side == "buy" else -1.0
            floating_pnl = round((price - entry) * abs_qty * 100000.0 * side_mult, 2)
            color_state = "profit_green" if floating_pnl >= 0 else "loss_red"

            risk_metrics = RiskService.calculate_risk_metrics(
                entry_price=entry,
                current_price=price,
                stop_loss=sl,
                take_profit=tp,
                quantity=abs_qty,
                side=side,
                account_equity=account_equity,
            )

            overlays.append({
                "id": pos.get("id", f"POS_{symbol}"),
                "symbol": symbol,
                "side": side.upper(),
                "quantity": abs_qty,
                "entry_price": round(entry, 5),
                "current_price": round(price, 5),
                "stop_loss": round(sl, 5) if sl else None,
                "take_profit": round(tp, 5) if tp else None,
                "floating_pnl": floating_pnl,
                "color_state": color_state,
                "leverage": leverage,
                "margin_used": margin_used,
                "risk_metrics": risk_metrics,
            })
        return overlays

    @staticmethod
    def format_pending_order_overlay(
        pending_orders: List[Dict[str, Any]],
        current_prices: Dict[str, float],
    ) -> List[Dict[str, Any]]:
        """
        Builds pending order overlay banners with order type, entry, SL, TP, quantity, and expiration details.
        """
        overlays = []
        for order in pending_orders:
            symbol = order.get("symbol", "BTCUSDT")
            price = current_prices.get(symbol, order.get("price", 100.0))
            entry = order.get("price", price)
            side = order.get("side", "buy").lower()
            order_type = order.get("type", "limit").lower()
            qty = abs(order.get("quantity", 1.0))

            overlays.append({
                "id": order.get("id", f"ORD_{symbol}"),
                "symbol": symbol,
                "side": side.upper(),
                "order_type": order_type.upper(),
                "label": f"{order_type.upper()} {side.upper()}",
                "price": round(entry, 5),
                "current_price": round(price, 5),
                "quantity": qty,
                "stop_loss": round(order.get("stop_loss"), 5) if order.get("stop_loss") else None,
                "take_profit": round(order.get("take_profit"), 5) if order.get("take_profit") else None,
                "expiry": order.get("expiry", "GTC"),
                "status": order.get("status", "pending"),
            })
        return overlays
