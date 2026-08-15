import uuid
import time
from sqlalchemy import Column, String, Text, Boolean, Integer, Float
from app.models import Base, GUID

class DBScript(Base):
    __tablename__ = "scripts"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    script_type = Column(String(30), nullable=False, default="indicator")  # indicator, strategy, scanner, alert, drawing
    language = Column(String(30), nullable=False, default="qscript")       # qscript, pyindicator, pystrategy
    code = Column(Text, nullable=False)
    description = Column(Text, nullable=True, default="")
    version = Column(Integer, nullable=False, default=1)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(Float, nullable=False, default=time.time)
    updated_at = Column(Float, nullable=False, default=time.time)

class DBScriptVersion(Base):
    __tablename__ = "script_versions"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    script_id = Column(GUID(), nullable=False, index=True)
    version = Column(Integer, nullable=False, default=1)
    code = Column(Text, nullable=False)
    changelog = Column(String(255), nullable=True, default="")
    created_at = Column(Float, nullable=False, default=time.time)

class DBInstalledScript(Base):
    __tablename__ = "installed_scripts"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), nullable=False, index=True)
    script_id = Column(GUID(), nullable=False)
    installed_at = Column(Float, nullable=False, default=time.time)
    is_enabled = Column(Boolean, nullable=False, default=True)

class DBMarketplaceScript(Base):
    __tablename__ = "marketplace_scripts"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    title = Column(String(100), nullable=False)
    author = Column(String(100), nullable=False, default="Quantum Quants")
    category = Column(String(50), nullable=False, default="Indicators")
    script_type = Column(String(30), nullable=False, default="indicator")
    language = Column(String(30), nullable=False, default="qscript")
    code = Column(Text, nullable=False)
    description = Column(Text, nullable=True, default="")
    downloads = Column(Integer, nullable=False, default=125)
    rating = Column(Float, nullable=False, default=4.9)
    created_at = Column(Float, nullable=False, default=time.time)
