from typing import List, Dict, Any
import datetime
from app.services.orderflow.volume_profile_service import calculate_volume_profile


def calculate_session_profiles(
    candles: List[Dict[str, Any]],
    session_type: str = "daily",
    tick_size: float = 0.5
) -> List[Dict[str, Any]]:
    """Group candles into sessions (Daily, Weekly, Monthly) and compute Volume Profile for each session segment."""
    if not candles:
        return []

    grouped_sessions: Dict[str, List[Dict[str, Any]]] = {}

    for c in candles:
        ts = c.get("timestamp", 0)
        dt = datetime.datetime.fromtimestamp(ts / 1000.0, tz=datetime.timezone.utc)

        if session_type == "weekly":
            s_key = f"{dt.year}-W{dt.isocalendar()[1]}"
        elif session_type == "monthly":
            s_key = dt.strftime("%Y-%m")
        else:  # 'daily' / 'session'
            s_key = dt.strftime("%Y-%m-%d")

        if s_key not in grouped_sessions:
            grouped_sessions[s_key] = []
        grouped_sessions[s_key].append(c)

    session_results: List[Dict[str, Any]] = []

    for s_key in sorted(grouped_sessions.keys()):
        sess_candles = grouped_sessions[s_key]
        profile_data = calculate_volume_profile(sess_candles, tick_size=tick_size)

        start_ts = sess_candles[0].get("timestamp", 0)
        end_ts = sess_candles[-1].get("timestamp", 0)

        session_results.append({
            "session_key": s_key,
            "start_timestamp": start_ts,
            "end_timestamp": end_ts,
            "candles_count": len(sess_candles),
            "profile": profile_data
        })

    return session_results
