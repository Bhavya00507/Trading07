import sys
import os

# Step 1: Install MetaPathFinder hook to force pure Python import for pydantic if .pyd fails or is blocked by AppControl
import importlib.abc
import importlib.util

class PydanticPurePythonMetaPathFinder(importlib.abc.MetaPathFinder):
    def find_spec(self, fullname, path, target=None):
        if fullname.startswith("pydantic.") or fullname == "pydantic":
            if path:
                for entry in path:
                    mod_name = fullname.split(".")[-1]
                    py_file = os.path.join(entry, mod_name + ".py")
                    if os.path.exists(py_file):
                        return importlib.util.spec_from_file_location(fullname, py_file)
        return None

sys.meta_path.insert(0, PydanticPurePythonMetaPathFinder())

# Add current directory to path so uvicorn can find app.main
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Step 2: Detailed Startup Logging for Module Imports
print("[Startup] Loading sys & os...", flush=True)
print("[Startup] Loading multiprocessing...", flush=True)
import multiprocessing

print("[Startup] Loading uvicorn...", flush=True)
import uvicorn

print("[Startup] Loading asyncio...", flush=True)
import asyncio

print("[Startup] Loading pydantic...", flush=True)
import pydantic
print(f"[Startup] Pydantic version {getattr(pydantic, '__version__', 'unknown')} loaded successfully.", flush=True)

print("[Startup] Loading fastapi...", flush=True)
import fastapi

print("[Startup] Loading sqlalchemy...", flush=True)
import sqlalchemy

print("[Startup] Loading app.database.migrations...", flush=True)
from app.database.migrations import run_auto_migrations

print("[Startup] Loading app.main...", flush=True)
from app.main import app, seed_demo_account

print("[Startup] All core modules loaded successfully.", flush=True)

if __name__ == "__main__":
    multiprocessing.freeze_support()
    
    print("[Startup] Initializing database...", flush=True)
    try:
        run_auto_migrations()
        asyncio.run(seed_demo_account())
        print("[Startup] Database initialization complete.", flush=True)
    except Exception as e:
        print(f"[Startup Error] Database initialization failed: {e}", file=sys.stderr, flush=True)
        sys.exit(1)
        
    print("[Startup] Launching Uvicorn server on http://0.0.0.0:8000 ...", flush=True)
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False, workers=1)
