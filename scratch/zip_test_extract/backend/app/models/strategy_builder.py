import uuid
from sqlalchemy import Column, Numeric, DateTime, func, String, Text, Boolean, Integer
from app.models import Base, GUID

class SavedStrategy(Base):
    __tablename__ = "saved_strategies"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(50), default="Trend") # Trend, Breakout, Scalping, Mean Reversal, AI
    version = Column(String(20), default="1.0.0")
    author = Column(String(50), default="Quantum User")
    nodes_json = Column(Text, nullable=False)
    edges_json = Column(Text, nullable=False)
    is_published = Column(Boolean, default=False)
    rating = Column(Numeric(3, 2), default=5.0)
    downloads = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class StrategyVersionHistory(Base):
    __tablename__ = "strategy_versions"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    strategy_id = Column(GUID(), nullable=False, index=True)
    version = Column(String(20), nullable=False)
    change_log = Column(Text, nullable=True)
    nodes_json = Column(Text, nullable=False)
    edges_json = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
