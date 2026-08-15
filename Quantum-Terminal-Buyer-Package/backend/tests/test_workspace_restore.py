import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_workspace_history_and_restore():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Create workspace
        create_res = await ac.post("/api/workspace", json={
            "name": "Versioning Test WS",
            "layout_data": {"version_name": "v1"}
        })
        ws_id = create_res.json()["id"]

        # 2. Perform 5 auto-saves
        for i in range(2, 7):
            await ac.put(f"/api/workspace/{ws_id}", json={
                "layout_data": {"version_name": f"v{i}"}
            })

        # 3. Check version history
        hist_res = await ac.get(f"/api/workspace/history/{ws_id}")
        assert hist_res.status_code == 200
        history = hist_res.json()["history"]
        assert len(history) >= 5

        # 4. Restore version 2
        restore_res = await ac.post(f"/api/workspace/restore/{ws_id}/2")
        assert restore_res.status_code == 200
        restored_ws = restore_res.json()["workspace"]
        assert restored_ws["layout"]["version_name"] == "v2"
