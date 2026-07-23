import pydantic
if pydantic.__version__.startswith("1."):
    from pydantic import BaseModel
    import json as _json, uuid as _uuid, datetime as _dt

    if not hasattr(BaseModel, "model_validate"):
        @classmethod
        def model_validate(cls, obj, *args, **kwargs):
            return cls.from_orm(obj)
        BaseModel.model_validate = model_validate

    if not hasattr(BaseModel, "model_dump"):
        def model_dump(self, *args, **kwargs):
            mode = kwargs.pop("mode", None)
            exclude_none = kwargs.pop("exclude_none", False)
            d = self.dict(exclude_none=exclude_none)
            if mode == "json":
                # Recursively convert non-JSON-safe types
                def _jsonify(obj):
                    if isinstance(obj, dict):
                        return {k: _jsonify(v) for k, v in obj.items()}
                    if isinstance(obj, list):
                        return [_jsonify(i) for i in obj]
                    if isinstance(obj, (_uuid.UUID,)):
                        return str(obj)
                    if isinstance(obj, (_dt.datetime, _dt.date)):
                        return obj.isoformat()
                    return obj
                return _jsonify(d)
            return d
        BaseModel.model_dump = model_dump

    if not hasattr(BaseModel, "model_dump_json"):
        def model_dump_json(self, *args, **kwargs):
            return self.json()
        BaseModel.model_dump_json = model_dump_json

import sys
from pathlib import Path

# Ensure the backend directory is in sys.path when started from repo root (e.g. Render / Procfile)
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import uvicorn
import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Routers
from app.api.health import router as health_router
from app.api.auth import router as auth_router
from app.api.ws import router as ws_router
from app.api.orders import router as orders_router
from app.api.positions import router as positions_router
from app.api.history import router as history_router
from app.api.market import router as market_router, api_router as api_market_router
from app.api.sync import router as sync_router
from app.api.journals import router as journals_router
from app.api.alerts import router as alerts_router
from app.api.workspaces import router as workspaces_router
from app.api.playbooks import router as playbooks_router
from app.api.paper import router as paper_router
from app.api.license import router as license_router
from app.api.brokers import router as brokers_router

from app.services.market_data import start_market_feed
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Launch market data feed
    asyncio.create_task(start_market_feed())
    
    print("\n=== REGISTERED ROUTES ===")
    try:
        schema = app.openapi()
        for path, methods_dict in schema.get("paths", {}).items():
            methods = ", ".join(methods_dict.keys()).upper()
            print(f"HTTP  {path} [{methods}]")
    except Exception as e:
        print(f"Error printing HTTP routes: {e}")
    print("WS    /ws")
    print("WS    /ws/market")
    print("=========================\n")

    print("\n=== MIDDLEWARES ===")
    try:
        for idx, mw in enumerate(app.user_middleware):
            options = getattr(mw, 'options', getattr(mw, 'kwargs', {}))
            print(f"Middleware {idx}: {mw.cls.__name__} (options: {options})")
    except Exception as e:
        print(f"Error listing middlewares: {e}")
    print("===================\n")
    
    print("\n=== EXCEPTION HANDLERS ===")
    try:
        for exc_type, handler in app.exception_handlers.items():
            handler_name = getattr(handler, "__name__", str(handler))
            print(f"Exception: {exc_type} -> Handler: {handler_name}")
    except Exception as e:
        print(f"Error listing exception handlers: {e}")
    print("==========================\n")
    
    print("\n=== STARTUP DATABASE INFO ===")
    try:
        import os
        from app.core.config import DATABASE_URL
        from app.database.session import engine
        print(f"DATABASE_URL from config: {DATABASE_URL}")
        print(f"Engine URL: {engine.url}")
        print(f"Current Working Directory: {os.getcwd()}")
        
        db_path = str(engine.url).replace("sqlite+aiosqlite:///", "")
        if os.path.exists(db_path):
            print(f"\nDATABASE:")
            print(f"Path: {os.path.abspath(db_path)}")
            print(f"Exists: True")
            print(f"Size: {os.path.getsize(db_path)} bytes")
        else:
            print(f"Database file NOT found at: {db_path}")
    except Exception as e:
        print(f"Error getting DB info: {e}")
    print("=============================\n")

    print("\nBackend running\n")
    yield

