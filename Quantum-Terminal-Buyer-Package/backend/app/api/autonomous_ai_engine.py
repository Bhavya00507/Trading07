from fastapi import APIRouter, Query, HTTPException, Body
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from app.services.autonomous_ai_engine_service import (
    autonomous_ai_engine, ExplainableAIEngine, AIStrategyGeneratorEngine
)

router = APIRouter(prefix="/api/autonomous-ai", tags=["autonomous-ai"])

class GenerateStrategyRequest(BaseModel):
    prompt: str

class OptimizeStrategyRequest(BaseModel):
    strategy_name: str

class AutomationModeRequest(BaseModel):
    mode: str = "ADVISORY_ONLY"

@router.get("/dashboard")
async def get_ai_dashboard():
    return autonomous_ai_engine.get_ai_dashboard_summary()

@router.get("/explainable-signal")
async def get_explainable_signal(
    symbol: str = Query("BTCUSDT"),
    price: float = Query(65000.0)
):
    return ExplainableAIEngine.generate_explainable_signal(symbol=symbol, price=price)

@router.post("/generate-strategy")
async def generate_strategy_from_prompt(req: GenerateStrategyRequest):
    return AIStrategyGeneratorEngine.generate_strategy_from_prompt(req.prompt)

@router.post("/optimize-strategy")
async def optimize_strategy(req: OptimizeStrategyRequest):
    return AIStrategyGeneratorEngine.optimize_strategy(req.strategy_name)

@router.post("/safety/mode")
async def set_automation_mode(req: AutomationModeRequest):
    return autonomous_ai_engine.safety.set_automation_mode(req.mode)

@router.post("/safety/kill-switch")
async def trigger_emergency_kill_switch():
    return autonomous_ai_engine.safety.trigger_emergency_kill_switch()

@router.get("/safety/status")
async def get_safety_status():
    return autonomous_ai_engine.safety.get_safety_status()
