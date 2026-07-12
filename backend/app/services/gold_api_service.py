import httpx
import asyncio
import time
import logging
from typing import Dict, List, Any, Optional
from app.core import config
from app.services.market_providers import YahooFinanceProvider, shared_client

logger = logging.getLogger("gold_api_service")

class GoldApiService:
    def __init__(self):
        self.api_key = config.GOLDAPI_KEY
        self.base_url = config.GOLDAPI_BASE_URL
        
        # In-memory caches
        self.quote_cache: Dict[str, Dict[str, Any]] = {}
        self.history_cache: Dict[str, List[Dict[str, Any]]] = {}
        
        # Last request timestamps for rate limiting (spacing queries by at least 1.0s)
        self.last_request_time = 0.0
        self.rate_limit_delay = 1.0
        
        # Initialize backup historical provider
        self.backup_provider = YahooFinanceProvider()

    async def _rate_limit_spacing(self):
        now = time.time()
        elapsed = now - self.last_request_time
        if elapsed < self.rate_limit_delay:
            await asyncio.sleep(self.rate_limit_delay - elapsed)
        self.last_request_time = time.time()

    def _validate_quote(self, data: Dict[str, Any]) -> bool:
        try:
            price = data.get("price")
            timestamp = data.get("timestamp")
            if price is None or timestamp is None:
                return False
            if float(price) <= 0 or int(timestamp) <= 0:
                return False
            return True
        except Exception:
            return False

    def _validate_candles(self, candles: List[Dict[str, Any]]) -> bool:
        if not isinstance(candles, list):
            return False
        for c in candles:
            try:
                if not all(k in c for k in ("timestamp", "open", "high", "low", "close", "volume")):
                    return False
                if c["open"] <= 0 or c["high"] <= 0 or c["low"] <= 0 or c["close"] <= 0:
                    return False
                if c["low"] > c["high"] or c["open"] > c["high"] or c["close"] > c["high"] or c["open"] < c["low"] or c["close"] < c["low"]:
                    return False
            except Exception:
                return False
        return True

    async def get_quote(self, symbol: str) -> Dict[str, Any]:
        norm = symbol.upper()
        metal = "XAU" if norm == "XAUUSD" else "XAG" if norm == "XAGUSD" else None
        
        if not metal:
            raise ValueError(f"Unsupported symbol for GoldAPI: {symbol}")
            
        url = f"{self.base_url}/api/{metal}/USD"
        
        # Check key existence dynamically
        api_key = config.GOLDAPI_KEY
        if not api_key:
            try:
                backup_price = await self.backup_provider.get_price(norm)
                fallback_quote = {
                    "symbol": norm,
                    "price": backup_price,
                    "timestamp": int(time.time() * 1000),
                    "open_price": backup_price,
                    "high_price": backup_price,
                    "low_price": backup_price,
                    "prev_close_price": backup_price,
                    "stale": False,
                    "source": "fallback"
                }
                self.quote_cache[norm] = fallback_quote
                return fallback_quote
            except Exception as e:
                logger.error(f"GoldAPI key missing and Yahoo Finance fallback failed: {e}")
                cached = self.quote_cache.get(norm)
                if cached:
                    return cached
                raise Exception("GOLDAPI_KEY is not configured and Yahoo Finance fallback failed")

        # Retry logic with backoff
        attempts = 3
        last_error = None
        
        for attempt in range(attempts):
            try:
                await self._rate_limit_spacing()
                
                headers = {
                    "x-access-token": api_key,
                    "Content-Type": "application/json"
                }
                
                resp = await shared_client.get(url, headers=headers, timeout=5.0)
                    
                if resp.status_code == 200:
                    data = resp.json()
                    
                    price = float(data.get("price", 0))
                    timestamp = int(data.get("timestamp", 0)) * 1000  # Convert to ms
                    
                    quote = {
                        "symbol": norm,
                        "price": price,
                        "timestamp": timestamp,
                        "open_price": float(data.get("open_price", price)),
                        "high_price": float(data.get("high_price", price)),
                        "low_price": float(data.get("low_price", price)),
                        "prev_close_price": float(data.get("prev_close_price", price)),
                        "stale": False
                    }
                    
                    if self._validate_quote(quote):
                        self.quote_cache[norm] = quote
                        return quote
                    else:
                        raise Exception("Quote validation failed")
                else:
                    raise Exception(f"HTTP Status {resp.status_code}")
                    
            except Exception as e:
                last_error = e
                # Backoff
                await asyncio.sleep(0.5 * (attempt + 1))
                
        # Hard fallback to Yahoo Finance first
        try:
            backup_price = await self.backup_provider.get_price(norm)
            fallback_quote = {
                "symbol": norm,
                "price": backup_price,
                "timestamp": int(time.time() * 1000),
                "open_price": backup_price,
                "high_price": backup_price,
                "low_price": backup_price,
                "prev_close_price": backup_price,
                "stale": False,
                "source": "fallback"
            }
            self.quote_cache[norm] = fallback_quote
            return fallback_quote
        except Exception as e:
            logger.error(f"Yahoo Finance hard fallback failed: {e}")
            
        # Last resort: Return cached quote with stale=True
        cached = self.quote_cache.get(norm)
        if cached:
            stale_quote = dict(cached)
            stale_quote["stale"] = True
            return stale_quote
            
        raise Exception(f"GoldAPI quote unavailable for {symbol} (error: {last_error})")

    async def get_history(self, symbol: str, timeframe: str = "1m", limit: int = 1000, before: Optional[int] = None) -> List[Dict[str, Any]]:
        norm = symbol.upper()
        cache_key = f"{norm}|{timeframe}"
        
        # Load from Yahoo Finance (since GoldAPI doesn't support interval OHLC candles natively)
        attempts = 3
        last_error = None
        
        for attempt in range(attempts):
            try:
                # Yahoo Finance API call
                candles = await self.backup_provider.get_candles(norm, timeframe, limit, before)
                
                valid_candles = []
                for c in candles:
                    try:
                        if not all(k in c for k in ("timestamp", "open", "high", "low", "close", "volume")):
                            continue
                        if c["open"] <= 0 or c["high"] <= 0 or c["low"] <= 0 or c["close"] <= 0:
                            continue
                        c["high"] = max(c["high"], c["open"], c["close"])
                        c["low"] = min(c["low"], c["open"], c["close"])
                        valid_candles.append(c)
                    except Exception:
                        continue
                
                if len(valid_candles) > 0:
                    valid_candles.sort(key=lambda c: c["timestamp"])
                    
                    cached = self.history_cache.get(cache_key, [])
                    combined = {c["timestamp"]: c for c in cached}
                    for c in valid_candles:
                        combined[c["timestamp"]] = c
                    merged = sorted(combined.values(), key=lambda c: c["timestamp"])
                    
                    self.history_cache[cache_key] = merged
                    
                    if before:
                        result = [c for c in merged if c["timestamp"] < before][-limit:]
                    else:
                        result = merged[-limit:]
                        
                    for c in result:
                        c["stale"] = False
                    return result
                else:
                    raise Exception("No valid candles found after cleaning")
            except Exception as e:
                last_error = e
                await asyncio.sleep(0.5 * (attempt + 1))
                
        # Return backend cached historical data if API is temporarily unavailable
        cached = self.history_cache.get(cache_key)
        if cached:
            result = [dict(c) for c in cached]
            for c in result:
                c["stale"] = True
            
            if before:
                return [c for c in result if c["timestamp"] < before][-limit:]
            return result[-limit:]
            
        raise Exception(f"GoldAPI history unavailable for {symbol} (error: {last_error})")

gold_api_service = GoldApiService()
