import os
import sys
from pathlib import Path

# Programmatically resolve repo root and backend directory into sys.path
root_dir = Path(__file__).resolve().parent
backend_dir = root_dir / "backend"

if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from app.main import app

if __name__ == "__main__":
    import uvicorn
    port_env = os.getenv("PORT", "8000")
    try:
        port = int(port_env)
    except ValueError:
        port = 8000
    uvicorn.run("app.main:app", host="0.0.0.0", port=port)
