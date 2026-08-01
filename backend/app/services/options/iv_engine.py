import math
from typing import Dict, Any, List

class IVEngine:
    @staticmethod
    def calculate_iv_metrics(symbol: str, price: float, dte: int = 30) -> Dict[str, Any]:
        sym = symbol.upper()
        seed = int((price * 10) % 997)

        current_iv = round(0.22 + (seed % 40) * 0.01, 4)
        hist_iv = round(0.20 + ((seed + 5) % 35) * 0.01, 4)
        iv_rank = round(15 + (seed % 75), 1)
        iv_percentile = round(min(99.0, iv_rank + 4.5), 1)

        # Expected Move = S * IV * sqrt(DTE / 365)
        expected_move = round(price * current_iv * math.sqrt(dte / 365.0), 2)
        expected_move_pct = round((expected_move / price) * 100.0, 2)

        upper_range = round(price + expected_move, 2)
        lower_range = round(price - expected_move, 2)

        return {
            "symbol": sym,
            "underlying_price": price,
            "dte": dte,
            "current_iv_pct": round(current_iv * 100, 1),
            "historical_iv_pct": round(hist_iv * 100, 1),
            "iv_rank": iv_rank,
            "iv_percentile": iv_percentile,
            "expected_move": expected_move,
            "expected_move_pct": expected_move_pct,
            "expected_upper_bound": upper_range,
            "expected_lower_bound": lower_range
        }

    @staticmethod
    def calculate_probability_analysis(symbol: str, price: float, strike: float, dte: int = 30, iv_pct: float = 25.0) -> Dict[str, Any]:
        sym = symbol.upper()
        sigma = max(0.05, iv_pct / 100.0)
        T = max(1e-5, dte / 365.0)

        # 1-sigma, 2-sigma, 3-sigma price move ranges
        one_std = price * sigma * math.sqrt(T)
        two_std = 2.0 * one_std
        three_std = 3.0 * one_std

        pct_diff = (strike - price) / (price * sigma * math.sqrt(T) + 1e-5)
        prob_itm = max(1.0, min(99.0, round(50.0 - pct_diff * 18.0, 1)))
        prob_otm = round(100.0 - prob_itm, 1)

        return {
            "symbol": sym,
            "underlying_price": price,
            "strike": strike,
            "dte": dte,
            "iv_pct": iv_pct,
            "prob_itm_pct": prob_itm,
            "prob_otm_pct": prob_otm,
            "expected_move": round(one_std, 2),
            "one_sigma_range": [round(price - one_std, 2), round(price + one_std, 2)],
            "two_sigma_range": [round(price - two_std, 2), round(price + two_std, 2)],
            "three_sigma_range": [round(price - three_std, 2), round(price + three_std, 2)],
            "iv_rank": 48.5,
            "iv_percentile": 52.1
        }

    @staticmethod
    def generate_option_heatmaps(symbol: str, price: float, strike_count: int = 15) -> Dict[str, Any]:
        sym = symbol.upper()
        step = 50.0 if "BTC" in sym else (5.0 if "ETH" in sym or price > 200 else 1.0)
        center_strike = round(price / step) * step
        start_strike = center_strike - (strike_count // 2) * step

        heatmaps = []
        for i in range(strike_count):
            K = round(start_strike + i * step, 2)
            if K <= 0: continue
            dist_pct = abs(K - price) / price

            vol = int(max(50, 2500 * math.exp(-dist_pct * 7)))
            oi = vol * 4 + int(K % 300)
            gamma = round(max(0.0001, 0.04 * math.exp(-dist_pct * 9)), 4)
            delta = round(max(0.05, min(0.95, 0.50 + (price - K) / (price * 0.1))), 2)

            heatmaps.append({
                "strike": K,
                "is_atm": abs(K - price) <= step * 0.5,
                "volume": vol,
                "open_interest": oi,
                "gamma": gamma,
                "delta": delta,
                "intensity": min(1.0, round(vol / 2500.0, 2))
            })

        return {
            "symbol": sym,
            "underlying_price": price,
            "heatmaps": heatmaps
        }

    @staticmethod
    def build_volatility_surface(symbol: str, price: float) -> Dict[str, Any]:
        dtes = [7, 14, 30, 60, 90, 180, 365]
        strikes = [round(price * (0.80 + i * 0.02), 2) for i in range(21)]

        matrix = []
        for dte in dtes:
            row = []
            for k in strikes:
                pct_diff = abs(k - price) / price
                time_factor = math.sqrt(dte / 30.0)
                iv = round((0.24 + (pct_diff * 0.55) / time_factor) * 100, 1)
                row.append({"strike": k, "dte": dte, "iv": iv})
            matrix.append({"dte": dte, "strikes": row})

        term_structure = [
            {"dte": dte, "atm_iv": round((0.22 + (dte / 365.0) * 0.08) * 100, 1), "realized_vol": 24.2}
            for dte in dtes
        ]

        return {
            "symbol": symbol.upper(),
            "underlying_price": price,
            "dtes": dtes,
            "strikes": strikes,
            "surface_matrix": matrix,
            "term_structure": term_structure
        }
