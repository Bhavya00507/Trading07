import time
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.services.script_engine import script_engine_service, ScriptLexerParser, ScriptSandboxExecutionEngine

@pytest.mark.asyncio
async def test_script_compile_and_run_api():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Compile valid script
        comp_res = await ac.post("/api/scripts/compile", json={
            "code": "ema9 = ta.ema(close, 9)\nplot(ema9)",
            "language": "qscript"
        })
        assert comp_res.status_code == 200
        assert comp_res.json()["valid"] is True

        # 2. Run sandboxed script
        run_res = await ac.post("/api/scripts/run", json={
            "code": "ema9 = ta.ema(close, 9)",
            "script_type": "indicator"
        })
        assert run_res.status_code == 200
        assert run_res.json()["success"] is True

        # 3. Create & Install Script
        create_res = await ac.post("/api/scripts/create", json={
            "name": "Custom Test Script",
            "script_type": "indicator",
            "code": "plot(close)"
        })
        assert create_res.status_code == 200
        sid = create_res.json()["id"]

        inst_res = await ac.post("/api/scripts/install", json={"script_id": sid})
        assert inst_res.status_code == 200

        # 4. Marketplace & AI Generator
        mkt_res = await ac.get("/api/scripts/marketplace")
        assert mkt_res.status_code == 200

        ai_res = await ac.post("/api/scripts/ai-generate", json={
            "prompt": "Create RSI strategy"
        })
        assert ai_res.status_code == 200
        assert "generated_code" in ai_res.json()

def test_security_sandbox_protection():
    unsafe_codes = [
        "import os\nos.system('dir')",
        "import sys\nsys.exit(0)",
        "import subprocess\nsubprocess.call(['calc'])",
        "eval('__import__(\"os\").system(\"ls\")')",
        "import socket\ns = socket.socket()",
        "open('/etc/passwd', 'r')"
    ]

    for code in unsafe_codes:
        res = ScriptLexerParser.tokenize_and_validate(code)
        assert res["valid"] is False, f"Security Sandbox failed to block unsafe code: {code}"
        assert len(res["errors"]) > 0

def test_stress_compile_1000_scripts_execute_100_indicators():
    """Stress test: Compile 1,000 scripts and execute 100 indicators under 2.0s."""
    t0 = time.time()

    # 1. Compile 1,000 scripts
    for i in range(1000):
        code = f"rsi = ta.rsi(close, {10 + (i % 20)})\nplot(rsi)"
        val = script_engine_service.compile_script(code)
        assert val["valid"] is True

    # 2. Execute 100 indicators simultaneously
    prices = [100.0 + i * 0.5 for i in range(200)]
    for j in range(100):
        res = script_engine_service.execute_script("ema9 = ta.ema(close, 9)", prices=prices)
        assert res["success"] is True

    elapsed = time.time() - t0
    assert elapsed < 4.0, f"Script engine stress test took too long: {elapsed:.2f}s"
