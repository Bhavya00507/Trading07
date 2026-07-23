import time
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.models import Base
from app.database.session import engine

@pytest.mark.asyncio
async def test_webhook_lifecycle_and_execution():
    # Ensure database schema is created for test run
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        ts = int(time.time() * 1000)
        username = f"wh_user_{ts}"
        email = f"wh_{ts}@test.com"

        # 1. Register user
        user_data = {
            "username": username,
            "email": email,
            "password": "Password123!"
        }
        reg_res = await ac.post("/auth/register", json=user_data)
        assert reg_res.status_code in [201, 200]

        # 2. Login user
        login_res = await ac.post("/auth/login", json={"username": username, "password": "Password123!"})
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 3. Create Webhook Key
        create_res = await ac.post("/api/webhooks", json={"name": "TradingView Strategy 1", "broker": "paper"}, headers=headers)
        assert create_res.status_code == 200
        key_data = create_res.json()
        assert "raw_api_key" in key_data
        raw_key = key_data["raw_api_key"]
        key_id = key_data["id"]

        # 4. List Webhook Keys
        list_res = await ac.get("/api/webhooks", headers=headers)
        assert list_res.status_code == 200
        assert len(list_res.json()) >= 1

        # 5. Execute TradingView Webhook Order
        webhook_payload = {
            "api_key": raw_key,
            "broker": "paper",
            "symbol": "BTCUSDT",
            "action": "buy",
            "type": "market",
            "volume": 0.05,
            "sl": 60000.0,
            "tp": 70000.0,
            "comment": "PineScript Signal"
        }
        exec_res = await ac.post("/api/webhooks/execute", json=webhook_payload)
        assert exec_res.status_code == 200
        exec_json = exec_res.json()
        assert exec_json["status"] == "success"
        assert exec_json["symbol"] == "BTCUSDT"

        # 6. Execute Test Webhook Endpoint
        test_res = await ac.post("/api/webhooks/test", headers=headers)
        assert test_res.status_code == 200
        assert test_res.json()["status"] == "success"

        # 7. Get Webhook Logs
        logs_res = await ac.get("/api/webhooks/logs", headers=headers)
        assert logs_res.status_code == 200
        logs = logs_res.json()
        assert len(logs) >= 2

        # 8. Toggle Webhook Key
        toggle_res = await ac.put(f"/api/webhooks/{key_id}/toggle", headers=headers)
        assert toggle_res.status_code == 200
        assert toggle_res.json()["enabled"] is False

        # 9. Execute with Disabled Key (Expect 403)
        disabled_exec = await ac.post("/api/webhooks/execute", json=webhook_payload)
        assert disabled_exec.status_code == 403

        # 10. Delete Webhook Key
        del_res = await ac.delete(f"/api/webhooks/{key_id}", headers=headers)
        assert del_res.status_code == 200
