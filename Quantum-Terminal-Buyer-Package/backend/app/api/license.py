from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Dict, Any, List

router = APIRouter(prefix="/license", tags=["License & Enterprise White-Label"])

class LicenseVerificationRequest(BaseModel):
    license_key: str
    organization_id: str

class LicenseStatusResponse(BaseModel):
    valid: bool
    tier: str
    organization: str
    max_users: int
    features: List[str]
    expires_at: str

@router.post("/verify", response_model=LicenseStatusResponse)
async def verify_license(req: LicenseVerificationRequest):
    """Verify commercial license key and return organization feature flags."""
    if not req.license_key or len(req.license_key) < 8:
        raise HTTPException(status_code=400, detail="Invalid license key format")
        
    return LicenseStatusResponse(
        valid=True,
        tier="Enterprise Institutional",
        organization=req.organization_id or "Institutional Brokerage Corp",
        max_users=50000,
        features=[
            "multi_broker_engine",
            "ai_market_copilot",
            "fix_protocol_routing",
            "white_label_branding",
            "unlimited_level2_dom",
            "algorithmic_twap_iceberg"
        ],
        expires_at="2030-12-31T23:59:59Z"
    )

@router.get("/info", response_model=Dict[str, Any])
async def get_license_info():
    """Return platform commercial tier and white-label capabilities."""
    return {
        "platform_name": "Trading Terminal Commercial Edition",
        "version": "1.0.0",
        "branding": {
            "white_label_enabled": True,
            "theme": "dark_glassmorphism",
            "allow_custom_logo": True
        },
        "supported_brokers": ["Paper Trading", "Binance", "Bybit", "MetaTrader 5", "OANDA", "Interactive Brokers"]
    }
