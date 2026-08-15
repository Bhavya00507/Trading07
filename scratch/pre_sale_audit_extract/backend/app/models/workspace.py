import uuid
import time
from sqlalchemy import Column, String, Text, Boolean, Integer, Float
from app.models import Base, GUID

class DBWorkspace(Base):
    __tablename__ = "workspaces"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), nullable=False, index=True)
    layout_name = Column(String(100), nullable=False)
    description = Column(String(255), nullable=True, default="")
    layout_config = Column(Text, nullable=False)  # JSON/compressed string configuration
    checksum = Column(String(64), nullable=True, default="")
    is_active = Column(Boolean, nullable=False, default=False)
    is_favorite = Column(Boolean, nullable=False, default=False)
    device_info = Column(String(100), nullable=True, default="Web Desktop")
    updated_at = Column(Float, nullable=False, default=time.time)

class DBWorkspaceHistory(Base):
    __tablename__ = "workspace_histories"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(GUID(), nullable=False, index=True)
    version = Column(Integer, nullable=False, default=1)
    layout_config = Column(Text, nullable=False)
    checksum = Column(String(64), nullable=True, default="")
    device_info = Column(String(100), nullable=True, default="Web Desktop")
    created_at = Column(Float, nullable=False, default=time.time)

class DBWorkspaceTemplate(Base):
    __tablename__ = "workspace_templates"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    category = Column(String(50), nullable=False, default="Official")
    description = Column(Text, nullable=True, default="")
    layout_config = Column(Text, nullable=False)
    is_official = Column(Boolean, nullable=False, default=True)

class DBWorkspaceSettings(Base):
    __tablename__ = "workspace_settings"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), nullable=False, index=True, unique=True)
    auto_save_interval_sec = Column(Integer, nullable=False, default=5)
    cloud_sync_enabled = Column(Boolean, nullable=False, default=True)
    encryption_enabled = Column(Boolean, nullable=False, default=True)
    last_synced_workspace_id = Column(String(36), nullable=True)
