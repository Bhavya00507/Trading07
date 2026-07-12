import asyncio
from typing import List, Dict
from fastapi import WebSocket
from uuid import UUID

class ConnectionManager:
    def __init__(self):
        # Map user_id to active WebSocket list
        self.active_connections: Dict[UUID, List[WebSocket]] = {}
        # Map WebSocket to asyncio.Queue
        self.queues: Dict[WebSocket, asyncio.Queue] = {}
        # Map WebSocket to consumer task
        self.tasks: Dict[WebSocket, asyncio.Task] = {}

    async def connect(self, websocket: WebSocket, user_id: UUID):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
        
        # Create queue and consumer task
        queue = asyncio.Queue()
        self.queues[websocket] = queue
        self.tasks[websocket] = asyncio.create_task(self._send_loop(websocket, queue))

    def disconnect(self, websocket: WebSocket):
        # Cancel background task
        task = self.tasks.pop(websocket, None)
        if task:
            task.cancel()
        self.queues.pop(websocket, None)
        
        for user_id, conns in list(self.active_connections.items()):
            if websocket in conns:
                conns.remove(websocket)
                if not conns:
                    del self.active_connections[user_id]
                break

    async def _send_loop(self, websocket: WebSocket, queue: asyncio.Queue):
        try:
            while True:
                message = await queue.get()
                try:
                    await websocket.send_text(message)
                except Exception:
                    break
                queue.task_done()
        except asyncio.CancelledError:
            pass

    def send_to_socket(self, websocket: WebSocket, message: str):
        queue = self.queues.get(websocket)
        if queue:
            queue.put_nowait(message)

    async def send_to_user(self, user_id: UUID, message: str):
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                queue = self.queues.get(connection)
                if queue:
                    # Put inside a try/except or non-blocking call
                    queue.put_nowait(message)

    async def broadcast(self, message: str):
        for conns in self.active_connections.values():
            for connection in conns:
                queue = self.queues.get(connection)
                if queue:
                    queue.put_nowait(message)

    async def broadcast_event(self, event_type: str, data: dict, user_id: UUID = None, extra: dict = None):
        import uuid
        import json
        from datetime import datetime
        payload = {
            "event_id": str(uuid.uuid4()),
            "timestamp": int(datetime.utcnow().timestamp() * 1000),
            "type": event_type,
            "data": data
        }
        if extra:
            payload.update(extra)
        
        msg_str = json.dumps(payload)
        if user_id:
            await self.send_to_user(user_id, msg_str)
        else:
            await self.broadcast(msg_str)

manager = ConnectionManager()
