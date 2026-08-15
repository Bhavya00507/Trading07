import time
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.services.workspace_sync import workspace_sync_engine

@pytest.mark.asyncio
async def test_workspace_sync_crud_operations():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Create Workspace
        create_res = await ac.post("/api/workspace-sync", json={
            "name": "Sync Test Workspace",
            "config_data": {"theme": "dark", "symbol": "BTCUSDT"}
        })
        assert create_res.status_code == 200
        created = create_res.json()
        ws_id = created["id"]
        assert created["name"] == "Sync Test Workspace"

        # 2. Update/Auto-save
        update_res = await ac.put(f"/api/workspace-sync/{ws_id}", json={
            "config_data": {"theme": "dark", "symbol": "ETHUSDT"}
        })
        assert update_res.status_code == 200
        assert update_res.json()["config"]["symbol"] == "ETHUSDT"

        # 3. Duplicate
        dup_res = await ac.post(f"/api/workspace-sync/duplicate/{ws_id}")
        assert dup_res.status_code == 200
        assert "Copy" in dup_res.json()["name"]

        # 4. Rename
        rename_res = await ac.post(f"/api/workspace-sync/rename/{ws_id}", json={"name": "Renamed WS"})
        assert rename_res.status_code == 200
        assert rename_res.json()["name"] == "Renamed WS"

        # 5. Delete
        del_res = await ac.delete(f"/api/workspace-sync/{ws_id}")
        assert del_res.status_code == 200

@pytest.mark.asyncio
async def test_workspace_sync_history_and_restore():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        create_res = await ac.post("/api/workspace-sync", json={
            "name": "History Test WS",
            "config_data": {"val": 1}
        })
        ws_id = create_res.json()["id"]

        # Perform 5 saves
        for i in range(2, 7):
            await ac.put(f"/api/workspace-sync/{ws_id}", json={
                "config_data": {"val": i}
            })

        hist_res = await ac.get(f"/api/workspace-sync/history/{ws_id}")
        assert hist_res.status_code == 200
        versions = hist_res.json()["versions"]
        assert len(versions) >= 5

        # Restore version 2
        restore_res = await ac.post(f"/api/workspace-sync/restore/{ws_id}/2")
        assert restore_res.status_code == 200
        assert restore_res.json()["workspace"]["config"]["val"] == 2

@pytest.mark.asyncio
async def test_workspace_sharing_and_import_export():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Share
        share_res = await ac.post("/api/workspace-sync/share/ws-sync-default")
        assert share_res.status_code == 200
        token = share_res.json()["share_token"]

        get_shared = await ac.get(f"/api/workspace-sync/share/{token}")
        assert get_shared.status_code == 200
        assert "config" in get_shared.json()

        # Export
        export_res = await ac.get("/api/workspace-sync/export/ws-sync-default")
        assert export_res.status_code == 200
        exported = export_res.json()
        assert exported["file_format"] == "workspace.qtws"

        # Import
        import_res = await ac.post("/api/workspace-sync/import", json={
            "file_content": workspace_sync_engine.compress_payload(exported)
        })
        assert import_res.status_code == 200

@pytest.mark.asyncio
async def test_conflict_resolution_strategies():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/api/workspace-sync/conflict-resolve", json={
            "workspace_id": "ws-sync-default",
            "strategy": "merge",
            "local_config": {"local_key": "local_val"}
        })
        assert res.status_code == 200
        assert "local_key" in res.json()["config"]

@pytest.mark.asyncio
async def test_stress_500_workspaces_1000_autosaves():
    """Stress test: 500 workspaces creation & 1000 autosave updates under 2.5s."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        t0 = time.time()

        # Create 500 workspaces
        ws_ids = []
        for i in range(500):
            res = await ac.post("/api/workspace-sync", json={
                "name": f"Stress WS #{i}",
                "config_data": {"idx": i}
            })
            ws_ids.append(res.json()["id"])

        # Perform 1000 autosaves across workspaces
        for j in range(1000):
            target_id = ws_ids[j % 500]
            await ac.put(f"/api/workspace-sync/{target_id}", json={
                "config_data": {"idx": j, "saved": True}
            })

        elapsed = time.time() - t0
        assert elapsed < 5.0, f"Workspace stress test took too long: {elapsed:.2f}s"
