from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.session import get_db
from app.models.strategy_builder import SavedStrategy, StrategyVersionHistory
from app.services.strategy_builder_service import StrategyBuilderService
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from uuid import UUID
import uuid

router = APIRouter(prefix="/strategy-builder", tags=["strategy_builder"])

from app.api.auth import get_current_user_id

class ValidateGraphRequest(BaseModel):
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]

class AiGenerateRequest(BaseModel):
    prompt: str

class GenerateCodeRequest(BaseModel):
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]
    target_lang: str = "pine_script"

class ImportCodeRequest(BaseModel):
    code_str: str
    source_lang: str = "pine_script"

class OptimizeRequest(BaseModel):
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]
    method: str = "Grid Search"

class SaveStrategyRequest(BaseModel):
    name: str
    description: Optional[str] = None
    category: Optional[str] = "Trend"
    version: Optional[str] = "1.0.0"
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]
    is_published: Optional[bool] = False

@router.post("/validate")
async def validate_strategy_graph(req: ValidateGraphRequest):
    errors = StrategyBuilderService.validate_node_graph(req.nodes, req.edges)
    return {"is_valid": len(errors) == 0, "errors": errors}

@router.post("/ai-generate")
async def ai_generate_strategy(req: AiGenerateRequest):
    return StrategyBuilderService.ai_generate_strategy(req.prompt)

@router.post("/ai-improve")
async def ai_improve_strategy(req: ValidateGraphRequest):
    return StrategyBuilderService.ai_improve_strategy(req.nodes, req.edges)

@router.post("/generate-code")
async def generate_strategy_code(req: GenerateCodeRequest):
    code = StrategyBuilderService.generate_strategy_code(req.nodes, req.edges, req.target_lang)
    return {"target_lang": req.target_lang, "code": code}

@router.post("/import-code")
async def import_code(req: ImportCodeRequest):
    return StrategyBuilderService.import_code_to_graph(req.code_str, req.source_lang)

@router.post("/optimize")
async def optimize_strategy(req: OptimizeRequest):
    results = StrategyBuilderService.run_parameter_optimization(req.nodes, req.edges, req.method)
    return {"method": req.method, "results": results}

@router.get("/strategies")
async def get_saved_strategies(
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id)
):
    stmt = select(SavedStrategy).where(SavedStrategy.user_id == user_id)
    res = await db.execute(stmt)
    return res.scalars().all()

@router.post("/strategies")
async def save_strategy(
    req: SaveStrategyRequest,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id)
):
    nodes_json = str(req.nodes)
    edges_json = str(req.edges)

    new_strat = SavedStrategy(
        id=uuid.uuid4(),
        user_id=user_id,
        name=req.name,
        description=req.description,
        category=req.category,
        version=req.version,
        nodes_json=nodes_json,
        edges_json=edges_json,
        is_published=req.is_published,
    )
    db.add(new_strat)
    await db.commit()
    await db.refresh(new_strat)

    # Version history
    ver = StrategyVersionHistory(
        id=uuid.uuid4(),
        strategy_id=new_strat.id,
        version=req.version,
        change_log="Initial strategy creation",
        nodes_json=nodes_json,
        edges_json=edges_json,
    )
    db.add(ver)
    await db.commit()

    return new_strat

@router.get("/marketplace")
async def get_marketplace_strategies():
    return [
        {
            "id": "mkt_1",
            "name": "Gold Order Block Breakout",
            "author": "Institutional Quant Lab",
            "category": "Order Blocks / ICT",
            "rating": 4.9,
            "downloads": 1420,
            "win_rate": "68.4%",
            "description": "Exploits liquidity sweep order blocks on XAUUSD during London/NY overlap.",
        },
        {
            "id": "mkt_2",
            "name": "Multi-EMA Cloud Trend Rider",
            "author": "CyberTrend AI",
            "category": "Trend",
            "rating": 4.8,
            "downloads": 2310,
            "win_rate": "62.1%",
            "description": "Multi-EMA ribbon trend riding strategy with dynamic ATR trailing stop.",
        },
        {
            "id": "mkt_3",
            "name": "SuperTrend + VWAP Reversal",
            "author": "Quant Master",
            "category": "Mean Reversal",
            "rating": 4.7,
            "downloads": 980,
            "win_rate": "59.5%",
            "description": "Mean reversal strategy combining session VWAP bands with SuperTrend flip.",
        },
    ]
