from typing import Dict, Any, Optional
from .risk_service import RiskService

class PreviewService:
    """
    Generates institutional order preview calculations before order execution.
    """

    @staticmethod
    def generate_order_preview(
        symbol: str,
        side: str,  # 'buy' or 'sell'
        order_type: str,  # 'market', 'limit', 'stop', 'stop_limit'
        quantity: float,
        entry_price: float,
        current_price: float,
        stop_loss: Optional[float] = None,
        take_profit: Optional[float] = None,
        account_balance: float = 10000.0,
        leverage: float = 100.0,
        contract_size: float = 100000.0,
        spread_pip: float = 1.2,
        commission_per_lot: float = 3.50,
        swap_long: float = -0.5,
        swap_short: float = 0.2,
    ) -> Dict[str, Any]:
        """
        Calculates order preview metrics including margin, risk, reward, commission, spread, and swap estimates.
        """
        if contract_size == 100000.0 and any(s in symbol.upper() for s in ["BTC", "ETH", "SOL", "XRP", "BNB", "USDT"]):
            contract_size = 1.0

        abs_qty = abs(quantity)
        notional_value = entry_price * abs_qty * contract_size
        required_margin = round(notional_value / max(leverage, 1.0), 2)
        margin_pct = round((required_margin / max(account_balance, 1.0)) * 100.0, 2)

        # Cost estimates
        commission = round(commission_per_lot * abs_qty * 2.0, 2)  # Turnaround buy+sell
        pip_value = 0.0001 * abs_qty * contract_size
        spread_cost = round(spread_pip * pip_value, 2)
        swap_est = round(swap_long if side.lower() == "buy" else swap_short, 2)

        risk_metrics = RiskService.calculate_risk_metrics(
            entry_price=entry_price,
            current_price=current_price,
            stop_loss=stop_loss,
            take_profit=take_profit,
            quantity=abs_qty,
            side=side,
            account_equity=account_balance,
            contract_size=contract_size,
        )

        return {
            "symbol": symbol,
            "side": side.upper(),
            "order_type": order_type.upper(),
            "quantity": abs_qty,
            "entry_price": round(entry_price, 5),
            "current_price": round(current_price, 5),
            "notional_value": round(notional_value, 2),
            "required_margin": required_margin,
            "margin_percentage": margin_pct,
            "estimated_commission": commission,
            "estimated_spread_cost": spread_cost,
            "estimated_swap_nightly": swap_est,
            "risk_metrics": risk_metrics,
            "can_execute": account_balance >= required_margin,
            "warning": None if account_balance >= required_margin else "Insufficient Account Margin",
        }
