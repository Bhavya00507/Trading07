import os
from pathlib import Path
from sqlalchemy import create_engine, text
from app.core.config import DATABASE_URL

# Convert DATABASE_URL to a synchronous URL
sync_url = DATABASE_URL
if "sqlite+aiosqlite" in sync_url:
    sync_url = sync_url.replace("sqlite+aiosqlite", "sqlite")
elif "postgresql+asyncpg" in sync_url:
    sync_url = sync_url.replace("postgresql+asyncpg", "postgresql")

def check_table_exists(table_name: str) -> bool:
    engine = create_engine(sync_url)
    try:
        with engine.connect() as conn:
            if "postgresql" in sync_url:
                query = text(f"SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '{table_name}')")
                res = conn.execute(query)
                return bool(res.scalar())
            else:
                query = text(f"SELECT name FROM sqlite_master WHERE type='table' AND name='{table_name}'")
                res = conn.execute(query)
                return res.scalar() is not None
    except Exception as e:
        print(f"Error checking table existence for '{table_name}': {e}")
        return False
    finally:
        engine.dispose()

def check_alembic_has_version() -> bool:
    engine = create_engine(sync_url)
    try:
        with engine.connect() as conn:
            if "postgresql" in sync_url:
                query = text("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'alembic_version')")
                res = conn.execute(query)
                exists = bool(res.scalar())
            else:
                query = text("SELECT name FROM sqlite_master WHERE type='table' AND name='alembic_version'")
                res = conn.execute(query)
                exists = res.scalar() is not None
            
            if not exists:
                return False
            
            query = text("SELECT version_num FROM alembic_version")
            res = conn.execute(query)
            return res.scalar() is not None
    except Exception as e:
        print(f"Error checking alembic version: {e}")
        return False
    finally:
        engine.dispose()

def run_auto_migrations():
    from alembic.config import Config
    from alembic import command
    import os

    base_dir = Path(__file__).resolve().parent.parent.parent
    print(f"Auto Migrations: Using base_dir: {base_dir}")

    ini_path = base_dir / "alembic.ini"
    alembic_cfg = Config(str(ini_path))
    alembic_cfg.set_main_option("script_location", str(base_dir / "alembic"))
    alembic_cfg.set_main_option("sqlalchemy.url", sync_url)

    has_users = check_table_exists("users")
    has_version = check_alembic_has_version()

    if has_users and not has_version:
        print("Existing database with tables detected, but no alembic version. Stamping database as baseline (b778d67fd5e8).")
        command.stamp(alembic_cfg, "b778d67fd5e8")
        print("Running database migrations to head.")
        command.upgrade(alembic_cfg, "head")
    else:
        print("Running database migrations to head.")
        command.upgrade(alembic_cfg, "head")

def seed_demo_account_sync():
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy import select
    from app.models.user import User
    from app.models.account import Account
    from app.models.position import Position
    import uuid

    engine = create_engine(sync_url)
    Session = sessionmaker(bind=engine)
    with Session() as db:
        from app.core.auth import get_password_hash
        users_to_seed = [
            ("testuser", "test@example.com", "password", uuid.UUID("00000000-0000-0000-0000-000000000001")),
            ("charli", "charli@example.com", "123456789", uuid.UUID("00000000-0000-0000-0000-000000000002"))
        ]

        for username, email, pwd, uid in users_to_seed:
            user = db.execute(select(User).where(User.username == username)).scalar_one_or_none()
            if not user:
                user = User(
                    id=uid,
                    username=username,
                    email=email,
                    hashed_password=get_password_hash(pwd)
                )
                db.add(user)
                db.commit()
                print(f"User {username} seeded.")
            else:
                uid = user.id

            for acct_type in ["paper", "binance", "bybit", "mt5", "live", "demo"]:
                account = db.execute(select(Account).where(Account.user_id == uid, Account.account_type == acct_type)).scalar_one_or_none()
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
            db.commit()
            print(f"Accounts for {username} seeded.")

        # Seed sample positions for the demo user if none exist
        default_uid = uuid.UUID("00000000-0000-0000-0000-000000000001")
        pos_exists = db.execute(select(Position).where(Position.user_id == default_uid)).scalars().first()
        if not pos_exists:
            # Seed a sample BTCUSDT position
            sample_pos = Position(
                id=uuid.uuid4(),
                user_id=default_uid,
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
            db.commit()
            print("Sample positions seeded.")
