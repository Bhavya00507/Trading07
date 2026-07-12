import httpx
from typing import Dict, List, Any, Optional
import asyncio
import time
import json
import random
from app.websocket.manager import manager
from app.services.market_providers import market_registry

# In-memory store of latest symbol prices
_latest_prices: Dict[str, float] = {
    "BTCUSDT": 65000.0,
    "ETHUSDT": 3500.0,
    "EURUSD": 1.17,
    "GBPUSD": 1.36,
    "USDJPY": 145.0,
    "XAUUSD": 3400.0,
    "XAGUSD": 36.0,
    "US30": 40000.0,
    "NAS100": 22700.0,
    "SPX500": 6200.0,
    "GER40": 24000.0
}

# In-memory store of delayed status
_is_delayed_status: Dict[str, bool] = {
    "BTCUSDT": False,
    "ETHUSDT": False,
    "EURUSD": False,
    "GBPUSD": False,
    "USDJPY": False,
    "XAUUSD": False,
    "XAGUSD": False,
    "US30": False,
    "NAS100": False,
    "SPX500": False,
    "GER40": False
}

# In-memory store of historical candles
_candle_history: Dict[str, List[Dict[str, Any]]] = {}

async def get_price(symbol: str) -> float:
    """Return the latest known price for the symbol, or fetch it if not present."""
    sym = symbol.upper()
    if sym in _latest_prices:
        return _latest_prices[sym]
    
    # Fallback fetch
    try:
        provider = market_registry.get_provider(sym)
        price = await provider.get_price(sym)
        _latest_prices[sym] = price
        _is_delayed_status[sym] = False
        return price
    except Exception as e:
        print(f"Failed to fetch price for {sym}: {e}")
        _is_delayed_status[sym] = True
        if sym in _latest_prices:
            return _latest_prices[sym]
        raise KeyError(f"Price for {sym} not available")

def get_candles(symbol: str, timeframe: str = "1m") -> List[Dict[str, Any]]:
    """Sync wrapper for candle history retrieval from cache, triggering async background fetch if empty."""
    sym = symbol.upper()
    key = f"{sym}|{timeframe}"
    if key not in _candle_history:
        _candle_history[key] = []
        asyncio.create_task(get_candles_async(sym, timeframe, 1000))
        return []
    return _candle_history[key]

