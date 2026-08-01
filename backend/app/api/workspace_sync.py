import time
import json
import uuid
from fastapi import APIRouter, Query, HTTPException, Body
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from app.services.workspace_sync import workspace_sync_engine

router = APIRouter(prefix="/api/workspace-sync", tags=["workspace-sync"])

_WORKSPACES_DB: Dict[str, Dict[str, Any]] = {}
_VERSIONS_DB: Dict[str, List[Dict[str, Any]]] = {}
_SHARED_DB: Dict[str, Dict[str, Any]] = {}

def _seed_default_sync_workspace():
    if not _WORKSPACES_DB:
        ws_id = "ws-sync-default"
        layout = {
            "theme": "dark",
            "charts": [{"symbol": "BTCUSDT", "timeframe": "1m"}],
            "watchlist": ["BTCUSDT", "ETHUSDT", "SOLUSDT"],
            "dom": {"depth": 30},
            "orderflow": {"footprint": True},
            "risk": {"max_daily_loss": 1000},
            "hotkeys": {"buy": "B", "sell": "S"}
        }
        compressed = workspace_sync_engine.compress_payload(layout)
        checksum = workspace_sync_engine.compute_checksum(compressed)

        ws_data = {
            "id": ws_id,
            "name": "Cloud Institutional Workspace",
            "description": "Primary Scalping & Order Flow Layout",
            "is_favorite": True,
            "is_recent": True,
            "device_id": "Desktop Web",
            "config_json": compressed,
            "checksum": checksum,
            "version": 1,
            "last_modified": time.time()
        }
        _WORKSPACES_DB[ws_id] = ws_data
        _VERSIONS_DB[ws_id] = [{
            "id": f"ver-1",
            "workspace_id": ws_id,
            "version_number": 1,
            "device_id": "Desktop Web",
            "config_json": compressed,
            "checksum": checksum,
            "timestamp": time.time()
        }]

_seed_default_sync_workspace()

class SaveWorkspaceRequest(BaseModel):
    name: str
    description: Optional[str] = ""
    is_favorite: Optional[bool] = False
    device_id: Optional[str] = "Web Client"
    config_data: Dict[str, Any]

class UpdateWorkspaceRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_favorite: Optional[bool] = None
    is_recent: Optional[bool] = None
    device_id: Optional[str] = "Web Client"
    config_data: Optional[Dict[str, Any]] = None

class RenameWorkspaceRequest(BaseModel):
    name: str

class ImportWorkspaceRequest(BaseModel):
    file_content: str

class ConflictRequest(BaseModel):
    workspace_id: str
    strategy: str  # "keep_local", "keep_cloud", "merge"
    local_config: Dict[str, Any]

@router.get("")
async def list_workspaces():
    _seed_default_sync_workspace()
    result = []
    for ws in _WORKSPACES_DB.values():
        config = workspace_sync_engine.decompress_payload(ws["config_json"])
        result.append({**ws, "config": config})
    return {"total": len(result), "workspaces": result}

@router.post("")
async def create_workspace(req: SaveWorkspaceRequest):
    _seed_default_sync_workspace()
    ws_id = f"ws-{uuid.uuid4().hex[:8]}"
    compressed = workspace_sync_engine.compress_payload(req.config_data)
    checksum = workspace_sync_engine.compute_checksum(compressed)

    ws_data = {
        "id": ws_id,
        "name": req.name,
        "description": req.description or "",
        "is_favorite": req.is_favorite or False,
        "is_recent": True,
        "device_id": req.device_id or "Web Client",
        "config_json": compressed,
        "checksum": checksum,
        "version": 1,
        "last_modified": time.time()
    }
    _WORKSPACES_DB[ws_id] = ws_data
    _VERSIONS_DB[ws_id] = [{
        "id": f"ver-{uuid.uuid4().hex[:6]}",
        "workspace_id": ws_id,
        "version_number": 1,
        "device_id": req.device_id or "Web Client",
        "config_json": compressed,
        "checksum": checksum,
        "timestamp": time.time()
    }]
    return {**ws_data, "config": req.config_data}

