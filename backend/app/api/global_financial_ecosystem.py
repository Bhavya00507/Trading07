from fastapi import APIRouter, Query, HTTPException, Body
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from app.services.global_financial_ecosystem_service import global_ecosystem_service, UnifiedNetWorthBankingEngine, TaxCenterWealthEngine

router = APIRouter(prefix="/api/ecosystem", tags=["ecosystem"])

class WalletTransferRequest(BaseModel):
    from_curr: str = "USD"
    to_curr: str = "EUR"
    amount: float = 1000.0

@router.get("/dashboard")
async def get_ecosystem_dashboard():
    return global_ecosystem_service.get_super_platform_dashboard()

@router.get("/net-worth")
async def get_net_worth_telemetry():
    return UnifiedNetWorthBankingEngine.get_consolidated_net_worth()

@router.get("/wallet/balances")
async def get_wallet_balances():
    return {
        "balances": global_ecosystem_service.wallet.wallet_balances,
        "history": global_ecosystem_service.wallet.transaction_history
    }

@router.post("/wallet/transfer")
async def process_wallet_transfer(req: WalletTransferRequest):
    return global_ecosystem_service.wallet.process_wallet_transfer(req.from_curr, req.to_curr, req.amount)

@router.get("/lending/borrowing-power")
async def get_lending_borrowing_power(portfolio_value: float = Query(1584000.0)):
    return global_ecosystem_service.lending.calculate_borrowing_power(portfolio_value=portfolio_value)

@router.get("/tax/report")
async def generate_tax_report(year: int = Query(2026)):
    return TaxCenterWealthEngine.generate_tax_report(year=year)

@router.get("/ai-wealth-insights")
async def get_ai_wealth_insights():
    return TaxCenterWealthEngine.get_ai_wealth_insights()
