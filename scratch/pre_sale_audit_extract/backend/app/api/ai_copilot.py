from fastapi import APIRouter, Query, HTTPException, Body
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from app.services.ai_copilot_service import ai_copilot_service

router = APIRouter(prefix="/api/ai", tags=["ai"])

class SwitchProviderRequest(BaseModel):
    provider_id: str

class ChatRequest(BaseModel):
    prompt: str
    symbol: Optional[str] = "BTCUSDT"

class VisionRequest(BaseModel):
    image_base64: str
    prompt: str = "Analyze orderflow footprint and market structure in screenshot."

class TradeEvalRequest(BaseModel):
    symbol: str = "BTCUSDT"
    side: str = "buy"
    price: float = 65000.0
    stop_loss: float = 64000.0
    take_profit: float = 67500.0

class VoiceCommandRequest(BaseModel):
    voice_input: str

@router.get("/providers")
async def get_ai_providers():
    return {
        "active_provider": ai_copilot_service.manager.get_active_provider().name,
        "providers": ai_copilot_service.manager.get_all_provider_statuses()
    }

@router.post("/provider/switch")
async def switch_ai_provider(req: SwitchProviderRequest):
    success = ai_copilot_service.manager.set_active_provider(req.provider_id)
    if not success:
        raise HTTPException(status_code=404, detail="AI Provider not found")
    return {"status": "switched", "active_provider": ai_copilot_service.manager.get_active_provider().name}

@router.post("/chat")
async def ai_chat(req: ChatRequest):
    prov = ai_copilot_service.manager.get_active_provider()
    return prov.chat(req.prompt)

@router.post("/vision")
async def ai_vision_analysis(req: VisionRequest):
    prov = ai_copilot_service.manager.get_active_provider()
    return prov.vision(req.image_base64, req.prompt)

@router.post("/voice-command")
async def ai_voice_command(req: VoiceCommandRequest):
    return ai_copilot_service.process_voice_command(req.voice_input)

@router.get("/market-analyst")
async def get_market_analysis(
    symbol: str = Query("BTCUSDT"),
    price: float = Query(65000.0),
    timeframe: str = Query("15m")
):
    return ai_copilot_service.market_analyst(symbol=symbol, price=price, timeframe=timeframe)

@router.post("/trade-assistant")
async def evaluate_trade(req: TradeEvalRequest):
    return ai_copilot_service.trade_assistant(
        symbol=req.symbol, side=req.side, price=req.price, stop_loss=req.stop_loss, take_profit=req.take_profit
    )

@router.get("/portfolio-assistant")
async def get_portfolio_analysis(
    positions_count: int = Query(4),
    total_equity: float = Query(25000.0)
):
    return ai_copilot_service.portfolio_assistant(positions_count=positions_count, total_equity=total_equity)

@router.get("/journal-assistant")
async def get_journal_analysis(entries_count: int = Query(15)):
    return ai_copilot_service.journal_assistant(entries_count=entries_count)

@router.get("/options-assistant")
async def get_options_ai_analysis(
    symbol: str = Query("BTCUSDT"),
    price: float = Query(65000.0)
):
    return ai_copilot_service.options_assistant(symbol=symbol, price=price)
