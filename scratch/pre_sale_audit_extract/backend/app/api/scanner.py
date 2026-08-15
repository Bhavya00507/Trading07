from fastapi import APIRouter, Query, HTTPException, Body
from typing import Optional, List, Dict, Any
from pydantic import BaseModel

from app.services.scanner_service import scanner_service

router = APIRouter(prefix="/api/scanner", tags=["scanner"])

class ScanRequest(BaseModel):
    assetClass: Optional[str] = "ALL"
    presetId: Optional[str] = None
    search: Optional[str] = None
    customFilters: Optional[List[Dict[str, Any]]] = None
    limit: Optional[int] = 200
    offset: Optional[int] = 0

class AlertWebhookRequest(BaseModel):
    webhookUrl: str
    symbol: str
    event: str
    message: str

@router.get("/presets")
async def get_presets():
    return scanner_service.get_presets()

@router.post("/scan")
async def run_scan(payload: ScanRequest):
    return scanner_service.scan(
        asset_class=payload.assetClass or "ALL",
        preset_id=payload.presetId,
        search=payload.search,
        custom_filters=payload.customFilters,
        limit=payload.limit or 200,
        offset=payload.offset or 0
    )

@router.post("/builder/validate")
async def validate_conditions(filters: List[Dict[str, Any]] = Body(...)):
    valid_fields = {
        "price", "changePct", "gapPct", "volume", "relativeVolume", "atr",
        "rsi", "ema9", "ema20", "ema50", "ema200", "vwap", "anchoredVwap",
        "high52w", "low52w", "near52wHigh", "near52wLow", "pattern", "marketCapM", "floatM"
    }
    valid_operators = {">", "<", ">=", "<=", "==", "!="}

    for f in filters:
        if f.get("field") not in valid_fields:
            raise HTTPException(status_code=400, detail=f"Invalid field: {f.get('field')}")
        if f.get("operator") not in valid_operators:
            raise HTTPException(status_code=400, detail=f"Invalid operator: {f.get('operator')}")

    return {"status": "valid", "count": len(filters)}

@router.post("/alert-webhook")
async def trigger_alert_webhook(payload: AlertWebhookRequest):
    import httpx
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            res = await client.post(payload.webhookUrl, json={
                "event": payload.event,
                "symbol": payload.symbol,
                "message": payload.message,
                "timestamp": __import__("time").time()
            })
            return {"status": "success", "statusCode": res.status_code}
    except Exception as e:
        return {"status": "queued_offline", "detail": str(e)}