app = FastAPI(lifespan=lifespan)

from fastapi.middleware.cors import CORSMiddleware

origins = [
    "http://localhost:5173",
    "http://localhost:4173",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:4173",
    "http://192.168.1.4:4173",
    "http://192.168.1.4:5173",
    "https://trading07.onrender.com",
    "https://*.onrender.com"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_origin_regex="https://.*\\.onrender\\.com",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/ping")
async def ping_endpoint():
    return {"status": "ok"}

# Prometheus Metrics Store
from collections import Counter
import time
import json
from fastapi import Request
from fastapi.responses import PlainTextResponse, JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

_request_counter = Counter()
_request_latencies = {}

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    body = b""
    try:
        body = await request.body()
        received_payload = json.loads(body.decode())
    except Exception:
        received_payload = {}
        
    errors = exc.errors()
    missing_fields = []
    for err in errors:
        if err.get("type") == "missing" or "missing" in str(err.get("type")):
            loc = err.get("loc")
            if loc:
                missing_fields.append(str(loc[-1]))
                
    error_msg = "; ".join([f"{'.'.join(str(l) for l in err['loc'])}: {err['msg']}" for err in errors])
    print(f"!!! Validation Error on {request.url.path}: {error_msg}. Payload was: {received_payload}")
    
    expected_schema = {
        "symbol": "string (e.g. BTCUSDT)",
        "side": "string ('buy' | 'sell')",
        "type": "string ('market' | 'limit' | 'stop' | 'stop_limit')",
        "quantity": "float > 0",
        "price": "float | null",
        "stop_price": "float | null",
        "stop_loss": "float | null",
        "take_profit": "float | null",
        "is_reduce_only": "bool",
        "is_post_only": "bool",
        "time_in_force": "string"
    }
    
    return JSONResponse(
        status_code=400,
        content={
            "error": "Validation failed",
            "missing": missing_fields,
            "received": received_payload,
            "expected": expected_schema
        }
    )

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    detail = exc.detail
    if isinstance(detail, dict):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "error": detail.get("message", "Risk Engine Rejection"),
                "code": detail.get("code", "RISK_REJECTED"),
                "reason": detail.get("reason", "RISK_REJECTED"),
                "detail": detail,
                "missing_fields": [],
                "received_payload": {}
            }
        )
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": str(detail),
            "detail": {"message": str(detail)},
            "missing_fields": [],
            "received_payload": {}
        }
    )

@app.middleware("http")
async def safe_logging_middleware(request: Request, call_next):
    method = request.method
    path = request.url.path
    
    is_high_freq = path in ["/market/candles", "/health", "/metrics", "/ping"] or path.startswith("/static") or path.startswith("/assets")
    
    if not is_high_freq:
        print(f"--> [API REQUEST] {method} {path}")
        
    start_time = time.time()
    try:
        response = await call_next(request)
        duration = time.time() - start_time
        if not is_high_freq:
            print(f"<-- [API RESPONSE] {response.status_code} for {method} {path} (took {duration*1000.0:.2f} ms)")
        return response
    except Exception as e:
        duration = time.time() - start_time
        print(f"!!! [API ERROR] {method} {path} failed: {e} (took {duration*1000.0:.2f} ms)")
        raise e

@app.get("/metrics", response_class=PlainTextResponse, tags=["metrics"])
async def metrics_endpoint():
    from app.websocket.manager import manager
    import os
    lines = [
        "# HELP http_requests_total Total number of HTTP requests.",
        "# TYPE http_requests_total counter"
    ]
    for (method, path, status), count in _request_counter.items():
        lines.append(f'http_requests_total{{method="{method}",path="{path}",status="{status}"}} {count}')
        
    lines.extend([
        "# HELP http_request_duration_seconds_avg Average duration of HTTP requests in seconds.",
        "# TYPE http_request_duration_seconds_avg gauge"
    ])
    for (method, path), durations in _request_latencies.items():
        avg = sum(durations) / len(durations) if durations else 0.0
        lines.append(f'http_request_duration_seconds_avg{{method="{method}",path="{path}"}} {avg:.6f}')
        
    active_ws = sum(len(conns) for conns in manager.active_connections.values())
    lines.extend([
        "# HELP active_websocket_connections Active WebSocket connections.",
        "# TYPE active_websocket_connections gauge",
        f"active_websocket_connections {active_ws}"
    ])
    return "\n".join(lines) + "\n"

