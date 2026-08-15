from fastapi import APIRouter, Query, HTTPException, Body
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from app.services.enterprise_developer_platform_service import enterprise_platform_service

router = APIRouter(prefix="/api/enterprise", tags=["enterprise"])

class CreateAPIKeyRequest(BaseModel):
    name: str
    role: str = "DEVELOPER"

class DispatchWebhookRequest(BaseModel):
    event_type: str = "ORDER_EXECUTED"
    payload: Dict[str, Any]

class UpdateWhiteLabelRequest(BaseModel):
    config: Dict[str, Any]

@router.get("/overview")
async def get_enterprise_overview():
    return enterprise_platform_service.get_enterprise_overview()

@router.get("/developer/api-keys")
async def get_api_keys():
    return {"api_keys": enterprise_platform_service.developer_portal.api_keys}

@router.post("/developer/api-keys")
async def create_api_key(req: CreateAPIKeyRequest):
    return enterprise_platform_service.developer_portal.create_api_key(req.name, req.role)

@router.get("/developer/sdks")
async def get_developer_sdks():
    return {"sdks": enterprise_platform_service.developer_portal.sdks}

@router.post("/webhooks/dispatch")
async def dispatch_signed_webhook(req: DispatchWebhookRequest):
    return enterprise_platform_service.webhooks.dispatch_webhook(req.event_type, req.payload)

@router.get("/white-label")
async def get_white_label_config():
    return enterprise_platform_service.white_label.white_label_config

@router.post("/white-label/update")
async def update_white_label_config(req: UpdateWhiteLabelRequest):
    return enterprise_platform_service.white_label.update_white_label(req.config)

@router.get("/broker-adapters")
async def get_broker_adapters():
    return {"adapters": enterprise_platform_service.white_label.broker_adapters}
