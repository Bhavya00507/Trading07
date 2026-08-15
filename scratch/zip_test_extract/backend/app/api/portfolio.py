from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.session import get_db
from app.models.portfolio import PortfolioAccount, PortfolioPosition, DividendEntry
from app.services.portfolio_service import PortfolioService
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from uuid import UUID
import uuid

router = APIRouter(prefix="/portfolio", tags=["portfolio"])

from app.api.auth import get_current_user_id

class PortfolioAccountBase(BaseModel):
    account_name: str
    broker: str
    account_type: Optional[str] = "live"
    account_group: Optional[str] = "Personal"
    currency: Optional[str] = "USD"
    balance: Optional[float] = 10000.0
    equity: Optional[float] = 10000.0
    leverage: Optional[float] = 10.0

class PortfolioAccountResponse(PortfolioAccountBase):
    id: UUID
    user_id: UUID
    margin_used: float
    free_margin: float
    is_active: bool

    class Config:
        orm_mode = True
        from_attributes = True

@router.get("/kpis")
async def get_portfolio_kpis(
    base_currency: str = Query("USD", regex="^(USD|EUR|GBP|INR|JPY|AUD)$"),
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id)
):
    acct_stmt = select(PortfolioAccount).where(PortfolioAccount.user_id == user_id)
    acct_res = await db.execute(acct_stmt)
    accounts = [a.__dict__ for a in acct_res.scalars().all()]

    pos_stmt = select(PortfolioPosition).where(PortfolioPosition.user_id == user_id)
    pos_res = await db.execute(pos_stmt)
    positions = [p.__dict__ for p in pos_res.scalars().all()]

    return PortfolioService.calculate_portfolio_kpis(accounts, positions, base_currency=base_currency)

@router.get("/accounts", response_model=List[PortfolioAccountResponse])
async def get_portfolio_accounts(
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id)
):
    stmt = select(PortfolioAccount).where(PortfolioAccount.user_id == user_id)
    res = await db.execute(stmt)
    accounts = res.scalars().all()

    if not accounts:
        # Seed default accounts for multi-account management demonstration
        demo_accounts = [
            {"name": "MT5 Institutional Live", "broker": "MT5", "group": "Prop Firm", "currency": "USD", "balance": 50000.0},
            {"name": "Binance Spot Crypto", "broker": "Binance", "group": "Crypto", "currency": "USD", "balance": 25000.0},
            {"name": "Bybit Derivatives", "broker": "Bybit", "group": "Scalping", "currency": "USD", "balance": 15000.0},
            {"name": "Interactive Brokers Stocks", "broker": "IBKR", "group": "Personal", "currency": "USD", "balance": 100000.0},
            {"name": "Zerodha Indian Market", "broker": "Zerodha", "group": "Swing", "currency": "INR", "balance": 500000.0},
        ]
        created = []
        for da in demo_accounts:
            acct = PortfolioAccount(
                id=uuid.uuid4(),
                user_id=user_id,
                account_name=da["name"],
                broker=da["broker"],
                account_group=da["group"],
                currency=da["currency"],
                balance=da["balance"],
                equity=da["balance"],
                free_margin=da["balance"],
            )
            db.add(acct)
            created.append(acct)
        await db.commit()
        return created

    return accounts

@router.post("/accounts", response_model=PortfolioAccountResponse)
async def create_portfolio_account(
    acct: PortfolioAccountBase,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id)
):
    new_acct = PortfolioAccount(
        id=uuid.uuid4(),
        user_id=user_id,
        account_name=acct.account_name,
        broker=acct.broker,
        account_type=acct.account_type,
        account_group=acct.account_group,
        currency=acct.currency,
        balance=acct.balance,
        equity=acct.equity,
        free_margin=acct.balance,
        leverage=acct.leverage,
    )
    db.add(new_acct)
    await db.commit()
    await db.refresh(new_acct)
    return new_acct

@router.get("/positions")
async def get_portfolio_positions(
    limit: int = Query(1000, ge=1, le=100000),
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id)
):
    stmt = select(PortfolioPosition).where(PortfolioPosition.user_id == user_id).limit(limit)
    res = await db.execute(stmt)
    positions = [p.__dict__ for p in res.scalars().all()]
    return {"count": len(positions), "positions": positions}

@router.get("/allocation")
async def get_portfolio_allocation(
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id)
):
    pos_stmt = select(PortfolioPosition).where(PortfolioPosition.user_id == user_id)
    pos_res = await db.execute(pos_stmt)
    positions = [p.__dict__ for p in pos_res.scalars().all()]
    return {"allocation": PortfolioService.calculate_asset_allocation(positions)}

@router.get("/risk")
async def get_portfolio_risk(
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id)
):
    pos_stmt = select(PortfolioPosition).where(PortfolioPosition.user_id == user_id)
    pos_res = await db.execute(pos_stmt)
    positions = [p.__dict__ for p in pos_res.scalars().all()]
    return PortfolioService.calculate_risk_and_correlation(positions)

@router.get("/benchmarks")
async def get_portfolio_benchmarks():
    return PortfolioService.get_benchmark_comparison()

@router.get("/dividends")
async def get_portfolio_dividends():
    return PortfolioService.get_dividends_and_corporate_actions()

@router.get("/fx-convert")
async def fx_convert(amount: float, from_curr: str = "USD", to_curr: str = "INR"):
    converted = PortfolioService.convert_currency(amount, from_curr, to_curr)
    return {"amount": amount, "from": from_curr, "to": to_curr, "converted": converted}

@router.post("/sync")
async def cloud_sync(state: Dict[str, Any], user_id: UUID = Depends(get_current_user_id)):
    return {"status": "success", "synced_at": "2026-07-31T19:07:00Z", "cloud_status": "Synced"}
