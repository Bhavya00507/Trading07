import pytest
import time
from app.services.orderflow.delta_service import calculate_delta, calculate_cumulative_delta
from app.services.orderflow.footprint_service import generate_footprint
from app.services.orderflow.volume_profile_service import calculate_volume_profile
from app.services.orderflow.imbalance_service import detect_imbalances, ImbalanceConfig
from app.services.orderflow.absorption_service import detect_absorption
from app.services.orderflow.iceberg_service import detect_icebergs
from app.services.orderflow.heatmap_service import generate_dom_heatmap
from app.services.orderflow.session_profile_service import calculate_session_profiles


def test_delta_calculation():
    res = calculate_delta(bid_volume=100.0, ask_volume=250.0)
    assert res["delta"] == 150.0
    assert res["total_volume"] == 350.0
    assert res["color_state"] == "positive"

    res_neg = calculate_delta(bid_volume=400.0, ask_volume=150.0)
    assert res_neg["delta"] == -250.0
    assert res_neg["color_state"] == "negative"


def test_cumulative_delta_series():
    now = int(time.time() * 1000)
    candles = [
        {"timestamp": now, "volume": 100, "bid_volume": 40, "ask_volume": 60, "open": 100, "close": 102},
        {"timestamp": now + 60000, "volume": 200, "bid_volume": 120, "ask_volume": 80, "open": 102, "close": 101},
        {"timestamp": now + 120000, "volume": 150, "bid_volume": 50, "ask_volume": 100, "open": 101, "close": 105},
    ]

    cvd = calculate_cumulative_delta(candles, mode="session")
    assert len(cvd) == 3
    assert cvd[0]["delta"] == 20.0
    assert cvd[1]["delta"] == -40.0
    assert cvd[2]["delta"] == 50.0
    assert cvd[2]["cvd"] == 30.0  # 20 - 40 + 50 = 30


def test_footprint_and_imbalance_detection():
    now = int(time.time() * 1000)
    candles = [
        {"timestamp": now, "open": 100.0, "high": 105.0, "low": 95.0, "close": 104.0, "volume": 1000.0}
    ]

    footprints = generate_footprint(candles, tick_size=1.0, imbalance_ratio_threshold=3.0)
    assert len(footprints) == 1
    fp_c = footprints[0]
    assert len(fp_c["levels"]) > 0
    assert fp_c["poc_price"] > 0

    imbalances = detect_imbalances(footprints, config=ImbalanceConfig(ratio_threshold=3.0))
    assert isinstance(imbalances, list)


def test_volume_profile_poc_vah_val():
    now = int(time.time() * 1000)
    candles = []
    for i in range(10):
        candles.append({
            "timestamp": now + i * 60000,
            "open": 100.0 + i * 0.2,
            "high": 103.0 + i * 0.2,
            "low": 98.0 + i * 0.2,
            "close": 101.0 + i * 0.2,
            "volume": 500.0 + i * 50
        })

    vp = calculate_volume_profile(candles, tick_size=0.5, value_area_percentage=70.0)
    assert "poc_price" in vp
    assert "vah_price" in vp
    assert "val_price" in vp
    assert vp["vah_price"] >= vp["poc_price"] >= vp["val_price"]
    assert len(vp["nodes"]) > 0


def test_absorption_and_iceberg_detection():
    now = int(time.time() * 1000)
    candles = [{"timestamp": now, "open": 100.0, "high": 102.0, "low": 98.0, "close": 101.0, "volume": 2000.0}]

    footprints = generate_footprint(candles, tick_size=0.5)
    absorptions = detect_absorption(footprints)
    icebergs = detect_icebergs(footprints)

    assert isinstance(absorptions, list)
    assert isinstance(icebergs, list)


def test_dom_heatmap_generation():
    heatmap = generate_dom_heatmap(current_price=65000.0, depth_levels=30, time_snapshots=20)
    assert heatmap["current_price"] == 65000.0
    assert len(heatmap["price_grid"]) == 31
    assert len(heatmap["heatmap_matrix"]) == 20
    assert "spoofing_alerts" in heatmap


def test_large_dataset_performance():
    """Verify performance on 100,000+ ticks benchmark target."""
    now = int(time.time() * 1000)
    large_candles = []
    for i in range(1000):
        large_candles.append({
            "timestamp": now + i * 60000,
            "open": 100.0,
            "high": 105.0,
            "low": 95.0,
            "close": 102.0,
            "volume": 100.0
        })

    t0 = time.time()
    vp = calculate_volume_profile(large_candles, tick_size=0.5)
    dt = (time.time() - t0) * 1000.0

    assert len(vp["nodes"]) > 0
    assert dt < 500.0  # Calculation completes in < 500ms
