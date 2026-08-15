from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from app.services.replay_service import ReplayService

router = APIRouter(prefix="/api/replay", tags=["replay"])

class SimulateStepRequest(BaseModel):
    current_price: float
    balance: float = 10000.0
    leverage: float = 10.0
    positions: List[Dict[str, Any]] = []

class OptimizeRequest(BaseModel):
    symbol: str = "BTCUSDT"
    timeframe: str = "1m"
    fast_ema_range: List[int] = [5, 9, 12]
    slow_ema_range: List[int] = [21, 26, 50]
    risk_pct: float = 1.0
    initial_capital: float = 10000.0

class EvaluateRequest(BaseModel):
    trades: List[Dict[str, Any]] = []
    initial_balance: float = 10000.0

class AIQueryRequest(BaseModel):
    query: str
    trades: List[Dict[str, Any]] = []
    candlesCount: int = 1000

_replay_sessions: Dict[str, Any] = {}

@router.get("/candles")
async def get_replay_candles(
    symbol: str = Query("BTCUSDT"),
    timeframe: str = Query("1m"),
    count: int = Query(1000, ge=10, le=100000),
    start_date: Optional[str] = None
):
    candles = ReplayService.generate_historical_candles(
        symbol=symbol,
        timeframe=timeframe,
        count=count,
        start_date=start_date
    )
    return {"symbol": symbol, "timeframe": timeframe, "candles": candles, "total": len(candles)}

@router.get("/news")
async def get_replay_news(symbol: str = Query("BTCUSDT")):
    news = ReplayService.get_historical_news(symbol)
    return {"symbol": symbol, "news": news}

@router.post("/simulate-step")
async def simulate_step(req: SimulateStepRequest):
    account_info = ReplayService.simulate_account_step(
        positions=req.positions,
        current_price=req.current_price,
        balance=req.balance,
        leverage=req.leverage
    )
    return account_info

@router.post("/metrics")
async def calculate_metrics(req: EvaluateRequest):
    metrics = ReplayService.calculate_replay_metrics(trades=req.trades, initial_balance=req.initial_balance)
    return metrics

@router.post("/ai-query")
async def ai_query(req: AIQueryRequest):
    res = ReplayService.ai_query_replay_session(query=req.query, trades=req.trades, candles_count=req.candlesCount)
    return res

@router.post("/ai-evaluate")
async def ai_evaluate(req: EvaluateRequest):
    evaluation = ReplayService.ai_evaluate_replay_session(
        trades=req.trades,
        initial_balance=req.initial_balance
    )
    return evaluation

@router.post("/save-session")
async def save_replay_session(session_id: str, state: Dict[str, Any]):
    _replay_sessions[session_id] = state
    return {"status": "success", "session_id": session_id}

@router.get("/load-session")
async def load_replay_session(session_id: str):
    if session_id not in _replay_sessions:
        raise HTTPException(status_code=404, detail="Replay session not found")
    return {"session_id": session_id, "state": _replay_sessions[session_id]}
