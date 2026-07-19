"""
session.py — SQLAlchemy session factory.

Exports (always):
    engine              – the primary engine (async)
    async_engine        – alias for engine (backwards compat)
    AsyncSessionLocal   – session factory; produces real AsyncSession
    get_db()            – FastAPI dependency that yields a db session
"""

import os
from app.core.config import DATABASE_URL
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import event

# connection tweaks
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"timeout": 30}

engine = create_async_engine(
    DATABASE_URL, echo=False, future=True, connect_args=connect_args
)
async_engine = engine  # alias

if DATABASE_URL.startswith("sqlite"):
    @event.listens_for(engine.sync_engine, "connect")
    def _set_sqlite_pragma(dbapi_conn, _record):
        cur = dbapi_conn.cursor()
        cur.execute("PRAGMA journal_mode=WAL")
        cur.execute("PRAGMA synchronous=NORMAL")
        cur.close()

AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

async def get_db() -> AsyncSession:
    if DATABASE_URL.startswith("sqlite"):
        clean_url = DATABASE_URL
        for prefix in ["sqlite+aiosqlite:///", "sqlite:///"]:
            if clean_url.startswith(prefix):
                clean_url = clean_url[len(prefix):]
                break
        abs_path = os.path.abspath(clean_url)
        print(f"DATABASE PATH: {abs_path}")
    else:
        print("DATABASE TYPE: PostgreSQL (Production/Centralized)")
        
    async with AsyncSessionLocal() as session:
        yield session
