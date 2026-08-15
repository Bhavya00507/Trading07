from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
import math


@dataclass
class VolumeProfileNode:
    price: float
    buy_volume: float
    sell_volume: float
    total_volume: float
    delta: float
    is_poc: bool = False
    in_value_area: bool = False
    is_hvn: bool = False
    is_lvn: bool = False

    def to_dict(self) -> Dict[str, Any]:
        return {
            "price": round(self.price, 4),
            "buy_volume": round(self.buy_volume, 4),
            "sell_volume": round(self.sell_volume, 4),
            "total_volume": round(self.total_volume, 4),
            "delta": round(self.delta, 4),
            "is_poc": self.is_poc,
            "in_value_area": self.in_value_area,
            "is_hvn": self.is_hvn,
            "is_lvn": self.is_lvn
        }


@dataclass
class VolumeProfileResult:
    poc_price: float
    vah_price: float
    val_price: float
    total_volume: float
    total_delta: float
    value_area_volume: float
    nodes: List[VolumeProfileNode] = field(default_factory=list)
    hvn_prices: List[float] = field(default_factory=list)
    lvn_prices: List[float] = field(default_factory=list)
    developing_poc: List[Dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "poc_price": round(self.poc_price, 4),
            "vah_price": round(self.vah_price, 4),
            "val_price": round(self.val_price, 4),
            "total_volume": round(self.total_volume, 4),
            "total_delta": round(self.total_delta, 4),
            "value_area_volume": round(self.value_area_volume, 4),
            "nodes": [n.to_dict() for n in self.nodes],
            "hvn_prices": [round(p, 4) for p in self.hvn_prices],
            "lvn_prices": [round(p, 4) for p in self.lvn_prices],
            "developing_poc": self.developing_poc
        }


def calculate_volume_profile(
    candles: List[Dict[str, Any]],
    tick_size: float = 0.5,
    value_area_percentage: float = 70.0
) -> Dict[str, Any]:
    """Calculate Volume Profile (POC, VAH, VAL, HVN, LVN, Developing POC) from candles."""
    if not candles:
        return VolumeProfileResult(0.0, 0.0, 0.0, 0.0, 0.0, 0.0).to_dict()

    min_p = min(c.get("low", c.get("close", 0)) for c in candles)
    max_p = max(c.get("high", c.get("close", 0)) for c in candles)

    if max_p <= min_p:
        max_p = min_p + tick_size

    # Aggregate volume per price level bucket
    profile_bins: Dict[float, Dict[str, float]] = {}

    def get_bin(p: float) -> float:
        return round(math.floor(p / tick_size) * tick_size, 4)

    developing_poc: List[Dict[str, Any]] = []
    cumulative_max_vol = -1.0
    current_dev_poc = min_p

    for c in candles:
        ts = c.get("timestamp", 0)
        c_open = c.get("open", 0)
        c_high = c.get("high", c_open)
        c_low = c.get("low", c_open)
        c_close = c.get("close", c_open)
        c_vol = c.get("volume", 0)

        steps = max(1, int(math.ceil((c_high - c_low) / tick_size)))
        vol_per_step = c_vol / (steps + 1)
        is_bull = c_close >= c_open

        for i in range(steps + 1):
            p = get_bin(c_low + (i * tick_size))
            if p not in profile_bins:
                profile_bins[p] = {"buy": 0.0, "sell": 0.0, "total": 0.0}

            buy_vol = vol_per_step * (0.55 if is_bull else 0.45)
            sell_vol = vol_per_step * (0.45 if is_bull else 0.55)

            profile_bins[p]["buy"] += buy_vol
            profile_bins[p]["sell"] += sell_vol
            profile_bins[p]["total"] += buy_vol + sell_vol

            if profile_bins[p]["total"] > cumulative_max_vol:
                cumulative_max_vol = profile_bins[p]["total"]
                current_dev_poc = p

        developing_poc.append({
            "timestamp": ts,
            "time": int(ts // 1000),
            "poc_price": round(current_dev_poc, 4),
            "close": round(c_close, 4)
        })

    sorted_prices = sorted(profile_bins.keys())
    if not sorted_prices:
        return VolumeProfileResult(0.0, 0.0, 0.0, 0.0, 0.0, 0.0).to_dict()

    # Find POC (Point of Control)
    poc_price = sorted_prices[0]
    max_bin_vol = -1.0
    total_profile_volume = 0.0
    total_profile_delta = 0.0

    for p in sorted_prices:
        bin_data = profile_bins[p]
        tot = bin_data["total"]
        total_profile_volume += tot
        total_profile_delta += (bin_data["buy"] - bin_data["sell"])
        if tot > max_bin_vol:
            max_bin_vol = tot
            poc_price = p

    # Calculate Value Area (70% of total volume expanding outward from POC)
    target_va_vol = total_profile_volume * (value_area_percentage / 100.0)
    poc_idx = sorted_prices.index(poc_price)

    va_indices = {poc_idx}
    va_volume = profile_bins[poc_price]["total"]

    up_idx = poc_idx + 1
    dn_idx = poc_idx - 1

    while va_volume < target_va_vol and (up_idx < len(sorted_prices) or dn_idx >= 0):
        up_vol = profile_bins[sorted_prices[up_idx]]["total"] if up_idx < len(sorted_prices) else -1
        dn_vol = profile_bins[sorted_prices[dn_idx]]["total"] if dn_idx >= 0 else -1

        if up_vol >= dn_vol and up_idx < len(sorted_prices):
            va_indices.add(up_idx)
            va_volume += up_vol
            up_idx += 1
        elif dn_idx >= 0:
            va_indices.add(dn_idx)
            va_volume += dn_vol
            dn_idx -= 1
        else:
            break

    val_idx = min(va_indices)
    vah_idx = max(va_indices)
    val_price = sorted_prices[val_idx]
    vah_price = sorted_prices[vah_idx]

    # Detect High Volume Nodes (HVN) & Low Volume Nodes (LVN)
    mean_vol = total_profile_volume / len(sorted_prices)
    hvn_prices: List[float] = []
    lvn_prices: List[float] = []

    nodes: List[VolumeProfileNode] = []
    for idx, p in enumerate(sorted_prices):
        bin_data = profile_bins[p]
        tot = bin_data["total"]
        buy_v = bin_data["buy"]
        sell_v = bin_data["sell"]
        delta_v = buy_v - sell_v

        is_poc = (p == poc_price)
        in_va = idx in va_indices
        is_hvn = tot >= mean_vol * 1.5
        is_lvn = tot <= mean_vol * 0.4 and tot > 0

        if is_hvn:
            hvn_prices.append(p)
        if is_lvn:
            lvn_prices.append(p)

        node = VolumeProfileNode(
            price=p,
            buy_volume=buy_v,
            sell_volume=sell_v,
            total_volume=tot,
            delta=delta_v,
            is_poc=is_poc,
            in_value_area=in_va,
            is_hvn=is_hvn,
            is_lvn=is_lvn
        )
        nodes.append(node)

    res = VolumeProfileResult(
        poc_price=poc_price,
        vah_price=vah_price,
        val_price=val_price,
        total_volume=total_profile_volume,
        total_delta=total_profile_delta,
        value_area_volume=va_volume,
        nodes=nodes,
        hvn_prices=hvn_prices,
        lvn_prices=lvn_prices,
        developing_poc=developing_poc
    )

    return res.to_dict()
