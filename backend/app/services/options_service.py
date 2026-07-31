import math
import random
import time
from typing import List, Dict, Any, Optional

from app.services.options.black_scholes import calculate_black_scholes
from app.services.options.iv_engine import IVEngine
from app.services.options.greeks_engine import GreeksEngine
from app.services.options.option_scanner import OptionScannerService

class OptionsGreeksEngine:
    @staticmethod
    def calculate_bs_greeks(
        S: float, K: float, T: float, r: float, sigma: float, option_type: str = "call"
    ) -> Dict[str, float]:
        return calculate_black_scholes(S, K, T, r, sigma, option_type)

class OptionsDeskService:
    @staticmethod
    def generate_options_chain(
        symbol: str = "BTCUSDT",
        underlying_price: float = 65000.0,
        expiry_days: int = 30,
        strike_count: int = 25
    ) -> Dict[str, Any]:
        """Generates a complete institutional options chain with Black-Scholes Greeks."""
        symbol_upper = symbol.upper()
        S = underlying_price
        r = 0.05
        T = expiry_days / 365.0

        step = 50.0 if "BTC" in symbol_upper else (5.0 if "ETH" in symbol_upper or S > 200 else 1.0)
        center_strike = round(S / step) * step

        chain = []
        start_strike = center_strike - (strike_count // 2) * step

        for i in range(strike_count):
            K = round(start_strike + i * step, 2)
            if K <= 0:
                continue

            pct_diff = abs(K - S) / S
            iv = max(0.15, 0.25 + pct_diff * 0.8)

            call_greeks = calculate_black_scholes(S, K, T, r, iv, "call")
            put_greeks = calculate_black_scholes(S, K, T, r, iv, "put")

            call_vol = int(max(10, 1500 * math.exp(-pct_diff * 8)))
            call_oi = call_vol * 4 + int(K % 200)
            put_vol = int(max(10, 1400 * math.exp(-pct_diff * 8)))
            put_oi = put_vol * 4 + int(K % 180)

            call_bid = round(call_greeks["price"] * 0.98, 2)
            call_ask = round(call_greeks["price"] * 1.02, 2)
            put_bid = round(put_greeks["price"] * 0.98, 2)
            put_ask = round(put_greeks["price"] * 1.02, 2)

            is_atm = abs(K - S) <= step * 0.5
            call_status = "ATM" if is_atm else ("ITM" if S > K else "OTM")
            put_status = "ATM" if is_atm else ("ITM" if K > S else "OTM")

            chain.append({
                "strike": K,
                "is_atm": is_atm,
                "call": {
                    "bid": call_bid, "ask": call_ask, "last": call_greeks["price"],
                    "volume": call_vol, "open_interest": call_oi, "iv_pct": round(iv * 100, 1),
                    "greeks": call_greeks, "status": call_status
                },
                "put": {
                    "bid": put_bid, "ask": put_ask, "last": put_greeks["price"],
                    "volume": put_vol, "open_interest": put_oi, "iv_pct": round(iv * 100, 1),
                    "greeks": put_greeks, "status": put_status
                }
            })

        expirations = [
            {"label": "7 DTE (Weekly)", "days": 7, "date": "2026-08-07"},
            {"label": "14 DTE (Weekly)", "days": 14, "date": "2026-08-14"},
            {"label": "30 DTE (Monthly)", "days": 30, "date": "2026-08-30"},
            {"label": "60 DTE (Monthly)", "days": 60, "date": "2026-09-30"},
            {"label": "90 DTE (Quarterly)", "days": 90, "date": "2026-10-30"},
            {"label": "180 DTE (Quarterly)", "days": 180, "date": "2027-01-30"},
            {"label": "365 DTE (LEAPS)", "days": 365, "date": "2027-07-30"}
        ]

        return {
            "symbol": symbol_upper,
            "underlying_price": S,
            "expiry_days": expiry_days,
            "expirations": expirations,
            "chain": chain
        }

    @staticmethod
    def calculate_strategy_payoff(
        legs: List[Dict[str, Any]],
        underlying_price: float,
        price_range_pct: float = 0.20,
        steps: int = 50
    ) -> Dict[str, Any]:
        """Calculates multi-leg options strategy payoff curve, max profit, max loss, POP, & breakeven points."""
        S = underlying_price
        min_p = S * (1.0 - price_range_pct)
        max_p = S * (1.0 + price_range_pct)
        step_val = (max_p - min_p) / steps

        payoff_curve = []
        net_credit_debit = 0.0

        for leg in legs:
            action = leg.get("action", "buy").lower()
            premium = float(leg.get("premium", 5.0))
            qty = float(leg.get("quantity", 1.0))
            multiplier = 1.0 if action == "buy" else -1.0
            net_credit_debit += (premium * qty * multiplier)

        profitable_points = 0
        breakevens = []
        max_profit = -float("inf")
        max_loss = float("inf")

        for i in range(steps + 1):
            p = min_p + (i * step_val)
            leg_payoffs = 0.0

            for leg in legs:
                K = float(leg.get("strike", S))
                action = leg.get("action", "buy").lower()
                opt_type = leg.get("type", "call").lower()
                premium = float(leg.get("premium", 5.0))
                qty = float(leg.get("quantity", 1.0))

                if opt_type == "call":
                    intrinsic = max(0.0, p - K)
                else:
                    intrinsic = max(0.0, K - p)

                if action == "buy":
                    pnl = (intrinsic - premium) * qty * 100.0
                else:
                    pnl = (premium - intrinsic) * qty * 100.0

                leg_payoffs += pnl

            max_profit = max(max_profit, leg_payoffs)
            max_loss = min(max_loss, leg_payoffs)

            if leg_payoffs >= 0:
                profitable_points += 1

            payoff_curve.append({
                "underlying_price": round(p, 2),
                "payoff_at_expiry": round(leg_payoffs, 2),
                "pnl_today": round(leg_payoffs * 0.85, 2)
            })

        pop_pct = round((profitable_points / (steps + 1)) * 100.0, 1)

        for i in range(len(payoff_curve) - 1):
            p1 = payoff_curve[i]["payoff_at_expiry"]
            p2 = payoff_curve[i+1]["payoff_at_expiry"]
            if (p1 <= 0 and p2 >= 0) or (p1 >= 0 and p2 <= 0):
                breakevens.append(payoff_curve[i]["underlying_price"])

        return {
            "underlying_price": S,
            "net_credit_debit": round(net_credit_debit * 100.0, 2),
            "is_credit": net_credit_debit < 0,
            "max_profit": round(max_profit, 2) if max_profit < 1e6 else "Unlimited",
            "max_loss": round(max_loss, 2) if max_loss > -1e6 else "Unlimited",
            "probability_of_profit_pct": pop_pct,
            "breakeven_prices": breakevens,
            "payoff_curve": payoff_curve
        }

    @staticmethod
    def generate_volatility_surface(symbol: str = "BTCUSDT", price: float = 65000.0) -> Dict[str, Any]:
        return IVEngine.build_volatility_surface(symbol=symbol, price=price)

    @staticmethod
    def run_options_scanner(criteria: str = "unusual_volume") -> List[Dict[str, Any]]:
        return OptionScannerService.scan_market(criteria=criteria)

    @staticmethod
    def ai_options_query(prompt: str) -> Dict[str, Any]:
        p_lower = prompt.lower()
        if "bullish" in p_lower or "call" in p_lower:
            recommendation = "Recommended Strategy: Bull Call Spread (Buy 45 DTE 0.60 Delta Call, Sell 0.30 Delta Call). Defined risk with 2.5:1 Risk/Reward."
        elif "safest" in p_lower or "neutral" in p_lower:
            recommendation = "Recommended Strategy: Iron Condor (Sell 0.15 Delta Put/Call spreads). High Probability of Profit (78% POP) capturing Theta decay."
        elif "greeks" in p_lower or "delta" in p_lower:
            recommendation = "Greeks Analysis: Portfolio Net Positive Delta (+145) and Negative Theta (-$32/day). Protect against IV drops with Vega hedges."
        elif "iron condor" in p_lower or "optimize" in p_lower:
            recommendation = "Optimization: Shift short strikes to 1.5 Std Dev (0.12 Delta) and widen long wings to reduce Gamma risk before earnings."
        else:
            recommendation = f"AI Options Analysis: Market IV Rank is 42%. Use defined-risk credit spreads to optimize Theta decay."

        return {
            "query": prompt,
            "recommendation": recommendation,
            "confidence": 92
        }

options_service = OptionsDeskService()
