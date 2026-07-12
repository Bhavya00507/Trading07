import httpx
import asyncio
import os
from typing import Dict, List, Any, Optional

# Shared AsyncClient for connection pooling and resource reuse
shared_client = httpx.AsyncClient(
    timeout=httpx.Timeout(2.5, connect=1.0),
    limits=httpx.Limits(max_keepalive_connections=100, max_connections=200)
)

class MarketProvider:
    async def get_price(self, symbol: str) -> float:
        raise NotImplementedError()
        
    async def get_candles(self, symbol: str, timeframe: str, limit: int = 1000, before: Optional[int] = None) -> List[Dict[str, Any]]:
        raise NotImplementedError()

class BinanceProvider(MarketProvider):
    async def get_price(self, symbol: str) -> float:
        normalized = symbol.upper()
        if normalized.endswith("USD"):
            normalized = normalized.replace("USD", "USDT")
            
        url = f"https://api.binance.com/api/v3/ticker/price?symbol={normalized}"
        try:
            resp = await shared_client.get(url, timeout=1.5)
            if resp.status_code == 200:
                return float(resp.json()["price"])
        except Exception:
            pass
        raise Exception(f"Failed to fetch price from Binance for {symbol}")

    async def get_candles(self, symbol: str, timeframe: str, limit: int = 1000, before: Optional[int] = None) -> List[Dict[str, Any]]:
        normalized = symbol.upper()
        if normalized.endswith("USD"):
            normalized = normalized.replace("USD", "USDT")
            
        interval = timeframe
        if interval == "1s":
            interval = "1s"
        elif interval in ["5s", "15s", "30s"]:
            interval = "1s"
            
        req_limit = min(limit, 1000)
        url = f"https://api.binance.com/api/v3/klines?symbol={normalized}&interval={interval}&limit={req_limit}"
        
        if before:
            url += f"&endTime={before}"
            
        try:
            resp = await shared_client.get(url, timeout=1.5)
            if resp.status_code == 200:
                data = resp.json()
                candles = []
                for item in data:
                    candles.append({
                        "timestamp": int(item[0]),
                        "open": float(item[1]),
                        "high": float(item[2]),
                        "low": float(item[3]),
                        "close": float(item[4]),
                        "volume": float(item[5])
                    })
                
                # Perform client-side aggregation for 5s, 15s, 30s
                if timeframe in ["5s", "15s", "30s"]:
                    agg_sec = 5 if timeframe == "5s" else 15 if timeframe == "15s" else 30
                    agg_candles = []
                    chunk_size = agg_sec
                    for idx in range(0, len(candles), chunk_size):
                        chunk = candles[idx:idx+chunk_size]
                        if not chunk:
                            continue
                        agg_candles.append({
                            "timestamp": chunk[0]["timestamp"],
                            "open": chunk[0]["open"],
                            "high": max(c["high"] for c in chunk),
                            "low": min(c["low"] for c in chunk),
                            "close": chunk[-1]["close"],
                            "volume": sum(c["volume"] for c in chunk)
                        })
                    return agg_candles
                return candles
        except Exception:
            pass
        raise Exception(f"Failed to fetch candles from Binance for {symbol}")

