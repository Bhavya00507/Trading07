# app/services/market_session.py
from datetime import datetime
import pytz

CONFIGS = {
    # Forex
    "EURUSD": {"category": "forex", "timezone": "UTC"},
    "GBPUSD": {"category": "forex", "timezone": "UTC"},
    "USDJPY": {"category": "forex", "timezone": "UTC"},
    "USDCHF": {"category": "forex", "timezone": "UTC"},
    "AUDUSD": {"category": "forex", "timezone": "UTC"},
    "NZDUSD": {"category": "forex", "timezone": "UTC"},
    "USDCAD": {"category": "forex", "timezone": "UTC"},
    # Metals
    "XAUUSD": {"category": "metals", "timezone": "UTC"},
    "XAGUSD": {"category": "metals", "timezone": "UTC"},
    "USOIL": {"category": "metals", "timezone": "UTC"},
    "BRENT": {"category": "metals", "timezone": "UTC"},
    # Indices
    "US30": {"category": "indices", "timezone": "America/New_York", "open": "09:30", "close": "16:00"},
    "NAS100": {"category": "indices", "timezone": "America/New_York", "open": "09:30", "close": "16:00"},
    "SPX500": {"category": "indices", "timezone": "America/New_York", "open": "09:30", "close": "16:00"},
    "GER40": {"category": "indices", "timezone": "Europe/Berlin", "open": "09:00", "close": "17:30"},
    "UK100": {"category": "indices", "timezone": "Europe/London", "open": "08:00", "close": "16:30"},
    "JP225": {"category": "indices", "timezone": "Asia/Tokyo", "open": "09:00", "close": "15:00"},
    # Stocks
    "AAPL": {"category": "stocks", "timezone": "America/New_York", "open": "09:30", "close": "16:00"},
    "TSLA": {"category": "stocks", "timezone": "America/New_York", "open": "09:30", "close": "16:00"},
    "MSFT": {"category": "stocks", "timezone": "America/New_York", "open": "09:30", "close": "16:00"},
}

def is_market_open(symbol: str) -> bool:
    sym = symbol.upper()
    config = CONFIGS.get(sym)
    if not config:
        # Default to crypto (24/7)
        return True
    
    category = config["category"]
    if category == "crypto":
        return True
        
    now_utc = datetime.utcnow()
    
    if category == "forex":
        weekday = now_utc.weekday() # Monday=0, Sunday=6
        hour = now_utc.hour
        minute = now_utc.minute
        minutes_since_sunday_00 = ((weekday + 1) % 7) * 1440 + hour * 60 + minute
        
        forex_open = 22 * 60 # Sunday 22:00
        forex_close = 5 * 1440 + 22 * 60 # Friday 22:00
        
        if minutes_since_sunday_00 < forex_open or minutes_since_sunday_00 >= forex_close:
            return False
        return True

    if category == "metals":
        weekday = now_utc.weekday()
        if weekday in (5, 6): # Sat, Sun
            if weekday == 6 and now_utc.hour < 23:
                return False
            if weekday == 5:
                return False
        if now_utc.hour == 23:
            return False
        return True
        
    # Indices & Stocks
    timezone_name = config["timezone"]
    tz = pytz.timezone(timezone_name)
    now_local = datetime.now(tz)
    
    if now_local.weekday() in (5, 6):
        return False
        
    open_h, open_m = map(int, config["open"].split(":"))
    close_h, close_m = map(int, config["close"].split(":"))
    
    local_min = now_local.hour * 60 + now_local.minute
    open_min = open_h * 60 + open_m
    close_min = close_h * 60 + close_m
    
    if local_min < open_min or local_min >= close_min:
        return False
        
    return True
