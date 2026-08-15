import time
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.services.enterprise_developer_platform_service import (
    enterprise_platform_service, DeveloperPortalEngine, EnterpriseWebhookEngine, WhiteLabelBrokerEngine
)

@pytest.mark.asyncio
async def test_developer_portal_api_keys_and_sdks():
    portal = DeveloperPortalEngine()
    key_res = portal.create_api_key("HedgeFund Production Key", "ADMIN")
    assert key_res["api_key"].startswith("qk_live_")
    assert key_res["details"]["rate_limit_rpm"] == 5000
    assert len(portal.sdks) == 4

@pytest.mark.asyncio
async def test_enterprise_hmac_webhook_engine():
    wh_engine = EnterpriseWebhookEngine()
    deliv = wh_engine.dispatch_webhook("ORDER_EXECUTED", {"symbol": "BTCUSDT", "volume": 1.0})
    assert deliv["http_status"] == 200
    assert len(deliv["signature_sha256"]) == 64

@pytest.mark.asyncio
async def test_white_label_and_broker_adapters():
    wl_engine = WhiteLabelBrokerEngine()
    up = wl_engine.update_white_label({"brand_name": "Goldman Quant Terminal"})
    assert up["config"]["brand_name"] == "Goldman Quant Terminal"
    assert len(wl_engine.broker_adapters) == 3

@pytest.mark.asyncio
async def test_enterprise_developer_platform_api_endpoints():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Overview API
        o_res = await ac.get("/api/enterprise/overview")
        assert o_res.status_code == 200
        assert o_res.json()["cloud_infrastructure"]["global_uptime_pct"] == 99.999

        # 2. List API Keys API
        k_res = await ac.get("/api/enterprise/developer/api-keys")
        assert k_res.status_code == 200
        assert len(k_res.json()["api_keys"]) >= 2

        # 3. Create API Key API
        ck_res = await ac.post("/api/enterprise/developer/api-keys", json={"name": "Bot Key", "role": "DEVELOPER"})
        assert ck_res.status_code == 200
        assert ck_res.json()["api_key"].startswith("qk_live_")

        # 4. List SDKs API
        sdk_res = await ac.get("/api/enterprise/developer/sdks")
        assert sdk_res.status_code == 200
        assert len(sdk_res.json()["sdks"]) >= 4

        # 5. Dispatch Webhook API
        wh_res = await ac.post("/api/enterprise/webhooks/dispatch", json={"event_type": "ORDER_EXECUTED", "payload": {"symbol": "BTCUSDT"}})
        assert wh_res.status_code == 200
        assert len(wh_res.json()["signature_sha256"]) == 64

        # 6. White-Label Config API
        wl_res = await ac.get("/api/enterprise/white-label")
        assert wl_res.status_code == 200
        assert "brand_name" in wl_res.json()

        # 7. Broker Adapters API
        ba_res = await ac.get("/api/enterprise/broker-adapters")
        assert ba_res.status_code == 200
        assert len(ba_res.json()["adapters"]) >= 3
