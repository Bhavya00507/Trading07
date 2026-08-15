from fastapi import APIRouter, Query, HTTPException, Depends
from typing import List, Dict, Any, Optional

from app.services.market_data import _candle_history, _latest_prices
from app.services.orderflow.delta_service import calculate_delta, calculate_cumulative_delta
from app.services.orderflow.footprint_service import generate_footprint
from app.services.orderflow.volume_profile_service import calculate_volume_profile
from app.services.orderflow.imbalance_service import detect_imbalances, ImbalanceConfig
from app.services.orderflow.absorption_service import detect_absorption
from app.services.orderflow.iceberg_service import detect_icebergs
from app.services.orderflow.heatmap_service import generate_dom_heatmap
from app.services.orderflow.session_profile_service import calculate_session_profiles

router = APIRouter(prefix="/api/orderflow", tags=["orderflow"])


def _get_candles_for_symbol(symbol: str, timeframe: str = "1m", limit: int = 100) -> List[Dict[str, Any]]:
    """Helper to fetch or generate candles for a symbol."""
    sym = symbol.upper()
    candles = _candle_history.get(sym, [])

    if not candles:
        # Fallback generator if symbol not yet in history cache
        import time
        now = time.time()
        base_price = _latest_prices.get(sym, 100.0)
        curr = base_price
        
        simulated: List[Dict[str, Any]] = []
        for i in range(limit, 0, -1):
            ts = int((now - i * 60) * 1000)
            change = (hash(f"{sym}_{i}") % 100 - 48) * (base_price * 0.0005)
            open_p = curr
            close_p = curr + change
            high_p = max(open_p, close_p) + abs(change) * 0.5
            low_p = min(open_p, close_p) - abs(change) * 0.5
            vol = max(10.0, 500.0 + (hash(f"vol_{i}") % 800))
            
            simulated.append({
                "timestamp": ts,
                "time": int(ts // 1000),
                "open": round(open_p, 4),
                "high": round(high_p, 4),
                "low": round(low_p, 4),
                "close": round(close_p, 4),
                "volume": round(vol, 2),
                "bid_volume": round(vol * 0.48, 2),
                "ask_volume": round(vol * 0.52, 2)
            })
            curr = close_p
        return simulated

    return candles[-limit:]


@router.get("/footprint")
async def get_footprint_data(
    symbol: str = Query("BTCUSDT"),
    timeframe: str = Query("1m"),
    limit: int = Query(50, ge=1, le=500),
    tick_size: float = Query(0.5, gt=0),
    imbalance_ratio: float = Query(3.0, ge=1.5, le=10.0)
):
    """Get Footprint Chart data with bid/ask price ladders, POC, and order flow imbalances."""
    candles = _get_candles_for_symbol(symbol, timeframe, limit)
    footprint = generate_footprint(
        candles=candles,
        tick_size=tick_size,
        imbalance_ratio_threshold=imbalance_ratio
    )
    return {
        "symbol": symbol,
        "timeframe": timeframe,
        "count": len(footprint),
        "footprint_candles": footprint
    }


@router.get("/volume-profile")
async def get_volume_profile_data(
    symbol: str = Query("BTCUSDT"),
    timeframe: str = Query("1m"),
    limit: int = Query(100, ge=1, le=1000),
    tick_size: float = Query(0.5, gt=0),
    profile_type: str = Query("visible_range"),  # 'visible_range', 'fixed_range', 'session'
    session_type: str = Query("daily")           # 'daily', 'weekly', 'monthly'
):
    """Get Volume Profile calculations (POC, VAH, VAL, HVN, LVN, Developing POC)."""
    candles = _get_candles_for_symbol(symbol, timeframe, limit)

    if profile_type == "session":
        session_profiles = calculate_session_profiles(candles, session_type=session_type, tick_size=tick_size)
        return {
            "symbol": symbol,
            "profile_type": profile_type,
            "session_type": session_type,
            "sessions": session_profiles
        }

    vp = calculate_volume_profile(candles, tick_size=tick_size)
    return {
        "symbol": symbol,
        "profile_type": profile_type,
        "volume_profile": vp
    }


@router.get("/delta")
async def get_cumulative_delta_data(
    symbol: str = Query("BTCUSDT"),
    timeframe: str = Query("1m"),
    limit: int = Query(100, ge=1, le=1000),
    mode: str = Query("session")  # 'session', 'daily', 'weekly', 'monthly', 'continuous'
):
    """Get Cumulative Volume Delta (CVD) series data."""
    candles = _get_candles_for_symbol(symbol, timeframe, limit)
    cvd_series = calculate_cumulative_delta(candles, mode=mode)
    return {
        "symbol": symbol,
        "mode": mode,
        "count": len(cvd_series),
        "cvd_series": cvd_series
    }


@router.get("/heatmap")
async def get_dom_heatmap_data(
    symbol: str = Query("BTCUSDT"),
    depth_levels: int = Query(40, ge=10, le=100),
    time_snapshots: int = Query(50, ge=10, le=200),
    tick_size: float = Query(0.5, gt=0)
):
    """Get DOM Heatmap depth intensity matrix and spoofing alerts."""
    current_p = _latest_prices.get(symbol.upper(), 65000.0)
    heatmap = generate_dom_heatmap(
        current_price=current_p,
        depth_levels=depth_levels,
        time_snapshots=time_snapshots,
        tick_size=tick_size
    )
    return {
        "symbol": symbol,
        "heatmap": heatmap
    }


@router.get("/analytics")
async def get_complete_orderflow_analytics(
    symbol: str = Query("BTCUSDT"),
    timeframe: str = Query("1m"),
    limit: int = Query(50, ge=1, le=200),
    tick_size: float = Query(0.5, gt=0),
    imbalance_ratio: float = Query(3.0, ge=1.5, le=10.0)
):
    """Complete institutional Order Flow payload including Footprint, Volume Profile, CVD, Imbalances, Absorptions, Icebergs, and Heatmap."""
    candles = _get_candles_for_symbol(symbol, timeframe, limit)
    current_p = _latest_prices.get(symbol.upper(), 65000.0)

    footprint = generate_footprint(candles, tick_size=tick_size, imbalance_ratio_threshold=imbalance_ratio)
    vp = calculate_volume_profile(candles, tick_size=tick_size)
    cvd = calculate_cumulative_delta(candles, mode="session")
    imbalances = detect_imbalances(footprint, config=ImbalanceConfig(ratio_threshold=imbalance_ratio))
    absorptions = detect_absorption(footprint)
    icebergs = detect_icebergs(footprint)
    heatmap = generate_dom_heatmap(current_price=current_p, depth_levels=30, time_snapshots=30, tick_size=tick_size)

    return {
        "symbol": symbol,
        "timeframe": timeframe,
        "current_price": current_p,
        "footprint": footprint,
        "volume_profile": vp,
        "cumulative_delta": cvd,
        "imbalances": imbalances,
        "absorptions": absorptions,
        "icebergs": icebergs,
        "heatmap": heatmap
    }


@router.get("/dom")
async def get_dom_ladder(
    symbol: str = Query("BTCUSDT"),
    depth_levels: int = Query(50, ge=5, le=200),
    tick_size: float = Query(0.5, gt=0),
    imbalance_ratio: float = Query(3.0, ge=1.5, le=10.0)
):
    """Get real-time institutional Depth of Market (DOM) ladder data."""
    from app.services.orderflow.dom_service import get_dom_ladder_data
    current_p = _latest_prices.get(symbol.upper(), 65000.0)
    return get_dom_ladder_data(
        symbol=symbol,
        current_price=current_p,
        depth_levels=depth_levels,
        tick_size=tick_size,
        imbalance_threshold=imbalance_ratio
    )
