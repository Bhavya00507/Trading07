import time
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.services.mobile_companion_service import mobile_companion_service

@pytest.mark.asyncio
async def test_mobile_security_and_biometrics():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Security Compliance Check
        sec_res = await ac.get("/api/mobile/security-check")
        assert sec_res.status_code == 200
        assert sec_res.json()["device_secure"] is True

        # 2. Enable Biometrics
        bio_res = await ac.post("/api/mobile/biometrics/enable", json={
            "user_id": "user-mobile-1", "biometric_type": "FACE_ID"
        })
        assert bio_res.status_code == 200
        assert bio_res.json()["status"] == "ENABLED"

        # 3. Set & Verify PIN Code
        set_pin = await ac.post("/api/mobile/pin/set", json={"user_id": "user-mobile-1", "pin_code": "1234"})
        assert set_pin.status_code == 200

        verify_pin = await ac.post("/api/mobile/pin/verify", json={"user_id": "user-mobile-1", "pin_code": "1234"})
        assert verify_pin.status_code == 200
        assert verify_pin.json()["valid"] is True

@pytest.mark.asyncio
async def test_mobile_push_notifications():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Send Push Notification
        send_res = await ac.post("/api/mobile/notifications/send", json={
            "title": "BTCUSDT Order Filled", "body": "Bought 1.0 BTC at $65,420.00", "category": "ORDER_FILLED"
        })
        assert send_res.status_code == 200
        assert send_res.json()["title"] == "BTCUSDT Order Filled"

        # Fetch Notifications Queue
        list_res = await ac.get("/api/mobile/notifications")
        assert list_res.status_code == 200
        assert len(list_res.json()["notifications"]) >= 1

@pytest.mark.asyncio
async def test_mobile_offline_cache_and_sync():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Queue Action Offline
        q_res = await ac.post("/api/mobile/offline/queue", json={
            "action_type": "PLACE_ORDER", "payload": {"symbol": "BTCUSDT", "side": "buy", "quantity": 1.0}
        })
        assert q_res.status_code == 200
        assert q_res.json()["status"] == "QUEUED"

        # Sync Offline Queue
        sync_res = await ac.post("/api/mobile/offline/sync")
        assert sync_res.status_code == 200
        assert sync_res.json()["status"] == "SYNCED"

@pytest.mark.asyncio
async def test_mobile_dashboard_and_settings():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Dashboard Summary
        dash_res = await ac.get("/api/mobile/dashboard")
        assert dash_res.status_code == 200
        assert dash_res.json()["equity"] > 0

        # Update Settings
        up_res = await ac.post("/api/mobile/settings/update", json={
            "settings": {"one_tap_trading": True, "haptic_feedback": True}
        })
        assert up_res.status_code == 200
        assert up_res.json()["settings"]["one_tap_trading"] is True
