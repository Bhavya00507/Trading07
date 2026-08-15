from fastapi import APIRouter, Query, HTTPException, Body
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from app.services.quantum_os_service import quantum_os_service

router = APIRouter(prefix="/api/quantum-os", tags=["quantum-os"])

class CreateTenantRequest(BaseModel):
    org_name: str
    tier: str = "ENTERPRISE_OS"

class TriggerWorkflowRequest(BaseModel):
    workflow_id: str
    payload: Dict[str, Any]

class AgentCollaborateRequest(BaseModel):
    task_description: str

@router.get("/dashboard")
async def get_quantum_os_dashboard():
    return quantum_os_service.get_quantum_os_dashboard()

@router.get("/tenants")
async def get_tenants():
    return {"tenants": quantum_os_service.multi_tenant.get_all_tenants()}

@router.post("/tenants")
async def create_tenant(req: CreateTenantRequest):
    return quantum_os_service.multi_tenant.create_tenant(req.org_name, req.tier)

@router.get("/workflows")
async def get_workflows():
    return {"workflows": quantum_os_service.workflows.workflows}

@router.post("/workflows/trigger")
async def trigger_workflow(req: TriggerWorkflowRequest):
    return quantum_os_service.workflows.trigger_workflow(req.workflow_id, req.payload)

@router.get("/ai-agents")
async def get_ai_agents():
    return {"agents": quantum_os_service.ai_agents.agents}

@router.post("/ai-agents/collaborate")
async def run_agent_collaboration(req: AgentCollaborateRequest):
    return quantum_os_service.ai_agents.run_agent_collaboration(req.task_description)
