from fastapi import APIRouter, Query, HTTPException, Body
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from app.services.hedge_fund_mam_service import hedge_fund_service

router = APIRouter(prefix="/api/hedge-fund", tags=["hedge-fund"])

class BulkOrderRequest(BaseModel):
    group_name: str = "ALL"
    symbol: str = "BTCUSDT"
    side: str = "BUY"
    total_volume: float = 10.0

class SubscribeProviderRequest(BaseModel):
    provider_id: str
    risk_multiplier: float = 1.0

@router.get("/dashboard")
async def get_global_monitoring_dashboard():
    return hedge_fund_service.get_global_monitoring_dashboard()

@router.get("/mam/accounts")
async def get_mam_accounts():
    return {"accounts": hedge_fund_service.mam.get_all_accounts()}

@router.post("/mam/bulk-order")
async def execute_bulk_order(req: BulkOrderRequest):
    return hedge_fund_service.mam.bulk_place_order(
        group_name=req.group_name, symbol=req.symbol, side=req.side, total_volume=req.total_volume
    )

@router.get("/pamm")
async def get_pamm_dashboard():
    return hedge_fund_service.pamm.get_pamm_dashboard()

@router.get("/copy-trading/leaderboard")
async def get_copy_trading_leaderboard():
    return {"providers": hedge_fund_service.copy_trading.providers}

@router.post("/copy-trading/subscribe")
async def subscribe_copy_trading_provider(req: SubscribeProviderRequest):
    return hedge_fund_service.copy_trading.subscribe_provider(
        provider_id=req.provider_id, risk_multiplier=req.risk_multiplier
    )

@router.get("/compliance/audit")
async def get_compliance_audit_logs():
    return {
        "audit_logs": [
            {"event": "BULK_ORDER_EXECUTED", "user": "Owner", "timestamp": 1785500000.0, "status": "SUCCESS"},
            {"event": "PAMM_FEE_CALCULATED", "user": "System", "timestamp": 1785490000.0, "fee_usd": 33198.0}
        ]
    }