from fastapi.middleware.gzip import GZipMiddleware

# app.add_middleware(GZipMiddleware, minimum_size=1000)

# CORSMiddleware configured above

# Include routers
app.include_router(health_router)
app.include_router(auth_router)
app.include_router(ws_router)
app.include_router(orders_router)
app.include_router(positions_router)
app.include_router(history_router)
app.include_router(market_router)
app.include_router(api_market_router)
app.include_router(sync_router)
app.include_router(journals_router)
app.include_router(alerts_router)
app.include_router(workspaces_router)
app.include_router(playbooks_router)
app.include_router(paper_router)
app.include_router(license_router)
app.include_router(brokers_router)


# Startup event to launch market data feed and tables
from app.models import Base
from app.database.session import engine, AsyncSessionLocal
from app.models.account import Account
from sqlalchemy import select
import uuid

async def seed_demo_account():
    async with AsyncSessionLocal() as db:
        from app.models.user import User
        from app.core.auth import get_password_hash
        users_to_seed = [
            ("testuser", "test@example.com", "password", uuid.UUID("00000000-0000-0000-0000-000000000001")),
            ("charli", "charli@example.com", "123456789", uuid.UUID("00000000-0000-0000-0000-000000000002"))
        ]

        for username, email, pwd, uid in users_to_seed:
            user_stmt = select(User).where(User.username == username)
            user_res = await db.execute(user_stmt)
            user = user_res.scalar_one_or_none()
            
            if not user:
                user = User(
                    id=uid,
                    username=username,
                    email=email,
                    hashed_password=get_password_hash(pwd)
                )
                db.add(user)
                await db.commit()
                print(f"User '{username}' seeded.")

            for acct_type in ["paper", "binance", "bybit", "mt5", "live", "demo"]:
                stmt = select(Account).where(Account.user_id == uid, Account.account_type == acct_type)
                res = await db.execute(stmt)
                account = res.scalar_one_or_none()
                if not account:
                    new_account = Account(
                        id=uuid.uuid4(),
                        user_id=uid,
                        balance=10000.0,
                        equity=10000.0,
                        peak_balance=10000.0,
                        margin_used=0.0,
                        free_margin=10000.0,
                        daily_pnl=0.0,
                        drawdown=0.0,
                        account_type=acct_type
                    )
                    db.add(new_account)
            await db.commit()
        print("Demo accounts (paper, binance, bybit, mt5, live, demo) seeded.")

        # Seed sample positions for the demo user if none exist
        from app.models.position import Position
        pos_stmt = select(Position).where(Position.user_id == uid)
        pos_res = await db.execute(pos_stmt)
        if not pos_res.scalars().first():
            # Seed a sample BTCUSDT position
            sample_pos = Position(
                id=uuid.uuid4(),
                user_id=uid,
                symbol="BTCUSDT",
                quantity=0.02,
                average_price=65000.0,
                unrealized_pnl=0.0,
                realized_pnl=0.0,
                stop_loss=62000.0,
                take_profit=72000.0,
                account_type="live"
            )
            db.add(sample_pos)
            await db.commit()
            print("Sample positions seeded.")




# ── Static frontend serving ────────────────────────────────────────────────────
# Resolve dist directory.  On Android the assets are extracted to filesDir by
# MainActivity *before* start_server() is called, so the directory exists by the
# time Python reaches this point.  We resolve the path lazily (at request time)
# so that a module-level check that momentarily runs before extraction doesn't
# permanently disable serving.
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse
import os
import sys
import socket
import subprocess
import shutil
import httpx
from pathlib import Path

def _is_dev_server_running(port: int) -> bool:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(0.1)
            s.connect(("127.0.0.1", port))
            return True
    except Exception:
        return False

def _get_dev_server_port() -> int | None:
    for port in (5173, 4173):
        if _is_dev_server_running(port):
            return port
    return None

