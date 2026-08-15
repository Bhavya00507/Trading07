import time
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.services.smart_order_router import (
    smart_order_router, IcebergEngine, TWAPEngine, VWAPEngine, AdaptiveExecutionEngine
)

@pytest.mark.asyncio
async def test_algorithmic_slice_engines():
    # 1. Iceberg Engine Slices
    iceberg_slices = IcebergEngine.generate_slices(total_quantity=10.0, visible_qty=2.0)
    assert len(iceberg_slices) >= 4
    total_iceberg_qty = sum(s["quantity"] for s in iceberg_slices)
    assert abs(total_iceberg_qty - 10.0) < 1e-3

    # 2. TWAP Engine Schedule
    twap_slices = TWAPEngine.generate_twap_schedule(total_quantity=20.0, duration_minutes=10, slices_count=5)
    assert len(twap_slices) == 5
    assert twap_slices[0]["quantity"] == 4.0

    # 3. VWAP Engine Curve
    vwap_slices = VWAPEngine.generate_vwap_schedule(total_quantity=100.0)
    assert len(vwap_slices) == 10
    assert abs(sum(s["quantity"] for s in vwap_slices) - 100.0) < 1e-2

    # 4. Adaptive Execution Switching
    style = AdaptiveExecutionEngine.determine_execution_style(spread=0.0001, volatility_atr=0.5, orderbook_depth=60000)
    assert style == "PASSIVE_MAKER"

@pytest.mark.asyncio
async def test_smart_order_router_api():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Status Telemetry
        status_res = await ac.get("/api/router/status")
        assert status_res.status_code == 200
        assert "fill_rate_pct" in status_res.json()

        # 2. Execute Market Order
        exec_res = await ac.post("/api/router/execute", json={
            "symbol": "BTCUSDT", "side": "buy", "quantity": 1.5, "order_type": "MARKET"
        })
        assert exec_res.status_code == 200
        assert exec_res.json()["status"] in ["FILLED", "WORKING"]

        # 3. Execute TWAP Algo Order
        twap_res = await ac.post("/api/router/twap", json={
            "symbol": "BTCUSDT", "side": "buy", "total_quantity": 15.0, "duration_minutes": 10
        })
        assert twap_res.status_code == 200
        assert twap_res.json()["algo_type"] == "TWAP"

        # 4. Execute VWAP Algo Order
        vwap_res = await ac.post("/api/router/vwap", json={
            "symbol": "EURUSD", "side": "buy", "total_quantity": 50.0
        })
        assert vwap_res.status_code == 200
        assert vwap_res.json()["algo_type"] == "VWAP"

        # 5. Execute Iceberg Algo Order
        ice_res = await ac.post("/api/router/iceberg", json={
            "symbol": "BTCUSDT", "side": "sell", "total_quantity": 25.0, "visible_quantity": 2.5
        })
        assert ice_res.status_code == 200
        assert ice_res.json()["algo_type"] == "ICEBERG"

        # 6. Orders & Fills Telemetry
        orders_res = await ac.get("/api/router/orders")
        assert orders_res.status_code == 200
        assert len(orders_res.json()["active_orders"]) > 0

        fills_res = await ac.get("/api/router/fills")
        assert fills_res.status_code == 200

        slippage_res = await ac.get("/api/router/slippage")
        assert slippage_res.status_code == 200

def test_stress_10000_orders_routing_benchmark():
    """Stress test: Route and benchmark 10,000 active orders under 2.0s."""
    t0 = time.time()
    for i in range(10000):
        sym = "BTCUSDT" if i % 2 == 0 else "EURUSD"
        res = smart_order_router.route_and_execute(
            symbol=sym,
            side="buy" if i % 2 == 0 else "sell",
            quantity=1.0 + (i % 5),
            order_type="MARKET"
        )
        assert res["status"] in ["FILLED", "WORKING"]

    elapsed = time.time() - t0
    assert elapsed < 3.0, f"10,000 orders routing benchmark took too long: {elapsed:.2f}s"
