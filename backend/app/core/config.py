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

if os.environ.get("ANDROID_BOOT"):
    # Android production mode - Store database in internal files directory
    android_data_dir = Path(os.environ.get("ANDROID_DATA_DIR", "/data/data/com.trading.platform/files"))
    android_data_dir.mkdir(parents=True, exist_ok=True)
    db_path = android_data_dir / "test.db"
    DATABASE_URL = f"sqlite+aiosqlite:///{db_path.as_posix()}"
elif getattr(sys, 'frozen', False):
    # Packaged production mode - Store test.db in user Local AppData
    app_data_dir = Path(os.environ.get("LOCALAPPDATA", os.path.expanduser("~"))) / "TradingPlatform"
    app_data_dir.mkdir(parents=True, exist_ok=True)
    db_path = app_data_dir / "test.db"
    
    # Copy seed test.db if not present in AppData
    if not db_path.exists():
        import shutil
        bundled_db = BASE_DIR / "test.db"
        if bundled_db.exists():
            try:
                shutil.copy(bundled_db, db_path)
            except Exception as e:
                print(f"Error copying seed db: {e}")
                
    env_db_url = os.getenv("DATABASE_URL")
    if env_db_url and "./test.db" not in env_db_url:
        DATABASE_URL = env_db_url
    else:
        DATABASE_URL = f"sqlite+aiosqlite:///{db_path.as_posix()}"
else:
    # Development mode
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./test.db")

JWT_SECRET = os.getenv("JWT_SECRET", "super-secret-production-trading-core-key-2026")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

GOLDAPI_KEY = os.getenv("GOLDAPI_KEY", "")
GOLDAPI_BASE_URL = os.getenv("GOLDAPI_BASE_URL", "https://www.goldapi.io")
