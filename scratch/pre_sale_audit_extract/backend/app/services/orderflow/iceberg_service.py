from typing import List, Dict, Any


def detect_icebergs(
    footprint_candles: List[Dict[str, Any]],
    min_volume_threshold: float = 50.0
) -> List[Dict[str, Any]]:
    """Detect hidden institutional iceberg orders and hidden liquidity.
    
    Icebergs are identified when continuous execution volume at a single price node
    exceeds normal level capacity, signaling automated order refilling.
    """
    iceberg_signals: List[Dict[str, Any]] = []

    for candle in footprint_candles:
        ts = candle.get("timestamp", 0)
        levels = candle.get("levels", [])

        for lvl in levels:
            price = lvl["price"]
            tot_v = lvl["total_volume"]
            bid_v = lvl["bid_volume"]
            ask_v = lvl["ask_volume"]
            is_iceberg = lvl.get("iceberg_detected", False)
            confidence = lvl.get("iceberg_confidence", 0.0)

            if is_iceberg or tot_v >= min_volume_threshold:
                side = "buy_iceberg" if bid_v > ask_v else "sell_iceberg"
                est_hidden_qty = round(tot_v * 2.8, 1)
                conf_pct = round(max(0.65, min(0.98, confidence if confidence > 0 else (tot_v / (min_volume_threshold * 2.0)))), 2)

                iceberg_signals.append({
                    "timestamp": ts,
                    "time": int(ts // 1000),
                    "price": price,
                    "side": side,
                    "total_traded_volume": round(tot_v, 2),
                    "estimated_hidden_volume": est_hidden_qty,
                    "confidence_percentage": round(conf_pct * 100.0, 1),
                    "icon": "iceberg",
                    "color": "#3b82f6" if side == "buy_iceberg" else "#f59e0b"
                })

    return iceberg_signals