class YahooFinanceProvider(MarketProvider):
    # Mapping symbol names to Yahoo Finance symbols
    SYMBOL_MAP = {
        "EURUSD": "EURUSD=X",
        "GBPUSD": "GBPUSD=X",
        "USDJPY": "USDJPY=X",
        "USDCHF": "USDCHF=X",
        "AUDUSD": "AUDUSD=X",
        "NZDUSD": "NZDUSD=X",
        "USDCAD": "USDCAD=X",
        "EURJPY": "EURJPY=X",
        "EURGBP": "EURGBP=X",
        "GBPJPY": "GBPJPY=X",
        "XAUUSD": "GC=F",      # Gold Futures
        "XAGUSD": "SI=F",      # Silver Futures
        "US30": "^DJI",        # Dow Jones Industrial Average
        "NAS100": "^NDX",      # Nasdaq 100
        "SPX500": "^GSPC",     # S&P 500
        "GER40": "^GDAXI",     # DAX 40
        "UK100": "^FTSE",      # FTSE 100
        "JP225": "^N225",      # Nikkei 225
        "USOIL": "CL=F",       # Crude Oil
        "BRENT": "BZ=F"        # Brent Crude
    }

    async def get_price(self, symbol: str) -> float:
        y_symbol = self.SYMBOL_MAP.get(symbol.upper(), symbol.upper())
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{y_symbol}?interval=1m&range=1d"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
        try:
            resp = await shared_client.get(url, headers=headers, timeout=1.5)
            if resp.status_code == 200:
                data = resp.json()
                result = data.get("chart", {}).get("result", [])
                if result:
                    meta = result[0].get("meta", {})
                    price = meta.get("regularMarketPrice")
                    if price is not None:
                        return float(price)
        except Exception:
            pass
        raise Exception(f"Failed to fetch price from Yahoo Finance for {symbol}")

    async def get_candles(self, symbol: str, timeframe: str, limit: int = 1000, before: Optional[int] = None) -> List[Dict[str, Any]]:
        y_symbol = self.SYMBOL_MAP.get(symbol.upper(), symbol.upper())
        
        interval = "1m"
        if timeframe in ["1m", "3m", "5m", "15m", "30m"]:
            interval = "1m" if timeframe == "1m" else "2m" if timeframe == "3m" else "5m" if timeframe == "5m" else "15m" if timeframe == "15m" else "30m"
        elif timeframe in ["1h", "2h", "4h"]:
            interval = "60m"
        elif timeframe in ["Daily", "1d"]:
            interval = "1d"
        elif timeframe in ["Weekly", "1w"]:
            interval = "1wk"
        elif timeframe in ["Monthly", "1M"]:
            interval = "1mo"
            
        if before:
            period2 = int(before // 1000)
            int_sec = 60
            if interval == "2m": int_sec = 120
            elif interval == "5m": int_sec = 300
            elif interval == "15m": int_sec = 900
            elif interval == "30m": int_sec = 1800
            elif interval == "60m": int_sec = 3600
            elif interval == "1d": int_sec = 86400
            elif interval == "1wk": int_sec = 604800
            elif interval == "1mo": int_sec = 2592000
            
            period1 = period2 - (limit * int_sec * 2)
            url = f"https://query1.finance.yahoo.com/v8/finance/chart/{y_symbol}?interval={interval}&period1={period1}&period2={period2}"
        else:
            range_val = "7d"
            if interval == "1m":
                range_val = "7d"
            elif interval in ["2m", "5m", "15m", "30m"]:
                range_val = "60d"
            elif interval == "60m":
                range_val = "730d"
            else:
                range_val = "10y"
            url = f"https://query1.finance.yahoo.com/v8/finance/chart/{y_symbol}?interval={interval}&range={range_val}"
            
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, http://localhost) Chrome/91.0.4472.124 Safari/537.36"
        }
        try:
            resp = await shared_client.get(url, headers=headers, timeout=1.5)
            if resp.status_code == 200:
                data = resp.json()
                chart_res = data.get("chart", {}).get("result", [])
                if not chart_res:
                    raise Exception(f"No chart data in Yahoo Finance response for {symbol}")
                
                result = chart_res[0]
                timestamps = result.get("timestamp", [])
                quote = result.get("indicators", {}).get("quote", [{}])[0]
                opens = quote.get("open", [])
                highs = quote.get("high", [])
                lows = quote.get("low", [])
                closes = quote.get("close", [])
                volumes = quote.get("volume", [0.0] * len(timestamps))
                
                candles = []
                for i in range(len(timestamps)):
                    if opens[i] is None or highs[i] is None or lows[i] is None or closes[i] is None:
                        continue
                    candles.append({
                        "timestamp": timestamps[i] * 1000,
                        "open": float(opens[i]),
                        "high": float(highs[i]),
                        "low": float(lows[i]),
                        "close": float(closes[i]),
                        "volume": float(volumes[i]) if volumes[i] is not None else 0.0
                    })
                
                if timeframe == "3m" and interval == "1m":
                    agg_candles = []
                    for idx in range(0, len(candles), 3):
                        chunk = candles[idx:idx+3]
                        if not chunk: continue
                        agg_candles.append({
                            "timestamp": chunk[0]["timestamp"],
                            "open": chunk[0]["open"],
                            "high": max(c["high"] for c in chunk),
                            "low": min(c["low"] for c in chunk),
                            "close": chunk[-1]["close"],
                            "volume": sum(c["volume"] for c in chunk)
                        })
                    return agg_candles
                elif timeframe == "2h" and interval == "60m":
                    agg_candles = []
                    for idx in range(0, len(candles), 2):
                        chunk = candles[idx:idx+2]
                        if not chunk: continue
                        agg_candles.append({
                            "timestamp": chunk[0]["timestamp"],
                            "open": chunk[0]["open"],
                            "high": max(c["high"] for c in chunk),
                            "low": min(c["low"] for c in chunk),
                            "close": chunk[-1]["close"],
                            "volume": sum(c["volume"] for c in chunk)
                        })
                    return agg_candles
                elif timeframe == "4h" and interval == "60m":
                    agg_candles = []
                    for idx in range(0, len(candles), 4):
                        chunk = candles[idx:idx+4]
                        if not chunk: continue
                        agg_candles.append({
                            "timestamp": chunk[0]["timestamp"],
                            "open": chunk[0]["open"],
                            "high": max(c["high"] for c in chunk),
                            "low": min(c["low"] for c in chunk),
                            "close": chunk[-1]["close"],
                            "volume": sum(c["volume"] for c in chunk)
                        })
                    return agg_candles
                    
                return candles[-limit:]
        except Exception:
            pass
        raise Exception(f"Failed to fetch candles from Yahoo Finance for {symbol}")

