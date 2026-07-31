from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class OptionLegSchema(BaseModel):
    strike: float
    type: str = "call"  # "call" or "put"
    action: str = "buy" # "buy" or "sell"
    quantity: float = 1.0
    premium: float = 0.0

class OptionChainRequest(BaseModel):
    symbol: str = "BTCUSDT"
    underlying_price: float = 65000.0
    expiry_days: int = 30
    strike_count: int = 25

class OptionPricingRequest(BaseModel):
    underlying_price: float
    strike: float
    time_to_expiry_years: float
    risk_free_rate: float = 0.05
    iv: float = 0.25
    option_type: str = "call"

class StrategyPayoffRequest(BaseModel):
    underlying_price: float
    legs: List[OptionLegSchema]
    price_range_pct: float = 0.20
    steps: int = 50

class OptionOrderRequest(BaseModel):
    symbol: str
    order_type: str = "limit" # market, limit, stop, bracket
    order_class: str = "single" # single, multi_leg, spread
    net_debit_credit: Optional[float] = 0.0
    legs: List[OptionLegSchema]
    time_in_force: str = "GTC"
