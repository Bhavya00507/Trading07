import time
import math
import random
import uuid
from typing import List, Dict, Any, Optional

class MBOOrder:
    def __init__(
        self,
        order_id: str,
        symbol: str,
        price: float,
        quantity: float,
        side: str,  # "bid" or "ask"
        is_hidden: bool = False,
        is_user_order: bool = False,
        user_order_id: Optional[str] = None
    ):
        self.order_id = order_id
        self.symbol = symbol.upper()
        self.price = round(price, 5)
        self.quantity = round(quantity, 4)
        self.filled_quantity = 0.0
        self.side = side.lower()
        self.is_hidden = is_hidden
        self.is_user_order = is_user_order
        self.user_order_id = user_order_id
        self.created_at = time.time()
        self.updated_at = time.time()

    @property
    def remaining_quantity(self) -> float:
        return round(max(0.0, self.quantity - self.filled_quantity), 4)

    def to_dict(self, queue_position: int = 1, qty_ahead: float = 0.0) -> Dict[str, Any]:
        age_sec = round(time.time() - self.created_at, 2)
        return {
            "order_id": self.order_id,
            "symbol": self.symbol,
            "price": self.price,
            "quantity": self.quantity,
            "filled_quantity": self.filled_quantity,
            "remaining_quantity": self.remaining_quantity,
            "side": self.side,
            "is_hidden": self.is_hidden,
            "is_user_order": self.is_user_order,
            "user_order_id": self.user_order_id,
            "queue_position": queue_position,
            "qty_ahead": round(qty_ahead, 2),
            "age_sec": age_sec,
            "created_at": self.created_at
        }


class PriceLevelQueue:
    def __init__(self, price: float, side: str):
        self.price = round(price, 5)
        self.side = side.lower()
        self.orders: List[MBOOrder] = []

    def add_order(self, order: MBOOrder):
        self.orders.append(order)

    def remove_order(self, order_id: str) -> Optional[MBOOrder]:
        for i, ord in enumerate(self.orders):
            if ord.order_id == order_id:
                return self.orders.pop(i)
        return None

    def find_order(self, order_id: str) -> Optional[MBOOrder]:
        for ord in self.orders:
            if ord.order_id == order_id:
                return ord
        return None

    @property
    def total_quantity(self) -> float:
        return round(sum(o.remaining_quantity for o in self.orders), 4)

    @property
    def order_count(self) -> int:
        return len(self.orders)

    def get_order_position_info(self, order_id: str) -> Dict[str, Any]:
        qty_ahead = 0.0
        position = 1
        found = False

        for ord in self.orders:
            if ord.order_id == order_id:
                found = True
                break
            qty_ahead += ord.remaining_quantity
            position += 1

        if not found:
            return {"position": 0, "qty_ahead": 0.0, "found": False}

        return {
            "position": position,
            "total_orders": len(self.orders),
            "qty_ahead": round(qty_ahead, 2),
            "total_level_qty": self.total_quantity,
            "found": True
        }


