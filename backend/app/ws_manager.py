import json
from typing import Dict, List

from fastapi import WebSocket


class ConnectionManager:
    """Keeps track of connected admin sockets and per-customer sockets.

    For a single-process deployment this in-memory manager is sufficient.
    For multi-process/horizontal scaling, replace with a Redis pub/sub backed
    implementation (the public interface below would stay identical).
    """

    def __init__(self):
        self.admin_connections: List[WebSocket] = []
        self.customer_connections: Dict[str, List[WebSocket]] = {}

    async def connect_admin(self, ws: WebSocket):
        await ws.accept()
        self.admin_connections.append(ws)

    def disconnect_admin(self, ws: WebSocket):
        if ws in self.admin_connections:
            self.admin_connections.remove(ws)

    async def connect_customer(self, ws: WebSocket, user_id: str):
        await ws.accept()
        self.customer_connections.setdefault(user_id, []).append(ws)

    def disconnect_customer(self, ws: WebSocket, user_id: str):
        conns = self.customer_connections.get(user_id, [])
        if ws in conns:
            conns.remove(ws)

    async def broadcast_admin(self, event: str, payload: dict):
        message = json.dumps({"event": event, "data": payload}, default=str)
        dead = []
        for conn in self.admin_connections:
            try:
                await conn.send_text(message)
            except Exception:
                dead.append(conn)
        for d in dead:
            self.disconnect_admin(d)

    async def send_to_customer(self, user_id: str, event: str, payload: dict):
        message = json.dumps({"event": event, "data": payload}, default=str)
        dead = []
        for conn in self.customer_connections.get(user_id, []):
            try:
                await conn.send_text(message)
            except Exception:
                dead.append(conn)
        for d in dead:
            self.disconnect_customer(d, user_id)


manager = ConnectionManager()