class TwelveDataProvider(MarketProvider):
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key
        self.fallback_provider = YahooFinanceProvider()

    async def get_price(self, symbol: str) -> float:
        if not self.api_key:
            return await self.fallback_provider.get_price(symbol)
        
        td_symbol = symbol
        if len(symbol) == 6 and symbol.isupper() and symbol not in ["GER40", "NAS100", "US30", "SPX500", "USOIL", "BRENT"]:
            td_symbol = f"{symbol[:3]}/{symbol[3:]}"
            
        url = f"https://api.twelvedata.com/price?symbol={td_symbol}&apikey={self.api_key}"
        try:
            resp = await shared_client.get(url, timeout=1.5)
            if resp.status_code == 200:
                data = resp.json()
                if "price" in data:
                    return float(data["price"])
                else:
                    print(f"TwelveData error: {data}. Falling back to Yahoo Finance.")
        except Exception:
            pass
                    
        return await self.fallback_provider.get_price(symbol)

    async def get_candles(self, symbol: str, timeframe: str, limit: int = 1000, before: Optional[int] = None) -> List[Dict[str, Any]]:
        if not self.api_key:
            return await self.fallback_provider.get_candles(symbol, timeframe, limit, before)
            
        td_symbol = symbol
        if len(symbol) == 6 and symbol.isupper() and symbol not in ["GER40", "NAS100", "US30", "SPX500", "USOIL", "BRENT"]:
            td_symbol = f"{symbol[:3]}/{symbol[3:]}"
            
        interval = "1min"
        if timeframe in ["1m", "3m", "5m", "15m", "30m"]:
            interval = "1min" if timeframe == "1m" else "5min" if timeframe == "5m" else "15min" if timeframe == "15m" else "30min"
        elif timeframe in ["1h", "2h", "4h"]:
            interval = "1h" if timeframe == "1h" else "2h" if timeframe == "2h" else "4h"
        elif timeframe in ["Daily", "1d"]:
            interval = "1day"
        elif timeframe in ["Weekly", "1w"]:
            interval = "1week"
        elif timeframe in ["Monthly", "1M"]:
            interval = "1month"
            
        req_limit = min(limit, 5000)
        url = f"https://api.twelvedata.com/time_series?symbol={td_symbol}&interval={interval}&outputsize={req_limit}&apikey={self.api_key}"
        
        if before:
            import datetime
            dt = datetime.datetime.fromtimestamp(before / 1000)
            end_date = dt.strftime("%Y-%m-%d %H:%M:%S")
            url += f"&end_date={end_date}"
            
        try:
            resp = await shared_client.get(url, timeout=1.5)
            if resp.status_code == 200:
                data = resp.json()
                if "values" in data:
                    candles = []
                    for item in reversed(data["values"]):
                        import datetime
                        dt = datetime.datetime.strptime(item["datetime"], "%Y-%m-%d %H:%M:%S" if len(item["datetime"]) > 10 else "%Y-%m-%d")
                        ts = int(dt.timestamp() * 1000)
                        candles.append({
                            "timestamp": ts,
                            "open": float(item["open"]),
                            "high": float(item["high"]),
                            "low": float(item["low"]),
                            "close": float(item["close"]),
                            "volume": float(item.get("volume", 0.0))
                        })
                    return candles
                else:
                    print(f"TwelveData error: {data}. Falling back to Yahoo Finance.")
        except Exception:
            pass
                    
        return await self.fallback_provider.get_candles(symbol, timeframe, limit, before)

class FXCMProvider(MarketProvider):
    def __init__(self, api_key: Optional[str] = None):
        self.delegate = TwelveDataProvider(api_key=api_key)

    async def get_price(self, symbol: str) -> float:
        return await self.delegate.get_price(symbol)

    async def get_candles(self, symbol: str, timeframe: str, limit: int = 1000, before: Optional[int] = None) -> List[Dict[str, Any]]:
        return await self.delegate.get_candles(symbol, timeframe, limit, before)

class TradingViewProvider(MarketProvider):
    def __init__(self, api_key: Optional[str] = None):
        self.delegate = TwelveDataProvider(api_key=api_key)

    async def get_price(self, symbol: str) -> float:
        return await self.delegate.get_price(symbol)

    async def get_candles(self, symbol: str, timeframe: str, limit: int = 1000, before: Optional[int] = None) -> List[Dict[str, Any]]:
        return await self.delegate.get_candles(symbol, timeframe, limit, before)

class MarketProviderRegistry:
    def __init__(self):
        td_api_key = os.getenv("TWELVEDATA_API_KEY")
        self.crypto_provider = BinanceProvider()
        self.fxcm_provider = FXCMProvider(api_key=td_api_key)
        self.tv_provider = TradingViewProvider(api_key=td_api_key)

    def get_provider(self, symbol: str) -> MarketProvider:
        from app.services.instrument_registry import get_instrument_spec
        spec = get_instrument_spec(symbol)
        category = spec.get("category", "crypto").lower()
        if category == "crypto":
            return self.crypto_provider
        elif category == "forex":
            return self.fxcm_provider
        else:
            return self.tv_provider

market_registry = MarketProviderRegistry()