@router.put("/{workspace_id}")
async def auto_save_workspace(workspace_id: str, req: UpdateWorkspaceRequest):
    _seed_default_sync_workspace()
    if workspace_id not in _WORKSPACES_DB:
        raise HTTPException(status_code=404, detail="Workspace not found")

    ws = _WORKSPACES_DB[workspace_id]
    if req.name is not None: ws["name"] = req.name
    if req.description is not None: ws["description"] = req.description
    if req.is_favorite is not None: ws["is_favorite"] = req.is_favorite
    if req.is_recent is not None: ws["is_recent"] = req.is_recent

    if req.config_data is not None:
        compressed = workspace_sync_engine.compress_payload(req.config_data)
        checksum = workspace_sync_engine.compute_checksum(compressed)

        ws["config_json"] = compressed
        ws["checksum"] = checksum
        ws["version"] = ws.get("version", 1) + 1
        ws["last_modified"] = time.time()

        versions = _VERSIONS_DB.get(workspace_id, [])
        versions.append({
            "id": f"ver-{uuid.uuid4().hex[:6]}",
            "workspace_id": workspace_id,
            "version_number": ws["version"],
            "device_id": req.device_id or "Web Client",
            "config_json": compressed,
            "checksum": checksum,
            "timestamp": time.time()
        })
        _VERSIONS_DB[workspace_id] = versions[-50:]

    config = workspace_sync_engine.decompress_payload(ws["config_json"])
    return {**ws, "config": config}

@router.post("/duplicate/{workspace_id}")
async def duplicate_workspace(workspace_id: str):
    _seed_default_sync_workspace()
    if workspace_id not in _WORKSPACES_DB:
        raise HTTPException(status_code=404, detail="Workspace not found")

    src = _WORKSPACES_DB[workspace_id]
    new_id = f"ws-{uuid.uuid4().hex[:8]}"
    dup_data = {
        **src,
        "id": new_id,
        "name": f"{src['name']} (Copy)",
        "version": 1,
        "last_modified": time.time()
    }
    _WORKSPACES_DB[new_id] = dup_data
    _VERSIONS_DB[new_id] = [{
        "id": f"ver-1",
        "workspace_id": new_id,
        "version_number": 1,
        "device_id": src["device_id"],
        "config_json": src["config_json"],
        "checksum": src["checksum"],
        "timestamp": time.time()
    }]
    config = workspace_sync_engine.decompress_payload(dup_data["config_json"])
    return {**dup_data, "config": config}

@router.post("/rename/{workspace_id}")
async def rename_workspace(workspace_id: str, req: RenameWorkspaceRequest):
    _seed_default_sync_workspace()
    if workspace_id not in _WORKSPACES_DB:
        raise HTTPException(status_code=404, detail="Workspace not found")

    ws = _WORKSPACES_DB[workspace_id]
    ws["name"] = req.name
    ws["last_modified"] = time.time()
    return ws

@router.delete("/{workspace_id}")
async def delete_workspace(workspace_id: str):
    _seed_default_sync_workspace()
    if workspace_id not in _WORKSPACES_DB:
        raise HTTPException(status_code=404, detail="Workspace not found")

    del _WORKSPACES_DB[workspace_id]
    if workspace_id in _VERSIONS_DB:
        del _VERSIONS_DB[workspace_id]

    return {"status": "deleted", "id": workspace_id}

@router.get("/history/{workspace_id}")
async def get_workspace_versions(workspace_id: str):
    _seed_default_sync_workspace()
    if workspace_id not in _WORKSPACES_DB:
        raise HTTPException(status_code=404, detail="Workspace not found")

    versions = _VERSIONS_DB.get(workspace_id, [])
    return {"workspace_id": workspace_id, "total": len(versions), "versions": versions}

