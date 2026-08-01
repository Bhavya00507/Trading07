from fastapi import APIRouter, Query, HTTPException, Body, Header
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from app.services.mobile_companion_service import mobile_companion_service

router = APIRouter(prefix="/api/mobile", tags=["mobile"])

class BiometricsEnableRequest(BaseModel):
    user_id: str = "user-main"
    biometric_type: str = "FACE_ID"

class PinCodeRequest(BaseModel):
    user_id: str = "user-main"
    pin_code: str

class PushNotificationRequest(BaseModel):
    title: str
    body: str
    category: str = "ORDER_FILLED"

class OfflineActionRequest(BaseModel):
    action_type: str = "PLACE_ORDER"
    payload: Dict[str, Any]

class MobileSettingsUpdateRequest(BaseModel):
    settings: Dict[str, Any]

@router.get("/dashboard")
async def get_mobile_dashboard():
    return mobile_companion_service.get_mobile_dashboard_summary()

@router.get("/security-check")
async def check_mobile_security(x_jailbreak_detected: Optional[str] = Header(None)):
    headers = {"x-jailbreak-detected": x_jailbreak_detected or "false"}
    return mobile_companion_service.security.check_security_compliance(headers)

@router.post("/biometrics/enable")
async def enable_biometrics(req: BiometricsEnableRequest):
    return mobile_companion_service.security.enable_biometrics(req.user_id, req.biometric_type)

@router.post("/pin/set")
async def set_pin_code(req: PinCodeRequest):
    success = mobile_companion_service.security.set_pin_code(req.user_id, req.pin_code)
    return {"status": "pin_set", "success": success}

@router.post("/pin/verify")
async def verify_pin_code(req: PinCodeRequest):
    valid = mobile_companion_service.security.verify_pin_code(req.user_id, req.pin_code)
    return {"status": "verified" if valid else "invalid", "valid": valid}

@router.get("/notifications")
async def get_push_notifications():
    return {"notifications": mobile_companion_service.notifications.get_user_notifications()}

@router.post("/notifications/send")
async def send_push_notification(req: PushNotificationRequest):
    return mobile_companion_service.notifications.send_push_notification(req.title, req.body, req.category)

@router.post("/offline/queue")
async def queue_offline_action(req: OfflineActionRequest):
    return mobile_companion_service.offline_cache.queue_offline_action(req.action_type, req.payload)

@router.post("/offline/sync")
async def sync_offline_actions():
    return mobile_companion_service.offline_cache.sync_offline_queue()

@router.get("/settings")
async def get_mobile_settings():
    return {"settings": mobile_companion_service.mobile_settings}

@router.post("/settings/update")
async def update_mobile_settings(req: MobileSettingsUpdateRequest):
    mobile_companion_service.mobile_settings.update(req.settings)
    return {"status": "updated", "settings": mobile_companion_service.mobile_settings}
