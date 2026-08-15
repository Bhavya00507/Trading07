import json
import zlib
import base64
import hashlib
import time
import uuid
from typing import List, Dict, Any, Optional

class WorkspaceService:
    @staticmethod
    def compute_checksum(data_str: str) -> str:
        return hashlib.sha256(data_str.encode('utf-8')).hexdigest()

    @staticmethod
    def compress_payload(data_dict: Dict[str, Any]) -> str:
        raw_json = json.dumps(data_dict)
        compressed = zlib.compress(raw_json.encode('utf-8'))
        return base64.b64encode(compressed).decode('utf-8')

    @staticmethod
    def decompress_payload(compressed_str: str) -> Dict[str, Any]:
        try:
            raw_bytes = base64.b64decode(compressed_str.encode('utf-8'))
            decompressed = zlib.decompress(raw_bytes).decode('utf-8')
            return json.loads(decompressed)
        except Exception:
            # Fallback for plain uncompressed JSON strings
            return json.loads(compressed_str)

    @staticmethod
    def get_official_templates() -> List[Dict[str, Any]]:
        return [
          {
            "id": "tpl-scalping",
            "name": "Scalper Pro Desk",
            "category": "Scalping",
            "description": "DOM Ladder, Time & Sales, Level 2 Heatmap, 1s/5s Candlestick Chart, Quick Order Bar",
            "layout": {
              "theme": "dark",
              "active_tabs": ["DOM", "Chart", "TimeSales"],
              "panels": {"dom": True, "chart": True, "prints": True},
              "chart": {"symbol": "BTCUSDT", "timeframe": "1m", "indicators": ["EMA_9", "VWAP"]}
            }
          },
          {
            "id": "tpl-orderflow",
            "name": "Institutional Order Flow",
            "category": "Order Flow",
            "description": "Footprint Imbalance Chart, Delta Profile, Cumulative Volume Delta (CVD), Iceberg Detector",
            "layout": {
              "theme": "dark",
              "active_tabs": ["Footprint", "Delta", "Heatmap"],
              "panels": {"footprint": True, "delta": True, "icebergs": True},
              "chart": {"symbol": "BTCUSDT", "timeframe": "5m", "indicators": ["CVD", "Footprint"]}
            }
          },
          {
            "id": "tpl-options",
            "name": "Institutional Options Desk",
            "category": "Options",
            "description": "Options Chain, Black-Scholes Greeks, 3D Volatility Surface, Risk Graph & Payoff Builder",
            "layout": {
              "theme": "dark",
              "active_tabs": ["OptionsChain", "Greeks", "VolSurface", "RiskGraph"],
              "panels": {"options": True, "greeks": True},
              "chart": {"symbol": "BTCUSDT", "timeframe": "1D", "indicators": ["IV_Percentile"]}
            }
          },
          {
            "id": "tpl-replay",
            "name": "Replay Studio Workspace",
            "category": "Replay",
            "description": "100,000 Candle Historical Market Replay, Replay Order Desk, Replay AI Copilot",
            "layout": {
              "theme": "dark",
              "active_tabs": ["ReplayStudio", "ReplayDOM", "ReplayStats"],
              "panels": {"replay": True},
              "chart": {"symbol": "BTCUSDT", "timeframe": "1m", "replay_mode": True}
            }
          },
          {
            "id": "tpl-swing",
            "name": "Swing Trading Command Center",
            "category": "Swing",
            "description": "Multi-Timeframe Charts (1H, 4H, Daily), Market Scanner, Trade Journal, Portfolio System",
            "layout": {
              "theme": "dark",
              "active_tabs": ["MultiChart", "Scanner", "Journal", "Portfolio"],
              "panels": {"chart": True, "scanner": True},
              "chart": {"symbol": "BTCUSDT", "timeframe": "4H", "indicators": ["EMA_20", "EMA_50", "RSI"]}
            }
          },
          {
            "id": "tpl-crypto",
            "name": "Crypto Volatility Desk",
            "category": "Crypto",
            "description": "BTC/ETH Spot & Futures, Funding Rate Monitor, Liquidation Heatmap, Orderflow DOM",
            "layout": {
              "theme": "dark",
              "active_tabs": ["CryptoDOM", "FundingRates", "Heatmap"],
              "panels": {"chart": True, "funding": True},
              "chart": {"symbol": "BTCUSDT", "timeframe": "15m", "indicators": ["RSI", "MACD"]}
            }
          },
          {
            "id": "tpl-forex",
            "name": "Global Forex & Indices",
            "category": "Forex",
            "description": "EUR/USD, GBP/USD, USD/JPY Correlation Matrix, Economic Calendar, News Stream",
            "layout": {
              "theme": "dark",
              "active_tabs": ["ForexGrid", "EconomicCalendar", "News"],
              "panels": {"forex": True, "news": True},
              "chart": {"symbol": "EURUSD", "timeframe": "1H", "indicators": ["EMA_200"]}
            }
          },
          {
            "id": "tpl-prop",
            "name": "Prop Firm Challenge Workspace",
            "category": "Prop Firm",
            "description": "Risk Desk, Daily Drawdown Tracker, Profit Target Progress, Automated Bracket Orders",
            "layout": {
              "theme": "dark",
              "active_tabs": ["RiskDesk", "Drawdown", "Chart"],
              "panels": {"risk": True, "chart": True},
              "chart": {"symbol": "BTCUSDT", "timeframe": "5m", "indicators": ["ATR", "VWAP"]}
            }
          }
        ]

workspace_service = WorkspaceService()
