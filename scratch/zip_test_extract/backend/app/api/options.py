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

class OrderExecutionRequest(BaseModel):
    symbol: str = "BTCUSDT"
    orderAction: str = "buy_to_open" # buy_to_open, sell_to_open, buy_to_close, sell_to_close
    orderType: str = "market"        # market, limit, stop, bracket, oco
    legs: List[Dict[str, Any]]
    limitPrice: Optional[float] = None

class BacktestRequest(BaseModel):
    underlyingPrice: float = 65000.0
    legs: List[Dict[str, Any]]
    daysSimulated: int = 30

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

@router.get("/probability")
async def get_probability_analysis(
    symbol: str = Query("BTCUSDT"),
    underlying_price: float = Query(65000.0),
    strike: float = Query(65000.0),
    expiry_days: int = Query(30),
    iv_pct: float = Query(25.0)
):
    return OptionsDeskService.calculate_probability(
        symbol=symbol, price=underlying_price, strike=strike, dte=expiry_days
    )

@router.get("/heatmap")
async def get_options_heatmap(
    symbol: str = Query("BTCUSDT"),
    underlying_price: float = Query(65000.0)
):
    return OptionsDeskService.get_heatmaps(symbol=symbol, price=underlying_price)

@router.post("/payoff")
async def get_strategy_payoff(req: PayoffRequest):
    return OptionsDeskService.calculate_strategy_payoff(
        legs=req.legs,
        underlying_price=req.underlyingPrice,
        price_range_pct=req.priceRangePct,
        steps=req.steps
    )

@router.post("/order")
async def execute_option_order(req: OrderExecutionRequest):
    return OptionsDeskService.execute_option_order(
        symbol=req.symbol,
        order_action=req.orderAction,
        order_type=req.orderType,
        legs=req.legs,
        limit_price=req.limitPrice
    )

@router.post("/backtest")
async def backtest_options_strategy(req: BacktestRequest):
    return OptionsDeskService.backtest_options_strategy(
        legs=req.legs,
        underlying_price=req.underlyingPrice,
        days_simulated=req.daysSimulated
    )

@router.get("/scan")
async def scan_options(criteria: str = Query("unusual_volume")):
    return {"results": OptionsDeskService.run_options_scanner(criteria=criteria)}

@router.post("/ai-query")
async def options_ai_query(req: AIQueryRequest):
    return OptionsDeskService.ai_options_query(req.query)
