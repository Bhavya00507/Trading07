from typing import List, Dict, Any, Optional
import math
import random
import time

def get_dom_ladder_data(
    symbol: str = "BTCUSDT",
    current_price: float = 65000.0,
    depth_levels: int = 50,
    tick_size: float = 0.5,
    imbalance_threshold: float = 3.0
) -> Dict[str, Any]:
    """Generates an institutional DOM ladder with bids, asks, heatmap intensities,
    volume profiles, large order notifications, micro-structure speed metrics, and imbalance flags.
    """
    sym = symbol.upper()
    
    # Calculate step size according to symbol specs
    if "JPY" in sym:
        tick_size = 0.01
    elif "XAU" in sym:
        tick_size = 0.1
    elif "XAG" in sym:
        tick_size = 0.01
    elif any(k in sym for k in ["US30", "NAS100", "SPX500", "GER40"]):
        tick_size = 1.0
    elif any(k in sym for k in ["EUR", "GBP", "AUD", "NZD", "CAD", "CHF"]) and not "BTC" in sym:
        tick_size = 0.0001

    base_price = round(math.floor(current_price / tick_size) * tick_size, 5)
    
    bids: List[Dict[str, Any]] = []
    asks: List[Dict[str, Any]] = []
    volume_profile: List[Dict[str, Any]] = []
    large_orders: List[Dict[str, Any]] = []
    sweeps: List[Dict[str, Any]] = []

    cum_bid_vol = 0.0
    cum_ask_vol = 0.0

    # Max volume for relative bar percentages
    max_vol = 1.0

    # 1. Generate Asks (above current price)
    for i in range(1, depth_levels + 1):
        price = round(base_price + (i * tick_size), 5)
        dist = i
        
        # Realistic depth distribution: higher liquidity at round numbers
        seed = int((price * 1000) % 997)
        base_vol = max(1.5, 45.0 * math.exp(-dist * 0.04))
        noise = (seed % 100) / 100.0
        vol = round(base_vol * (0.6 + 0.8 * noise), 2)

        # Round number liquidity injection (walls)
        if int(price) % 10 == 0 or int(price * 10) % 50 == 0:
            vol = round(vol * 3.2, 2)

        cum_ask_vol += vol
        if vol > max_vol:
            max_vol = vol

        is_large = vol > 120.0
        is_iceberg = vol > 180.0 and (seed % 7 == 0)
        is_spoof = vol > 150.0 and (seed % 11 == 0)

        if is_large or is_iceberg or is_spoof:
            large_orders.append({
                "price": price,
                "side": "ask",
                "size": vol,
                "type": "iceberg" if is_iceberg else ("spoof" if is_spoof else "whale"),
                "description": f"{'Iceberg' if is_iceberg else ('Spoof' if is_spoof else 'Whale')} Ask @ {price} ({vol} lots)"
            })

        asks.append({
            "price": price,
            "volume": vol,
            "cumulative_volume": round(cum_ask_vol, 2),
            "orders_count": max(1, int(vol * 1.8)),
            "intensity": min(1.0, vol / 200.0),
            "is_large": is_large,
            "is_iceberg": is_iceberg,
            "is_spoof": is_spoof
        })

    # Sort asks ascending price
    asks.sort(key=lambda x: x["price"])

    # 2. Generate Bids (below current price)
    for i in range(1, depth_levels + 1):
        price = round(base_price - (i * tick_size), 5)
        dist = i
        
        seed = int((price * 1000) % 991)
        base_vol = max(1.5, 50.0 * math.exp(-dist * 0.04))
        noise = (seed % 100) / 100.0
        vol = round(base_vol * (0.6 + 0.8 * noise), 2)

        if int(price) % 10 == 0 or int(price * 10) % 50 == 0:
            vol = round(vol * 3.5, 2)

        cum_bid_vol += vol
        if vol > max_vol:
            max_vol = vol

        is_large = vol > 120.0
        is_iceberg = vol > 180.0 and (seed % 9 == 0)
        is_spoof = vol > 150.0 and (seed % 13 == 0)

        if is_large or is_iceberg or is_spoof:
            large_orders.append({
                "price": price,
                "side": "bid",
                "size": vol,
                "type": "iceberg" if is_iceberg else ("spoof" if is_spoof else "whale"),
                "description": f"{'Iceberg' if is_iceberg else ('Spoof' if is_spoof else 'Whale')} Bid @ {price} ({vol} lots)"
            })

        bids.append({
            "price": price,
            "volume": vol,
            "cumulative_volume": round(cum_bid_vol, 2),
            "orders_count": max(1, int(vol * 2.0)),
            "intensity": min(1.0, vol / 200.0),
            "is_large": is_large,
            "is_iceberg": is_iceberg,
            "is_spoof": is_spoof
        })

    # Sort bids descending price
    bids.sort(key=lambda x: x["price"], reverse=True)

    # 3. Calculate Diagonal / Level Imbalances
    for idx in range(min(len(bids), len(asks))):
        bid_vol = bids[idx]["volume"]
        ask_vol = asks[idx]["volume"]

        if ask_vol > 0 and (bid_vol / ask_vol) >= imbalance_threshold:
            bids[idx]["imbalance_ratio"] = round(bid_vol / ask_vol, 1)
            bids[idx]["is_imbalance"] = True
        else:
            bids[idx]["imbalance_ratio"] = 1.0
            bids[idx]["is_imbalance"] = False

        if bid_vol > 0 and (ask_vol / bid_vol) >= imbalance_threshold:
            asks[idx]["imbalance_ratio"] = round(ask_vol / bid_vol, 1)
            asks[idx]["is_imbalance"] = True
        else:
            asks[idx]["imbalance_ratio"] = 1.0
            asks[idx]["is_imbalance"] = False

    # 4. Generate Integrated Volume Profile & POC / VAH / VAL
    profile_levels: List[Dict[str, Any]] = []
    total_session_vol = 0.0
    highest_vol_level = 0.0
    poc_price = base_price

    all_prices = [b["price"] for b in bids] + [base_price] + [a["price"] for a in asks]
    all_prices.sort()

    for p in all_prices:
        dist = abs(p - base_price) / tick_size
        seed = int((p * 777) % 883)
        b_vol = round(max(5.0, 120.0 * math.exp(-dist * 0.08) * (0.8 + 0.4 * (seed % 10 / 10))), 2)
        s_vol = round(max(5.0, 110.0 * math.exp(-dist * 0.08) * (0.8 + 0.4 * ((seed + 3) % 10 / 10))), 2)
        tot_vol = b_vol + s_vol
        total_session_vol += tot_vol

        if tot_vol > highest_vol_level:
            highest_vol_level = tot_vol
            poc_price = p

        profile_levels.append({
            "price": p,
            "buy_volume": b_vol,
            "sell_volume": s_vol,
            "total_volume": tot_vol,
            "is_poc": False,
            "is_vah": False,
            "is_val": False
        })

    # Set POC, VAH (Value Area High), VAL (Value Area Low) - 70% value area
    target_va_vol = total_session_vol * 0.70
    accumulated = 0.0
    vah_price = all_prices[-1]
    val_price = all_prices[0]

    profile_levels.sort(key=lambda x: x["total_volume"], reverse=True)
    for item in profile_levels:
        if item["price"] == poc_price:
            item["is_poc"] = True
        accumulated += item["total_volume"]
        if accumulated <= target_va_vol:
            vah_price = max(vah_price, item["price"])
            val_price = min(val_price, item["price"])

    # Re-sort profile levels by price ascending
    profile_levels.sort(key=lambda x: x["price"])

    for item in profile_levels:
        if item["price"] == vah_price:
            item["is_vah"] = True
        if item["price"] == val_price:
            item["is_val"] = True

    # 5. Microstructure & Tape Telemetry Metrics
    microstructure = {
        "orders_added_per_sec": random.randint(140, 320),
        "orders_removed_per_sec": random.randint(110, 280),
        "trades_per_sec": random.randint(35, 95),
        "volume_per_sec": round(random.uniform(12.5, 48.0), 2),
        "session_delta": round(cum_bid_vol - cum_ask_vol, 2),
        "running_delta": round((cum_bid_vol - cum_ask_vol) * 0.65, 2),
        "total_bid_volume": round(cum_bid_vol, 2),
        "total_ask_volume": round(cum_ask_vol, 2),
        "imbalance_pct": round((cum_bid_vol / max(1, cum_bid_vol + cum_ask_vol)) * 100, 1),
        "poc_price": poc_price,
        "vah_price": vah_price,
        "val_price": val_price,
        "tick_size": tick_size
    }

    # 6. Liquidity Sweep Detection
    if random.random() > 0.7:
        sweep_side = "bid" if random.random() > 0.5 else "ask"
        start_p = base_price + (tick_size * 2 if sweep_side == "ask" else -tick_size * 2)
        end_p = base_price + (tick_size * 6 if sweep_side == "ask" else -tick_size * 6)
        sweeps.append({
            "timestamp": int(time.time() * 1000),
            "side": sweep_side,
            "start_price": round(start_p, 5),
            "end_price": round(end_p, 5),
            "total_volume": round(random.uniform(80.0, 240.0), 2),
            "message": f"⚡ Liquidity Sweep: {sweep_side.upper()} levels swept from {round(start_p, 5)} to {round(end_p, 5)}"
        })

    return {
        "symbol": sym,
        "current_price": current_price,
        "base_price": base_price,
        "tick_size": tick_size,
        "max_level_volume": max_vol,
        "bids": bids,
        "asks": asks,
        "volume_profile": profile_levels,
        "microstructure": microstructure,
        "large_orders": large_orders,
        "sweeps": sweeps
    }
