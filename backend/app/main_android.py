import sys
import os

# Global variable to store any exception traceback during startup
_startup_error_traceback = None

def get_startup_error() -> str:
    """Returns the captured startup traceback, if any."""
    global _startup_error_traceback
    return _startup_error_traceback or ""

try:
    import uvicorn
    import asyncio
    from pathlib import Path
    import traceback
    import logging

    # --- Pydantic V1 Monkey-patch for Pydantic V2 Compatibility ---
    import pydantic
    if pydantic.__version__.startswith("1."):
        print(f"Android Boot: Applying Pydantic V1 monkey-patch for V2 compatibility. Version: {pydantic.__version__}")
        from pydantic import BaseModel
        from pydantic.main import ModelMetaclass
        from fastapi.encoders import jsonable_encoder

        # 1. Patch metaclass to map from_attributes to orm_mode
        orig_new = ModelMetaclass.__new__
        def patched_new(mcs, name, bases, namespace, **kwargs):
            if "Config" in namespace:
                cfg = namespace["Config"]
                if hasattr(cfg, "from_attributes"):
                    cfg.orm_mode = getattr(cfg, "from_attributes")
            cls = orig_new(mcs, name, bases, namespace, **kwargs)
            if hasattr(cls, "Config"):
                if hasattr(cls.Config, "from_attributes") and not hasattr(cls.Config, "orm_mode"):
                    cls.Config.orm_mode = cls.Config.from_attributes
            return cls
        ModelMetaclass.__new__ = patched_new

        # 2. Patch model_dump to use dict() and support mode="json"
        def model_dump(self, mode=None, **kwargs):
            d = self.dict(**kwargs)
            if mode == "json":
                return jsonable_encoder(d)
            return d
        BaseModel.model_dump = model_dump

        # 3. Patch model_dump_json to use json()
        def model_dump_json(self, **kwargs):
            return self.json(**kwargs)
        BaseModel.model_dump_json = model_dump_json

        # 4. Patch model_validate classmethod to parse dict/ORM objects
        @classmethod
        def model_validate(cls, obj, *args, **kwargs):
            if hasattr(cls, "Config") and getattr(cls.Config, "from_attributes", False):
                cls.Config.orm_mode = True
            if hasattr(cls, "Config") and getattr(cls.Config, "orm_mode", False):
                try:
                    return cls.from_orm(obj)
                except Exception:
                    pass
            if isinstance(obj, dict):
                return cls.parse_obj(obj)
            try:
                return cls.from_orm(obj)
            except Exception:
                return cls.parse_obj(obj)
        BaseModel.model_validate = model_validate
except Exception as e:
    import traceback
    _startup_error_traceback = f"Top-level import failed:\n{traceback.format_exc()}"
    print(f"Android Boot: Top-level import crashed:\n{_startup_error_traceback}", file=sys.stderr)


def start_server(files_dir: str):
    """
    Called from Android Kotlin/Java code to start the FastAPI server on a background thread.
    """
    global _startup_error_traceback
    
    # Configure root logger to force everything to stdout, ensuring Logcat captures it
    logging.basicConfig(
        stream=sys.stdout,
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        force=True
    )
    
    print(f"Android Boot Log: start_server invoked with files_dir: {files_dir}")
    
    if _startup_error_traceback:
        print(f"Android Boot Log: Fatal import failure detected on entry:\n{_startup_error_traceback}", file=sys.stderr)
        raise Exception(_startup_error_traceback)
        
    try:
        # 1. Set environment variables so config.py and main.py know we are on Android
        os.environ["ANDROID_BOOT"] = "1"
        os.environ["ANDROID_DATA_DIR"] = files_dir
        
        # 2. Add files_dir to PYTHONPATH
        sys.path.insert(0, files_dir)
        
        # 3. Change current directory to files_dir so file references (like alembic.ini, version files, database) are resolved relative to files_dir
        os.chdir(files_dir)
        
        # 4. Import configuration and migrations dynamically so environment variables are applied first
        print("Android Boot Log: Loading configuration & database settings...")
        from app.core.config import DATABASE_URL
        print(f"Android Boot Log: Database URL configured as: {DATABASE_URL}")
        
        from app.database.migrations import run_auto_migrations, seed_demo_account_sync
        
        # Database initialization & Alembic migrations
        print("Android Boot Log: Database initialization & Alembic migrations starting...")
        try:
            run_auto_migrations()
            print("Android Boot Log: Alembic migrations completed successfully.")
        except Exception as e:
            tb = traceback.format_exc()
            _startup_error_traceback = f"Database Migrations Failed:\n{tb}"
            print(f"Android Boot Log: Migrations failed with exception:\n{tb}", file=sys.stderr)
            raise e
            
        # Importing FastAPI app
        print("Android Boot Log: Importing FastAPI app...")
        try:
            from app.main import app
        except Exception as e:
            tb = traceback.format_exc()
            _startup_error_traceback = f"Importing FastAPI app failed:\n{tb}"
            print(f"Android Boot Log: Import app failed with exception:\n{tb}", file=sys.stderr)
            raise e
            
        print("Android Boot Log: Seeding accounts...")
        try:
            seed_demo_account_sync()
            print("Android Boot Log: Seeding complete.")
        except Exception as e:
            tb = traceback.format_exc()
            _startup_error_traceback = f"Database Seeding Failed:\n{tb}"
            print(f"Android Boot Log: Seeding failed with exception:\n{tb}", file=sys.stderr)
            raise e
            
        # 5. Launch uvicorn
        print("Android Boot Log: Starting Uvicorn server...")
        try:
            # We print uvicorn listening status explicitly
            print("Android Boot Log: Uvicorn server is now listening on 0.0.0.0:8000")
            uvicorn.run(app, host="0.0.0.0", port=8000, reload=False, workers=1)
        except Exception as e:
            tb = traceback.format_exc()
            _startup_error_traceback = f"Uvicorn Server Crashed:\n{tb}"
            print(f"Android Boot Log: Uvicorn startup crashed with exception:\n{tb}", file=sys.stderr)
            raise e
            
    except Exception as e:
        tb = traceback.format_exc()
        if not _startup_error_traceback:
            _startup_error_traceback = tb
        print(f"Android Boot Log: Fatal server bootstrap failure:\n{tb}", file=sys.stderr)
        raise Exception(_startup_error_traceback)
