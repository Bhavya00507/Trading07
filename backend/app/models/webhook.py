import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Integer, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.models import Base

class WebhookKey(Base):
    __tablename__ = "webhook_keys"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False)
    api_key_hash = Column(String(255), nullable=False, index=True)
    api_key_prefix = Column(String(12), nullable=False)
    broker = Column(String(50), default="paper")
    allowed_ip = Column(String(100), nullable=True)
    enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_used = Column(DateTime, nullable=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)

    user = relationship("User", back_populates="webhook_keys")

class WebhookLog(Base):
    __tablename__ = "webhook_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    symbol = Column(String(30), nullable=False)
    action = Column(String(30), nullable=False)
    status = Column(String(30), nullable=False)
    broker = Column(String(50), nullable=False)
    latency_ms = Column(Integer, default=0)
    error = Column(Text, nullable=True)
    request_payload = Column(Text, nullable=True)
    response_payload = Column(Text, nullable=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
