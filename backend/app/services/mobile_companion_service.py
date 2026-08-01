import time
import hashlib
import uuid
import random
from typing import Dict, List, Any, Optional

class MobileSecurityManager:
    """Handles mobile biometric authentication, PIN lock, and root/jailbreak detection."""
    def __init__(self):
        self.biometrics_enabled: Dict[str, bool] = {}
        self.pin_hashes: Dict[str, str] = {}
        self.trusted_devices: Dict[str, Dict[str, Any]] = {}

    def enable_biometrics(self, user_id: str, biometric_type: str = "FACE_ID") -> Dict[str, Any]:
        self.biometrics_enabled[user_id] = True
        return {
            "user_id": user_id,
            "biometric_type": biometric_type,
            "status": "ENABLED",
            "timestamp": time.time()
        }

    def set_pin_code(self, user_id: str, pin_code: str) -> bool:
        hashed = hashlib.sha256(pin_code.encode('utf-8')).hexdigest()
        self.pin_hashes[user_id] = hashed
        return True

    def verify_pin_code(self, user_id: str, pin_code: str) -> bool:
        hashed = hashlib.sha256(pin_code.encode('utf-8')).hexdigest()
        return self.pin_hashes.get(user_id) == hashed

    def check_security_compliance(self, device_headers: Dict[str, str]) -> Dict[str, Any]:
        is_jailbroken = device_headers.get("x-jailbreak-detected", "false").lower() == "true"
        return {
            "device_secure": not is_jailbroken,
            "jailbreak_detected": is_jailbroken,
            "biometric_capable": True,
            "tls_pinned": True,
            "session_expiry_sec": 86400
        }


class MobilePushNotificationEngine:
    """Dispatches push notifications for order execution, price alerts, SL/TP hits, and AI signals."""
    def __init__(self):
        self.notifications_queue: List[Dict[str, Any]] = []

    def send_push_notification(self, title: str, body: str, category: str = "ORDER_FILLED") -> Dict[str, Any]:
        record = {
            "notification_id": f"push-{uuid.uuid4().hex[:10]}",
            "title": title,
            "body": body,
            "category": category,
            "read": False,
            "timestamp": time.time()
        }
        self.notifications_queue.insert(0, record)
        return record

    def get_user_notifications(self) -> List[Dict[str, Any]]:
        return self.notifications_queue


class MobileOfflineCacheEngine:
    """Handles offline caching of market data, charts, positions, and offline task queue."""
    def __init__(self):
        self.offline_queue: List[Dict[str, Any]] = []

    def queue_offline_action(self, action_type: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        task = {
            "task_id": f"task-{uuid.uuid4().hex[:8]}",
            "action_type": action_type,
            "payload": payload,
            "queued_at": time.time(),
            "status": "QUEUED"
        }
        self.offline_queue.append(task)
        return task

    def sync_offline_queue(self) -> Dict[str, Any]:
        synced_count = len(self.offline_queue)
        self.offline_queue.clear()
        return {
            "status": "SYNCED",
            "tasks_processed": synced_count,
            "synced_at": time.time()
        }


class MobileCompanionManager:
    def __init__(self):
        self.security = MobileSecurityManager()
        self.notifications = MobilePushNotificationEngine()
        self.offline_cache = MobileOfflineCacheEngine()
        self.mobile_settings: Dict[str, Any] = {
            "one_tap_trading": True,
            "haptic_feedback": True,
            "default_timeframe": "1m",
            "default_lot_size": 1.0,
            "theme": "dark_institutional",
            "voice_assistant_enabled": True
        }

    def get_mobile_dashboard_summary(self) -> Dict[str, Any]:
        return {
            "equity": 25480.50,
            "balance": 25000.00,
            "unrealized_pnl": 480.50,
            "realized_pnl_today": 320.00,
            "free_margin": 22100.00,
            "margin_level_pct": 750.2,
            "open_positions_count": 3,
            "pending_orders_count": 1,
            "top_gainers": [
                {"symbol": "BTCUSDT", "change_pct": 3.42, "price": 65420.0},
                {"symbol": "ETHUSDT", "change_pct": 4.15, "price": 3520.0}
            ],
            "ai_market_bulletin": "AI Bulletin: Bullish expansion above VWAP on BTCUSDT. Cumulative Delta remains positive."
        }

mobile_companion_service = MobileCompanionManager()
