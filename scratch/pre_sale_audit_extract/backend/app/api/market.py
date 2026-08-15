from fastapi import APIRouter, Query
from typing import List, Dict, Optional
from pydantic import BaseModel
from app.services.market_data import get_candles, get_candles_async, _latest_prices, _candle_history, _is_delayed_status
from app.services.instrument_registry import get_all_instruments

router = APIRouter(prefix="/market", tags=["market"])

class CandleResponse(BaseModel):
    time: int
    open: float
    high: float
    low: float
    close: float
    volume: float

class InstrumentDetail(BaseModel):
    symbol: str
    name: str
    category: str
    price: float
    change: float
    volume: float
    pip_size: float
    contract_size: float
    leverage_limit: float
    is_delayed: bool = False

class InstrumentsResponse(BaseModel):
    crypto: List[InstrumentDetail]
    forex: List[InstrumentDetail]
    indices: List[InstrumentDetail]
    metals: List[InstrumentDetail]

@router.get("/instruments", response_model=InstrumentsResponse)
def list_instruments():
    insts = get_all_instruments()
    
    categories = {
        "crypto": [],
        "forex": [],
        "indices": [],
        "metals": []
    }
    
    for inst in insts:
        symbol = inst["symbol"]
        price = _latest_prices.get(symbol, inst["default_price"])
        candles = _candle_history.get(f"{symbol}|1m", [])
        is_delayed = _is_delayed_status.get(symbol, False)
        
        open_price = candles[0]["open"] if candles else price
        change = ((price - open_price) / open_price * 100) if open_price else 0.0
        volume = sum(c["volume"] for c in candles) if candles else 0.0
        
        detail = InstrumentDetail(
            symbol=symbol,
            name=inst["name"],
            category=inst["category"],
            price=price,
            change=change,
            volume=volume,
            pip_size=inst["pip_size"],
            contract_size=inst["contract_size"],
            leverage_limit=inst["leverage_limit"],
            is_delayed=is_delayed
        )
        
        cat = inst["category"].lower()
        if cat in categories:
            categories[cat].append(detail)
    return categories

@router.get("", response_model=InstrumentsResponse)
def get_market_root():
    return list_instruments()

@router.get("/", response_model=InstrumentsResponse)
def get_market_root_slash():
    return list_instruments()

