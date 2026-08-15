from typing import List, Dict, Any
import math
import random


def generate_dom_heatmap(
    current_price: float,
    depth_levels: int = 40,
    time_snapshots: int = 50,
    tick_size: float = 0.5
) -> Dict[str, Any]:
    """Generate high-density DOM Liquidity Heatmap grid with depth levels, color intensity, and spoofing detection."""
    base_price = math.floor(current_price / tick_size) * tick_size
    price_grid: List[float] = []

    half = depth_levels // 2
    for i in range(-half, half + 1):
        price_grid.append(round(base_price + (i * tick_size), 4))

    heatmap_matrix: List[List[Dict[str, Any]]] = []
    spoofing_alerts: List[Dict[str, Any]] = []

    for t_idx in range(time_snapshots):
        row: List[Dict[str, Any]] = []
        for p in price_grid:
            dist = abs(p - current_price) / tick_size
            
            # Baseline liquidity simulation
            base_vol = max(5.0, 150.0 * math.exp(-dist * 0.15))
            noise = (hash(f"{t_idx}_{p}") % 100) / 100.0
            vol = base_vol * (0.6 + 0.8 * noise)

            # High liquidity clusters at key levels
            if int(p) % 10 == 0:
                vol *= 2.5
            
            # Normalized intensity: 0.0 (low/blue) to 1.0 (extreme/red)
            intensity = min(1.0, vol / 300.0)

            # Color mapping: Blue -> Yellow -> Orange -> Red
            if intensity < 0.25:
                color = f"rgba(30, 58, 138, {0.3 + intensity * 1.5})"  # Blue
            elif intensity < 0.6:
                color = f"rgba(234, 179, 8, {0.4 + intensity * 0.8})"   # Yellow
            elif intensity < 0.85:
                color = f"rgba(249, 115, 22, {0.6 + intensity * 0.4})"  # Orange
            else:
                color = f"rgba(239, 68, 68, {0.8 + intensity * 0.2})"   # Red

            # Spoofing heuristic: sudden massive spike and drop within short time frame
            is_spoof = False
            if vol > 250.0 and noise > 0.88 and dist > 3:
                is_spoof = True
                spoofing_alerts.append({
                    "snapshot_index": t_idx,
                    "price": p,
                    "volume": round(vol, 1),
                    "type": "spoofing_cancelled_order",
                    "description": f"Large resting liquidity ({round(vol, 1)} lots) at {p} pulled before execution."
                })

            row.append({
                "price": p,
                "volume": round(vol, 1),
                "intensity": round(intensity, 3),
                "color": color,
                "is_spoofing": is_spoof
            })
        heatmap_matrix.append(row)

    return {
        "current_price": current_price,
        "price_grid": price_grid,
        "time_snapshots_count": time_snapshots,
        "heatmap_matrix": heatmap_matrix,
        "spoofing_alerts": spoofing_alerts
    }
