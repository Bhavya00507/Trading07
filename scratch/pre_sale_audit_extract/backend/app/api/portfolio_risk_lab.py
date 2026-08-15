from fastapi import APIRouter, Query, HTTPException, Body
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from app.services.portfolio_risk_lab_service import (
    portfolio_risk_lab, MonteCarloSimulationEngine, VaREngine, KellyPositionSizingEngine, StressTestingEngine
)

router = APIRouter(prefix="/api/portfolio-risk", tags=["portfolio-risk"])

class MonteCarloRequest(BaseModel):
    initial_equity: float = 25000.0
    simulations_count: int = 1000
    horizon_days: int = 252

class KellyRequest(BaseModel):
    win_rate_pct: float = 65.0
    avg_win_usd: float = 450.0
    avg_loss_usd: float = 200.0
    account_equity: float = 25000.0

@router.get("/report")
async def get_portfolio_risk_report(equity: float = Query(25000.0)):
    return portfolio_risk_lab.get_full_risk_lab_report(equity=equity)

@router.post("/monte-carlo")
async def run_monte_carlo(req: MonteCarloRequest):
    return MonteCarloSimulationEngine.run_simulation(
        initial_equity=req.initial_equity,
        simulations_count=req.simulations_count,
        days_horizon=req.horizon_days
    )

@router.get("/var")
async def get_value_at_risk(portfolio_value: float = Query(25000.0)):
    return VaREngine.calculate_var(portfolio_value=portfolio_value)

@router.post("/kelly")
async def calculate_kelly_position_size(req: KellyRequest):
    return KellyPositionSizingEngine.calculate_kelly(
        win_rate_pct=req.win_rate_pct,
        avg_win_usd=req.avg_win_usd,
        avg_loss_usd=req.avg_loss_usd,
        account_equity=req.account_equity
    )

@router.get("/stress-test")
async def run_stress_test(portfolio_value: float = Query(25000.0)):
    return {"scenarios": StressTestingEngine.run_stress_test(portfolio_value=portfolio_value)}

@router.get("/correlation")
async def get_correlation_matrix():
    report = portfolio_risk_lab.get_full_risk_lab_report()
    return report["correlation_matrix"]

@router.get("/export/{export_format}")
async def export_risk_report(export_format: str):
    if export_format.lower() not in ["pdf", "excel", "csv"]:
        raise HTTPException(status_code=400, detail="Invalid format. Supported: pdf, excel, csv")
    return {
        "status": "exported",
        "format": export_format.upper(),
        "filename": f"quantum_portfolio_risk_report.{export_format.lower()}",
        "download_url": f"/downloads/quantum_portfolio_risk_report.{export_format.lower()}"
    }
