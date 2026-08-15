import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.services.workspace_service import workspace_service

@pytest.mark.asyncio
async def test_list_and_create_workspace():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. List Workspaces
        res = await ac.get("/api/workspace")
        assert res.status_code == 200
        data = res.json()
        assert data["total"] > 0
        assert "workspaces" in data

        # 2. Create Workspace
        new_ws = {
            "name": "Test Crypto Workspace",
            "description": "BTC & ETH Trading",
            "is_favorite": True,
            "device_info": "Test Suite",
            "layout_data": {"theme": "dark", "symbol": "BTCUSDT"}
        }
        res_create = await ac.post("/api/workspace", json=new_ws)
        assert res_create.status_code == 200
        created = res_create.json()
        assert created["name"] == "Test Crypto Workspace"
        assert created["checksum"] != ""

@pytest.mark.asyncio
async def test_update_and_delete_workspace():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Create workspace
        create_res = await ac.post("/api/workspace", json={
            "name": "Delete Me WS",
            "layout_data": {"active": True}
        })
        ws_id = create_res.json()["id"]

        # Update workspace
        update_res = await ac.put(f"/api/workspace/{ws_id}", json={
            "name": "Updated Name WS",
            "layout_data": {"active": False}
        })
        assert update_res.status_code == 200
        assert update_res.json()["name"] == "Updated Name WS"

        # Delete workspace
        del_res = await ac.delete(f"/api/workspace/{ws_id}")
        assert del_res.status_code == 200

@pytest.mark.asyncio
async def test_templates_and_import_export():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Get Templates
        tpl_res = await ac.get("/api/workspace/templates")
        assert tpl_res.status_code == 200
        templates = tpl_res.json()["templates"]
        assert len(templates) >= 8

        # 2. Export Workspace
        export_res = await ac.get("/api/workspace/export/ws-default-scalping")
        assert export_res.status_code == 200
        exported = export_res.json()
        assert exported["file_format"] == "workspace.qt"

        # 3. Import Workspace
        import_res = await ac.post("/api/workspace/import", json={
            "file_content": workspace_service.compress_payload(exported)
        })
        assert import_res.status_code == 200
        assert import_res.json()["name"] != ""
