from fastapi import APIRouter, Query, HTTPException, Body
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from app.services.options_service import OptionsDeskService, OptionsGreeksEngine

router = APIRouter(prefix="/api/options", tags=["options"])

class PricingRequest(BaseModel):
    underlyingPrice: float
    strike: float
    timeToExpiryYears: float
    riskFreeRate: float = 0.05
    iv: float = 0.25
    optionType: str = "call"

class PayoffRequest(BaseModel):
    underlyingPrice: float
    legs: List[Dict[str, Any]]
    priceRangePct: float = 0.20
    steps: int = 50

class AIQueryRequest(BaseModel):
    query: str

@router.get("/chain")
async def get_options_chain(
    symbol: str = Query("BTCUSDT"),
    underlying_price: float = Query(65000.0),
    expiry_days: int = Query(30),
    strike_count: int = Query(25)
):
    return OptionsDeskService.generate_options_chain(
        symbol=symbol,
        underlying_price=underlying_price,
        expiry_days=expiry_days,
        strike_count=strike_count
    )

@router.post("/pricing")
async def calculate_pricing(req: PricingRequest):
    return OptionsGreeksEngine.calculate_bs_greeks(
        S=req.underlyingPrice,
        K=req.strike,
        T=req.timeToExpiryYears,
        r=req.riskFreeRate,
        sigma=req.iv,
        option_type=req.optionType
    )

@router.get("/vol-surface")
async def get_volatility_surface(
    symbol: str = Query("BTCUSDT"),
    underlying_price: float = Query(65000.0)
):
    return OptionsDeskService.generate_volatility_surface(symbol=symbol, price=underlying_price)

@router.post("/payoff")
async def get_strategy_payoff(req: PayoffRequest):
    return OptionsDeskService.calculate_strategy_payoff(
        legs=req.legs,
        underlying_price=req.underlyingPrice,
        price_range_pct=req.priceRangePct,
        steps=req.steps
    )

@router.get("/scan")
async def scan_options(criteria: str = Query("unusual_volume")):
    return {"results": OptionsDeskService.run_options_scanner(criteria=criteria)}

@router.post("/ai-query")
async def options_ai_query(req: AIQueryRequest):
    return OptionsDeskService.ai_options_query(req.query)