class MBOHostEngine:
    def __init__(self):
        # Symbol -> Side -> Price -> PriceLevelQueue
        self._queues: Dict[str, Dict[str, Dict[float, PriceLevelQueue]]] = {}
        # OrderId -> MBOOrder
        self._orders_by_id: Dict[str, MBOOrder] = {}
        # Statistics telemetry
        self._stats: Dict[str, Dict[str, Any]] = {}
        self._event_log: List[Dict[str, Any]] = []

    def _ensure_symbol(self, symbol: str):
        sym = symbol.upper()
        if sym not in self._queues:
            self._queues[sym] = {"bid": {}, "ask": {}}
            self._stats[sym] = {
                "orders_created": 0,
                "orders_cancelled": 0,
                "orders_filled": 0,
                "trades_count": 0,
                "volume_traded": 0.0,
                "aggressive_buy_vol": 0.0,
                "aggressive_sell_vol": 0.0,
                "created_at": time.time()
            }
            # Seed initial level depth
            self.seed_mock_book(sym, base_price=65000.0 if "BTC" in sym else 1.0850)

    def seed_mock_book(self, symbol: str, base_price: float = 65000.0, num_levels: int = 20):
        sym = symbol.upper()
        tick_size = 0.5 if "BTC" in sym else 0.0001
        
        for i in range(1, num_levels + 1):
            bid_p = round(base_price - i * tick_size, 5)
            ask_p = round(base_price + i * tick_size, 5)

            # Add 2-5 orders per bid/ask level
            for _ in range(random.randint(2, 5)):
                oid = f"mbo-{uuid.uuid4().hex[:8]}"
                self.add_order(sym, oid, bid_p, round(random.uniform(0.5, 10.0), 2), "bid")

            for _ in range(random.randint(2, 5)):
                oid = f"mbo-{uuid.uuid4().hex[:8]}"
                self.add_order(sym, oid, ask_p, round(random.uniform(0.5, 10.0), 2), "ask")

    def add_order(
        self,
        symbol: str,
        order_id: str,
        price: float,
        quantity: float,
        side: str,
        is_hidden: bool = False,
        is_user_order: bool = False,
        user_order_id: Optional[str] = None
    ) -> MBOOrder:
        self._ensure_symbol(symbol)
        sym = symbol.upper()
        p = round(price, 5)
        s = side.lower()

        order = MBOOrder(
            order_id=order_id,
            symbol=sym,
            price=p,
            quantity=quantity,
            side=s,
            is_hidden=is_hidden,
            is_user_order=is_user_order,
            user_order_id=user_order_id
        )

        side_dict = self._queues[sym][s]
        if p not in side_dict:
            side_dict[p] = PriceLevelQueue(p, s)

        side_dict[p].add_order(order)
        self._orders_by_id[order_id] = order
        self._stats[sym]["orders_created"] += 1

        self._record_event("ADD", order)
        return order

    def modify_order(self, order_id: str, new_quantity: float) -> Optional[MBOOrder]:
        if order_id not in self._orders_by_id:
            return None

        order = self._orders_by_id[order_id]
        sym = order.symbol
        p = order.price
        s = order.side

        # If quantity increases, order loses queue priority and goes to back of queue
        if new_quantity > order.quantity:
            side_dict = self._queues[sym][s]
            if p in side_dict:
                side_dict[p].remove_order(order_id)
                order.quantity = round(new_quantity, 4)
                order.updated_at = time.time()
                side_dict[p].add_order(order)
        else:
            order.quantity = round(new_quantity, 4)
            order.updated_at = time.time()

        self._record_event("MODIFY", order)
        return order

    def cancel_order(self, order_id: str) -> Optional[MBOOrder]:
        if order_id not in self._orders_by_id:
            return None

        order = self._orders_by_id.pop(order_id)
        sym = order.symbol
        p = order.price
        s = order.side

        side_dict = self._queues[sym][s]
        if p in side_dict:
            side_dict[p].remove_order(order_id)
            if side_dict[p].order_count == 0:
                del side_dict[p]

        self._stats[sym]["orders_cancelled"] += 1
        self._record_event("CANCEL", order)
        return order

    def execute_fill(self, order_id: str, fill_qty: float) -> Dict[str, Any]:
        if order_id not in self._orders_by_id:
            return {"status": "not_found"}

        order = self._orders_by_id[order_id]
        sym = order.symbol
        actual_fill = min(fill_qty, order.remaining_quantity)
        order.filled_quantity = round(order.filled_quantity + actual_fill, 4)
        order.updated_at = time.time()

        self._stats[sym]["volume_traded"] = round(self._stats[sym]["volume_traded"] + actual_fill, 2)
        self._stats[sym]["trades_count"] += 1

        if order.side == "bid":
            self._stats[sym]["aggressive_sell_vol"] += actual_fill
        else:
            self._stats[sym]["aggressive_buy_vol"] += actual_fill

        is_fully_filled = order.remaining_quantity <= 0.0001
        if is_fully_filled:
            self.cancel_order(order_id)
            self._stats[sym]["orders_filled"] += 1

        self._record_event("FILL", order, fill_qty=actual_fill)

        return {
            "status": "filled" if is_fully_filled else "partially_filled",
            "order_id": order_id,
            "fill_qty": actual_fill,
            "remaining_qty": order.remaining_quantity
        }

    def simulate_microstructure_tick(self, symbol: str, current_price: float):
        self._ensure_symbol(symbol)
        sym = symbol.upper()
        tick_size = 0.5 if "BTC" in sym else 0.0001

        # 1. Randomly add new participant orders
        for _ in range(random.randint(1, 4)):
            side = "bid" if random.random() > 0.5 else "ask"
            level_offset = random.randint(1, 10)
            p = round(current_price - level_offset * tick_size if side == "bid" else current_price + level_offset * tick_size, 5)
            oid = f"mbo-{uuid.uuid4().hex[:8]}"
            qty = round(random.uniform(0.5, 12.0), 2)
            is_hidden = random.random() < 0.1
            self.add_order(sym, oid, p, qty, side, is_hidden=is_hidden)

        # 2. Randomly fill front of queue orders
        for side in ["bid", "ask"]:
            side_dict = self._queues[sym][side]
            if not side_dict:
                continue
            prices = sorted(side_dict.keys(), reverse=(side == "bid"))
            best_price = prices[0]
            queue = side_dict[best_price]
            if queue.orders:
                front_order = queue.orders[0]
                fill_size = round(random.uniform(0.2, min(3.0, front_order.remaining_quantity)), 2)
                self.execute_fill(front_order.order_id, fill_size)

        # 3. Randomly cancel an order in queue
        all_ids = list(self._orders_by_id.keys())
        if len(all_ids) > 100:
            cancel_id = random.choice(all_ids[:50])
            self.cancel_order(cancel_id)

    def get_queue_at_level(self, symbol: str, side: str, price: float) -> Dict[str, Any]:
        self._ensure_symbol(symbol)
        sym = symbol.upper()
        s = side.lower()
        p = round(price, 5)

        side_dict = self._queues[sym].get(s, {})
        if p not in side_dict:
            return {"price": p, "side": s, "total_quantity": 0.0, "order_count": 0, "orders": []}

        queue = side_dict[p]
        qty_ahead = 0.0
        orders_data = []

        for idx, ord in enumerate(queue.orders, 1):
            orders_data.append(ord.to_dict(queue_position=idx, qty_ahead=qty_ahead))
            qty_ahead += ord.remaining_quantity

        return {
            "price": p,
            "side": s,
            "total_quantity": queue.total_quantity,
            "order_count": queue.order_count,
            "orders": orders_data
        }

    def get_order_queue_position(self, order_id: str) -> Dict[str, Any]:
        if order_id not in self._orders_by_id:
            return {"found": False, "message": "Order not found"}

        order = self._orders_by_id[order_id]
        sym = order.symbol
        p = order.price
        s = order.side

        side_dict = self._queues[sym].get(s, {})
        if p not in side_dict:
            return {"found": False, "message": "Price level queue missing"}

        info = side_dict[p].get_order_position_info(order_id)
        qty_ahead = info.get("qty_ahead", 0.0)
        total_qty = info.get("total_level_qty", 1.0)

        # Calculate fill probability & estimated fill time
        avg_trades_per_sec = max(1.0, self._stats[sym]["trades_count"] / max(1.0, time.time() - self._stats[sym]["created_at"]))
        avg_trade_size = max(0.5, self._stats[sym]["volume_traded"] / max(1, self._stats[sym]["trades_count"]))
        fill_rate_qty_sec = avg_trades_per_sec * avg_trade_size

        est_fill_sec = round(qty_ahead / max(0.1, fill_rate_qty_sec), 1)
        prob_fill = max(5.0, min(99.0, round(100.0 * (1.0 - (qty_ahead / (total_qty + 1.0))), 1)))

        return {
            "found": True,
            "order_id": order_id,
            "symbol": sym,
            "price": p,
            "side": s,
            "remaining_quantity": order.remaining_quantity,
            "queue_position": info.get("position", 1),
            "total_orders_in_queue": info.get("total_orders", 1),
            "qty_ahead": qty_ahead,
            "estimated_fill_time_sec": est_fill_sec,
            "fill_probability_pct": prob_fill,
            "estimated_fill_pct": round(max(0.0, 100.0 - prob_fill), 1)
        }

    def get_statistics(self, symbol: str) -> Dict[str, Any]:
        self._ensure_symbol(symbol)
        sym = symbol.upper()
        st = self._stats[sym]

        elapsed = max(1.0, time.time() - st["created_at"])
        trades_per_sec = round(st["trades_count"] / elapsed, 2)
        cancel_ratio = round((st["orders_cancelled"] / max(1, st["orders_created"])) * 100.0, 1)
        queue_velocity = round((st["volume_traded"] / elapsed) * 60.0, 2)  # Contracts / min

        total_orders = len(self._orders_by_id)
        avg_queue_len = round(total_orders / max(1, len(self._queues[sym]["bid"]) + len(self._queues[sym]["ask"])), 1)

        buy_vol = st["aggressive_buy_vol"]
        sell_vol = st["aggressive_sell_vol"]
        tot_vol = max(1.0, buy_vol + sell_vol)
        market_pressure_index = round(((buy_vol - sell_vol) / tot_vol) * 100.0, 1)

        return {
            "symbol": sym,
            "total_active_orders": total_orders,
            "trades_per_sec": trades_per_sec,
            "cancel_ratio_pct": cancel_ratio,
            "queue_velocity_min": queue_velocity,
            "avg_queue_length": avg_queue_len,
            "aggressive_buy_volume": round(buy_vol, 2),
            "aggressive_sell_volume": round(sell_vol, 2),
            "market_pressure_index": market_pressure_index,
            "total_volume_traded": round(st["volume_traded"], 2)
        }

    def _record_event(self, event_type: str, order: MBOOrder, fill_qty: float = 0.0):
        evt = {
            "event_id": f"evt-{uuid.uuid4().hex[:6]}",
            "type": event_type,
            "order_id": order.order_id,
            "symbol": order.symbol,
            "price": order.price,
            "quantity": order.quantity,
            "remaining_quantity": order.remaining_quantity,
            "side": order.side,
            "fill_qty": fill_qty,
            "timestamp": int(time.time() * 1000)
        }
        self._event_log.append(evt)
        if len(self._event_log) > 5000:
            self._event_log.pop(0)

    def get_event_history(self, limit: int = 100) -> List[Dict[str, Any]]:
        return self._event_log[-limit:]

mbo_engine = MBOHostEngine()
