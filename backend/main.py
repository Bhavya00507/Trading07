import uvicorn
import multiprocessing
import sys
import os

# Add current directory to path so uvicorn can find app.main
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import asyncio

from app.database.migrations import run_auto_migrations
from app.main import app, seed_demo_account

if __name__ == "__main__":
    multiprocessing.freeze_support()
    
    print("Initializing database...")
    try:
        run_auto_migrations()
        asyncio.run(seed_demo_account())
        print("Database initialization complete.")
    except Exception as e:
        print(f"Error during database initialization: {e}", file=sys.stderr)
        sys.exit(1)
        
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False, workers=1)
