from fastapi import APIRouter, Query, HTTPException, Body
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from app.services.institutional_scanner_service import (
    institutional_scanner, SMCEngine, FootprintDOMAnalyticsEngine, MultiTimeframeConfluenceEngine
)

router = APIRouter(prefix="/api/institutional-scanner", tags=["institutional-scanner"])

@router.get("/opportunities")
async def get_institutional_opportunities(limit: int = Query(15)):
    return {"opportunities": institutional_scanner.get_market_opportunities(limit=limit)}

@router.get("/scan")
async def scan_symbol_opportunity(
    symbol: str = Query("BTCUSDT"),
    price: float = Query(65000.0)
):
    return institutional_scanner.scan_opportunity(symbol=symbol, price=price)

@router.get("/smc")
async def get_smc_patterns(
    symbol: str = Query("BTCUSDT"),
    price: float = Query(65000.0)
):
    return SMCEngine.scan_smc_patterns(symbol=symbol, price=price)

@router.get("/orderflow")
async def get_orderflow_dom_analysis(
    symbol: str = Query("BTCUSDT"),
    price: float = Query(65000.0)
):
    return FootprintDOMAnalyticsEngine.analyze_orderflow_and_dom(symbol=symbol, price=price)

@router.get("/heatmap")
async def get_liquidity_heatmap(symbol: str = Query("BTCUSDT")):
    return {
        "symbol": symbol.upper(),
        "liquidity_pools": [
            {"price_level": 65500.0, "pool_type": "BUY_SIDE_LIQUIDITY", "volume": 1420},
            {"price_level": 64200.0, "pool_type": "SELL_SIDE_LIQUIDITY", "volume": 1850}
        ],
        "order_clusters": [
            {"price": 64800.0, "type": "INSTITUTIONAL_BID_WALL", "size": 890}
        ]
    }

@router.get("/history")
async def get_historical_signals():
    return {"signal_history": institutional_scanner.get_signal_history()}
