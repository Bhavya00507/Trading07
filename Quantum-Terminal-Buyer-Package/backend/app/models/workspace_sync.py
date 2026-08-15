import uuid
import time
from sqlalchemy import Column, String, Text, Boolean, Integer, Float
from app.models import Base, GUID

class DBWorkspaceSync(Base):
    __tablename__ = "workspace"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    description = Column(String(255), nullable=True, default="")
    config_json = Column(Text, nullable=False)
    checksum = Column(String(64), nullable=True, default="")
    is_favorite = Column(Boolean, nullable=False, default=False)
    is_recent = Column(Boolean, nullable=False, default=True)
    device_id = Column(String(100), nullable=True, default="Web Client")
    last_modified = Column(Float, nullable=False, default=time.time)

class DBWorkspaceVersion(Base):
    __tablename__ = "workspace_versions"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(GUID(), nullable=False, index=True)
    version_number = Column(Integer, nullable=False, default=1)
    config_json = Column(Text, nullable=False)
    checksum = Column(String(64), nullable=True, default="")
    device_id = Column(String(100), nullable=True, default="Web Client")
    timestamp = Column(Float, nullable=False, default=time.time)

class DBWorkspaceShared(Base):
    __tablename__ = "workspace_shared"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(GUID(), nullable=False, index=True)
    share_token = Column(String(64), nullable=False, unique=True, index=True)
    owner_user_id = Column(GUID(), nullable=False)
    is_public = Column(Boolean, nullable=False, default=True)
    created_at = Column(Float, nullable=False, default=time.time)

class DBWorkspaceSnapshot(Base):
    __tablename__ = "workspace_snapshots"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(GUID(), nullable=False, index=True)
    snapshot_tag = Column(String(100), nullable=False, default="Auto-Backup")
    config_json = Column(Text, nullable=False)
    created_at = Column(Float, nullable=False, default=time.time)
