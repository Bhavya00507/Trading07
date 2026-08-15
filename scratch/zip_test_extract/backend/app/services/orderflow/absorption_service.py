from typing import List, Dict, Any


def detect_absorption(
    footprint_candles: List[Dict[str, Any]],
    volume_multiplier_threshold: float = 2.2
) -> List[Dict[str, Any]]:
    """Automatically detect Buyer Absorption and Seller Absorption.
    
    Buyer Absorption: Large aggressive selling volume into bid with no downward price movement.
    Seller Absorption: Large aggressive buying volume into ask with no upward price movement.
    """
    absorption_events: List[Dict[str, Any]] = []

    for candle in footprint_candles:
        ts = candle.get("timestamp", 0)
        c_low = candle.get("low", 0.0)
        c_high = candle.get("high", 0.0)
        c_vol = candle.get("total_volume", 1.0)
        levels = candle.get("levels", [])

        if not levels or c_vol <= 0:
            continue

        avg_level_vol = c_vol / len(levels)

        for lvl in levels:
            price = lvl["price"]
            bid_v = lvl["bid_volume"]
            ask_v = lvl["ask_volume"]
            tot_v = lvl["total_volume"]

            if tot_v < avg_level_vol * volume_multiplier_threshold:
                continue

            # Buyer Absorption: Heavy sell volume at low of candle, price refuses to break lower
            if bid_v > ask_v * 2.0 and abs(price - c_low) <= (c_high - c_low) * 0.2:
                absorption_events.append({
                    "timestamp": ts,
                    "time": int(ts // 1000),
                    "price": price,
                    "type": "buyer_absorption",
                    "title": "Buyer Absorption Detected",
                    "description": f"Large aggressive selling ({round(bid_v, 1)} contracts) absorbed at bid {price} with zero downward breakdown.",
                    "absorbed_volume": round(bid_v, 2),
                    "counter_volume": round(ask_v, 2),
                    "strength": round(bid_v / (ask_v + 0.01), 2),
                    "color": "#10b981",  # Bullish defense
                    "icon": "shield-up"
                })

            # Seller Absorption: Heavy buy volume at high of candle, price refuses to break higher
            if ask_v > bid_v * 2.0 and abs(price - c_high) <= (c_high - c_low) * 0.2:
                absorption_events.append({
                    "timestamp": ts,
                    "time": int(ts // 1000),
                    "price": price,
                    "type": "seller_absorption",
                    "title": "Seller Absorption Detected",
                    "description": f"Large aggressive buying ({round(ask_v, 1)} contracts) absorbed at ask {price} with zero upward breakout.",
                    "absorbed_volume": round(ask_v, 2),
                    "counter_volume": round(bid_v, 2),
                    "strength": round(ask_v / (bid_v + 0.01), 2),
                    "color": "#ef4444",  # Bearish defense
                    "icon": "shield-down"
                })

    return absorption_events
