import os
os.environ["SPREAD_CRYPTO"] = "0.0"
os.environ["SPREAD_FOREX"] = "0.0"
os.environ["SPREAD_METALS"] = "0.0"
os.environ["SPREAD_INDICES"] = "0.0"
os.environ["SPREAD_STOCKS"] = "0.0"
os.environ["COMMISSION_RATE"] = "0.0"

import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.database.session import AsyncSessionLocal, engine
from app.models import Base
from app.models.account import Account
from app.models.order import OrderSide, OrderType, OrderStatus, Order
from app.models.position import Position
from app.services.market_data import update_market_price
from sqlalchemy import select, delete

@pytest.fixture(autouse=True)
async def clean_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    async with AsyncSessionLocal() as db:
        from app.models.user import User
        from app.models.account import Account
        from app.models.position import Position
        from app.models.order import Order
        await db.execute(delete(Position))
        await db.execute(delete(Order))
        await db.execute(delete(Account))
        await db.execute(delete(User))
        await db.commit()

async def register_and_login(ac: AsyncClient, username="testuser2", email="test2@example.com", password="password"):
    await ac.post("/auth/register", json={
        "username": username,
        "email": email,
        "password": password
    })
    resp = await ac.post("/auth/login", json={
        "username": username,
        "password": password
    })
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.mark.anyio
async def test_algo_orders_slicing_twap():
    """Verify that TWAP and VWAP orders execute slices properly."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        headers = await register_and_login(ac)
        await update_market_price("BTCUSDT", 20000.0)

        # Place a TWAP Buy order for 0.1 BTC (should slice into 5 parts, first slice quantity = 0.02)
        resp = await ac.post("/orders", json={
            "symbol": "BTCUSDT",
            "side": "buy",
            "type": "twap",
            "quantity": 0.1,
            "price": 20000.0
        }, headers=headers)

        assert resp.status_code == 200
        order_data = resp.json()
        assert order_data["status"] == "filled"
        assert pytest.approx(order_data["quantity"]) == 0.02 # 20% of 0.1 BTC
        assert order_data["algo_type"] == "twap"

@pytest.mark.anyio
async def test_algo_orders_slicing_iceberg():
    """Verify Iceberg orders execute with visible quantity slicing."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        headers = await register_and_login(ac)
        await update_market_price("BTCUSDT", 20000.0)

        # Place an Iceberg Buy order for 0.2 BTC, visible qty = 0.05
        resp = await ac.post("/orders", json={
            "symbol": "BTCUSDT",
            "side": "buy",
            "type": "iceberg",
            "quantity": 0.2,
            "price": 20000.0,
            "iceberg_visible_qty": 0.05
        }, headers=headers)

        assert resp.status_code == 200
        order_data = resp.json()
        assert order_data["status"] == "filled"
        assert order_data["quantity"] == 0.05
        assert order_data["iceberg_visible_qty"] == 0.05

@pytest.mark.anyio
async def test_broker_adapter_sync_endpoint():
    """Verify that sync-state returns valid structured accounts, orders and positions."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        headers = await register_and_login(ac)
        
        resp = await ac.get("/sync-state?account_type=live", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "accounts" in data
        assert "positions" in data
        assert "orders" in data

@pytest.mark.anyio
async def test_alert_rules_registration():
    """Verify that price alerts can be successfully added to the system."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        headers = await register_and_login(ac)

        resp = await ac.post("/alerts", json={
            "symbol": "BTCUSDT",
            "type": "price_above",
            "value": 68000.0,
            "condition": ">=",
            "is_active": True
        }, headers=headers)

        assert resp.status_code == 200
        alert_data = resp.json()
        assert alert_data["symbol"] == "BTCUSDT"
        assert alert_data["value"] == 68000.0
        assert alert_data["type"] == "price_above"
