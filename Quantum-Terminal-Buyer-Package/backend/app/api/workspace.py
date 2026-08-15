import time
import json
import uuid
import hashlib
from fastapi import APIRouter, Query, HTTPException, Body
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from app.services.workspace_service import workspace_service

router = APIRouter(prefix="/api/workspace", tags=["workspace"])

# In-Memory Storage & Version History Store
_WORKSPACES_DB: Dict[str, Dict[str, Any]] = {}
_WORKSPACE_HISTORY_DB: Dict[str, List[Dict[str, Any]]] = {}

# Seed default initial workspace
def _seed_default_workspace():
    if not _WORKSPACES_DB:
        ws_id = "ws-default-scalping"
        layout = {
            "theme": "dark",
            "charts": [{"symbol": "BTCUSDT", "timeframe": "1m", "indicators": ["EMA_9", "VWAP"]}],
            "dom": {"depth": 30, "mbo": True},
            "footprint": {"enabled": True},
            "hotkeys": {"buy": "B", "sell": "S", "cancel": "Escape"},
            "risk": {"max_daily_loss": 500, "max_position_size": 2.0}
        }
        compressed = workspace_service.compress_payload(layout)
        checksum = workspace_service.compute_checksum(compressed)

        ws_data = {
            "id": ws_id,
            "name": "Default Scalping Desk",
            "description": "Primary Scalping & Order Flow Layout",
            "is_default": True,
            "is_favorite": True,
            "is_active": True,
            "device_info": "Web Desktop",
            "layout_config": compressed,
            "checksum": checksum,
            "version": 1,
            "updated_at": time.time()
        }
        _WORKSPACES_DB[ws_id] = ws_data
        _WORKSPACE_HISTORY_DB[ws_id] = [{
            "id": f"hist-1",
            "workspace_id": ws_id,
            "version": 1,
            "device_info": "Web Desktop",
            "layout_config": compressed,
            "checksum": checksum,
            "created_at": time.time()
        }]

_seed_default_workspace()

class CreateWorkspaceRequest(BaseModel):
    name: str
    description: Optional[str] = ""
    is_favorite: Optional[bool] = False
    device_info: Optional[str] = "Web Desktop"
    layout_data: Dict[str, Any]

class UpdateWorkspaceRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_favorite: Optional[bool] = None
    is_active: Optional[bool] = None
    device_info: Optional[str] = "Web Desktop"
    layout_data: Optional[Dict[str, Any]] = None

class ImportWorkspaceRequest(BaseModel):
    file_content: str  # Base64 or JSON string

class ConflictResolveRequest(BaseModel):
    workspace_id: str
    strategy: str  # "keep_mine", "keep_cloud", "merge"
    local_layout: Dict[str, Any]

@router.get("")
async def list_workspaces():
    _seed_default_workspace()
    workspaces = []
    for ws in _WORKSPACES_DB.values():
        layout = workspace_service.decompress_payload(ws["layout_config"])
        workspaces.append({
            **ws,
            "layout": layout
        })
    return {"total": len(workspaces), "workspaces": workspaces}

@router.post("")
async def create_workspace(req: CreateWorkspaceRequest):
    _seed_default_workspace()
    ws_id = f"ws-{uuid.uuid4().hex[:8]}"
    compressed = workspace_service.compress_payload(req.layout_data)
    checksum = workspace_service.compute_checksum(compressed)

    ws_data = {
        "id": ws_id,
        "name": req.name,
        "description": req.description or "",
        "is_default": False,
        "is_favorite": req.is_favorite or False,
        "is_active": True,
        "device_info": req.device_info or "Web Desktop",
        "layout_config": compressed,
        "checksum": checksum,
        "version": 1,
        "updated_at": time.time()
    }
    _WORKSPACES_DB[ws_id] = ws_data
    _WORKSPACE_HISTORY_DB[ws_id] = [{
        "id": f"hist-{uuid.uuid4().hex[:6]}",
        "workspace_id": ws_id,
        "version": 1,
        "device_info": req.device_info or "Web Desktop",
        "layout_config": compressed,
        "checksum": checksum,
        "created_at": time.time()
    }]

    return {**ws_data, "layout": req.layout_data}

@router.put("/{workspace_id}")
async def update_workspace(workspace_id: str, req: UpdateWorkspaceRequest):
    _seed_default_workspace()
    if workspace_id not in _WORKSPACES_DB:
        raise HTTPException(status_code=404, detail="Workspace not found")

    ws = _WORKSPACES_DB[workspace_id]
    if req.name is not None: ws["name"] = req.name
    if req.description is not None: ws["description"] = req.description
    if req.is_favorite is not None: ws["is_favorite"] = req.is_favorite
    if req.is_active is not None: ws["is_active"] = req.is_active

    if req.layout_data is not None:
        compressed = workspace_service.compress_payload(req.layout_data)
        checksum = workspace_service.compute_checksum(compressed)

        # Update current workspace
        ws["layout_config"] = compressed
        ws["checksum"] = checksum
        ws["version"] = ws.get("version", 1) + 1
        ws["updated_at"] = time.time()

        # Add to history (keep max 20 versions)
        history = _WORKSPACE_HISTORY_DB.get(workspace_id, [])
        history.append({
            "id": f"hist-{uuid.uuid4().hex[:6]}",
            "workspace_id": workspace_id,
            "version": ws["version"],
            "device_info": req.device_info or "Web Desktop",
            "layout_config": compressed,
            "checksum": checksum,
            "created_at": time.time()
        })
        _WORKSPACE_HISTORY_DB[workspace_id] = history[-20:]

    layout = workspace_service.decompress_payload(ws["layout_config"])
    return {**ws, "layout": layout}

