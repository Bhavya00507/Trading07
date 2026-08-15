import time
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.services.marketplace_service import (
    marketplace_service, PluginSDKVerificationEngine, MarketplaceLicensingEngine
)

@pytest.mark.asyncio
async def test_marketplace_catalog_search():
    prods = marketplace_service.catalog.search_products("Smart Money", "ALL", 100.0)
    assert len(prods) > 0
    assert prods[0]["product_id"] == "prod-smc-pro"

@pytest.mark.asyncio
async def test_plugin_sdk_package_verification():
    v = PluginSDKVerificationEngine.verify_package("pkg-123", "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855")
    assert v["signature_verified"] is True
    assert v["status"] == "APPROVED"

@pytest.mark.asyncio
async def test_marketplace_licensing_engine():
    lic_engine = MarketplaceLicensingEngine()
    lic = lic_engine.issue_license("user-1", "prod-smc-pro")
    assert lic["license_key"].startswith("QK-")
    assert lic_engine.verify_license(lic["license_key"]) is True

@pytest.mark.asyncio
async def test_marketplace_api_endpoints():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Search Products API
        p_res = await ac.get("/api/marketplace/products?query=Footprint")
        assert p_res.status_code == 200
        assert len(p_res.json()["products"]) > 0

        # 2. Product Details API
        d_res = await ac.get("/api/marketplace/products/prod-smc-pro")
        assert d_res.status_code == 200
        assert d_res.json()["name"] == "Smart Money Concepts Pro EA"

        # 3. Verify Package API
        v_res = await ac.post("/api/marketplace/verify-package", json={
            "package_id": "pkg-1", "sha256_hash": "3e23e8160039594a33894f6564e1b1348bbd7a0088d42c4acb73eee7935b2041"
        })
        assert v_res.status_code == 200
        assert v_res.json()["signature_verified"] is True

        # 4. Install Product API
        inst_res = await ac.post("/api/marketplace/install", json={"product_id": "prod-smc-pro"})
        assert inst_res.status_code == 200
        assert inst_res.json()["status"] == "INSTALLED"

        # 5. User Library API
        lib_res = await ac.get("/api/marketplace/library")
        assert lib_res.status_code == 200
        assert len(lib_res.json()["installed_products"]) >= 1

        # 6. Creator Analytics API
        c_res = await ac.get("/api/marketplace/creator/analytics")
        assert c_res.status_code == 200
        assert c_res.json()["total_revenue_usd"] > 0