def _get_repo_root() -> Path:
    if getattr(sys, 'frozen', False):
        exe_path = Path(sys.executable).resolve()
        curr = exe_path.parent
        for _ in range(10):
            if (curr / "package.json").exists():
                return curr
            curr = curr.parent
        return exe_path.parent.parent.parent.parent
    else:
        curr = Path(__file__).resolve().parent
        for _ in range(10):
            if (curr / "package.json").exists():
                return curr
            curr = curr.parent
        return Path(__file__).resolve().parent.parent.parent

def _get_dist_dir() -> Path | None:
    # Look for the built dist next to the repo root
    p = _get_repo_root() / "dist"
    return p if p.exists() else None

def _auto_build_frontend():
    frontend_root = _get_repo_root()
    dist_dir = frontend_root / "dist"
    
    if dist_dir.exists() and (dist_dir / "index.html").exists():
        return
        
    print("Frontend dist not found. Starting automatic build...")
    
    npm_path = shutil.which("npm") or shutil.which("npm.cmd")
    if not npm_path:
        raise RuntimeError("npm is not installed. Node.js and npm must be installed to compile the frontend automatically.")
        
    print(f"Detected frontend root: {frontend_root}")
    print("Executing: npm install ...")
    try:
        subprocess.run(
            ["npm", "install"],
            cwd=str(frontend_root),
            shell=True,
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        print("npm install completed successfully.")
    except subprocess.CalledProcessError as e:
        raise RuntimeError(f"npm install failed: {e.stderr or e.stdout}")
        
    print("Executing: npm run build ...")
    try:
        subprocess.run(
            ["npm", "run", "build"],
            cwd=str(frontend_root),
            shell=True,
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        print("npm run build completed successfully.")
    except subprocess.CalledProcessError as e:
        raise RuntimeError(f"npm run build failed: {e.stderr or e.stdout}")
        
    if not dist_dir.exists() or not (dist_dir / "index.html").exists():
        raise RuntimeError("Frontend build completed but dist/index.html was not generated.")

# Resolve mode and auto-build if needed
try:
    _auto_build_frontend()
except Exception as e:
    print(f"Error checking/building frontend: {e}", file=sys.stderr)

_dist = _get_dist_dir()
if _dist:
    _assets = _dist / "assets"
    if _assets.exists():
        app.mount("/assets", StaticFiles(directory=str(_assets)), name="assets")
    print(f"Static serving: dist={_dist}  assets_exist={(_dist/'assets').exists()}")
else:
    print("WARNING: dist/ directory not found — static serving disabled")

# API prefixes that must NOT be caught by the SPA fallback
_API_PREFIXES = ("api/", "ws", "auth/", "orders", "positions", "history",
                 "market", "sync", "journals", "alerts", "workspaces",
                 "playbooks", "paper", "health", "metrics", "ping",
                 "docs", "redoc", "openapi.json", "assets/")

@app.get("/")
async def serve_root(request: Request):
    """Serve the React SPA entry point."""
    dist = _get_dist_dir()
    if dist is None:
        try:
            _auto_build_frontend()
            dist = _get_dist_dir()
        except Exception as e:
            return JSONResponse(
                status_code=503,
                content={"error": f"Frontend dist not found and auto-build failed: {str(e)}"}
            )
            
    if dist:
        index = dist / "index.html"
        if index.exists():
            return FileResponse(str(index), media_type="text/html")
    return JSONResponse(status_code=404, content={"error": "index.html not found"})

@app.get("/{catchall:path}")
async def serve_react_spa(request: Request, catchall: str):
    """SPA fallback — return index.html for any non-API path."""
    if any(catchall.startswith(p) for p in _API_PREFIXES):
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"Not found: /{catchall}")

    dist = _get_dist_dir()
    if dist is None:
        try:
            _auto_build_frontend()
            dist = _get_dist_dir()
        except Exception as e:
            return JSONResponse(
                status_code=503,
                content={"error": f"Frontend dist not found and auto-build failed: {str(e)}"}
            )
            
    if dist:
        index = dist / "index.html"
        if index.exists():
            return FileResponse(str(index), media_type="text/html")
    return JSONResponse(status_code=404, content={"error": "index.html missing"})


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=False)