@router.delete("/{workspace_id}")
async def delete_workspace(workspace_id: str):
    _seed_default_workspace()
    if workspace_id not in _WORKSPACES_DB:
        raise HTTPException(status_code=404, detail="Workspace not found")

    del _WORKSPACES_DB[workspace_id]
    if workspace_id in _WORKSPACE_HISTORY_DB:
        del _WORKSPACE_HISTORY_DB[workspace_id]

    return {"status": "deleted", "id": workspace_id}

@router.get("/history/{workspace_id}")
async def get_workspace_history(workspace_id: str):
    _seed_default_workspace()
    if workspace_id not in _WORKSPACES_DB:
        raise HTTPException(status_code=404, detail="Workspace not found")

    history = _WORKSPACE_HISTORY_DB.get(workspace_id, [])
    return {"workspace_id": workspace_id, "total": len(history), "history": history}

@router.post("/restore/{workspace_id}/{version}")
async def restore_workspace_version(workspace_id: str, version: int):
    _seed_default_workspace()
    if workspace_id not in _WORKSPACES_DB:
        raise HTTPException(status_code=404, detail="Workspace not found")

    history = _WORKSPACE_HISTORY_DB.get(workspace_id, [])
    target = next((h for h in history if h["version"] == version), None)
    if not target:
        raise HTTPException(status_code=404, detail="Version not found in history")

    ws = _WORKSPACES_DB[workspace_id]
    ws["layout_config"] = target["layout_config"]
    ws["checksum"] = target["checksum"]
    ws["version"] = ws["version"] + 1
    ws["updated_at"] = time.time()

    layout = workspace_service.decompress_payload(ws["layout_config"])
    return {"status": "restored", "version": version, "workspace": {**ws, "layout": layout}}

@router.get("/templates")
async def get_templates():
    return {"templates": workspace_service.get_official_templates()}

@router.post("/import")
async def import_workspace(req: ImportWorkspaceRequest):
    _seed_default_workspace()
    try:
        data = workspace_service.decompress_payload(req.file_content)
        ws_name = data.get("name", "Imported Workspace")
        ws_id = f"ws-{uuid.uuid4().hex[:8]}"
        compressed = workspace_service.compress_payload(data.get("layout", data))
        checksum = workspace_service.compute_checksum(compressed)

        ws_data = {
            "id": ws_id,
            "name": ws_name,
            "description": "Imported from .qt backup",
            "is_default": False,
            "is_favorite": True,
            "is_active": True,
            "device_info": "Imported File",
            "layout_config": compressed,
            "checksum": checksum,
            "version": 1,
            "updated_at": time.time()
        }
        _WORKSPACES_DB[ws_id] = ws_data
        return {**ws_data, "layout": data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to import workspace: {str(e)}")

@router.get("/export/{workspace_id}")
async def export_workspace(workspace_id: str):
    _seed_default_workspace()
    if workspace_id not in _WORKSPACES_DB:
        raise HTTPException(status_code=404, detail="Workspace not found")

    ws = _WORKSPACES_DB[workspace_id]
    layout = workspace_service.decompress_payload(ws["layout_config"])

    export_payload = {
        "quantum_terminal_version": "v2.5",
        "file_format": "workspace.qt",
        "id": ws["id"],
        "name": ws["name"],
        "checksum": ws["checksum"],
        "exported_at": time.time(),
        "layout": layout
    }
    return export_payload

@router.post("/conflict-resolve")
async def resolve_conflict(req: ConflictResolveRequest):
    _seed_default_workspace()
    ws = _WORKSPACES_DB.get(req.workspace_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    if req.strategy == "keep_mine":
        final_layout = req.local_layout
    elif req.strategy == "keep_cloud":
        final_layout = workspace_service.decompress_payload(ws["layout_config"])
    else:  # merge
        cloud_layout = workspace_service.decompress_payload(ws["layout_config"])
        final_layout = {**cloud_layout, **req.local_layout}

    compressed = workspace_service.compress_payload(final_layout)
    ws["layout_config"] = compressed
    ws["checksum"] = workspace_service.compute_checksum(compressed)
    ws["updated_at"] = time.time()

    return {"status": "resolved", "strategy": req.strategy, "layout": final_layout}
