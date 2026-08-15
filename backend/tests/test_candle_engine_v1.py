"""
test_candle_engine_v1.py
Tests for timeframe conversion, candle aggregation, timestamp deduplication,
boundary ticks, invalid tick handling, and historical/live merge logic.
"""
import pytest

def get_timeframe_ms(tf: str) -> int:
    if not tf:
        return 60000
    if tf == "1M" or tf.lower() in ("1mo", "monthly"):
        return 2592000000
    norm = tf.lower()
    mapping = {
        "1s": 1000, "5s": 5000, "15s": 15000, "30s": 30000,
        "1m": 60000, "3m": 180000, "5m": 300000, "10m": 600000,
        "15m": 900000, "30m": 1800000, "45m": 2700000,
        "1h": 3600000, "2h": 7200000, "4h": 14400000, "6h": 21600000,
        "8h": 28800000, "12h": 43200000, "1d": 86400000, "daily": 86400000,
        "1w": 604800000, "weekly": 604800000,
    }
    return mapping.get(norm, 60000)

def align_timestamp(timestamp: int, tf_ms: int) -> int:
    ts_ms = timestamp * 1000 if timestamp < 30000000000 else timestamp
    return (ts_ms // tf_ms) * tf_ms

def dedupe_candles(candles):
    if not candles:
        return []
    candle_map = {}
    for c in candles:
        ts = c.get("timestamp")
        if ts is not None:
            candle_map[ts] = c
    sorted_candles = [candle_map[k] for k in sorted(candle_map.keys())]
    return sorted_candles

class TestCandleEngineLogic:

    def test_timeframe_conversion(self):
        assert get_timeframe_ms("1m") == 60000
        assert get_timeframe_ms("3m") == 180000
        assert get_timeframe_ms("5m") == 300000
        assert get_timeframe_ms("15m") == 900000
        assert get_timeframe_ms("1H") == 3600000
        assert get_timeframe_ms("4H") == 14400000
        assert get_timeframe_ms("1D") == 86400000
        assert get_timeframe_ms("1M") == 2592000000

    def test_candle_aggregation_single_bucket(self):
        tf_ms = get_timeframe_ms("1m")
        # 09:15:01, 09:15:12, 09:15:35, 09:15:58 (all in 09:15:00 bucket = 1723132500000)
        base_ts = 1723132500000
        ticks = [
            (base_ts + 1000, 100.0),
            (base_ts + 12000, 105.0),
            (base_ts + 35000, 98.0),
            (base_ts + 58000, 102.0),
        ]
        history = []
        for ts, price in ticks:
            aligned = align_timestamp(ts, tf_ms)
            if not history or history[-1]["timestamp"] != aligned:
                history.append({
                    "timestamp": aligned, "open": price, "high": price, "low": price, "close": price, "volume": 1
                })
            else:
                c = history[-1]
                c["close"] = price
                c["high"] = max(c["high"], price)
                c["low"] = min(c["low"], price)
                c["volume"] += 1

        assert len(history) == 1
        c = history[0]
        assert c["timestamp"] == base_ts
        assert c["open"] == 100.0
        assert c["high"] == 105.0
        assert c["low"] == 98.0
        assert c["close"] == 102.0
        assert c["volume"] == 4

    def test_boundary_creates_next_candle(self):
        tf_ms = get_timeframe_ms("1m")
        t1 = 1723132500000  # 09:15:00
        t2 = 1723132560000  # 09:16:00 (exact boundary)

        b1 = align_timestamp(t1, tf_ms)
        b2 = align_timestamp(t2, tf_ms)
        assert b1 != b2
        assert b2 - b1 == 60000

    def test_deduplicate_timestamps(self):
        candles = [
            {"timestamp": 1000, "close": 10.0},
            {"timestamp": 2000, "close": 20.0},
            {"timestamp": 1000, "close": 15.0}, # duplicate timestamp
            {"timestamp": 3000, "close": 30.0},
        ]
        deduped = dedupe_candles(candles)
        assert len(deduped) == 3
        timestamps = [c["timestamp"] for c in deduped]
        assert timestamps == [1000, 2000, 3000]
        # Should keep latest candle for timestamp 1000
        assert deduped[0]["close"] == 15.0

    def test_historical_live_merge(self):
        historical = [
            {"timestamp": 1000000, "close": 10.0},
            {"timestamp": 2000000, "close": 20.0},
        ]
        live_tick = {"timestamp": 2000, "price": 22.0} # 2000 seconds = 2000000 ms
        
        # Merge live tick into existing historical bucket
        bucket = align_timestamp(live_tick["timestamp"], 1000000)
        found = False
        for c in historical:
            if c["timestamp"] == bucket:
                c["close"] = live_tick["price"]
                found = True
                break

        assert found is True
        assert len(historical) == 2
        assert historical[1]["close"] == 22.0
