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

# Services
from app.services.market_data import start_market_feed

app = FastAPI()

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

# @app.middleware("http")
async def metrics_middleware(request: Request, call_next):
    method = request.method
    path = request.url.path
    if path == "/metrics":
        return await call_next(request)
        
    # Log incoming request payload for POST/PATCH/PUT
    body_data = b""
    if method in ["POST", "PATCH", "PUT"]:
        body_bytes = await request.body()
        original_receive = request._receive
        body_delivered = False
        async def receive():
            nonlocal body_delivered
            if not body_delivered:
                body_delivered = True
                return {"type": "http.request", "body": body_bytes, "more_body": False}
            # Subsequent calls (e.g. Uvicorn checking for client disconnects) must delegate to the original receive channel
            return await original_receive()
        request._receive = receive
        body_data = body_bytes
        
    is_high_freq = path in ["/market/candles", "/health", "/metrics"] or path.startswith("/static")
    should_log = not is_high_freq
    
    if should_log:
        print(f"--> Incoming Request: {method} {path} Payload: {body_data.decode('utf-8', errors='ignore')}")
    
    request.state.start_time = time.time()
    start_time = request.state.start_time
    try:
        response = await call_next(request)
        status_code = response.status_code
        duration = time.time() - start_time
        if should_log or duration > 0.1:
            print(f"<-- Response Status: {status_code} for {method} {path} (took {duration*1000.0:.2f} ms)")
    except Exception as e:
        duration = time.time() - start_time
        print(f"!!! Server Error: {str(e)} for {method} {path} (took {duration*1000.0:.2f} ms)")
        status_code = 500
        raise e
    finally:
        _request_counter[(method, path, status_code)] += 1
        key = (method, path)
        if key not in _request_latencies:
            _request_latencies[key] = []
        _request_latencies[key].append(duration)
        if len(_request_latencies[key]) > 100:
            _request_latencies[key].pop(0)
    return response

# @app.middleware("http")
async def debug(request: Request, call_next):
    print("=" * 80)
    print("REQUEST:", request.method, request.url)
    response = await call_next(request)
    print("RESPONSE:", response.status_code)
    print("=" * 80)
    return response

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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

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


# Startup event to launch market data feed and tables
from app.models import Base
from app.database.session import engine, AsyncSessionLocal
from app.models.account import Account
from sqlalchemy import select
import uuid

async def seed_demo_account():
    async with AsyncSessionLocal() as db:
        # Check if the testuser exists by username
        from app.models.user import User
        user_stmt = select(User).where(User.username == "testuser")
        user_res = await db.execute(user_stmt)
        user = user_res.scalar_one_or_none()
        
        if not user:
            user_id = uuid.UUID("00000000-0000-0000-0000-000000000001")
            from app.core.auth import get_password_hash
            user = User(
                id=user_id,
                username="testuser",
                email="test@example.com",
                hashed_password=get_password_hash("password")
            )
            db.add(user)
            await db.commit()
            print("Demo user seeded.")
        else:
            user_id = user.id

        for acct_type in ["paper", "binance", "bybit", "mt5", "live", "demo"]:
            stmt = select(Account).where(Account.user_id == user_id, Account.account_type == acct_type)
            res = await db.execute(stmt)
            account = res.scalar_one_or_none()
            if not account:
                new_account = Account(
                    id=uuid.uuid4(),
                    user_id=user_id,
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
        pos_stmt = select(Position).where(Position.user_id == user_id)
        pos_res = await db.execute(pos_stmt)
        if not pos_res.scalars().first():
            # Seed a sample BTCUSDT position
            sample_pos = Position(
                id=uuid.uuid4(),
                user_id=user_id,
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

@app.on_event("startup")
async def startup_event():
    # Launch market data feed
    asyncio.create_task(start_market_feed())
    
    print("\n=== REGISTERED ROUTES ===")
    try:
        # Generate OpenAPI schema to resolve and print all HTTP routes
        schema = app.openapi()
        for path, methods_dict in schema.get("paths", {}).items():
            methods = ", ".join(methods_dict.keys()).upper()
            print(f"HTTP  {path} [{methods}]")
    except Exception as e:
        print(f"Error printing HTTP routes: {e}")
    # Print websocket routes
    print("WS    /ws")
    print("WS    /ws/market")
    print("=========================\n")

    print("\n=== MIDDLEWARES ===")
    try:
        for idx, mw in enumerate(app.user_middleware):
            print(f"Middleware {idx}: {mw.cls.__name__} (options: {mw.options})")
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
    except Exception as e:
        print(f"Error printing startup database info: {e}")
    print("=============================\n")
    
    print("\nBackend running\n")
    print("http://localhost:8000\n")
    print("http://127.0.0.1:8000\n")
    print("http://192.168.1.7:8000\n")
    print("Swagger:\nhttp://192.168.1.7:8000/docs\n")


# ── Static frontend serving ────────────────────────────────────────────────────
# Resolve dist directory.  On Android the assets are extracted to filesDir by
# MainActivity *before* start_server() is called, so the directory exists by the
# time Python reaches this point.  We resolve the path lazily (at request time)
# so that a module-level check that momentarily runs before extraction doesn't
# permanently disable serving.
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
from pathlib import Path

def _get_dist_dir() -> Path | None:
    if os.environ.get("ANDROID_BOOT"):
        p = Path(os.environ.get("ANDROID_DATA_DIR", "/data/data/com.trading.platform/files")) / "dist"
        return p if p.exists() else None
    # Desktop / dev: look for the built dist next to the repo root
    p = Path(__file__).resolve().parent.parent.parent / "dist"
    return p if p.exists() else None

# Mount /assets statically (lazy — evaluate at startup after env is set)
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
async def serve_root():
    """Serve the React SPA entry point."""
    dist = _get_dist_dir()
    if dist is None:
        return JSONResponse(
            status_code=503,
            content={"error": "Frontend dist not found. Run: npm run build"}
        )
    index = dist / "index.html"
    if index.exists():
        return FileResponse(str(index), media_type="text/html")
    return JSONResponse(status_code=404, content={"error": "index.html not found in dist"})

@app.get("/{catchall:path}")
async def serve_react_spa(catchall: str):
    """SPA fallback — return index.html for any non-API path."""
    # Let real API routes handle themselves
    if any(catchall.startswith(p) for p in _API_PREFIXES):
        # Fall through to FastAPI's normal 404 for unknown API paths
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"Not found: /{catchall}")

    dist = _get_dist_dir()
    if dist is None:
        return JSONResponse(
            status_code=503,
            content={"error": "Frontend dist not found"}
        )
    index = dist / "index.html"
    if index.exists():
        return FileResponse(str(index), media_type="text/html")
    return JSONResponse(status_code=404, content={"error": "index.html missing"})


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=False)

