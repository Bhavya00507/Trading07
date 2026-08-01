from fastapi import APIRouter, Query, HTTPException, Body
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from app.services.marketplace_service import (
    marketplace_service, PluginSDKVerificationEngine
)

router = APIRouter(prefix="/api/marketplace", tags=["marketplace"])

class InstallProductRequest(BaseModel):
    product_id: str

class VerifyPackageRequest(BaseModel):
    package_id: str
    sha256_hash: str

@router.get("/products")
async def get_marketplace_products(
    query: str = Query(""),
    category: str = Query("ALL"),
    max_price: float = Query(1000.0)
):
    prods = marketplace_service.catalog.search_products(query=query, category=category, max_price=max_price)
    return {"products": prods}

@router.get("/products/{product_id}")
async def get_product_details(product_id: str):
    for p in marketplace_service.catalog.products:
        if p["product_id"] == product_id:
            return p
    raise HTTPException(status_code=404, detail="Product not found")

@router.post("/verify-package")
async def verify_plugin_package(req: VerifyPackageRequest):
    return PluginSDKVerificationEngine.verify_package(req.package_id, req.sha256_hash)

@router.post("/install")
async def install_marketplace_product(req: InstallProductRequest):
    return marketplace_service.install_product(req.product_id)

@router.post("/uninstall")
async def uninstall_marketplace_product(req: InstallProductRequest):
    return marketplace_service.uninstall_product(req.product_id)

@router.get("/library")
async def get_user_marketplace_library():
    return marketplace_service.get_user_library()

@router.get("/licenses/verify")
async def verify_license_key(license_key: str = Query(...)):
    valid = marketplace_service.licensing.verify_license(license_key)
    return {"license_key": license_key, "valid": valid}

@router.get("/creator/analytics")
async def get_creator_analytics():
    return {
        "creator_id": "user-main",
        "total_revenue_usd": 1420.50,
        "total_downloads": 8420,
        "active_subscribers": 142,
        "average_rating": 4.9,
        "monthly_payout_history": [
            {"month": "May 2026", "payout": 340.0},
            {"month": "June 2026", "payout": 480.5},
            {"month": "July 2026", "payout": 600.0}
        ]
    }
