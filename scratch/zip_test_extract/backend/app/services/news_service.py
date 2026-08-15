import httpx
import xml.etree.ElementTree as ET
import logging
import time
import re
from datetime import datetime
from typing import List, Dict, Any

logger = logging.getLogger("news_service")

class NewsService:
    def __init__(self):
        self.calendar_url = "https://www.forexfactory.com/ffcal_week_this.xml"
        # Yahoo Finance RSS Feed for global financial news (legal, open alternative to Bloomberg)
        self.news_url = "https://finance.yahoo.com/news/rssindex"
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
        }
        self.cached_news = []
        self.cached_calendar = []
        self.last_news_fetch = 0
        self.last_cal_fetch = 0
        self.cache_ttl = 300 # 5 minutes

    async def get_news(self) -> List[Dict[str, Any]]:
        now = time.time()
        if self.cached_news and (now - self.last_news_fetch < self.cache_ttl):
            return self.cached_news

        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(self.news_url, headers=self.headers, timeout=5.0)
            if resp.status_code == 200:
                root = ET.fromstring(resp.content)
                items = root.findall(".//item")
                parsed_news = []
                for i, item in enumerate(items[:20]):
                    title = item.find("title")
                    desc = item.find("description")
                    pub_date = item.find("pubDate")
                    
                    headline = title.text if title is not None else "Financial News Update"
                    summary = desc.text if desc is not None else ""
                    if summary:
                        summary = re.sub('<[^<]+?>', '', summary)
                    
                    pub_str = pub_date.text if pub_date is not None else ""
                    timestamp = int(time.time() * 1000)
                    if pub_str:
                        try:
                            # Parse pubDate like "Tue, 30 Jun 2026 12:00:00 GMT"
                            dt = datetime.strptime(pub_str[:25].strip(), "%a, %d %b %Y %H:%M:%S")
                            timestamp = int(dt.timestamp() * 1000)
                        except Exception:
                            pass
                    
                    # Sentiment heuristic
                    sentiment = "neutral"
                    h_lower = headline.lower()
                    s_lower = summary.lower() if summary else ""
                    if any(w in h_lower or w in s_lower for w in ["surge", "rise", "rally", "boost", "growth", "gain", "bullish", "jump"]):
                        sentiment = "bullish"
                    elif any(w in h_lower or w in s_lower for w in ["drop", "fall", "plunge", "decline", "bearish", "loss", "slump"]):
                        sentiment = "bearish"
                    
                    # Category heuristic
                    category = "forex"
                    if any(w in h_lower or w in s_lower for w in ["btc", "eth", "crypto", "bitcoin", "ethereum", "solana", "coinbase"]):
                        category = "crypto"
                    elif any(w in h_lower or w in s_lower for w in ["gold", "silver", "xau", "xag", "oil", "brent", "crude", "metal"]):
                        category = "metals"
                    elif any(w in h_lower or w in s_lower for w in ["spx", "nasdaq", "nas100", "dow", "us30", "dax", "ftse", "indices"]):
                        category = "indices"

                    parsed_news.append({
                        "id": f"rss_{i}_{timestamp}",
                        "time": "Recent",
                        "source": "YAHOO_FINANCE",
                        "headline": headline,
                        "summary": summary[:300] + "..." if len(summary) > 300 else summary,
                        "symbols": self._extract_symbols(headline + " " + (summary or "")),
                        "sentiment": sentiment,
                        "category": category,
                        "timestamp": timestamp
                    })
                
                if parsed_news:
                    self.cached_news = parsed_news
                    self.last_news_fetch = now
                    return parsed_news
        except Exception as e:
            logger.error(f"Failed to fetch RSS news feed: {e}")

        # Fallback to simulated news
        return self._get_simulated_news()

    async def get_calendar(self) -> List[Dict[str, Any]]:
        now = time.time()
        if self.cached_calendar and (now - self.last_cal_fetch < self.cache_ttl):
            return self.cached_calendar

        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(self.calendar_url, headers=self.headers, timeout=5.0)
            if resp.status_code == 200:
                root = ET.fromstring(resp.content)
                events = root.findall(".//event")
                parsed_events = []
                for i, ev in enumerate(events):
                    title = ev.find("title")
                    country = ev.find("country")
                    date_str = ev.find("date")
                    time_str = ev.find("time")
                    impact = ev.find("impact")
                    forecast = ev.find("forecast")
                    previous = ev.find("previous")

                    # Parse values
                    t_val = title.text if title is not None else ""
                    c_val = country.text if country is not None else "USD"
                    d_val = date_str.text if date_str is not None else ""
                    tm_val = time_str.text if time_str is not None else ""
                    imp_val = impact.text if impact is not None else "Low"
                    f_val = forecast.text if forecast is not None else ""
                    p_val = previous.text if previous is not None else ""

                    ts = int(time.time() * 1000)
                    if d_val and tm_val:
                        try:
                            dt_str = f"{d_val} {tm_val}"
                            dt = datetime.strptime(dt_str, "%m-%d-%Y %I:%M%p")
                            ts = int(dt.timestamp() * 1000)
                        except Exception:
                            pass

                    parsed_events.append({
                        "id": f"cal_{i}_{ts}",
                        "timeLabel": tm_val if tm_val else "All Day",
                        "currency": c_val,
                        "event": t_val,
                        "importance": imp_val.upper() if imp_val.upper() in ["HIGH", "MEDIUM", "LOW"] else "LOW",
                        "forecast": f_val,
                        "previous": p_val,
                        "timestamp": ts,
                        "volatilityImpactRatio": "3.5x" if imp_val.upper() == "HIGH" else "1.5x",
                        "overlap": "NY / LDN" if c_val in ["USD", "GBP", "EUR"] else "Asian"
                    })
                
                if parsed_events:
                    self.cached_calendar = parsed_events
                    self.last_cal_fetch = now
                    return parsed_events
        except Exception as e:
            logger.error(f"Failed to fetch ForexFactory calendar XML: {e}")

        # Fallback to simulated calendar
        return self._get_simulated_calendar()

    def _extract_symbols(self, text: str) -> List[str]:
        symbols = []
        t_upper = text.upper()
        if "BITCOIN" in t_upper or "BTC" in t_upper:
            symbols.append("BTCUSD")
        if "ETHER" in t_upper or "ETH" in t_upper:
            symbols.append("ETHUSD")
        if "GOLD" in t_upper or "XAU" in t_upper:
            symbols.append("XAUUSD")
        if "SILVER" in t_upper or "XAG" in t_upper:
            symbols.append("XAGUSD")
        if "EURO" in t_upper or "EUR" in t_upper:
            symbols.append("EURUSD")
        if "STERLING" in t_upper or "GBP" in t_upper:
            symbols.append("GBPUSD")
        if "YEN" in t_upper or "JPY" in t_upper:
            symbols.append("USDJPY")
        if "DOW" in t_upper or "US30" in t_upper:
            symbols.append("US30")
        if "NASDAQ" in t_upper or "NAS100" in t_upper:
            symbols.append("NAS100")
        if "S&P" in t_upper or "SPX500" in t_upper:
            symbols.append("SPX500")
        if "OIL" in t_upper or "CRUDE" in t_upper or "USOIL" in t_upper:
            symbols.append("USOIL")
        if "BRENT" in t_upper:
            symbols.append("BRENT")
        return symbols if symbols else ["BTCUSD"]

    def _get_simulated_news(self) -> List[Dict[str, Any]]:
        now = int(time.time() * 1000)
        return [
            {
                "id": "1",
                "time": "Just now",
                "source": "REUTERS",
                "headline": "Bitcoin Eyes $70k Resistance as Institutional Inflows Accelerate",
                "summary": "Spot Bitcoin ETFs recorded a net inflow of $350 million yesterday, marking five consecutive days of positive inflows.",
                "symbols": ["BTCUSD", "ETHUSD"],
                "sentiment": "bullish",
                "category": "crypto",
                "timestamp": now - 60000
            },
            {
                "id": "2",
                "time": "25 mins ago",
                "source": "BLOOMBERG",
                "headline": "Fed Chair Powell Hints at Rate Path as Inflation Moderates",
                "summary": "In his latest address, Federal Reserve Chair Jerome Powell suggested that while inflation is moderating, the committee will remain data-dependent.",
                "symbols": ["US30", "SPX500", "NAS100", "EURUSD"],
                "sentiment": "neutral",
                "category": "indices",
                "timestamp": now - 25 * 60000
            },
            {
                "id": "3",
                "time": "45 mins ago",
                "source": "CNBC",
                "headline": "Gold Surges to Record Highs Amid Geopolitical Uncertainties",
                "summary": "Spot gold prices hovered near all-time highs as safe-haven demand continues to drive investors. Silver followed the rally, breaching key resistance.",
                "symbols": ["XAUUSD", "XAGUSD"],
                "sentiment": "bullish",
                "category": "metals",
                "timestamp": now - 45 * 60000
            }
        ]

    def _get_simulated_calendar(self) -> List[Dict[str, Any]]:
        now = int(time.time() * 1000)
        return [
            { "id": "1", "timeLabel": "14:30", "currency": "USD", "event": "Non-Farm Employment Change (NFP)", "importance": "HIGH", "forecast": "185K", "previous": "175K", "timestamp": now + 50 * 60 * 1000, "volatilityImpactRatio": "4.8x", "overlap": "NY / LDN" },
            { "id": "2", "timeLabel": "14:30", "currency": "USD", "event": "Unemployment Rate", "importance": "HIGH", "forecast": "3.9%", "previous": "3.8%", "timestamp": now + 50 * 60 * 1000, "volatilityImpactRatio": "3.2x", "overlap": "NY / LDN" },
            { "id": "3", "timeLabel": "11:30", "currency": "GBP", "event": "CPI y/y", "importance": "HIGH", "forecast": "2.1%", "previous": "2.3%", "timestamp": now - 30 * 60000, "volatilityImpactRatio": "3.5x", "overlap": "London" }
        ]

news_service = NewsService()
