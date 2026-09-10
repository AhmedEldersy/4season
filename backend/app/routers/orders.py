import asyncio
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.deps import get_current_user, require_complete_profile
from app.services import order_service
from app.ws_manager import manager

router = APIRouter(prefix="/orders", tags=["orders"])


@router.post("", response_model=schemas.OrderOut)
async def checkout(
    payload: schemas.CheckoutIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_complete_profile),
):
    order = order_service.create_order(db, user, payload)

    await manager.broadcast_admin("new_order", schemas.OrderOut.model_validate(order).model_dump())
    return order


@router.get("", response_model=List[schemas.OrderOut])
def list_my_orders(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    return (
        db.query(models.Order)
        .filter(models.Order.user_id == user.id)
        .order_by(models.Order.created_at.desc())
        .all()
    )


@router.get("/{order_id}", response_model=schemas.OrderOut)
def get_order(order_id: str, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.user_id != user.id and user.role == models.RoleEnum.CUSTOMER:
        raise HTTPException(status_code=403, detail="Not authorized to view this order")
    return order


@router.post("/{order_id}/cancel", response_model=schemas.OrderOut)
async def cancel_order(
    order_id: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    order = order_service.cancel_order(db, user, order_id)
    await manager.broadcast_admin("order_cancelled", schemas.OrderOut.model_validate(order).model_dump())
    return order
