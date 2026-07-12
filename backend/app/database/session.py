"""
session.py — SQLAlchemy session factory.

Exports (always):
    engine              – the primary engine (sync on Android, async on desktop)
    async_engine        – alias for engine (backwards compat)
    AsyncSessionLocal   – session factory; produces SyncToAsyncSession on Android,
                          real AsyncSession on desktop
    get_db()            – FastAPI dependency that yields a db session
"""

import os
from app.core.config import DATABASE_URL

# ── connection tweaks ──────────────────────────────────────────────────────────
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"timeout": 30}

_is_android = bool(os.environ.get("ANDROID_BOOT"))

# ==============================================================================
# ANDROID PATH — greenlet / aiosqlite unavailable
# We expose a synchronous engine but wrap it behind an async-compatible shim so
# every existing `async def` route that does `await db.execute(...)` keeps working.
# ==============================================================================
if _is_android:
    from sqlalchemy import create_engine, event
    from sqlalchemy.orm import sessionmaker, Session as _Session

    # Convert driver prefix to plain sqlite://
    _sync_url = DATABASE_URL
    for _old, _new in [
        ("sqlite+aiosqlite", "sqlite"),
        ("postgresql+asyncpg", "postgresql"),
    ]:
        _sync_url = _sync_url.replace(_old, _new)

    engine = create_engine(_sync_url, echo=False, connect_args=connect_args)
    async_engine = engine  # alias for any code that references async_engine

    if _sync_url.startswith("sqlite"):
        @event.listens_for(engine, "connect")
        def _set_sqlite_pragma(dbapi_conn, _record):
            cur = dbapi_conn.cursor()
            cur.execute("PRAGMA journal_mode=WAL")
            cur.execute("PRAGMA synchronous=NORMAL")
            cur.close()

    _SyncFactory = sessionmaker(bind=engine, expire_on_commit=False)

    # ── async-compatible shim ──────────────────────────────────────────────────
    class _SyncToAsync:
        """
        Wraps a synchronous SQLAlchemy Session behind the AsyncSession interface
        so that all FastAPI `async def` route handlers work unchanged.
        Every method is a coroutine that executes synchronously — safe because
        Chaquopy runs Python in a single OS thread.
        """
        def __init__(self, session: _Session):
            self._s = session

        # ── context-manager ────────────────────────────────────────────────────
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc_val, exc_tb):
            if exc_type:
                self._s.rollback()
            self._s.close()

        # ── core query interface ───────────────────────────────────────────────
        async def execute(self, statement, *args, **kwargs):
            return self._s.execute(statement, *args, **kwargs)

        async def scalar(self, statement, *args, **kwargs):
            return self._s.scalar(statement, *args, **kwargs)

        async def scalars(self, statement, *args, **kwargs):
            return self._s.scalars(statement, *args, **kwargs)

        # ── write helpers ──────────────────────────────────────────────────────
        def add(self, instance, _warn=True):
            self._s.add(instance)

        def add_all(self, instances):
            self._s.add_all(instances)

        async def delete(self, instance):
            self._s.delete(instance)

        async def merge(self, instance):
            return self._s.merge(instance)

        def expunge(self, instance):
            self._s.expunge(instance)

        # ── transaction control ────────────────────────────────────────────────
        async def commit(self):
            self._s.commit()

        async def rollback(self):
            self._s.rollback()

        async def flush(self, objects=None):
            self._s.flush(objects)

        async def close(self):
            self._s.close()

        async def refresh(self, instance):
            self._s.refresh(instance)

        # ── begin() context for `async with session.begin():` ─────────────────
        def begin(self):
            return _BeginCtx(self)

    class _BeginCtx:
        def __init__(self, session):
            self._session = session
        async def __aenter__(self):
            return self._session
        async def __aexit__(self, *_):
            pass

    # ── session "factory" that mimics AsyncSessionLocal() ─────────────────────
    class _AsyncSessionLocalClass:
        """
        Callable that returns a SyncToAsync context manager, mirroring the
        behaviour of `AsyncSessionLocal` on desktop so that:
            async with AsyncSessionLocal() as db: ...
        works identically on Android.
        """
        def __call__(self):
            raw = _SyncFactory()
            return _SyncToAsync(raw)

    AsyncSessionLocal = _AsyncSessionLocalClass()

    # ── FastAPI dependency ─────────────────────────────────────────────────────
    async def get_db():
        raw = _SyncFactory()
        try:
            yield _SyncToAsync(raw)
        except Exception:
            raw.rollback()
            raise
        finally:
            raw.close()

# ==============================================================================
# DESKTOP / DEV PATH — full aiosqlite async stack
# ==============================================================================
else:
    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy import event

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
        async with AsyncSessionLocal() as session:
            yield session
