from typing import List, Dict, Any
from dataclasses import dataclass


@dataclass
class ImbalanceConfig:
    ratio_threshold: float = 3.0  # 2x, 3x, 4x, 5x
    min_volume_filter: float = 1.0
    diagonal: bool = True  # Diagonal footprint comparison vs direct level


def detect_imbalances(
    footprint_candles: List[Dict[str, Any]],
    config: ImbalanceConfig = ImbalanceConfig()
) -> List[Dict[str, Any]]:
    """Detect Buy and Sell imbalances across footprint candles."""
    imbalance_events: List[Dict[str, Any]] = []

    for candle in footprint_candles:
        levels = candle.get("levels", [])
        ts = candle.get("timestamp", 0)

        # Sort levels descending by price
        sorted_levels = sorted(levels, key=lambda x: x["price"], reverse=True)

        for i, lvl in enumerate(sorted_levels):
            price = lvl["price"]
            ask_v = lvl["ask_volume"]
            bid_v = lvl["bid_volume"]

            # Buy Imbalance: Ask volume at price P vs Bid volume at price (P - tick)
            if config.diagonal and i < len(sorted_levels) - 1:
                lower_lvl = sorted_levels[i + 1]
                compare_bid = lower_lvl["bid_volume"]
                if compare_bid >= config.min_volume_filter and ask_v >= compare_bid * config.ratio_threshold:
                    ratio = ask_v / compare_bid if compare_bid > 0 else ask_v
                    imbalance_events.append({
                        "timestamp": ts,
                        "time": int(ts // 1000),
                        "price": price,
                        "type": "buy_imbalance",
                        "ask_volume": round(ask_v, 2),
                        "compared_bid_volume": round(compare_bid, 2),
                        "ratio": round(ratio, 2),
                        "color": "#10b981"
                    })
            elif not config.diagonal:
                if bid_v >= config.min_volume_filter and ask_v >= bid_v * config.ratio_threshold:
                    ratio = ask_v / bid_v if bid_v > 0 else ask_v
                    imbalance_events.append({
                        "timestamp": ts,
                        "time": int(ts // 1000),
                        "price": price,
                        "type": "buy_imbalance",
                        "ask_volume": round(ask_v, 2),
                        "compared_bid_volume": round(bid_v, 2),
                        "ratio": round(ratio, 2),
                        "color": "#10b981"
                    })

            # Sell Imbalance: Bid volume at price P vs Ask volume at price (P + tick)
            if config.diagonal and i > 0:
                upper_lvl = sorted_levels[i - 1]
                compare_ask = upper_lvl["ask_volume"]
                if compare_ask >= config.min_volume_filter and bid_v >= compare_ask * config.ratio_threshold:
                    ratio = bid_v / compare_ask if compare_ask > 0 else bid_v
                    imbalance_events.append({
                        "timestamp": ts,
                        "time": int(ts // 1000),
                        "price": price,
                        "type": "sell_imbalance",
                        "bid_volume": round(bid_v, 2),
                        "compared_ask_volume": round(compare_ask, 2),
                        "ratio": round(ratio, 2),
                        "color": "#ef4444"
                    })
            elif not config.diagonal:
                if ask_v >= config.min_volume_filter and bid_v >= ask_v * config.ratio_threshold:
                    ratio = bid_v / ask_v if ask_v > 0 else bid_v
                    imbalance_events.append({
                        "timestamp": ts,
                        "time": int(ts // 1000),
                        "price": price,
                        "type": "sell_imbalance",
                        "bid_volume": round(bid_v, 2),
                        "compared_ask_volume": round(ask_v, 2),
                        "ratio": round(ratio, 2),
                        "color": "#ef4444"
                    })

    return imbalance_events
