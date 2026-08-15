import math
from typing import Dict, Any, Optional

class RiskService:
    """
    Calculates live risk, reward, and distance metrics for interactive chart trading.
    """

    @staticmethod
    def calculate_risk_metrics(
        entry_price: float,
        current_price: float,
        stop_loss: Optional[float] = None,
        take_profit: Optional[float] = None,
        quantity: float = 1.0,
        side: str = "buy",
        account_equity: float = 10000.0,
        contract_size: float = 100000.0,
        tick_size: float = 0.0001,
    ) -> Dict[str, Any]:
        """
        Compute complete risk, reward, R:R ratio, P/L projections, and distances.
        """
        side_mult = 1.0 if side.lower() in ["buy", "long"] else -1.0
        abs_qty = abs(quantity)

        # Distance to current price
        unrealized_pnl = (current_price - entry_price) * abs_qty * contract_size * side_mult

        # Risk metrics (Stop Loss)
        risk_usd = 0.0
        risk_pct = 0.0
        sl_distance_ticks = 0.0
        sl_distance_pct = 0.0
        sl_pnl = 0.0

        if stop_loss is not None and stop_loss > 0:
            sl_dist = abs(entry_price - stop_loss)
            sl_distance_ticks = round(sl_dist / max(tick_size, 1e-8), 1)
            sl_distance_pct = round((sl_dist / entry_price) * 100.0, 2)
            risk_usd = sl_dist * abs_qty * contract_size
            risk_pct = round((risk_usd / max(account_equity, 1.0)) * 100.0, 2)
            sl_pnl = -risk_usd

        # Reward metrics (Take Profit)
        reward_usd = 0.0
        reward_pct = 0.0
        tp_distance_ticks = 0.0
        tp_distance_pct = 0.0
        tp_pnl = 0.0

        if take_profit is not None and take_profit > 0:
            tp_dist = abs(take_profit - entry_price)
            tp_distance_ticks = round(tp_dist / max(tick_size, 1e-8), 1)
            tp_distance_pct = round((tp_dist / entry_price) * 100.0, 2)
            reward_usd = tp_dist * abs_qty * contract_size
            reward_pct = round((reward_usd / max(account_equity, 1.0)) * 100.0, 2)
            tp_pnl = reward_usd

        # Risk:Reward Ratio
        rr_ratio_str = "1 : 0.0"
        rr_numeric = 0.0
        if risk_usd > 0 and reward_usd > 0:
            rr_numeric = round(reward_usd / risk_usd, 2)
            rr_ratio_str = f"1 : {rr_numeric}"

        return {
            "entry_price": round(entry_price, 5),
            "current_price": round(current_price, 5),
            "stop_loss": round(stop_loss, 5) if stop_loss else None,
            "take_profit": round(take_profit, 5) if take_profit else None,
            "quantity": abs_qty,
            "side": side,
            "unrealized_pnl": round(unrealized_pnl, 2),
            "risk_usd": round(risk_usd, 2),
            "risk_pct": risk_pct,
            "sl_distance_ticks": sl_distance_ticks,
            "sl_distance_pct": sl_distance_pct,
            "sl_projected_pnl": round(sl_pnl, 2),
            "reward_usd": round(reward_usd, 2),
            "reward_pct": reward_pct,
            "tp_distance_ticks": tp_distance_ticks,
            "tp_distance_pct": tp_distance_pct,
            "tp_projected_pnl": round(tp_pnl, 2),
            "risk_reward_ratio": rr_ratio_str,
            "risk_reward_numeric": rr_numeric,
        }
