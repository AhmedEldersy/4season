from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.deps import get_current_admin
from app.services import order_service
from app.ws_manager import manager

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/orders", response_model=List[schemas.OrderOut])
def list_orders(
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
    status: Optional[models.OrderStatus] = None,
    order_type: Optional[models.OrderType] = None,
    delivery_area_id: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    customer: Optional[str] = None,
    payment_method: Optional[models.PaymentMethod] = None,
):
    q = db.query(models.Order)
    if status:
        q = q.filter(models.Order.status == status)
    if order_type:
        q = q.filter(models.Order.order_type == order_type)
    if delivery_area_id:
        q = q.filter(models.Order.delivery_area_id == delivery_area_id)
    if date_from:
        q = q.filter(models.Order.created_at >= date_from)
    if date_to:
        q = q.filter(models.Order.created_at <= date_to)
    if customer:
        like = f"%{customer}%"
        q = q.filter(
            (models.Order.customer_name.like(like)) | (models.Order.phone.like(like))
        )
    if payment_method:
        q = q.filter(models.Order.payment_method == payment_method)
    return q.order_by(models.Order.created_at.desc()).all()


@router.patch("/orders/{order_id}/status", response_model=schemas.OrderOut)
async def update_order_status(
    order_id: str,
    payload: schemas.OrderStatusUpdateIn,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    order = order_service.update_status(db, order_id, payload.status)
    event = "order_cancelled" if payload.status == models.OrderStatus.CANCELLED else "order_status_changed"
    await manager.broadcast_admin(event, schemas.OrderOut.model_validate(order).model_dump())
    await manager.send_to_customer(order.user_id, "order_status_changed", schemas.OrderOut.model_validate(order).model_dump())
    return order


@router.get("/customers")
def list_customers(db: Session = Depends(get_db), _admin=Depends(get_current_admin), q: Optional[str] = None):
    from sqlalchemy import func

    query = db.query(
        models.User.id,
        models.User.name,
        models.User.email,
        models.User.phone,
        models.User.created_at,
        func.count(models.Order.id).label("orders_count"),
        func.coalesce(func.sum(models.Order.total), 0).label("total_spent"),
        func.max(models.Order.created_at).label("last_order_at"),
    ).outerjoin(models.Order, models.Order.user_id == models.User.id).filter(
        models.User.role == models.RoleEnum.CUSTOMER
    )
    if q:
        like = f"%{q}%"
        query = query.filter((models.User.name.like(like)) | (models.User.email.like(like)))
    query = query.group_by(models.User.id).order_by(func.sum(models.Order.total).desc())

    return [
        {
            "id": r.id,
            "name": r.name,
            "email": r.email,
            "phone": r.phone,
            "registered_at": r.created_at,
            "orders_count": r.orders_count,
            "total_spent": round(r.total_spent, 2),
            "last_order_at": r.last_order_at,
        }
        for r in query.all()
    ]
