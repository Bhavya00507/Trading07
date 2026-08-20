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
    workspace_db = Path("D:/Trading07/backend/test.db")
    if workspace_db.parent.exists():
        db_path = workspace_db
    else:
        db_dir = Path("/tmp") if os.name != "nt" else Path(__file__).resolve().parent.parent.parent
        db_path = db_dir / "test.db"
    DATABASE_URL = f"sqlite+aiosqlite:///{db_path.as_posix()}"
else:
    # Normalize DATABASE_URL for async SQLAlchemy
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
    elif DATABASE_URL.startswith("postgresql://") and not DATABASE_URL.startswith("postgresql+"):
        DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif DATABASE_URL.startswith("sqlite://") and not DATABASE_URL.startswith("sqlite+"):
        DATABASE_URL = DATABASE_URL.replace("sqlite://", "sqlite+aiosqlite://", 1)

JWT_SECRET = os.getenv("JWT_SECRET", "super-secret-production-trading-core-key-2026")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

GOLDAPI_KEY = os.getenv("GOLDAPI_KEY", "")
GOLDAPI_BASE_URL = os.getenv("GOLDAPI_BASE_URL", "https://www.goldapi.io")
