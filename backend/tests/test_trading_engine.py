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
from app.models.order import OrderSide, OrderType, OrderStatus
from app.models.position import Position
from app.services.market_data import update_market_price
import uuid
from sqlalchemy import select, delete

@pytest.fixture(autouse=True)
async def clean_db():
    # Ensure tables exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        from app.models.user import User
        from app.models.account import Account
        from app.models.position import Position
        from app.models.order import Order
        from app.models.trade_history import TradeHistory
        await db.execute(delete(TradeHistory))
        await db.execute(delete(Position))
        await db.execute(delete(Order))
        await db.execute(delete(Account))
        await db.execute(delete(User))
        await db.commit()

async def register_and_login(ac: AsyncClient, username="testuser", email="test@example.com", password="testpassword"):
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
async def test_seed_and_sync_state():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        headers = await register_and_login(ac)
        
        resp = await ac.get("/sync-state", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["account"] is not None
        assert data["account"]["balance"] == 10000.0
        assert data["account"]["equity"] == 10000.0
        assert len(data["orders"]) == 0
        assert len(data["positions"]) == 0

@pytest.mark.anyio
async def test_order_risk_engine_insufficient_margin():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        headers = await register_and_login(ac)
        await update_market_price("BTCUSDT", 60000.0)
        
        # Try to buy 10 BTC (at $60,000 each = $600,000 value. 20x leverage = $30,000 margin required. Balance is only $10,000!)
        resp = await ac.post("/orders", json={
            "symbol": "BTCUSDT",
            "side": "buy",
            "type": "market",
            "quantity": 10.0
        }, headers=headers)
        assert resp.status_code == 400
        data = resp.json()
        assert data["detail"]["code"] == "INSUFFICIENT_MARGIN"

@pytest.mark.anyio
async def test_order_risk_engine_exposure_limit():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        headers = await register_and_login(ac)
        await update_market_price("BTCUSDT", 60000.0)
        
        # Try to buy 0.1 BTC (value = $6,000, margin = $300. Exposure = $6,000 / $10,000 equity = 60%, which is > 50% limit!)
        resp = await ac.post("/orders", json={
            "symbol": "BTCUSDT",
            "side": "buy",
            "type": "market",
            "quantity": 0.1
        }, headers=headers)
        assert resp.status_code == 400
        data = resp.json()
        assert data["detail"]["code"] == "EXPOSURE_LIMIT_EXCEEDED"

@pytest.mark.anyio
async def test_successful_order_execution_and_netting():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        headers = await register_and_login(ac)
        await update_market_price("BTCUSDT", 20000.0)
        
        # Buy 0.04 BTC (value = $800, margin = $40, exposure = 8% < 50%)
        resp = await ac.post("/orders", json={
            "symbol": "BTCUSDT",
            "side": "buy",
            "type": "market",
            "quantity": 0.04
        }, headers=headers)
        assert resp.status_code == 200
        order = resp.json()
        assert order["status"] == "filled"
        
        # Check sync state
        sync_resp = await ac.get("/sync-state", headers=headers)
        sync_data = sync_resp.json()
        assert len(sync_data["positions"]) == 1
        pos = sync_data["positions"][0]
        assert pos["symbol"] == "BTCUSDT"
        assert pos["quantity"] == 0.04
        assert pos["average_price"] == 20000.0
        
        # Sell 0.02 BTC (partial close)
        resp2 = await ac.post("/orders", json={
            "symbol": "BTCUSDT",
            "side": "sell",
            "type": "market",
            "quantity": 0.02,
            "is_reduce_only": True
        }, headers=headers)
        assert resp2.status_code == 200
        
        sync_resp = await ac.get("/sync-state", headers=headers)
        sync_data = sync_resp.json()
        assert len(sync_data["positions"]) == 1
        pos = sync_data["positions"][0]
        assert pos["quantity"] == 0.02


@pytest.mark.anyio
async def test_stop_limit_order_trigger():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        headers = await register_and_login(ac)
        await update_market_price("BTCUSDT", 20000.0)
        
        # Place a stop_limit BUY order
        # stop_price = 21000.0, limit price = 20500.0
        resp = await ac.post("/orders", json={
            "symbol": "BTCUSDT",
            "side": "buy",
            "type": "stop_limit",
            "quantity": 0.02,
            "price": 20500.0,
            "stop_price": 21000.0
        }, headers=headers)
        assert resp.status_code == 200
        order = resp.json()
        assert order["status"] == "pending"
        assert order["type"] == "stop_limit"
        assert order["stop_price"] == 21000.0
        
        # Update price to 20900 (does not trigger stop_price)
        await update_market_price("BTCUSDT", 20900.0)
        
        # Check order is still stop_limit pending
        orders_resp = await ac.get("/orders", headers=headers)
        orders = orders_resp.json()
        assert any(o["id"] == order["id"] and o["type"] == "stop_limit" and o["status"] == "pending" for o in orders)
        
        # Update price to 21100 (triggers stop_price -> converts to limit order)
        await update_market_price("BTCUSDT", 21100.0)
        
        # Check order converted to limit pending
        orders_resp = await ac.get("/orders", headers=headers)
        orders = orders_resp.json()
        assert any(o["id"] == order["id"] and o["type"] == "limit" and o["status"] == "pending" for o in orders)

        # Update price to 20400 (triggers limit execution)
        await update_market_price("BTCUSDT", 20400.0)
        
        # Check order filled and position opened
        orders_resp = await ac.get("/orders", headers=headers)
        orders_list = orders_resp.json()
        assert any(o["id"] == order["id"] and o["status"] == "filled" for o in orders_list)

        sync_resp = await ac.get("/sync-state", headers=headers)
        sync_data = sync_resp.json()
        assert len(sync_data["positions"]) == 1
        assert sync_data["positions"][0]["quantity"] == 0.02


@pytest.mark.anyio
async def test_trailing_stop_updates():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        headers = await register_and_login(ac)
        await update_market_price("BTCUSDT", 20000.0)
        
        # Buy 0.02 BTC
        resp = await ac.post("/orders", json={
            "symbol": "BTCUSDT",
            "side": "buy",
            "type": "market",
            "quantity": 0.02
        }, headers=headers)
        assert resp.status_code == 200
        
        # Set trailing stop distance = 500
        ts_resp = await ac.post("/positions/trailing-stop", json={
            "symbol": "BTCUSDT",
            "distance": 500.0
        }, headers=headers)
        assert ts_resp.status_code == 200
        pos = ts_resp.json()
        assert pos["trailing_stop"] == 500.0
        # Stop loss should be initialized to 20000 - 500 = 19500
        assert pos["stop_loss"] == 19500.0
        
        # Price goes up to 21000. Stop loss should trail to 21000 - 500 = 20500
        await update_market_price("BTCUSDT", 21000.0)
        
        sync_resp = await ac.get("/sync-state", headers=headers)
        sync_data = sync_resp.json()
        pos = sync_data["positions"][0]
        assert pos["stop_loss"] == 20500.0
        
        # Price drops to 20600. Stop loss should NOT change
        await update_market_price("BTCUSDT", 20600.0)
        
        sync_resp2 = await ac.get("/sync-state", headers=headers)
        pos2 = sync_resp2.json()["positions"][0]
        assert pos2["stop_loss"] == 20500.0
        
        # Price drops to 20400 (below 20500 stop loss). Position should close.
        await update_market_price("BTCUSDT", 20400.0)
        
        sync_resp3 = await ac.get("/sync-state", headers=headers)
        assert len(sync_resp3.json()["positions"]) == 0


@pytest.mark.anyio
async def test_stop_out_liquidation():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        headers = await register_and_login(ac)
        await update_market_price("BTCUSDT", 20000.0)
        
        # Buy 0.01 BTC
        resp = await ac.post("/orders", json={
            "symbol": "BTCUSDT",
            "side": "buy",
            "type": "market",
            "quantity": 0.01
        }, headers=headers)
        assert resp.status_code == 200
        
        # Manipulate account balance directly to trigger stop out on price drop
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Account).where(Account.account_type == "live"))
            account = result.scalars().first()
            assert account is not None
            account.balance = 105.0
            account.equity = 105.0
            account.free_margin = 105.0 - float(account.margin_used)
            await db.commit()
            
        # Verify initial state post-manipulation
        sync_resp = await ac.get("/sync-state", headers=headers)
        sync_data = sync_resp.json()
        assert sync_data["account"]["balance"] == 105.0
        
        # Price drops to 9000. Unrealized loss = -100, Equity = 5, Margin = 4.5.
        # Margin level = 5 / 4.5 = 111% (still above 50%)
        # Let's drop to 8000. Unrealized loss = -120. Equity = -15.
        # Margin level = -15 / 4.0 = -375% (< 50% stop out) -> should trigger liquidation.
        await update_market_price("BTCUSDT", 8000.0)
        
        # Check position is liquidated
        sync_resp = await ac.get("/sync-state", headers=headers)
        sync_data = sync_resp.json()
        assert len(sync_data["positions"]) == 0
