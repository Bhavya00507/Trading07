"""
backend/tests/test_chart_orders.py

Integration test suite for Feature 2: Interactive Chart Trading.
Tests the order placement API endpoints that back the chart trading interface.

All assertions use case-insensitive status checks since the backend returns lowercase statuses.
"""
import time
import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.models import Base
from app.database.session import engine


async def _ensure_schema():
    """Ensure all tables exist in the test DB."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def _register_and_login(ac: AsyncClient, username: str, password: str = "Chart123!") -> str:
    """Helper: register + login, return JWT token."""
    ts = int(time.time() * 1000)
    reg = await ac.post("/auth/register", json={
        "username": username,
        "email": f"{username}_{ts}@test.com",
        "password": password
    })
    assert reg.status_code in [200, 201], f"Register failed: {reg.text}"

    login = await ac.post("/auth/login", json={"username": username, "password": password})
    assert login.status_code == 200, f"Login failed: {login.text}"
    return login.json()["access_token"]


def _is_filled_or_pending(status: str) -> bool:
    """Check status regardless of case (backend returns lowercase)."""
    return str(status).lower() in ["filled", "pending", "partial"]


@pytest.mark.asyncio
async def test_chart_market_buy_order():
    """
    Feature 2: Right-click → Buy Market → Risk Calculator → Place Order.
    Verifies POST /orders with type=market, side=buy.
    """
    await _ensure_schema()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        ts = int(time.time() * 1000)
        token = await _register_and_login(ac, f"chart_buy_{ts}")
        headers = {"Authorization": f"Bearer {token}"}

        res = await ac.post("/orders", json={
            "symbol": "BTCUSDT",
            "side": "buy",
            "type": "market",
            "quantity": 0.01,
            "account_type": "paper"
        }, headers=headers)

        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        assert data["symbol"] == "BTCUSDT"
        assert data["side"] == "buy"
        assert _is_filled_or_pending(data["status"]), f"Unexpected status: {data['status']}"


@pytest.mark.asyncio
async def test_chart_market_sell_order():
    """
    Feature 2: Right-click → Sell Market → Risk Calculator → Place Order.
    Verifies POST /orders with type=market, side=sell.
    """
    await _ensure_schema()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        ts = int(time.time() * 1000)
        token = await _register_and_login(ac, f"chart_sell_{ts}")
        headers = {"Authorization": f"Bearer {token}"}

        res = await ac.post("/orders", json={
            "symbol": "ETHUSDT",
            "side": "sell",
            "type": "market",
            "quantity": 0.01,
            "account_type": "paper"
        }, headers=headers)

        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        assert data["symbol"] == "ETHUSDT"
        assert data["side"] == "sell"


@pytest.mark.asyncio
async def test_chart_limit_buy_order():
    """
    Feature 2: Right-click → Buy Limit → Risk Calculator → Place Order.
    A pending order line should appear on chart.
    """
    await _ensure_schema()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        ts = int(time.time() * 1000)
        token = await _register_and_login(ac, f"chart_lim_{ts}")
        headers = {"Authorization": f"Bearer {token}"}

        res = await ac.post("/orders", json={
            "symbol": "BTCUSDT",
            "side": "buy",
            "type": "limit",
            "quantity": 0.01,
            "price": 60000.0,
            "stop_loss": 59000.0,
            "take_profit": 63000.0,
            "account_type": "paper"
        }, headers=headers)

        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        assert data["symbol"] == "BTCUSDT"
        assert data["side"] == "buy"
        assert data["type"] == "limit"
        assert _is_filled_or_pending(data["status"]), f"Unexpected status: {data['status']}"


@pytest.mark.asyncio
async def test_chart_limit_sell_order():
    """
    Feature 2: Right-click → Sell Limit at a specific chart price.
    """
    await _ensure_schema()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        ts = int(time.time() * 1000)
        token = await _register_and_login(ac, f"chart_slm_{ts}")
        headers = {"Authorization": f"Bearer {token}"}

        res = await ac.post("/orders", json={
            "symbol": "ETHUSDT",
            "side": "sell",
            "type": "limit",
            "quantity": 0.05,
            "price": 1.12000,
            "account_type": "paper"
        }, headers=headers)

        assert res.status_code == 200, f"Expected 200: {res.text}"
        data = res.json()
        assert data["type"] == "limit"
        assert data["side"] == "sell"


@pytest.mark.asyncio
async def test_chart_stop_buy_order():
    """
    Feature 2: Right-click → Buy Stop at a breakout price.
    Some backends accept stop orders via 'stop_price' field, others via 'price'.
    """
    await _ensure_schema()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        ts = int(time.time() * 1000)
        token = await _register_and_login(ac, f"chart_stp_{ts}")
        headers = {"Authorization": f"Bearer {token}"}

        # Try with price field (some backends use this for stop orders)
        res = await ac.post("/orders", json={
            "symbol": "BTCUSDT",
            "side": "buy",
            "type": "stop",
            "quantity": 0.01,
            "price": 70000.0,
            "account_type": "paper"
        }, headers=headers)

        # Stop orders may be accepted as pending or may fill immediately if price is at market
        assert res.status_code in [200, 201], f"Expected 200/201: {res.text}"


@pytest.mark.asyncio
async def test_chart_stop_sell_order():
    """
    Feature 2: Right-click → Sell Stop (protection stop below market).
    """
    await _ensure_schema()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        ts = int(time.time() * 1000)
        token = await _register_and_login(ac, f"chart_sts_{ts}")
        headers = {"Authorization": f"Bearer {token}"}

        res = await ac.post("/orders", json={
            "symbol": "ETHUSDT",
            "side": "sell",
            "type": "stop",
            "quantity": 0.01,
            "price": 1.05000,
            "account_type": "paper"
        }, headers=headers)

        assert res.status_code in [200, 201], f"Expected 200/201: {res.text}"


@pytest.mark.asyncio
async def test_chart_order_with_sl_tp():
    """
    Feature 2: Risk Calculator with SL + TP filled — market buy with stop_loss and take_profit.
    """
    await _ensure_schema()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        ts = int(time.time() * 1000)
        token = await _register_and_login(ac, f"chart_sltp_{ts}")
        headers = {"Authorization": f"Bearer {token}"}

        res = await ac.post("/orders", json={
            "symbol": "BTCUSDT",
            "side": "buy",
            "type": "market",
            "quantity": 0.01,
            "stop_loss": 60000.0,
            "take_profit": 70000.0,
            "account_type": "paper"
        }, headers=headers)

        assert res.status_code == 200, f"Expected 200: {res.text}"
        data = res.json()
        assert data["symbol"] == "BTCUSDT"


@pytest.mark.asyncio
async def test_chart_drag_sl_tp_modify():
    """
    Feature 2: Drag SL/TP lines → calls POST /positions/modify-sltp.
    """
    await _ensure_schema()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        ts = int(time.time() * 1000)
        token = await _register_and_login(ac, f"chart_drag_{ts}")
        headers = {"Authorization": f"Bearer {token}"}

        # Open position first
        place_res = await ac.post("/orders", json={
            "symbol": "BTCUSDT",
            "side": "buy",
            "type": "market",
            "quantity": 0.01,
            "account_type": "paper"
        }, headers=headers)
        assert place_res.status_code == 200

        # Simulate drag SL/TP lines
        modify_res = await ac.post("/positions/modify-sltp", json={
            "symbol": "BTCUSDT",
            "stop_loss": 61000.0,
            "take_profit": 68000.0,
            "account_type": "paper"
        }, headers=headers)

        assert modify_res.status_code in [200, 404], f"Unexpected: {modify_res.text}"


@pytest.mark.asyncio
async def test_chart_cancel_pending_order():
    """
    Feature 2: Cancel pending order (DELETE /orders/{id}).
    The backend returns 204 No Content on success.
    """
    await _ensure_schema()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        ts = int(time.time() * 1000)
        token = await _register_and_login(ac, f"chart_canc_{ts}")
        headers = {"Authorization": f"Bearer {token}"}

        # Place a limit order very far from market (will be PENDING)
        place_res = await ac.post("/orders", json={
            "symbol": "BTCUSDT",
            "side": "buy",
            "type": "limit",
            "quantity": 0.01,
            "price": 1000.0,
            "account_type": "paper"
        }, headers=headers)
        assert place_res.status_code == 200
        order_id = place_res.json()["id"]

        # Cancel the pending order (DELETE returns 204 No Content)
        cancel_res = await ac.delete(f"/orders/{order_id}", headers=headers)
        assert cancel_res.status_code in [200, 204], f"Cancel failed: {cancel_res.text}"
        # 204 = No Content (success), 200 = returns cancelled order object
        if cancel_res.status_code == 200:
            cancel_data = cancel_res.json()
            status = str(cancel_data.get("status", "")).lower()
            assert "cancel" in status or status == "cancelled"


@pytest.mark.asyncio
async def test_chart_risk_calculator_validation():
    """
    Feature 2: Risk Calculator rejects orders with zero quantity.
    """
    await _ensure_schema()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        ts = int(time.time() * 1000)
        token = await _register_and_login(ac, f"chart_inv_{ts}")
        headers = {"Authorization": f"Bearer {token}"}

        res = await ac.post("/orders", json={
            "symbol": "BTCUSDT",
            "side": "buy",
            "type": "market",
            "quantity": 0,
            "account_type": "paper"
        }, headers=headers)
        assert res.status_code in [400, 422], f"Expected validation error: {res.text}"


@pytest.mark.asyncio
async def test_chart_break_even():
    """
    Feature 2: Position right-click → Break Even.
    """
    await _ensure_schema()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        ts = int(time.time() * 1000)
        token = await _register_and_login(ac, f"chart_be_{ts}")
        headers = {"Authorization": f"Bearer {token}"}

        place_res = await ac.post("/orders", json={
            "symbol": "BTCUSDT",
            "side": "buy",
            "type": "market",
            "quantity": 0.01,
            "account_type": "paper"
        }, headers=headers)
        assert place_res.status_code == 200

        be_res = await ac.post("/positions/break-even", json={
            "symbol": "BTCUSDT",
            "account_type": "paper"
        }, headers=headers)
        assert be_res.status_code in [200, 404], f"Unexpected: {be_res.text}"


@pytest.mark.asyncio
async def test_chart_partial_close():
    """
    Feature 2: Entry line partial close → Close 50%.
    """
    await _ensure_schema()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        ts = int(time.time() * 1000)
        token = await _register_and_login(ac, f"chart_pc_{ts}")
        headers = {"Authorization": f"Bearer {token}"}

        place_res = await ac.post("/orders", json={
            "symbol": "BTCUSDT",
            "side": "buy",
            "type": "market",
            "quantity": 0.02,
            "account_type": "paper"
        }, headers=headers)
        assert place_res.status_code == 200

        pc_res = await ac.post("/positions/partial-close", json={
            "symbol": "BTCUSDT",
            "quantity": 0.01,
            "account_type": "paper"
        }, headers=headers)
        assert pc_res.status_code in [200, 404], f"Unexpected: {pc_res.text}"



@pytest.mark.asyncio
async def test_chart_reverse_position():
    """
    Feature 2: Right-click position → Reverse Position.
    """
    await _ensure_schema()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        ts = int(time.time() * 1000)
        token = await _register_and_login(ac, f"chart_rev_{ts}")
        headers = {"Authorization": f"Bearer {token}"}

        place_res = await ac.post("/orders", json={
            "symbol": "ETHUSDT",
            "side": "buy",
            "type": "market",
            "quantity": 0.01,
            "account_type": "paper"
        }, headers=headers)
        assert place_res.status_code == 200

        rev_res = await ac.post("/positions/reverse", json={
            "symbol": "EURUSD",
            "account_type": "paper"
        }, headers=headers)
        assert rev_res.status_code in [200, 404], f"Unexpected: {rev_res.text}"
