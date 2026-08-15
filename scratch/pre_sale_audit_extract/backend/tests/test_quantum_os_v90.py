import time
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.services.quantum_os_service import (
    quantum_os_service, MultiTenantWorkspaceEngine, WorkflowAutomationEngine, EnterpriseAIAgentCoordinator
)

@pytest.mark.asyncio
async def test_multi_tenant_workspace_engine():
    mt = MultiTenantWorkspaceEngine()
    tenants = mt.get_all_tenants()
    assert len(tenants) >= 2

    new_t = mt.create_tenant("Barclays Wealth Desk", "ENTERPRISE_OS")
    assert new_t["tenant_id"].startswith("org-")
    assert new_t["details"]["org_name"] == "Barclays Wealth Desk"

@pytest.mark.asyncio
async def test_visual_workflow_automation_engine():
    wf_engine = WorkflowAutomationEngine()
    trig = wf_engine.trigger_workflow("wf-auto-hedge", {"symbol": "BTCUSDT"})
    assert trig["status"] == "EXECUTION_SUCCESS"
    assert "DISPATCH_WEBHOOK" in trig["actions_triggered"]

@pytest.mark.asyncio
async def test_enterprise_ai_agent_coordinator():
    coord = EnterpriseAIAgentCoordinator()
    collab = coord.run_agent_collaboration("Audit orderflow risk limits")
    assert collab["verdict"] == "APPROVED_FOR_EXECUTION"
    assert collab["consensus_score_pct"] > 90.0

@pytest.mark.asyncio
async def test_quantum_os_api_endpoints():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Dashboard API
        d_res = await ac.get("/api/quantum-os/dashboard")
        assert d_res.status_code == 200
        assert d_res.json()["executive_bi"]["global_trading_volume_usd"] > 0

        # 2. Tenants List API
        t_res = await ac.get("/api/quantum-os/tenants")
        assert t_res.status_code == 200
        assert "org-goldman" in t_res.json()["tenants"]

        # 3. Create Tenant API
        ct_res = await ac.post("/api/quantum-os/tenants", json={"org_name": "JPMorgan Quant Desk", "tier": "ENTERPRISE_OS"})
        assert ct_res.status_code == 200
        assert ct_res.json()["tenant_id"].startswith("org-")

        # 4. Workflows List API
        wf_res = await ac.get("/api/quantum-os/workflows")
        assert wf_res.status_code == 200
        assert len(wf_res.json()["workflows"]) >= 2

        # 5. Trigger Workflow API
        trig_res = await ac.post("/api/quantum-os/workflows/trigger", json={"workflow_id": "wf-auto-hedge", "payload": {}})
        assert trig_res.status_code == 200
        assert trig_res.json()["status"] == "EXECUTION_SUCCESS"

        # 6. AI Agents API
        ag_res = await ac.get("/api/quantum-os/ai-agents")
        assert ag_res.status_code == 200
        assert len(ag_res.json()["agents"]) >= 4

        # 7. AI Agents Collaborate API
        col_res = await ac.post("/api/quantum-os/ai-agents/collaborate", json={"task_description": "Audit orderflow risk"})
        assert col_res.status_code == 200
        assert col_res.json()["verdict"] == "APPROVED_FOR_EXECUTION"
