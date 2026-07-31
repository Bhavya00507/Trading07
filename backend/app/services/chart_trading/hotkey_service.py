from typing import Dict, Any, Optional

class HotkeyService:
    """
    Manages configurable hotkeys and dispatches keyboard actions for chart trading.
    """

    DEFAULT_HOTKEYS = {
        "buy": "KeyB",
        "sell": "KeyS",
        "cancel_selected": "Delete",
        "cancel_drag": "Escape",
        "undo": "KeyZ",
        "redo": "KeyY",
        "center_chart": "Space",
    }

    @classmethod
    def dispatch_hotkey_action(
        cls,
        key_code: str,
        modifiers: Optional[Dict[str, bool]] = None,
        custom_bindings: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        """
        Maps a keyboard event key code to the corresponding trading action.
        """
        bindings = {**cls.DEFAULT_HOTKEYS, **(custom_bindings or {})}
        ctrl_down = (modifiers or {}).get("ctrl", False) or (modifiers or {}).get("meta", False)

        action = None
        if ctrl_down and key_code == bindings["undo"]:
            action = "undo"
        elif ctrl_down and key_code == bindings["redo"]:
            action = "redo"
        elif key_code == bindings["buy"]:
            action = "buy_market"
        elif key_code == bindings["sell"]:
            action = "sell_market"
        elif key_code == bindings["cancel_selected"]:
            action = "cancel_selected_order"
        elif key_code == bindings["cancel_drag"]:
            action = "cancel_drag"
        elif key_code == bindings["center_chart"]:
            action = "center_chart"

        return {
            "key_code": key_code,
            "action": action,
            "is_mapped": action is not None,
            "bindings": bindings,
        }
