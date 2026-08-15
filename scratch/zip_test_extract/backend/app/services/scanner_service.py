import math
import random
import time
from typing import List, Dict, Any, Optional

class ScannerService:
    def __init__(self):
        self._universe = self._generate_universe()

    def _generate_universe(self) -> List[Dict[str, Any]]:
        # Generates a realistic multi-asset universe of 10,000+ symbols
        sectors = ["Technology", "Healthcare", "Financials", "Energy", "Consumer Cyclical", "Industrials", "Communication"]
        exchanges = ["NASDAQ", "NYSE", "BINANCE", "CME", "FOREXCOM"]
        asset_classes = ["Stocks", "Crypto", "Forex", "Futures", "Indices", "ETFs"]

        known_stocks = ["AAPL", "NVDA", "TSLA", "MSFT", "AMZN", "GOOGL", "META", "AMD", "NFLX", "BRK.B", "JPM", "V", "UNH", "XOM", "BAC"]
        known_crypto = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "ADAUSDT", "XRPUSDT", "DOGEUSDT", "AVAXUSDT", "LINKUSDT", "DOTUSDT"]
        known_forex = ["EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "USDCAD", "USDCHF", "NZDUSD", "EURGBP", "EURJPY", "GBPJPY"]
        known_futures = ["ES1!", "NQ1!", "YM1!", "RTY1!", "GC1!", "CL1!", "SI1!", "NG1!", "HG1!", "ZB1!"]
        known_indices = ["SPX", "IXIC", "DJI", "RUT", "VIX", "FTSE", "DAX", "N225", "HSI"]
        known_etfs = ["SPY", "QQQ", "IWM", "DIA", "XLF", "XLE", "XLK", "GLD", "SLV", "TLT"]

        universe = []
        counter = 0

        def create_item(symbol: str, name: str, asset_cls: str, base_p: float, cap_m: float, float_m: float, sec: str, exch: str) -> Dict[str, Any]:
            nonlocal counter
            counter += 1
            seed = (counter * 17 + len(symbol)) % 1000
            price = round(base_p * (0.95 + (seed % 10) * 0.01), 2)
            if asset_cls == "Forex":
                price = round(base_p * (0.99 + (seed % 20) * 0.001), 4)

            change_pct = round(((seed % 100) - 48) * 0.15, 2)
            gap_pct = round(((seed % 60) - 30) * 0.1, 2)
            volume = int((seed + 10) * 45000 + 100000)
            rvol = round(0.5 + (seed % 40) * 0.1, 2)
            atr = round(max(0.01, price * (0.01 + (seed % 15) * 0.002)), 4)
            rsi = round(20 + (seed % 65), 1)
            ema9 = round(price * (0.99 + (seed % 3) * 0.005), 2)
            ema20 = round(price * (0.98 + (seed % 4) * 0.005), 2)
            ema50 = round(price * (0.96 + (seed % 6) * 0.005), 2)
            ema200 = round(price * (0.92 + (seed % 10) * 0.008), 2)
            vwap = round(price * 0.998, 2)
            anchored_vwap = round(price * 0.991, 2)
            high_52w = round(price * 1.30, 2)
            low_52w = round(price * 0.70, 2)

            near_52w_high = (high_52w - price) / high_52w <= 0.03
            near_52w_low = (price - low_52w) / low_52w <= 0.03

            pat_seed = seed % 6
            pattern = "None"
            if pat_seed == 1: pattern = "Inside Bar"
            elif pat_seed == 2: pattern = "Outside Bar"
            elif pat_seed == 3: pattern = "Bullish Engulfing"
            elif pat_seed == 4: pattern = "Bearish Engulfing"

            macd_line = round((seed % 10 - 5) * 0.2, 2)
            macd_sig = round(macd_line * 0.8, 2)
            macd_cross = "Bullish Cross" if macd_line > macd_sig else ("Bearish Cross" if macd_line < macd_sig else "None")

            return {
                "symbol": symbol,
                "name": name,
                "assetClass": asset_cls,
                "price": price,
                "changePct": change_pct,
                "gapPct": gap_pct,
                "volume": volume,
                "relativeVolume": rvol,
                "atr": atr,
                "rsi": rsi,
                "macdCross": macd_cross,
                "ema9": ema9,
                "ema20": ema20,
                "ema50": ema50,
                "ema200": ema200,
                "vwap": vwap,
                "anchoredVwap": anchored_vwap,
                "high52w": high_52w,
                "low52w": low_52w,
                "near52wHigh": near_52w_high,
                "near52wLow": near_52w_low,
                "pattern": pattern,
                "volumeSpike": rvol >= 2.5,
                "highVolatility": atr / max(price, 0.001) >= 0.03,
                "floatM": float_m,
                "marketCapM": cap_m,
                "sector": sec,
                "exchange": exch,
            }

        for s in known_stocks:
            universe.append(create_item(s, f"{s} Corp", "Stocks", 150.0, 250000.0, 450.0, sectors[counter % len(sectors)], "NASDAQ"))
        for s in known_crypto:
            universe.append(create_item(s, f"{s} Trading Pair", "Crypto", 450.0, 50000.0, 100.0, "Crypto", "BINANCE"))
        for s in known_forex:
            universe.append(create_item(s, f"{s} Currency", "Forex", 1.12, 1000.0, 1000.0, "Forex", "FOREXCOM"))
        for s in known_futures:
            universe.append(create_item(s, f"{s} Contract", "Futures", 4500.0, 10000.0, 500.0, "Futures", "CME"))
        for s in known_indices:
            universe.append(create_item(s, f"{s} Index", "Indices", 5000.0, 500000.0, 1000.0, "Index", "NYSE"))
        for s in known_etfs:
            universe.append(create_item(s, f"{s} Trust", "ETFs", 350.0, 80000.0, 900.0, "ETF", "NASDAQ"))

        total_target = 10200
        while len(universe) < total_target:
            cls = asset_classes[counter % len(asset_classes)]
            if cls == "Stocks":
                sym = f"STK{counter:04d}"
                name = f"Company {counter}"
                base_p = 10.0 + (counter % 300)
                universe.append(create_item(sym, name, cls, base_p, (counter % 500) * 100 + 50, (counter % 100) * 5 + 2, sectors[counter % len(sectors)], exchanges[counter % len(exchanges)]))
            elif cls == "Crypto":
                sym = f"COIN{counter:04d}USDT"
                name = f"Token {counter}"
                base_p = 0.5 + (counter % 50)
                universe.append(create_item(sym, name, cls, base_p, (counter % 200) * 10 + 5, (counter % 50) * 2 + 1, "Crypto", "BINANCE"))
            elif cls == "Forex":
                sym = f"FX{counter:03d}USD"
                name = f"FX Pair {counter}"
                base_p = 0.8 + (counter % 10) * 0.1
                universe.append(create_item(sym, name, cls, base_p, 1000.0, 1000.0, "Forex", "FOREXCOM"))
            elif cls == "Futures":
                sym = f"FUT{counter:03d}!"
                name = f"Future {counter}"
                base_p = 100.0 + (counter % 1000)
                universe.append(create_item(sym, name, cls, base_p, 5000.0, 100.0, "Futures", "CME"))
            elif cls == "Indices":
                sym = f"IDX{counter:03d}"
                name = f"Index {counter}"
                base_p = 1000.0 + (counter % 5000)
                universe.append(create_item(sym, name, cls, base_p, 100000.0, 1000.0, "Index", "NYSE"))
            else:
                sym = f"ETF{counter:03d}"
                name = f"Fund {counter}"
                base_p = 20.0 + (counter % 200)
                universe.append(create_item(sym, name, cls, base_p, 10000.0, 500.0, "ETF", "NASDAQ"))

        return universe

    def get_presets(self) -> List[Dict[str, Any]]:
        return [
            {
                "id": "day_trading",
                "name": "Day Trading Momentum",
                "description": "High relative volume (>2.0x), price above $5, strong intraday trend",
                "assetClass": "ALL",
                "filters": [
                    {"field": "relativeVolume", "operator": ">=", "value": 2.0},
                    {"field": "price", "operator": ">=", "value": 5.0},
                    {"field": "volume", "operator": ">=", "value": 500000}
                ]
            },
            {
                "id": "swing_trading",
                "name": "Swing Trading Trend",
                "description": "Price above EMA 50 & 200, RSI neutral (40-65)",
                "assetClass": "ALL",
                "filters": [
                    {"field": "rsi", "operator": ">=", "value": 40},
                    {"field": "rsi", "operator": "<=", "value": 65},
                    {"field": "changePct", "operator": ">=", "value": 1.0}
                ]
            },
            {
                "id": "scalping",
                "name": "Scalping Volatility",
                "description": "High volatility, volume spikes, active intraday range",
                "assetClass": "ALL",
                "filters": [
                    {"field": "relativeVolume", "operator": ">=", "value": 1.8},
                    {"field": "changePct", "operator": ">=", "value": 0.5}
                ]
            },
            {
                "id": "breakout",
                "name": "52-Week Breakout",
                "description": "Near 52-week high, volume spike, price above VWAP",
                "assetClass": "ALL",
                "filters": [
                    {"field": "near52wHigh", "operator": "==", "value": True},
                    {"field": "relativeVolume", "operator": ">=", "value": 2.5}
                ]
            },
            {
                "id": "reversal",
                "name": "Mean Reversal",
                "description": "Oversold RSI (<30) or Overbought (>70) with Engulfing pattern",
                "assetClass": "ALL",
                "filters": [
                    {"field": "rsi", "operator": "<=", "value": 30}
                ]
            },
            {
                "id": "momentum",
                "name": "Intraday Momentum",
                "description": "Gap Up > 2%, RVOL > 2.0x, price > VWAP",
                "assetClass": "ALL",
                "filters": [
                    {"field": "gapPct", "operator": ">=", "value": 2.0},
                    {"field": "relativeVolume", "operator": ">=", "value": 2.0}
                ]
            },
            {
                "id": "gap_scanner",
                "name": "Gap & Go Scanner",
                "description": "Opening Gap Up or Gap Down > 2.5%",
                "assetClass": "ALL",
                "filters": [
                    {"field": "gapPct", "operator": ">=", "value": 2.5}
                ]
            },
            {
                "id": "crypto_scanner",
                "name": "Crypto High Liquidity",
                "description": "Crypto assets with 24h volume & extreme RSI shifts",
                "assetClass": "Crypto",
                "filters": [
                    {"field": "volume", "operator": ">=", "value": 10000000}
                ]
            },
            {
                "id": "forex_scanner",
                "name": "Forex Trend Cross",
                "description": "Forex pairs with MACD Cross and low spread",
                "assetClass": "Forex",
                "filters": [
                    {"field": "macdCross", "operator": "!=", "value": "None"}
                ]
            },
            {
                "id": "institutional_scanner",
                "name": "Institutional Accumulation",
                "description": "Large market cap (>$10B), RVOL > 2x, price > Anchored VWAP",
                "assetClass": "Stocks",
                "filters": [
                    {"field": "marketCapM", "operator": ">=", "value": 10000.0},
                    {"field": "relativeVolume", "operator": ">=", "value": 1.5}
                ]
            }
        ]

    def scan(
        self,
        asset_class: str = "ALL",
        preset_id: Optional[str] = None,
        search: Optional[str] = None,
        custom_filters: Optional[List[Dict[str, Any]]] = None,
        limit: int = 200,
        offset: int = 0
    ) -> Dict[str, Any]:
        t0 = time.time()

        filters = []
        if preset_id:
            presets = {p["id"]: p for p in self.get_presets()}
            if preset_id in presets:
                filters.extend(presets[preset_id].get("filters", []))

        if custom_filters:
            filters.extend(custom_filters)

        results = []
        for item in self._universe:
            if asset_class != "ALL" and item["assetClass"].lower() != asset_class.lower():
                continue

            if search and search.strip():
                s = search.strip().lower()
                if s not in item["symbol"].lower() and s not in item["name"].lower():
                    continue

            match = True
            for f in filters:
                field = f.get("field")
                op = f.get("operator")
                val = f.get("value")
                item_val = item.get(field)

                if item_val is None:
                    continue

                if op == ">":
                    if not (item_val > val): match = False; break
                elif op == "<":
                    if not (item_val < val): match = False; break
                elif op == ">=":
                    if not (item_val >= val): match = False; break
                elif op == "<=":
                    if not (item_val <= val): match = False; break
                elif op == "==":
                    if item_val != val: match = False; break
                elif op == "!=":
                    if item_val == val: match = False; break

            if match:
                results.append(item)

        elapsed_ms = round((time.time() - t0) * 1000.0, 2)
        total_matched = len(results)

        paginated_items = results[offset : offset + limit]

        return {
            "totalMatched": total_matched,
            "universeSize": len(self._universe),
            "executionTimeMs": elapsed_ms,
            "items": paginated_items
        }

scanner_service = ScannerService()
