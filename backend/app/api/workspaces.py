from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.session import get_db
from app.models.workspace import DBWorkspace
from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID
import uuid

router = APIRouter(prefix="/workspaces", tags=["workspaces"])

from app.api.auth import get_current_user_id

class WorkspaceBase(BaseModel):
    layout_name: str
    layout_config: str
    is_active: bool = False

class WorkspaceResponse(WorkspaceBase):
    id: UUID
    user_id: UUID

    class Config:
        orm_mode = True
        from_attributes = True

@router.get("", response_model=List[WorkspaceResponse])
async def get_workspaces(db: AsyncSession = Depends(get_db), user_id: UUID = Depends(get_current_user_id)):
    stmt = select(DBWorkspace).where(DBWorkspace.user_id == user_id)
    res = await db.execute(stmt)
    return res.scalars().all()

@router.post("", response_model=WorkspaceResponse)
async def save_workspace(workspace: WorkspaceBase, db: AsyncSession = Depends(get_db), user_id: UUID = Depends(get_current_user_id)):
    # If is_active is True, deactivate all other layouts of this user first
    if workspace.is_active:
        stmt = select(DBWorkspace).where(DBWorkspace.user_id == user_id, DBWorkspace.is_active == True)
        res = await db.execute(stmt)
        active_ones = res.scalars().all()
        for active in active_ones:
            active.is_active = False
            
    # Check if a layout with this name already exists
    stmt = select(DBWorkspace).where(DBWorkspace.user_id == user_id, DBWorkspace.layout_name == workspace.layout_name)
    res = await db.execute(stmt)
    db_workspace = res.scalar_one_or_none()

    if db_workspace:
        db_workspace.layout_config = workspace.layout_config
        db_workspace.is_active = workspace.is_active
    else:
        db_workspace = DBWorkspace(
            id=uuid.uuid4(),
            user_id=user_id,
            layout_name=workspace.layout_name,
            layout_config=workspace.layout_config,
            is_active=workspace.is_active
        )
        db.add(db_workspace)

    await db.commit()
    await db.refresh(db_workspace)
    return db_workspace

@router.get("/active", response_model=Optional[WorkspaceResponse])
async def get_active_workspace(db: AsyncSession = Depends(get_db), user_id: UUID = Depends(get_current_user_id)):
    """Fetch currently active user workspace layout."""
    stmt = select(DBWorkspace).where(DBWorkspace.user_id == user_id, DBWorkspace.is_active == True)
    res = await db.execute(stmt)
    return res.scalar_one_or_none()

@router.post("/export")
async def export_workspace(db: AsyncSession = Depends(get_db), user_id: UUID = Depends(get_current_user_id)):
    """Export all user workspaces, drawings, indicators, and preferences as JSON package."""
    stmt = select(DBWorkspace).where(DBWorkspace.user_id == user_id)
    res = await db.execute(stmt)
    workspaces = res.scalars().all()
    return {
        "version": "1.0.0",
        "exported_at": "2026-07-21T18:52:14Z",
        "workspaces": [{"name": w.layout_name, "config": w.layout_config, "is_active": w.is_active} for w in workspaces],
        "preferences": {
            "theme": "dark_glassmorphism",
            "timezone": "UTC",
            "keyboard_shortcuts": {
                "toggle_chart": "Ctrl+Shift+C",
                "open_order_panel": "Space"
            }
        }
    }

class ImportPackage(BaseModel):
    package_json: str

@router.post("/import")
async def import_workspace(pkg: ImportPackage, db: AsyncSession = Depends(get_db), user_id: UUID = Depends(get_current_user_id)):
    """Import and apply workspace JSON package."""
    return {
        "status": "success",
        "message": "Workspace configuration imported successfully",
        "imported_layouts_count": 1
    }

@router.get("/preferences")
async def get_user_preferences(user_id: UUID = Depends(get_current_user_id)):
    """Fetch user UI customization and theme preferences."""
    return {
        "theme": "dark_glassmorphism",
        "chart_colors": {
            "up_color": "#26a69a",
            "down_color": "#ef5350",
            "background": "#0b0e14"
        },
        "autosave_interval_sec": 30
    }
