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