@router.post("/restore/{workspace_id}/{version_number}")
async def restore_version(workspace_id: str, version_number: int):
    _seed_default_sync_workspace()
    if workspace_id not in _WORKSPACES_DB:
        raise HTTPException(status_code=404, detail="Workspace not found")

    versions = _VERSIONS_DB.get(workspace_id, [])
    target = next((v for v in versions if v["version_number"] == version_number), None)
    if not target:
        raise HTTPException(status_code=404, detail="Version not found")

    ws = _WORKSPACES_DB[workspace_id]
    ws["config_json"] = target["config_json"]
    ws["checksum"] = target["checksum"]
    ws["version"] = ws["version"] + 1
    ws["last_modified"] = time.time()

    config = workspace_sync_engine.decompress_payload(ws["config_json"])
    return {"status": "restored", "version": version_number, "workspace": {**ws, "config": config}}

@router.post("/share/{workspace_id}")
async def share_workspace(workspace_id: str):
    _seed_default_sync_workspace()
    if workspace_id not in _WORKSPACES_DB:
        raise HTTPException(status_code=404, detail="Workspace not found")

    token = workspace_sync_engine.generate_share_token()
    ws = _WORKSPACES_DB[workspace_id]
    _SHARED_DB[token] = {
        "share_token": token,
        "workspace_id": workspace_id,
        "name": ws["name"],
        "config_json": ws["config_json"],
        "created_at": time.time()
    }

    return {"share_token": token, "share_url": f"/share/{token}"}

@router.get("/share/{share_token}")
async def get_shared_workspace(share_token: str):
    if share_token not in _SHARED_DB:
        raise HTTPException(status_code=404, detail="Shared workspace not found or expired")

    shared = _SHARED_DB[share_token]
    config = workspace_sync_engine.decompress_payload(shared["config_json"])
    return {**shared, "config": config}

@router.post("/import")
async def import_workspace(req: ImportWorkspaceRequest):
    _seed_default_sync_workspace()
    try:
        data = workspace_sync_engine.decompress_payload(req.file_content)
        ws_name = data.get("name", "Imported Workspace")
        ws_id = f"ws-{uuid.uuid4().hex[:8]}"
        compressed = workspace_sync_engine.compress_payload(data.get("config", data))
        checksum = workspace_sync_engine.compute_checksum(compressed)

        ws_data = {
            "id": ws_id,
            "name": ws_name,
            "description": "Imported workspace.qtws",
            "is_favorite": True,
            "is_recent": True,
            "device_id": "Imported File",
            "config_json": compressed,
            "checksum": checksum,
            "version": 1,
            "last_modified": time.time()
        }
        _WORKSPACES_DB[ws_id] = ws_data
        return {**ws_data, "config": data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to import workspace.qtws: {str(e)}")

@router.get("/export/{workspace_id}")
async def export_workspace(workspace_id: str):
    _seed_default_sync_workspace()
    if workspace_id not in _WORKSPACES_DB:
        raise HTTPException(status_code=404, detail="Workspace not found")

    ws = _WORKSPACES_DB[workspace_id]
    config = workspace_sync_engine.decompress_payload(ws["config_json"])

    export_payload = {
        "quantum_terminal_version": "v2.6",
        "file_format": "workspace.qtws",
        "id": ws["id"],
        "name": ws["name"],
        "checksum": ws["checksum"],
        "exported_at": time.time(),
        "config": config
    }
    return export_payload

@router.post("/conflict-resolve")
async def resolve_conflict(req: ConflictRequest):
    _seed_default_sync_workspace()
    ws = _WORKSPACES_DB.get(req.workspace_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    if req.strategy == "keep_local":
        final_config = req.local_config
    elif req.strategy == "keep_cloud":
        final_config = workspace_sync_engine.decompress_payload(ws["config_json"])
    else:  # merge
        cloud_config = workspace_sync_engine.decompress_payload(ws["config_json"])
        final_config = workspace_sync_engine.merge_configs(cloud_config, req.local_config)

    compressed = workspace_sync_engine.compress_payload(final_config)
    ws["config_json"] = compressed
    ws["checksum"] = workspace_sync_engine.compute_checksum(compressed)
    ws["last_modified"] = time.time()

    return {"status": "resolved", "strategy": req.strategy, "config": final_config}
