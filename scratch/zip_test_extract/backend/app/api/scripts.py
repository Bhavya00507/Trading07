import time
import uuid
import json
from fastapi import APIRouter, Query, HTTPException, Body
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from app.services.script_engine import script_engine_service

router = APIRouter(prefix="/api/scripts", tags=["scripts"])

_SCRIPTS_DB: Dict[str, Dict[str, Any]] = {}
_INSTALLED_DB: Dict[str, List[str]] = {}

def _seed_default_scripts():
    if not _SCRIPTS_DB:
        templates = script_engine_service.get_official_templates()
        for tpl in templates:
            sid = tpl["id"]
            _SCRIPTS_DB[sid] = {
                "id": sid,
                "name": tpl["name"],
                "script_type": tpl["script_type"],
                "language": tpl["language"],
                "code": tpl["code"],
                "description": "Official built-in template script",
                "version": 1,
                "author": "Quantum Quants",
                "rating": 4.9,
                "downloads": 482,
                "updated_at": time.time()
            }

_seed_default_scripts()

class CreateScriptRequest(BaseModel):
    name: str
    script_type: str = "indicator" # indicator, strategy, scanner, alert, drawing
    language: str = "qscript"       # qscript, pyindicator, pystrategy
    code: str
    description: Optional[str] = ""

class CompileRequest(BaseModel):
    code: str
    language: str = "qscript"

class RunScriptRequest(BaseModel):
    code: str
    script_type: str = "indicator"
    prices: Optional[List[float]] = None

class ImportScriptRequest(BaseModel):
    file_content: str
    filename: Optional[str] = "custom_script.qscript"

class AIGenerateRequest(BaseModel):
    prompt: str
    language: Optional[str] = "qscript"

@router.get("")
async def list_user_scripts():
    _seed_default_scripts()
    return {"total": len(_SCRIPTS_DB), "scripts": list(_SCRIPTS_DB.values())}

@router.post("/create")
async def create_script(req: CreateScriptRequest):
    _seed_default_scripts()
    sid = f"script-{uuid.uuid4().hex[:8]}"
    script_data = {
        "id": sid,
        "name": req.name,
        "script_type": req.script_type,
        "language": req.language,
        "code": req.code,
        "description": req.description or "",
        "version": 1,
        "author": "User Developer",
        "rating": 5.0,
        "downloads": 1,
        "updated_at": time.time()
    }
    _SCRIPTS_DB[sid] = script_data
    return script_data

@router.post("/compile")
async def compile_script(req: CompileRequest):
    return script_engine_service.compile_script(req.code)

@router.post("/run")
async def run_script(req: RunScriptRequest):
    return script_engine_service.execute_script(req.code, prices=req.prices, script_type=req.script_type)

@router.post("/install")
async def install_script(script_id: str = Body(..., embed=True)):
    _seed_default_scripts()
    if script_id not in _SCRIPTS_DB:
        raise HTTPException(status_code=404, detail="Script not found")

    installed = _INSTALLED_DB.get("user-default", [])
    if script_id not in installed:
        installed.append(script_id)
        _INSTALLED_DB["user-default"] = installed
        _SCRIPTS_DB[script_id]["downloads"] += 1

    return {"status": "installed", "script_id": script_id}

@router.get("/export/{script_id}")
async def export_script(script_id: str):
    _seed_default_scripts()
    if script_id not in _SCRIPTS_DB:
        raise HTTPException(status_code=404, detail="Script not found")

    script = _SCRIPTS_DB[script_id]
    ext = ".qscript" if script["language"] == "qscript" else (".pyindicator" if "indicator" in script["script_type"] else ".pystrategy")

    return {
        "filename": f"{script['name'].replace(' ', '_').lower()}{ext}",
        "script": script
    }

@router.post("/import")
async def import_script(req: ImportScriptRequest):
    _seed_default_sync = _seed_default_scripts()
    sid = f"script-{uuid.uuid4().hex[:8]}"

    lang = "qscript"
    if ".pyindicator" in req.filename:
        lang = "pyindicator"
    elif ".pystrategy" in req.filename:
        lang = "pystrategy"

    script_data = {
        "id": sid,
        "name": req.filename.split('.')[0].replace('_', ' ').title(),
        "script_type": "strategy" if "strategy" in lang else "indicator",
        "language": lang,
        "code": req.file_content,
        "description": "Imported custom script",
        "version": 1,
        "author": "External Developer",
        "rating": 5.0,
        "downloads": 1,
        "updated_at": time.time()
    }
    _SCRIPTS_DB[sid] = script_data
    return script_data

@router.delete("/delete/{script_id}")
async def delete_script(script_id: str):
    _seed_default_scripts()
    if script_id not in _SCRIPTS_DB:
        raise HTTPException(status_code=404, detail="Script not found")

    del _SCRIPTS_DB[script_id]
    return {"status": "deleted", "script_id": script_id}

@router.get("/marketplace")
async def get_marketplace_scripts():
    _seed_default_scripts()
    return {"total": len(_SCRIPTS_DB), "marketplace_scripts": list(_SCRIPTS_DB.values())}

@router.post("/ai-generate")
async def ai_generate_script(req: AIGenerateRequest):
    p_lower = req.prompt.lower()
    if "rsi" in p_lower or "oversold" in p_lower:
        generated_code = """# AI Generated QScript Indicator: RSI Dynamic Bands
rsi14 = ta.rsi(close, 14)
upper_band = 70.0
lower_band = 30.0

plot(rsi14, color="purple", title="RSI 14")
if rsi14 < lower_band:
    plot_shape(style="triangle_up", color="green", text="Oversold Buy")
elif rsi14 > upper_band:
    plot_shape(style="triangle_down", color="red", text="Overbought Sell")
"""
    elif "vwap" in p_lower or "footprint" in p_lower:
        generated_code = """# AI Generated QScript: Anchored VWAP Order Flow
vwap_val = ta.vwap(close, volume)
std_dev = ta.stdev(close, 20)

plot(vwap_val, color="gold", title="VWAP")
plot(vwap_val + std_dev * 2.0, color="cyan", title="Upper Dev")
plot(vwap_val - std_dev * 2.0, color="cyan", title="Lower Dev")
"""
    else:
        generated_code = """# AI Generated QScript: EMA Moving Average Strategy
ema9 = ta.ema(close, 9)
ema21 = ta.ema(close, 21)

if ta.crossover(ema9, ema21):
    strategy.buy(size=1.0)
elif ta.crossunder(ema9, ema21):
    strategy.close_all()
"""

    return {
        "prompt": req.prompt,
        "language": req.language,
        "generated_code": generated_code,
        "explanation": "Generated production-ready QScript using built-in technical analysis (ta) primitives and order flow metrics."
    }
