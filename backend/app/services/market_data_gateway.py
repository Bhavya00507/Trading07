import time
import math
import random
import uuid
from typing import Dict, List, Any, Optional

class SymbolMapperEngine:
    """Translates broker/exchange symbol variations to internal canonical symbols."""
    
    MAP = {
        # Forex
        "EURUSD.C": "EURUSD", "6E": "EURUSD", "EUR.USD": "EURUSD", "EUR/USD": "EURUSD",
        "GBPUSD.C": "GBPUSD", "6B": "GBPUSD", "GBP.USD": "GBPUSD", "GBP/USD": "GBPUSD",
        "USDJPY.C": "USDJPY", "6J": "USDJPY", "USD.JPY": "USDJPY", "USD/JPY": "USDJPY",
        # Crypto
        "XBTUSD": "BTCUSDT", "BTC/USD": "BTCUSDT", "BTC-PERP": "BTCUSDT", "BTCUSDT.P": "BTCUSDT",
        "ETH/USD": "ETHUSDT", "ETH-PERP": "ETHUSDT", "ETHUSDT.P": "ETHUSDT",
        # Metals & Commodities
        "GC": "XAUUSD", "GOLD": "XAUUSD", "XAU/USD": "XAUUSD",
        "SI": "XAGUSD", "SILVER": "XAGUSD", "XAG/USD": "XAGUSD",
        # Indices
        "YM": "US30", "DJI": "US30",
        "NQ": "NAS100", "NDX": "NAS100",
        "ES": "SPX500", "SPX": "SPX500"
    }

    @staticmethod
    def resolve_symbol(raw_symbol: str) -> str:
        clean = raw_symbol.upper().strip()
        return SymbolMapperEngine.MAP.get(clean, clean)


class AbstractMarketDataProvider:
    def __init__(self, provider_name: str):
        self.name = provider_name
        self.is_connected = False
        self.current_latency_ms = random.uniform(5.0, 25.0)
        self.packet_loss_pct = 0.0
        self.reconnect_count = 0
        self.heartbeat_last = time.time()
        self.uptime_start = time.time()
        self.subscriptions = set()

    def connect(self) -> bool:
        self.is_connected = True
        self.heartbeat_last = time.time()
        return True

    def disconnect(self) -> bool:
        self.is_connected = False
        return True

    def subscribe(self, symbol: str) -> bool:
        canonical = SymbolMapperEngine.resolve_symbol(symbol)
        self.subscriptions.add(canonical)
        return True

    def unsubscribe(self, symbol: str) -> bool:
        canonical = SymbolMapperEngine.resolve_symbol(symbol)
        self.subscriptions.discard(canonical)
        return True

    def get_level1(self, symbol: str, base_price: float = 65000.0) -> Dict[str, Any]:
        canonical = SymbolMapperEngine.resolve_symbol(symbol)
        spread = 0.50 if "BTC" in canonical else 0.0001
        bid = round(base_price - spread / 2.0, 4)
        ask = round(base_price + spread / 2.0, 4)
        return {
            "symbol": canonical,
            "provider": self.name,
            "bid": bid,
            "ask": ask,
            "last": base_price,
            "bid_size": 12.5,
            "ask_size": 18.2,
            "timestamp_us": int(time.time() * 1000000)
        }

    def get_level2(self, symbol: str, base_price: float = 65000.0, depth: int = 10) -> Dict[str, Any]:
        canonical = SymbolMapperEngine.resolve_symbol(symbol)
        bids = []
        asks = []
        step = 10.0 if "BTC" in canonical else 0.0001

        for i in range(depth):
            b_price = round(base_price - (i + 1) * step, 4)
            a_price = round(base_price + (i + 1) * step, 4)
            bids.append({"price": b_price, "size": round(random.uniform(0.5, 10.0), 2), "orders": random.randint(1, 8)})
            asks.append({"price": a_price, "size": round(random.uniform(0.5, 10.0), 2), "orders": random.randint(1, 8)})

        return {
            "symbol": canonical,
            "provider": self.name,
            "bids": bids,
            "asks": asks,
            "timestamp_us": int(time.time() * 1000000)
        }

    def get_trades(self, symbol: str, count: int = 20) -> List[Dict[str, Any]]:
        canonical = SymbolMapperEngine.resolve_symbol(symbol)
        trades = []
        now_us = int(time.time() * 1000000)
        for i in range(count):
            side = "BUY" if i % 2 == 0 else "SELL"
            trades.append({
                "trade_id": f"trd-{now_us}-{i}",
                "symbol": canonical,
                "provider": self.name,
                "price": round(65000.0 + random.uniform(-15.0, 15.0), 2),
                "size": round(random.uniform(0.1, 5.0), 2),
                "aggressor_side": side,
                "timestamp_us": now_us - (i * 1000)
            })
        return trades

    def health(self) -> Dict[str, Any]:
        uptime_sec = int(time.time() - self.uptime_start)
        return {
            "name": self.name,
            "connected": self.is_connected,
            "latency_ms": round(self.current_latency_ms, 2),
            "packet_loss_pct": self.packet_loss_pct,
            "reconnects": self.reconnect_count,
            "heartbeat_age_sec": round(time.time() - self.heartbeat_last, 1),
            "uptime_sec": uptime_sec,
            "subscriptions_count": len(self.subscriptions)
        }

    def latency(self) -> float:
        return self.current_latency_ms


