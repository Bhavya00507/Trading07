import json
import asyncio
import uuid
from datetime import datetime, timezone
from uuid import UUID
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, status
from app.websocket.manager import manager
from app.core.auth import decode_access_token

router = APIRouter()

def _resolve_user_id(token: str | None) -> UUID:
    if token:
        payload = decode_access_token(token)
        if payload and "user_id" in payload:
            try:
                return UUID(payload["user_id"])
            except ValueError:
                pass
    return uuid.uuid4()

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(None)):
    user_id = _resolve_user_id(token)

    await manager.connect(websocket, user_id)
    print(f"--> WS [user] Connected: {user_id}")
    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("type") == "ping":
                    pong_msg = {
                        "type": "pong",
                        "timestamp": int(datetime.now(timezone.utc).timestamp() * 1000)
                    }
                    if "event_id" in msg:
                        pong_msg["event_id"] = msg["event_id"]
                    manager.send_to_socket(websocket, json.dumps(pong_msg))
                    print(f"<-- WS [user] Sent Pong to {user_id}: {pong_msg.get('event_id')}")
                else:
                    print(f"--> WS [user] Received Message from {user_id}: {msg}")
            except Exception as e:
                print(f"WS [user] Parse Error: {str(e)}")
    except WebSocketDisconnect:
        print(f"<-- WS [user] Disconnected: {user_id}")
    except Exception as e:
        print(f"WS [user] Error: {str(e)}")
    finally:
        manager.disconnect(websocket)

@router.websocket("/ws/market")
async def websocket_market_endpoint(websocket: WebSocket, token: str = Query(None)):
    user_id = _resolve_user_id(token)

    await manager.connect(websocket, user_id)
    print(f"--> WS [market] Connected: {user_id}")
    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("type") == "ping":
                    pong_msg = {
                        "type": "pong",
                        "timestamp": int(datetime.now(timezone.utc).timestamp() * 1000)
                    }
                    if "event_id" in msg:
                        pong_msg["event_id"] = msg["event_id"]
                    manager.send_to_socket(websocket, json.dumps(pong_msg))
                    print(f"<-- WS [market] Sent Pong to {user_id}: {pong_msg.get('event_id')}")
                else:
                    print(f"--> WS [market] Received Message from {user_id}: {msg}")
            except Exception as e:
                print(f"WS [market] Parse Error: {str(e)}")
    except WebSocketDisconnect:
        print(f"<-- WS [market] Disconnected: {user_id}")
    except Exception as e:
        print(f"WS [market] Error: {str(e)}")
    finally:
        manager.disconnect(websocket)
