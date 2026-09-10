from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.security import decode_token
from app import models
from app.ws_manager import manager

router = APIRouter(tags=["realtime"])


def _authenticate(token: str, db: Session):
    payload = decode_token(token) if token else None
    if not payload:
        return None
    return db.query(models.User).filter(models.User.id == payload["sub"]).first()


@router.websocket("/ws/admin")
async def ws_admin(websocket: WebSocket, token: str = Query(...)):
    db = SessionLocal()
    user = _authenticate(token, db)
    db.close()
    if not user or user.role not in (models.RoleEnum.ADMIN, models.RoleEnum.OWNER):
        await websocket.close(code=4401)
        return

    await manager.connect_admin(websocket)
    try:
        while True:
            await websocket.receive_text()  # keep-alive / ignored pings
    except WebSocketDisconnect:
        manager.disconnect_admin(websocket)


@router.websocket("/ws/orders")
async def ws_customer(websocket: WebSocket, token: str = Query(...)):
    db = SessionLocal()
    user = _authenticate(token, db)
    db.close()
    if not user:
        await websocket.close(code=4401)
        return

    await manager.connect_customer(websocket, user.id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect_customer(websocket, user.id)
