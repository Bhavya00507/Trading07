from typing import List, Dict, Any

class OptionScannerService:
    @staticmethod
    def scan_market(criteria: str = "all") -> List[Dict[str, Any]]:
        symbols = ["AAPL", "NVDA", "TSLA", "BTCUSDT", "ETHUSDT", "SPY", "QQQ", "AMD", "META", "AMZN"]
        results = []

        for idx, sym in enumerate(symbols):
            seed = (idx * 43 + len(criteria)) % 100
            price = 150.0 + (idx * 50)
            iv_rank = 12 + (seed % 80)
            vol = int((seed + 10) * 9200 + 15000)
            oi = vol * 4 + 1000
            vol_oi_ratio = round(vol / max(1, oi), 2)

            if criteria == "highest_iv" and iv_rank < 60:
                continue
            elif criteria == "lowest_iv" and iv_rank > 30:
                continue
            elif criteria == "gamma_squeeze" and vol_oi_ratio < 2.0:
                continue

            category = "Unusual Volume"
            if iv_rank > 70: category = "Highest IV"
            elif iv_rank < 25: category = "Lowest IV"
            elif vol_oi_ratio > 2.5: category = "Gamma Squeeze Alert"
            elif idx % 3 == 0: category = "Wheel Candidate"

            results.append({
                "symbol": sym,
                "underlying_price": price,
                "scan_category": category,
                "iv_rank": iv_rank,
                "iv_percentile": min(99.0, iv_rank + 4.0),
                "volume": vol,
                "open_interest": oi,
                "volume_oi_ratio": vol_oi_ratio,
                "recommended_strategy": "Covered Call / Cash-Secured Put" if "Wheel" in category else ("Bull Call Spread" if iv_rank < 50 else "Iron Condor")
            })

        return results
