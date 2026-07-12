import httpx
import asyncio
import time
import os
import logging
from typing import Dict, List, Any, Optional

logger = logging.getLogger("market_data_service")
logger.setLevel(logging.INFO)

# Supported symbols
SUPPORTED_SYMBOLS = [
    "BTCUSD", "ETHUSD", "XAUUSD", "XAGUSD",
    "EURUSD", "GBPUSD", "USDJPY", "US30",
    "NAS100", "USOIL", "BRENT"
]

class MarketDataService:
    def __init__(self):
        self.quotes: Dict[str, Dict[str, Any]] = {}
        self.history_cache: Dict[str, List[Dict[str, Any]]] = {}
        
        # Load API keys from environment
        self.goldapi_key = os.getenv("GOLDAPI_KEY", "")
        self.twelvedata_key = os.getenv("TWELVEDATA_API_KEY", "")
        self.alphavantage_key = os.getenv("ALPHAVANTAGE_API_KEY", "")
        self.finnhub_key = os.getenv("FINNHUB_API_KEY", "")
        self.polygon_key = os.getenv("POLYGON_API_KEY", "")

        # HTTP Client with timeout
        self.client = httpx.AsyncClient(timeout=4.0)

        self.fetch_all_promise = None

        # Cache control: cache quote results for 2 seconds to limit rate limits
        self.quote_cache_timestamps: Dict[str, float] = {}
        self.cache_ttl = 2.0  # seconds

        # Logging / Metrics store
        self.metrics: Dict[str, Dict[str, Any]] = {}

        # Initialize default quotes
        for sym in SUPPORTED_SYMBOLS:
            self.quotes[sym] = {
                "symbol": sym,
                "bid": 0.0,
                "ask": 0.0,
                "last": 0.0,
                "spread": 0.0,
                "timestamp": int(time.time() * 1000),
                "source": "None",
                "stale": True
            }

    def log_metric(self, symbol: str, provider: str, start_time: float, status_code: int, retry_count: int, cache_hit: bool):
        latency = time.time() - start_time
        self.metrics[symbol] = {
            "provider": provider,
            "latency": latency,
            "response_time": latency,
            "status_code": status_code,
            "retry_count": retry_count,
            "cache_hit": cache_hit,
            "last_successful_update": time.time()
        }
        logger.info(
            f"Metrics [{symbol}] -> provider: {provider}, latency: {latency:.3f}s, status: {status_code}, retry: {retry_count}, cache_hit: {cache_hit}"
        )

    # 1. GoldAPI Provider
    async def fetch_goldapi(self, symbol: str, retry_count: int = 0) -> Optional[Dict[str, float]]:
        if not self.goldapi_key:
            return None
        metal = "XAU" if symbol == "XAUUSD" else "XAG" if symbol == "XAGUSD" else None
        if not metal:
            return None
        
        url = f"https://www.goldapi.io/api/{metal}/USD"
        headers = {"x-access-token": self.goldapi_key, "Content-Type": "application/json"}
        
        start = time.time()
        try:
            resp = await self.client.get(url, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                price = float(data.get("price", 0))
                # GoldAPI returns high, low, open, we can construct spread
                bid = float(data.get("bid", price - 0.1))
                ask = float(data.get("ask", price + 0.1))
                self.log_metric(symbol, "GoldAPI", start, 200, retry_count, False)
                return {"bid": bid, "ask": ask, "last": price, "spread": ask - bid}
            elif resp.status_code == 429:
                logger.warn("GoldAPI rate limit hit.")
                return None
            else:
                logger.warn(f"GoldAPI returned status {resp.status_code}")
                return None
        except Exception as e:
            logger.error(f"GoldAPI query failed: {e}")
            return None

    # 2. Binance Provider
    async def fetch_binance(self, symbol: str, retry_count: int = 0) -> Optional[Dict[str, float]]:
        from app.services.instruments import get_instrument_spec
        spec = get_instrument_spec(symbol)
        if spec.get("category") != "crypto":
            return None
        binance_symbol = symbol.upper().replace("USD", "USDT")
        url = f"https://api.binance.com/api/v3/ticker/bookTicker?symbol={binance_symbol}"
        
        start = time.time()
        try:
            resp = await self.client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                bid = float(data["bidPrice"])
                ask = float(data["askPrice"])
                last = (bid + ask) / 2.0
                self.log_metric(symbol, "Binance", start, 200, retry_count, False)
                return {"bid": bid, "ask": ask, "last": last, "spread": ask - bid}
        except Exception as e:
            logger.error(f"Binance fetch failed: {e}")
        return None

    # 3. Yahoo Finance Provider (Batch lookup for forex/metals/indices/oil using stable chart API)
    async def fetch_yahoo(self, symbol: str, retry_count: int = 0) -> Optional[Dict[str, float]]:
        yahoo_map = {
            "EURUSD": "EURUSD=X", "GBPUSD": "GBPUSD=X", "USDJPY": "USDJPY=X",
            "USDCHF": "USDCHF=X", "AUDUSD": "AUDUSD=X", "NZDUSD": "NZDUSD=X", "USDCAD": "USDCAD=X",
            "EURJPY": "EURJPY=X", "EURGBP": "EURGBP=X", "GBPJPY": "GBPJPY=X",
            "XAUUSD": "GC=F", "XAGUSD": "SI=F",
            "USOIL": "CL=F", "BRENT": "BZ=F",
            "US30": "^DJI", "NAS100": "^NDX", "SPX500": "^GSPC", "GER40": "^GDAXI", "UK100": "^FTSE", "JP225": "^N225"
        }
        y_symbol = yahoo_map.get(symbol)
        if not y_symbol:
            # Fallback mappings for crypto to Yahoo Finance
            if symbol == "BTCUSD": y_symbol = "BTC-USD"
            elif symbol == "ETHUSD": y_symbol = "ETH-USD"
            elif symbol == "SOLUSD": y_symbol = "SOL-USD"
            elif symbol == "BNBUSD": y_symbol = "BNB-USD"
            else: return None

        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{y_symbol}?interval=1m&range=1d"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
        start = time.time()
        try:
            resp = await self.client.get(url, headers=headers, timeout=5.0)
            if resp.status_code == 200:
                data = resp.json()
                result = data.get("chart", {}).get("result", [])
                if result:
                    meta = result[0].get("meta", {})
                    price = float(meta.get("regularMarketPrice", 0.0))
                    if price > 0:
                        self.log_metric(symbol, "Yahoo Finance", start, 200, retry_count, False)
                        return {"bid": price, "ask": price, "last": price, "spread": 0.0}
        except Exception as e:
            logger.error(f"Yahoo Finance fetch failed for {symbol}: {e}")
        return None

    # 4. TwelveData Provider
    async def fetch_twelvedata(self, symbol: str, retry_count: int = 0) -> Optional[Dict[str, float]]:
        if not self.twelvedata_key:
            return None
        td_symbol = symbol
        if len(symbol) == 6 and symbol.isupper() and symbol not in ["GER40", "NAS100", "US30", "SPX500", "USOIL", "BRENT"]:
            td_symbol = f"{symbol[:3]}/{symbol[3:]}"
        url = f"https://api.twelvedata.com/price?symbol={td_symbol}&apikey={self.twelvedata_key}"
        start = time.time()
        try:
            resp = await self.client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                price = float(data.get("price", 0.0))
                self.log_metric(symbol, "TwelveData", start, 200, retry_count, False)
                return {"bid": price - 0.01, "ask": price + 0.01, "last": price, "spread": 0.02}
        except Exception:
            pass
        return None

    # 5. AlphaVantage Provider
    async def fetch_alphavantage(self, symbol: str, retry_count: int = 0) -> Optional[Dict[str, float]]:
        if not self.alphavantage_key:
            return None
        url = f"https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol={symbol}&apikey={self.alphavantage_key}"
        start = time.time()
        try:
            resp = await self.client.get(url)
            if resp.status_code == 200:
                quote = resp.json().get("Global Quote", {})
                price = float(quote.get("05. price", 0.0))
                self.log_metric(symbol, "AlphaVantage", start, 200, retry_count, False)
                return {"bid": price - 0.01, "ask": price + 0.01, "last": price, "spread": 0.02}
        except Exception:
            pass
        return None

    # 6. Finnhub Provider
    async def fetch_finnhub(self, symbol: str, retry_count: int = 0) -> Optional[Dict[str, float]]:
        if not self.finnhub_key:
            return None
        url = f"https://finnhub.io/api/v1/quote?symbol={symbol}&token={self.finnhub_key}"
        start = time.time()
        try:
            resp = await self.client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                price = float(data.get("c", 0.0))
                self.log_metric(symbol, "Finnhub", start, 200, retry_count, False)
                return {"bid": price - 0.01, "ask": price + 0.01, "last": price, "spread": 0.02}
        except Exception:
            pass
        return None

    # 7. Polygon Provider
    async def fetch_polygon(self, symbol: str, retry_count: int = 0) -> Optional[Dict[str, float]]:
        if not self.polygon_key:
            return None
        url = f"https://api.polygon.io/v2/last/trade/{symbol}?apiKey={self.polygon_key}"
        start = time.time()
        try:
            resp = await self.client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                price = float(data.get("results", {}).get("p", 0.0))
                self.log_metric(symbol, "Polygon", start, 200, retry_count, False)
                return {"bid": price - 0.01, "ask": price + 0.01, "last": price, "spread": 0.02}
        except Exception:
            pass
        return None

    # Fetch price with automated fallback sequence and retries
    async def fetch_price_with_fallback(self, symbol: str) -> Dict[str, Any]:
        # Caching logic
        now = time.time()
        if symbol in self.quote_cache_timestamps:
            if now - self.quote_cache_timestamps[symbol] < self.cache_ttl:
                cached = self.quotes.get(symbol)
                if cached and not cached.get("stale", True):
                    self.log_metric(symbol, cached["source"], now, 200, 0, True)
                    return cached

        # Mappings of sequences
        providers = []
        from app.services.instruments import get_instrument_spec
        spec = get_instrument_spec(symbol)
        if spec.get("category") == "crypto":
            providers = [
                ("Binance", self.fetch_binance),
                ("Yahoo Finance", self.fetch_yahoo),
                ("Finnhub", self.fetch_finnhub),
                ("Polygon", self.fetch_polygon)
            ]
        elif symbol in ["XAUUSD", "XAGUSD"]:
            providers = [
                ("GoldAPI", self.fetch_goldapi),
                ("Yahoo Finance", self.fetch_yahoo),
                ("TwelveData", self.fetch_twelvedata),
                ("AlphaVantage", self.fetch_alphavantage)
            ]
        else:
            providers = [
                ("Yahoo Finance", self.fetch_yahoo),
                ("TwelveData", self.fetch_twelvedata),
                ("AlphaVantage", self.fetch_alphavantage),
                ("Finnhub", self.fetch_finnhub)
            ]

        # Query loop
        for provider_name, fetch_fn in providers:
            retry_attempts = 3
            for attempt in range(retry_attempts):
                try:
                    result = await fetch_fn(symbol, attempt)
                    if result:
                        quote = {
                            "symbol": symbol,
                            "bid": float(result["bid"]),
                            "ask": float(result["ask"]),
                            "last": float(result["last"]),
                            "spread": float(result["spread"]),
                            "timestamp": int(time.time() * 1000),
                            "source": provider_name,
                            "stale": False
                        }
                        self.quotes[symbol] = quote
                        self.quote_cache_timestamps[symbol] = time.time()
                        return quote
                except Exception as e:
                    logger.warn(f"Provider {provider_name} failed on attempt {attempt}: {e}")
                    await asyncio.sleep(0.1 * (attempt + 1))

        # Fallback to last known value if all failed
        logger.error(f"All providers failed for {symbol}. Returning cached copy.")
        cached_copy = dict(self.quotes[symbol])
        cached_copy["stale"] = True
        return cached_copy

    async def fetch_all_quotes(self) -> Dict[str, Dict[str, Any]]:
        now = time.time()
        last_time = getattr(self, "last_fetch_time", 0.0)
        if now - last_time < 5.0 and self.quotes:
            # If all quotes have already been successfully populated, return from cache
            all_seeded = all(q.get("last", 0.0) > 0 for q in self.quotes.values())
            if all_seeded:
                return self.quotes

        if self.fetch_all_promise is not None:
            return await self.fetch_all_promise

        async def do_fetch():
            tasks = [self.fetch_price_with_fallback(sym) for sym in SUPPORTED_SYMBOLS]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            for i, res in enumerate(results):
                sym = SUPPORTED_SYMBOLS[i]
                if isinstance(res, dict):
                    self.quotes[sym] = res
                else:
                    logger.error(f"Unhandled exception fetching quote for {sym}: {res}")
                    
            self.last_fetch_time = time.time()
            return self.quotes

        self.fetch_all_promise = asyncio.create_task(do_fetch())
        try:
            return await self.fetch_all_promise
        finally:
            self.fetch_all_promise = None

market_data_service = MarketDataService()
