import uuid
from sqlalchemy import Column, String, Text, Boolean
from app.models import Base, GUID

class DBWorkspace(Base):
    __tablename__ = "workspaces"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), nullable=False, index=True)
    layout_name = Column(String(50), nullable=False)
    layout_config = Column(Text, nullable=False) # JSON configuration
    is_active = Column(Boolean, nullable=False, default=False)
