from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.deps import get_current_admin

router = APIRouter(tags=["delivery-areas"])


@router.get("/delivery-areas", response_model=List[schemas.DeliveryAreaOut])
def list_active_delivery_areas(db: Session = Depends(get_db)):
    """Public endpoint: only active areas, for the checkout screen."""
    return (
        db.query(models.DeliveryArea)
        .filter(models.DeliveryArea.is_active.is_(True))
        .order_by(models.DeliveryArea.sort_order, models.DeliveryArea.name)
        .all()
    )


@router.get("/admin/delivery-areas", response_model=List[schemas.DeliveryAreaAdminOut])
def admin_list_delivery_areas(db: Session = Depends(get_db), _admin=Depends(get_current_admin)):
    rows = (
        db.query(
            models.DeliveryArea,
            func.count(models.Order.id).label("orders_count"),
        )
        .outerjoin(models.Order, models.Order.delivery_area_id == models.DeliveryArea.id)
        .group_by(models.DeliveryArea.id)
        .order_by(models.DeliveryArea.sort_order, models.DeliveryArea.name)
        .all()
    )
    out = []
    for area, orders_count in rows:
        item = schemas.DeliveryAreaAdminOut.model_validate(area)
        item.orders_count = orders_count or 0
        out.append(item)
    return out


@router.post("/admin/delivery-areas", response_model=schemas.DeliveryAreaAdminOut, status_code=201)
def create_delivery_area(
    payload: schemas.DeliveryAreaIn,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Area name is required")
    existing = (
        db.query(models.DeliveryArea)
        .filter(func.lower(models.DeliveryArea.name) == name.lower())
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="A delivery area with this name already exists")

    area = models.DeliveryArea(
        name=name, fee=payload.fee, is_active=payload.is_active, sort_order=payload.sort_order
    )
    db.add(area)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="A delivery area with this name already exists")
    db.refresh(area)
    out = schemas.DeliveryAreaAdminOut.model_validate(area)
    out.orders_count = 0
    return out


@router.put("/admin/delivery-areas/{area_id}", response_model=schemas.DeliveryAreaAdminOut)
def update_delivery_area(
    area_id: str,
    payload: schemas.DeliveryAreaIn,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    area = db.query(models.DeliveryArea).filter(models.DeliveryArea.id == area_id).first()
    if not area:
        raise HTTPException(status_code=404, detail="Delivery area not found")

    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Area name is required")
    dup = (
        db.query(models.DeliveryArea)
        .filter(func.lower(models.DeliveryArea.name) == name.lower(), models.DeliveryArea.id != area_id)
        .first()
    )
    if dup:
        raise HTTPException(status_code=400, detail="A delivery area with this name already exists")

    # NOTE: changing `fee` here never touches historical orders -- those
    # keep the delivery_fee/delivery_area_name_snapshot captured at the time
    # they were placed (see Order model + order_service.create_order).
    area.name = name
    area.fee = payload.fee
    area.is_active = payload.is_active
    area.sort_order = payload.sort_order
    db.commit()
    db.refresh(area)

    orders_count = (
        db.query(func.count(models.Order.id))
        .filter(models.Order.delivery_area_id == area.id)
        .scalar()
        or 0
    )
    out = schemas.DeliveryAreaAdminOut.model_validate(area)
    out.orders_count = orders_count
    return out


@router.delete("/admin/delivery-areas/{area_id}", status_code=204)
def delete_delivery_area(
    area_id: str,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    area = db.query(models.DeliveryArea).filter(models.DeliveryArea.id == area_id).first()
    if not area:
        raise HTTPException(status_code=404, detail="Delivery area not found")

    used = db.query(models.Order).filter(models.Order.delivery_area_id == area_id).first()
    if used:
        # Don't destroy historical order data -- deactivate instead, exactly
        # like we do for categories that still have products.
        raise HTTPException(
            status_code=400,
            detail="This area has existing orders and can't be deleted. Deactivate it instead.",
        )

    db.delete(area)
    db.commit()
    return None