async def get_candles_async(symbol: str, timeframe: str = "1m", limit: int = 1000, before: Optional[int] = None, after: Optional[int] = None) -> List[Dict[str, Any]]:
    """Retrieve historical candles from cache or provider asynchronously to prevent blocking the event loop."""
    sym = symbol.upper()
    key = f"{sym}|{timeframe}"
    now_ms = int(time.time() * 1000)
    
    tf_ms = 60000
    if timeframe == "1s": tf_ms = 1000
    elif timeframe == "5s": tf_ms = 5000
    elif timeframe == "15s": tf_ms = 15000
    elif timeframe == "30s": tf_ms = 30000
    elif timeframe == "3m": tf_ms = 180000
    elif timeframe == "5m": tf_ms = 300000
    elif timeframe == "15m": tf_ms = 900000
    elif timeframe == "30m": tf_ms = 1800000
    elif timeframe == "1h": tf_ms = 3600000
    elif timeframe == "2h": tf_ms = 7200000
    elif timeframe == "4h": tf_ms = 14400000
    elif timeframe in ["Daily", "1d"]: tf_ms = 86400000
    elif timeframe in ["Weekly", "1w"]: tf_ms = 604800000
    elif timeframe in ["Monthly", "1M"]: tf_ms = 2592000000

    async def fetch_and_cache_bg():
        try:
            provider = market_registry.get_provider(sym)
            fetched = await provider.get_candles(sym, timeframe, limit, before)
            
            valid_candles = []
            seen_timestamps = set()
            for c in fetched:
                ts = c.get("timestamp")
                o, h, l, cl = c.get("open"), c.get("high"), c.get("low"), c.get("close")
                v = c.get("volume", 0.0)
                
                if (ts is None or o is None or h is None or l is None or cl is None or v is None or
                    ts in seen_timestamps or
                    o != o or h != h or l != l or cl != cl or v != v or
                    o <= 0 or h <= 0 or l <= 0 or cl <= 0 or v < 0 or
                    l > o or l > cl or h < o or h < cl):
                    continue
                    
                seen_timestamps.add(ts)
                valid_candles.append(c)

            if valid_candles:
                _latest_prices[sym] = valid_candles[-1]["close"]
                _is_delayed_status[sym] = False
                
                if key not in _candle_history:
                    _candle_history[key] = []
                
                combined = {c["timestamp"]: c for c in (_candle_history[key] + valid_candles)}
                _candle_history[key] = sorted(combined.values(), key=lambda x: x["timestamp"])
                
                if len(_candle_history[key]) > 10000:
                    _candle_history[key] = _candle_history[key][-10000:]
        except Exception as e:
            print(f"Async provider fetch failed for {sym}: {e}")

    # Check cache first
    cached_list = _candle_history.get(key, [])
    subset = cached_list
    if before:
        subset = [c for c in subset if c["timestamp"] < before]
    if after:
        subset = [c for c in subset if c["timestamp"] > after]

    # Trigger background fetch if cache is insufficient and rate limit allows (e.g. >2 seconds since last fetch for this key)
    if len(subset) < limit:
        if not hasattr(get_candles_async, "_last_triggers"):
            get_candles_async._last_triggers = {}
        last_trigger = get_candles_async._last_triggers.get(key, 0.0)
        now_time = time.time()
        if now_time - last_trigger > 2.0:
            get_candles_async._last_triggers[key] = now_time
            asyncio.create_task(fetch_and_cache_bg())

    # Return cached subset immediately if we have some data
    if len(subset) > 0:
        return subset[-limit:] if len(subset) > limit else subset

    # Fallback to simulated mock candles immediately
    try:
        from app.services.instrument_registry import get_instrument_spec
        spec = get_instrument_spec(sym)
        default_price = spec.get("default_price", 100.0)
    except Exception:
        default_price = 100.0

    mock_candles = []
    current_price = default_price
    start_ts = (before if before else now_ms) - (limit * tf_ms)
    import random
    for i in range(limit):
        candle_ts = start_ts + (i * tf_ms)
        chg = current_price * 0.0008 * (random.random() - 0.5)
        o = current_price
        c_val = current_price + chg
        h = max(o, c_val) + (current_price * 0.0003 * random.random())
        l = min(o, c_val) - (current_price * 0.0003 * random.random())
        mock_candles.append({
            "timestamp": candle_ts,
            "open": o,
            "high": h,
            "low": l,
            "close": c_val,
            "volume": float(random.randint(10, 500))
        })
        current_price = c_val

    _candle_history[key] = mock_candles
    return mock_candles