@router.get("/candles", response_model=List[CandleResponse])
async def get_historical_candles(
    symbol: str = Query(..., description="The symbol name, e.g. BTCUSDT"),
    timeframe: str = Query("1m", description="The timeframe, e.g. 1m"),
    limit: int = Query(1000, description="Number of candles to load"),
    before: Optional[int] = Query(None, description="Load candles before this timestamp (ms)"),
    after: Optional[int] = Query(None, description="Load candles after this timestamp (ms)")
):
    candles = await get_candles_async(symbol, timeframe, limit, before, after)
    resp = []
    for c in candles:
        ts = c.get("timestamp")
        t_sec = int(ts // 1000) if ts > 30000000000 else int(ts)
        resp.append(CandleResponse(
            time=t_sec,
            open=c.get("open"),
            high=c.get("high"),
            low=c.get("low"),
            close=c.get("close"),
            volume=c.get("volume", 0.0)
        ))
    resp.sort(key=lambda x: x.time)
    
    unique_resp = []
    seen_times = set()
    for c in resp:
        if c.time not in seen_times:
            seen_times.add(c.time)
            unique_resp.append(c)
    return unique_resp

# Secure market endpoints utilizing MarketDataService and GoldAPI
from fastapi import APIRouter
from fastapi.responses import JSONResponse
import logging
from app.services.gold_api_service import gold_api_service
from app.services.market_data_service import market_data_service

logger = logging.getLogger("api_market")
api_router = APIRouter(prefix="/api/market", tags=["secure_gold_api"])

@api_router.get("/quotes")
async def get_quotes():
    try:
        quotes = await market_data_service.fetch_all_quotes()
        return quotes
    except Exception as e:
        logger.exception("Failed to get quotes in API endpoint")
        return JSONResponse(status_code=500, content={"error": str(e)})

@api_router.get("/quote/{symbol}")
async def get_secure_quote(symbol: str):
    try:
        sym = symbol.upper()
        # Route XAUUSD/XAGUSD to market_data_service to leverage its background fetch and cache!
        import time
        quote = await market_data_service.fetch_price_with_fallback(sym)
        if quote:
            return {
                "symbol": sym,
                "price": quote["last"],
                "timestamp": int(time.time() * 1000),
                "open_price": quote["last"],
                "high_price": quote["last"],
                "low_price": quote["last"],
                "prev_close_price": quote["last"],
                "stale": quote.get("stale", False)
            }
        
        # Fallback to gold_api_service if market_data_service fails
        res = await gold_api_service.get_quote(symbol)
        return res
    except Exception as e:
        logger.exception(f"Failed to get secure quote for {symbol}")
        return JSONResponse(status_code=500, content={"error": str(e)})

@api_router.get("/history")
@api_router.get("/history/{symbol}")
async def get_secure_history(
    symbol: Optional[str] = None,
    timeframe: str = Query("1m"),
    limit: int = Query(1000),
    before: Optional[int] = Query(None)
):
    try:
        sym = symbol
        if not sym:
            return JSONResponse(status_code=400, content={"error": "Symbol is required"})
        res = await gold_api_service.get_history(sym, timeframe, limit, before)
        resp = []
        for c in res:
            ts = c.get("timestamp")
            t_sec = int(ts // 1000) if ts > 30000000000 else int(ts)
            resp.append({
                "time": t_sec,
                "open": c.get("open"),
                "high": c.get("high"),
                "low": c.get("low"),
                "close": c.get("close"),
                "volume": c.get("volume", 0.0)
            })
        resp.sort(key=lambda x: x["time"])
        
        unique_resp = []
        seen_times = set()
        for c in resp:
            if c["time"] not in seen_times:
                seen_times.add(c["time"])
                unique_resp.append(c)
        return unique_resp
    except Exception as e:
        logger.exception(f"Failed to get secure history for {symbol}")
        return JSONResponse(status_code=500, content={"error": str(e)})

@api_router.get("/candles")
@api_router.get("/candles/{symbol}")
async def get_secure_candles(
    symbol: Optional[str] = None,
    timeframe: str = Query("1m"),
    limit: int = Query(1000),
    before: Optional[int] = Query(None)
):
    try:
        sym = symbol
        if not sym:
            return JSONResponse(status_code=400, content={"error": "Symbol is required"})
        candles = await get_candles_async(sym, timeframe, limit, before)
        resp = []
        for c in candles:
            ts = c.get("timestamp")
            t_sec = int(ts // 1000) if ts > 30000000000 else int(ts)
            resp.append({
                "time": t_sec,
                "open": c.get("open"),
                "high": c.get("high"),
                "low": c.get("low"),
                "close": c.get("close"),
                "volume": c.get("volume", 0.0)
            })
        resp.sort(key=lambda x: x["time"])
        
        unique_resp = []
        seen_times = set()
        for c in resp:
            if c["time"] not in seen_times:
                seen_times.add(c["time"])
                unique_resp.append(c)
        return unique_resp
    except Exception as e:
        logger.exception(f"Failed to get candles for {symbol}")
        return JSONResponse(status_code=500, content={"error": str(e)})

@api_router.get("/news")
async def get_market_news():
    try:
        from app.services.news_service import news_service
        res = await news_service.get_news()
        return res
    except Exception as e:
        logger.exception("Failed to get market news")
        return JSONResponse(status_code=500, content={"error": str(e)})

@api_router.get("/calendar")
async def get_market_calendar():
    try:
        from app.services.news_service import news_service
        res = await news_service.get_calendar()
        return res
    except Exception as e:
        logger.exception("Failed to get economic calendar")
        return JSONResponse(status_code=500, content={"error": str(e)})

@router.get("/news")
async def get_market_news_legacy():
    try:
        from app.services.news_service import news_service
        res = await news_service.get_news()
        return res
    except Exception as e:
        logger.exception("Failed to get market news")
        return JSONResponse(status_code=500, content={"error": str(e)})

@router.get("/calendar")
async def get_market_calendar_legacy():
    try:
        from app.services.news_service import news_service
        res = await news_service.get_calendar()
        return res
    except Exception as e:
        logger.exception("Failed to get economic calendar")
        return JSONResponse(status_code=500, content={"error": str(e)})

@router.get("/earnings")
async def get_earnings_calendar():
    return [
        {"symbol": "NVDA", "company": "NVIDIA Corp", "estimate": 0.65, "actual": 0.68, "revenueEstimate": "28.5B", "revenueActual": "30.0B", "date": "2026-07-25"},
        {"symbol": "AAPL", "company": "Apple Inc", "estimate": 1.40, "actual": 1.45, "revenueEstimate": "89.0B", "revenueActual": "90.2B", "date": "2026-07-28"}
    ]

@router.get("/dividends")
async def get_dividend_calendar():
    return [
        {"symbol": "MSFT", "company": "Microsoft Corp", "exDate": "2026-08-15", "payDate": "2026-09-10", "amount": 0.75, "yieldPct": 0.85},
        {"symbol": "JPM", "company": "JPMorgan Chase", "exDate": "2026-08-04", "payDate": "2026-08-31", "amount": 1.15, "yieldPct": 2.40}
    ]

@router.get("/corporate-actions")
async def get_corporate_actions():
    return [
        {"symbol": "TSLA", "company": "Tesla Inc", "actionType": "Stock Split", "details": "3-for-1 Stock Split", "effectiveDate": "2026-08-20"},
        {"symbol": "AMZN", "company": "Amazon.com Inc", "actionType": "Buyback", "details": "$10B Share Repurchase Program", "effectiveDate": "2026-08-01"}
    ]

@router.get("/news/search")
async def search_market_news(query: str = Query(..., min_length=1)):
    from app.services.news_service import news_service
    all_news = await news_service.get_news()
    q = query.lower()
    return [n for n in all_news if q in n.get("title", "").lower() or q in n.get("summary", "").lower()]

