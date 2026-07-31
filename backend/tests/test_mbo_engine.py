import pytest
import time
import uuid
from app.services.mbo_service import mbo_engine, MBOHostEngine, MBOOrder, PriceLevelQueue

def test_mbo_order_lifecycle():
    engine = MBOHostEngine()
    symbol = "BTCUSDT"
    price = 65000.0

    # 1. Add 3 orders at same price level
    o1 = engine.add_order(symbol, "ord-1", price, 2.5, "bid")
    o2 = engine.add_order(symbol, "ord-2", price, 5.0, "bid", is_user_order=True)
    o3 = engine.add_order(symbol, "ord-3", price, 1.0, "bid")

    assert o1.remaining_quantity == 2.5
    assert o2.is_user_order is True

    # 2. Verify queue positions
    pos1 = engine.get_order_queue_position("ord-1")
    pos2 = engine.get_order_queue_position("ord-2")
    pos3 = engine.get_order_queue_position("ord-3")

    assert pos1["queue_position"] == 1
    assert pos1["qty_ahead"] == 0.0

    assert pos2["queue_position"] == 2
    assert pos2["qty_ahead"] == 2.5

    assert pos3["queue_position"] == 3
    assert pos3["qty_ahead"] == 7.5

    # 3. Fill order 1 partially (1.5 lots)
    res = engine.execute_fill("ord-1", 1.5)
    assert res["status"] == "partially_filled"
    assert res["remaining_qty"] == 1.0

    # Verify order 2 position updated (qty_ahead is now 1.0)
    pos2_updated = engine.get_order_queue_position("ord-2")
    assert pos2_updated["qty_ahead"] == 1.0

    # 4. Fill remaining 1.0 of order 1 -> order 1 finishes and clears
    engine.execute_fill("ord-1", 1.0)
    pos2_after_fill = engine.get_order_queue_position("ord-2")
    assert pos2_after_fill["queue_position"] == 1
    assert pos2_after_fill["qty_ahead"] == 0.0

    # 5. Modify order 2 size up -> loses queue priority and goes to back of queue
    engine.modify_order("ord-2", 10.0)
    pos2_after_modify = engine.get_order_queue_position("ord-2")
    assert pos2_after_modify["queue_position"] == 2
    assert pos2_after_modify["qty_ahead"] == 1.0  # order 3 is now ahead!

    # 6. Cancel order 3
    engine.cancel_order("ord-3")
    pos2_final = engine.get_order_queue_position("ord-2")
    assert pos2_final["queue_position"] == 1
    assert pos2_final["qty_ahead"] == 0.0

def test_mbo_statistics():
    engine = MBOHostEngine()
    symbol = "ETHUSDT"
    engine.seed_mock_book(symbol, base_price=3500.0, num_levels=10)

    stats = engine.get_statistics(symbol)
    assert stats["symbol"] == "ETHUSDT"
    assert stats["total_active_orders"] > 0
    assert "queue_velocity_min" in stats
    assert "cancel_ratio_pct" in stats
    assert "market_pressure_index" in stats

def test_mbo_stress_5000_orders_100k_events():
    """Stress test: 5,000 active orders and 100,000 queue events under 3 seconds."""
    engine = MBOHostEngine()
    symbol = "SOLUSDT"
    t0 = time.time()

    order_ids = []
    # 1. Add 5,000 orders
    for i in range(5000):
        oid = f"stress-ord-{i}"
        price = round(150.0 + (i % 50) * 0.1, 2)
        side = "bid" if i % 2 == 0 else "ask"
        engine.add_order(symbol, oid, price, round(1.0 + (i % 10), 2), side)
        order_ids.append(oid)

    # 2. Run 100,000 queue event updates (modifies, fills, cancels, adds)
    for i in range(100000):
        action = i % 4
        target_id = order_ids[i % 5000]

        if action == 0:
            engine.modify_order(target_id, new_quantity=round(2.0 + (i % 5), 2))
        elif action == 1:
            engine.execute_fill(target_id, fill_qty=0.5)
        elif action == 2:
            position = engine.get_order_queue_position(target_id)
        else:
            engine.get_statistics(symbol)

    elapsed = time.time() - t0
    assert elapsed < 3.0, f"MBO stress test took too long: {elapsed:.2f}s"
