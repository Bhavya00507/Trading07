from typing import Dict, Any, Optional
from .risk_service import RiskService

class DragService:
    """
    Handles live drag-and-drop modifications for Stop Loss, Take Profit, Entry Price, and Pending Orders.
    """

    @staticmethod
    def validate_and_calculate_drag(
        target_type: str,  # 'sl', 'tp', 'entry', 'pending'
        new_price: float,
        entry_price: float,
        side: str = "buy",
        tick_size: float = 0.01,
        quantity: float = 1.0,
        account_equity: float = 10000.0,
        contract_size: float = 100000.0,
    ) -> Dict[str, Any]:
        """
        Validates price step constraints and computes live updated risk metrics.
        """
        # Round price to nearest tick size
        steps = round(new_price / max(tick_size, 1e-8))
        rounded_price = round(steps * tick_size, 5)

        is_buy = side.lower() in ["buy", "long"]
        is_valid = True
        error_msg = None

        if target_type == "sl":
            if is_buy and rounded_price >= entry_price:
                is_valid = False
                error_msg = "Stop Loss for Buy must be below entry price"
            elif not is_buy and rounded_price <= entry_price:
                is_valid = False
                error_msg = "Stop Loss for Sell must be above entry price"
        elif target_type == "tp":
            if is_buy and rounded_price <= entry_price:
                is_valid = False
                error_msg = "Take Profit for Buy must be above entry price"
            elif not is_buy and rounded_price >= entry_price:
                is_valid = False
                error_msg = "Take Profit for Sell must be below entry price"

        sl = rounded_price if target_type == "sl" else None
        tp = rounded_price if target_type == "tp" else None
        entry = rounded_price if target_type in ["entry", "pending"] else entry_price

        metrics = RiskService.calculate_risk_metrics(
            entry_price=entry,
            current_price=entry_price,
            stop_loss=sl,
            take_profit=tp,
            quantity=quantity,
            side=side,
            account_equity=account_equity,
            contract_size=contract_size,
            tick_size=tick_size,
        )

        return {
            "target_type": target_type,
            "new_price": rounded_price,
            "is_valid": is_valid,
            "error": error_msg,
            "metrics": metrics,
        }
