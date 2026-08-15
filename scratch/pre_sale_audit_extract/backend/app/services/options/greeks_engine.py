from typing import List, Dict, Any
from app.services.options.black_scholes import calculate_black_scholes

class GreeksEngine:
    @staticmethod
    def calculate_leg_greeks(
        S: float, K: float, T: float, r: float, sigma: float, option_type: str
    ) -> Dict[str, float]:
        return calculate_black_scholes(S, K, T, r, sigma, option_type)

    @staticmethod
    def calculate_portfolio_greeks(legs: List[Dict[str, Any]], underlying_price: float) -> Dict[str, float]:
        net_delta = 0.0
        net_gamma = 0.0
        net_theta = 0.0
        net_vega = 0.0
        net_rho = 0.0

        for leg in legs:
            strike = float(leg.get("strike", underlying_price))
            opt_type = leg.get("type", "call").lower()
            action = leg.get("action", "buy").lower()
            qty = float(leg.get("quantity", 1.0))
            multiplier = 1.0 if action == "buy" else -1.0

            greeks = calculate_black_scholes(
                S=underlying_price,
                K=strike,
                T=30/365.0,
                r=0.05,
                sigma=0.25,
                option_type=opt_type
            )

            net_delta += greeks["delta"] * qty * multiplier * 100.0
            net_gamma += greeks["gamma"] * qty * multiplier * 100.0
            net_theta += greeks["theta"] * qty * multiplier * 100.0
            net_vega += greeks["vega"] * qty * multiplier * 100.0
            net_rho += greeks["rho"] * qty * multiplier * 100.0

        return {
            "net_delta": round(net_delta, 2),
            "net_gamma": round(net_gamma, 4),
            "net_theta": round(net_theta, 2),
            "net_vega": round(net_vega, 2),
            "net_rho": round(net_rho, 2),
            "portfolio_exposure": round(net_delta * underlying_price, 2)
        }