# Concrete Institutional Providers
class RithmicProvider(AbstractMarketDataProvider):
    def __init__(self): super().__init__("Rithmic Institutional")

class IBKRProvider(AbstractMarketDataProvider):
    def __init__(self): super().__init__("Interactive Brokers TWS")

class CQGProvider(AbstractMarketDataProvider):
    def __init__(self): super().__init__("CQG Architecture Ready")

class MT5Provider(AbstractMarketDataProvider):
    def __init__(self): super().__init__("MetaTrader 5 Gateway")

class BinanceProvider(AbstractMarketDataProvider):
    def __init__(self): super().__init__("Binance Institutional WS")

class BybitProvider(AbstractMarketDataProvider):
    def __init__(self): super().__init__("Bybit Ultra Direct")

class WebSocketProvider(AbstractMarketDataProvider):
    def __init__(self): super().__init__("Unified Quantum WS Gateway")


class MarketDataGatewayManager:
    def __init__(self):
        self.providers: Dict[str, AbstractMarketDataProvider] = {
            "rithmic": RithmicProvider(),
            "ibkr": IBKRProvider(),
            "cqg": CQGProvider(),
            "mt5": MT5Provider(),
            "binance": BinanceProvider(),
            "bybit": BybitProvider(),
            "quantum_ws": WebSocketProvider()
        }
        self.primary_provider_id = "rithmic"
        self.failover_active = False
        self.dropped_packets_total = 0

        # Auto-connect all
        for p in self.providers.values():
            p.connect()

    def get_active_provider(self) -> AbstractMarketDataProvider:
        p = self.providers.get(self.primary_provider_id)
        if p and p.is_connected and p.latency() < 200.0:
            return p

        # Trigger Failover to fastest healthy backup provider
        self.failover_active = True
        healthy = [prov for prov in self.providers.values() if prov.is_connected]
        healthy.sort(key=lambda x: x.latency())
        return healthy[0] if healthy else self.providers["quantum_ws"]

    def get_all_provider_statuses(self) -> List[Dict[str, Any]]:
        active = self.get_active_provider()
        res = []
        for pid, prov in self.providers.items():
            h = prov.health()
            h["id"] = pid
            h["is_primary"] = (pid == self.primary_provider_id)
            h["is_active_route"] = (prov.name == active.name)
            res.append(h)
        return res

    def get_level1(self, symbol: str, price: float = 65000.0) -> Dict[str, Any]:
        prov = self.get_active_provider()
        return prov.get_level1(symbol, price)

    def get_level2(self, symbol: str, price: float = 65000.0) -> Dict[str, Any]:
        prov = self.get_active_provider()
        return prov.get_level2(symbol, price)

    def get_trades(self, symbol: str) -> List[Dict[str, Any]]:
        prov = self.get_active_provider()
        return prov.get_trades(symbol)

    def get_history(self, symbol: str, timeframe: str = "1m", limit: int = 100) -> Dict[str, Any]:
        canonical = SymbolMapperEngine.resolve_symbol(symbol)
        now = time.time()
        candles = []
        base_price = 65000.0 if "BTC" in canonical else 1.17

        for i in range(limit):
            t = now - (limit - i) * 60
            o = base_price + random.uniform(-10, 10)
            h = o + random.uniform(0, 15)
            l = o - random.uniform(0, 15)
            c = (h + l) / 2.0
            v = random.uniform(10, 200)
            candles.append({"timestamp": int(t), "open": round(o, 2), "high": round(h, 2), "low": round(l, 2), "close": round(c, 2), "volume": round(v, 2)})

        return {
            "symbol": canonical,
            "provider": self.get_active_provider().name,
            "timeframe": timeframe,
            "candles_count": len(candles),
            "candles": candles
        }

market_data_gateway = MarketDataGatewayManager()