async def handle_price_tick(symbol: str, price: float, is_delayed: bool = False, bg: bool = True, propagate: bool = True):
    """Update in-memory state, construct/update candle history correctly, and execute order engine triggers."""
    sym = symbol.upper()
    if price is None or price != price or price <= 0:
        return
        
    now_ms = int(time.time() * 1000)
    key = f"{sym}|1m"
    if key not in _candle_history:
        _candle_history[key] = []
        asyncio.create_task(get_candles_async(sym, "1m", 1000))
        
    history = _candle_history[key]
    align_t = (now_ms // 60000) * 60000

    last_price = _latest_prices.get(sym)
    is_new_candle = not history or history[-1]["timestamp"] < align_t
    if last_price == price and not is_new_candle:
        return

    _latest_prices[sym] = price
    _is_delayed_status[sym] = is_delayed
    
    if not history:
        pass
    else:
        if history[-1]["timestamp"] < align_t:
            prev_close = history[-1]["close"]
            candle = {
                "timestamp": align_t,
                "open": prev_close,
                "high": max(prev_close, price),
                "low": min(prev_close, price),
                "close": price,
                "volume": 0.0
            }
            history.append(candle)
            if len(history) > 10000:
                history.pop(0)
        else:
            history[-1]["close"] = price
            if price > history[-1]["high"]:
                history[-1]["high"] = price
            if price < history[-1]["low"]:
                history[-1]["low"] = price
            candle = history[-1]
            
        # Broadcast price_update event
        await manager.broadcast_event(
            event_type="price_update",
            data={
                "symbol": sym,
                "price": price,
                "time": int(now_ms // 1000),
                "timestamp": now_ms,
                "is_delayed": is_delayed
            }
        )
        
        # Broadcast candle event
        await manager.broadcast_event(
            event_type="market_candle",
            data={
                "time": int(candle["timestamp"] // 1000),
                "open": candle["open"],
                "high": candle["high"],
                "low": candle["low"],
                "close": candle["close"],
                "volume": candle.get("volume", 0.0)
            },
            extra={"symbol": sym, "timeframe": "1m"}
        )
    
    # Trigger matching engine checks in database in the background to avoid blocking the event loop
    async def run_matching_engine_bg():
        from app.database.session import AsyncSessionLocal
        from app.services.order_engine import process_market_tick
        try:
            async with AsyncSessionLocal() as db:
                await process_market_tick(db, sym, price)
                await db.commit()
        except Exception as e:
            print(f"Error executing pending orders/SL/TP for {sym} at {price}: {e}")
            
    if bg:
        asyncio.create_task(run_matching_engine_bg())
    else:
        await run_matching_engine_bg()

    if propagate:
        mapped_sym = None
        if sym == "BTCUSD":
            mapped_sym = "BTCUSDT"
        elif sym == "BTCUSDT":
            mapped_sym = "BTCUSD"
        elif sym == "ETHUSD":
            mapped_sym = "ETHUSDT"
        elif sym == "ETHUSDT":
            mapped_sym = "ETHUSD"
            
        if mapped_sym:
            asyncio.create_task(handle_price_tick(mapped_sym, price, is_delayed, bg, propagate=False))

async def start_market_feed() -> None:
    """Unified background task polling MarketDataService and generating high-frequency micro-ticks."""
    from app.services.market_data_service import market_data_service
    
    # Initialize baseline prices from external service
    try:
        quotes = await market_data_service.fetch_all_quotes()
        for symbol, quote in quotes.items():
            sym = symbol.upper()
            price = quote.get("last", 0.0)
            if price > 0:
                _latest_prices[sym] = price
    except Exception as e:
        print(f"Initial market data fetch failed: {e}")

    # Ensure other symbols are initialized
    for sym in ["BTCUSD", "ETHUSD", "USOIL", "BRENT"]:
        if sym not in _latest_prices:
            if sym == "BTCUSD": _latest_prices[sym] = 65000.0
            elif sym == "ETHUSD": _latest_prices[sym] = 3500.0
            elif sym == "USOIL": _latest_prices[sym] = 78.0
            elif sym == "BRENT": _latest_prices[sym] = 82.0

    volatilities = {
        "BTCUSDT": 0.0001, "BTCUSD": 0.0001,
        "ETHUSDT": 0.00012, "ETHUSD": 0.00012,
        "XAUUSD": 0.00008, "XAGUSD": 0.00015,
        "EURUSD": 0.00002, "GBPUSD": 0.00002, "USDJPY": 0.00002,
        "US30": 0.00004, "NAS100": 0.00005, "SPX500": 0.00004, "GER40": 0.00004,
        "USOIL": 0.00008, "BRENT": 0.00008
    }

    tick_count = 0
    while True:
        try:
            # Every 40 ticks (10 seconds), fetch real quotes to update baseline
            if tick_count % 40 == 0:
                async def fetch_bg():
                    try:
                        quotes = await market_data_service.fetch_all_quotes()
                        for symbol, quote in quotes.items():
                            sym = symbol.upper()
                            price = quote.get("last", 0.0)
                            if price > 0:
                                _latest_prices[sym] = price
                    except Exception:
                        pass
                asyncio.create_task(fetch_bg())

            # Generate micro-ticks for all symbols in _latest_prices
            for sym, current_price in list(_latest_prices.items()):
                vol = volatilities.get(sym, 0.00005)
                # Random walk
                change_pct = random.gauss(0, vol)
                new_price = current_price * (1.0 + change_pct)
                
                # Keep decimal precision correct
                decimals = 2
                if sym.endswith("USD") and sym not in ["XAUUSD", "XAGUSD", "BTCUSD", "ETHUSD"]:
                    decimals = 5
                elif sym in ["EURUSD", "GBPUSD"]:
                    decimals = 5
                elif sym in ["USDJPY"]:
                    decimals = 3
                elif sym in ["XAGUSD"]:
                    decimals = 3
                
                new_price = round(new_price, decimals)
                await handle_price_tick(sym, new_price, is_delayed=False)
                
        except Exception as e:
            print(f"Error in unified start_market_feed tick generator task: {e}")
            
        tick_count += 1
        await asyncio.sleep(0.25)  # 4 ticks per second

async def update_market_price(symbol: str, price: float) -> None:
    """Trigger price ticks directly (e.g. from tests or mock events)."""
    await handle_price_tick(symbol, price, bg=False)
