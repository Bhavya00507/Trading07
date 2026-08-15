# Core configuration
import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Load .env from backend directory
backend_env = BASE_DIR / ".env"
if backend_env.exists():
    load_dotenv(dotenv_path=backend_env)

# Load .env from workspace root directory
root_env = BASE_DIR.parent / ".env"
if root_env.exists():
    load_dotenv(dotenv_path=root_env)

import sys

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    # Host PC mode: Force both dev and frozen desktop app backend to use the exact same test.db
    # If the workspace D:/Trading07/backend exists, use it. Otherwise, use relative path.
    workspace_db = Path("D:/Trading07/backend/test.db")
    if workspace_db.parent.exists():
        db_path = workspace_db
    else:
        # Fallback to the absolute path of test.db in backend folder
        db_path = (Path(__file__).resolve().parent.parent.parent / "test.db")
    DATABASE_URL = f"sqlite+aiosqlite:///{db_path.as_posix()}"

JWT_SECRET = os.getenv("JWT_SECRET", "super-secret-production-trading-core-key-2026")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

GOLDAPI_KEY = os.getenv("GOLDAPI_KEY", "")
GOLDAPI_BASE_URL = os.getenv("GOLDAPI_BASE_URL", "https://www.goldapi.io")
