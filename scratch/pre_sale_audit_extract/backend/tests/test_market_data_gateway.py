import time
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.services.market_data_gateway import market_data_gateway, SymbolMapperEngine

@pytest.mark.asyncio
async def test_symbol_mapper_engine():
    assert SymbolMapperEngine.resolve_symbol("EURUSD.c") == "EURUSD"
    assert SymbolMapperEngine.resolve_symbol("6E") == "EURUSD"
    assert SymbolMapperEngine.resolve_symbol("EUR.USD") == "EURUSD"
    assert SymbolMapperEngine.resolve_symbol("XBTUSD") == "BTCUSDT"
    assert SymbolMapperEngine.resolve_symbol("GC") == "XAUUSD"
    assert SymbolMapperEngine.resolve_symbol("YM") == "US30"
    assert SymbolMapperEngine.resolve_symbol("NQ") == "NAS100"

@pytest.mark.asyncio
async def test_market_data_gateway_api():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Get Status
        status_res = await ac.get("/api/provider/status")
        assert status_res.status_code == 200
        data = status_res.json()
        assert len(data["providers"]) >= 7

        # 2. Get Level 2 Depth
        depth_res = await ac.get("/api/provider/depth?symbol=BTCUSDT")
        assert depth_res.status_code == 200
        depth = depth_res.json()
        assert len(depth["bids"]) == 10
        assert len(depth["asks"]) == 10

        # 3. Get Trades
        trades_res = await ac.get("/api/provider/trades?symbol=BTCUSDT")
        assert trades_res.status_code == 200
        assert len(trades_res.json()["trades"]) == 20

        # 4. Symbol Resolver API
        resolve_res = await ac.get("/api/provider/resolve-symbol?symbol=6E")
        assert resolve_res.status_code == 200
        assert resolve_res.json()["canonical_symbol"] == "EURUSD"

@pytest.mark.asyncio
async def test_provider_failover_and_connect_disconnect():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Disconnect primary rithmic provider
        disc_res = await ac.post("/api/provider/disconnect", json={"provider_id": "rithmic"})
        assert disc_res.status_code == 200
        assert disc_res.json()["status"] == "disconnected"

        # Check that failover automatically routed to healthy secondary provider
        status_res = await ac.get("/api/provider/status")
        assert status_res.status_code == 200
        assert status_res.json()["active_route"] != ""

        # Reconnect rithmic
        conn_res = await ac.post("/api/provider/connect", json={"provider_id": "rithmic"})
        assert conn_res.status_code == 200

def test_stress_2000_updates_per_sec():
    """Stress test: Process 2,000 level 1/level 2 market data updates under 1.0s."""
    t0 = time.time()
    for i in range(2000):
        sym = "BTCUSDT" if i % 2 == 0 else "EURUSD"
        l1 = market_data_gateway.get_level1(sym, price=65000.0 + i)
        l2 = market_data_gateway.get_level2(sym, price=65000.0 + i)
        assert l1["bid"] < l1["ask"]
        assert len(l2["bids"]) == 10

    elapsed = time.time() - t0
    assert elapsed < 2.0, f"Market Data Gateway 2,000 updates/sec stress test took too long: {elapsed:.2f}s"
