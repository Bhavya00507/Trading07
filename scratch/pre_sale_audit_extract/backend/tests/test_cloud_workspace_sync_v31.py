import time
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.services.cloud_sync_service import cloud_sync_engine

@pytest.mark.asyncio
async def test_device_management_api():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Get Devices
        dev_res = await ac.get("/api/workspace-sync/devices")
        assert dev_res.status_code == 200
        assert len(dev_res.json()["devices"]) >= 2

        # 2. Rename Device
        ren_res = await ac.post("/api/workspace-sync/devices/rename", json={
            "device_id": "dev-desktop-main", "new_name": "Quant Superstation X"
        })
        assert ren_res.status_code == 200
        assert ren_res.json()["device"]["name"] == "Quant Superstation X"

        # 3. Signout Device
        so_res = await ac.post("/api/workspace-sync/devices/signout", json={"device_id": "dev-iphone-mobile"})
        assert so_res.status_code == 200
        assert so_res.json()["status"] == "signed_out"

        # 4. Signout All Secondary Devices
        so_all = await ac.post("/api/workspace-sync/devices/signout-all")
        assert so_all.status_code == 200

@pytest.mark.asyncio
async def test_cloud_backups_and_rollback_api():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        ws_id = "ws-sync-default"

        # 1. Create Manual Backup
        bak_res = await ac.post("/api/workspace-sync/backups/create", json={
            "workspace_id": ws_id, "backup_type": "MANUAL"
        })
        assert bak_res.status_code == 200
        backup_id = bak_res.json()["backup"]["backup_id"]

        # 2. Get Backups List
        list_res = await ac.get(f"/api/workspace-sync/backups/{ws_id}")
        assert list_res.status_code == 200
        assert len(list_res.json()["backups"]) >= 1

        # 3. Restore Backup Version
        rest_res = await ac.post("/api/workspace-sync/backups/restore", json={
            "workspace_id": ws_id, "backup_id": backup_id
        })
        assert rest_res.status_code == 200
        assert rest_res.json()["status"] == "restored"

@pytest.mark.asyncio
async def test_layout_templates_api():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Get Templates
        tpl_res = await ac.get("/api/workspace-sync/templates")
        assert tpl_res.status_code == 200
        assert len(tpl_res.json()["templates"]) >= 2

        # 2. Create Layout Template
        create_tpl = await ac.post("/api/workspace-sync/templates/create", json={
            "name": "Custom Crypto Scalper", "category": "Crypto", "layout": {"charts": [{"symbol": "BTCUSDT"}]}
        })
        assert create_tpl.status_code == 200
        assert create_tpl.json()["template"]["name"] == "Custom Crypto Scalper"

@pytest.mark.asyncio
async def test_audit_logs_and_security():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        audit_res = await ac.get("/api/workspace-sync/audit-logs")
        assert audit_res.status_code == 200
        assert isinstance(audit_res.json()["audit_logs"], list)
