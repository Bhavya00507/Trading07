from typing import List, Dict, Any, Optional
import datetime


def calculate_delta(bid_volume: float, ask_volume: float) -> Dict[str, Any]:
    """Calculate Delta for a single candle or price level.
    
    Delta = Ask Volume - Bid Volume
    """
    total_vol = bid_volume + ask_volume
    delta = ask_volume - bid_volume
    
    if delta > 0:
        color_state = "positive"  # Green
    elif delta < 0:
        color_state = "negative"  # Red
    else:
        color_state = "neutral"   # Gray

    delta_pct = (delta / total_vol * 100.0) if total_vol > 0 else 0.0

    return {
        "bid_volume": round(bid_volume, 4),
        "ask_volume": round(ask_volume, 4),
        "total_volume": round(total_vol, 4),
        "delta": round(delta, 4),
        "delta_percentage": round(delta_pct, 2),
        "color_state": color_state
    }


def calculate_cumulative_delta(
    candles: List[Dict[str, Any]],
    mode: str = "session"
) -> List[Dict[str, Any]]:
    """Calculate Cumulative Volume Delta (CVD) series across a sequence of candles.
    
    Modes:
    - 'session': Resets CVD at session boundary (00:00 UTC or session open)
    - 'daily': Resets CVD daily
    - 'weekly': Resets CVD weekly
    - 'monthly': Resets CVD monthly
    - 'continuous': Running cumulative delta without reset
    """
    results = []
    running_cvd = 0.0
    session_delta = 0.0
    daily_delta = 0.0

    current_day = None
    current_week = None
    current_month = None

    for c in candles:
        ts = c.get("timestamp", 0)
        dt = datetime.datetime.fromtimestamp(ts / 1000.0, tz=datetime.timezone.utc)
        
        bid_vol = c.get("bid_volume", c.get("volume", 0.0) * 0.48)
        ask_vol = c.get("ask_volume", c.get("volume", 0.0) * 0.52)
        candle_delta = ask_vol - bid_vol
        total_vol = bid_vol + ask_vol

        day_key = dt.strftime("%Y-%m-%d")
        week_key = f"{dt.year}-W{dt.isocalendar()[1]}"
        month_key = dt.strftime("%Y-%m")

        # Handle resets based on mode
        if mode == "daily" and current_day != day_key:
            running_cvd = 0.0
            current_day = day_key
        elif mode == "weekly" and current_week != week_key:
            running_cvd = 0.0
            current_week = week_key
        elif mode == "monthly" and current_month != month_key:
            running_cvd = 0.0
            current_month = month_key
        elif mode == "session" and current_day != day_key:
            running_cvd = 0.0
            current_day = day_key

        running_cvd += candle_delta
        session_delta += candle_delta
        daily_delta += candle_delta

        color = "#10b981" if running_cvd > 0 else ("#ef4444" if running_cvd < 0 else "#6b7280")

        results.append({
            "timestamp": ts,
            "time": c.get("time", int(ts // 1000)),
            "delta": round(candle_delta, 4),
            "cvd": round(running_cvd, 4),
            "session_delta": round(session_delta, 4),
            "daily_delta": round(daily_delta, 4),
            "total_volume": round(total_vol, 4),
            "color": color,
            "high": round(max(c.get("high", c.get("close", 0)), c.get("open", 0)), 4),
            "low": round(min(c.get("low", c.get("close", 0)), c.get("open", 0)), 4),
            "close": round(c.get("close", 0), 4)
        })

    return results
