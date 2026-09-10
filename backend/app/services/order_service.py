from datetime import datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app import models, schemas
from app.config import settings


def next_order_number(db: Session) -> int:
    last = db.query(func.max(models.Order.order_number)).scalar()
    return (last or 1000) + 1


# Base forward transitions for the restaurant lifecycle. PICKUP orders skip
# OUT_FOR_DELIVERY entirely (see _allowed_next below), since there's no
# courier leg for a pickup order.
NEXT_STATUS = {
    models.OrderStatus.PENDING: {models.OrderStatus.ACCEPTED, models.OrderStatus.CANCELLED},
    models.OrderStatus.ACCEPTED: {models.OrderStatus.PREPARING, models.OrderStatus.CANCELLED},
    models.OrderStatus.PREPARING: {models.OrderStatus.READY},
    models.OrderStatus.READY: {models.OrderStatus.OUT_FOR_DELIVERY, models.OrderStatus.DELIVERED},
    models.OrderStatus.OUT_FOR_DELIVERY: {models.OrderStatus.DELIVERED},
    models.OrderStatus.DELIVERED: set(),
    models.OrderStatus.CANCELLED: set(),
}


def _allowed_next(order: models.Order) -> set:
    allowed = set(NEXT_STATUS.get(order.status, set()))
    if order.order_type == models.OrderType.PICKUP:
        # Pickup never goes "out for delivery" -- READY leads straight to
        # DELIVERED (picked up by the customer).
        allowed.discard(models.OrderStatus.OUT_FOR_DELIVERY)
    else:
        # A delivery order can only be marked DELIVERED once it's actually
        # out for delivery.
        if order.status == models.OrderStatus.READY:
            allowed.discard(models.OrderStatus.DELIVERED)
    return allowed


def create_order(db: Session, user: models.User, payload: schemas.CheckoutIn) -> models.Order:
    # ---- Idempotency: if this exact checkout attempt was already
    # submitted (double-click, retried request after a flaky response),
    # return the existing order instead of creating a duplicate. ----
    if payload.idempotency_key:
        existing = (
            db.query(models.Order)
            .filter(models.Order.idempotency_key == payload.idempotency_key)
            .first()
        )
        if existing:
            return existing

    if not payload.items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    # ---- Resolve order type + delivery area / fee. NEVER trust a fee or
    # total sent by the client -- everything money-related is recomputed
    # here from the database. ----
    delivery_area = None
    delivery_fee = 0.0
    delivery_area_name = None

    if payload.order_type == models.OrderType.DELIVERY:
        if not payload.delivery_area_id:
            raise HTTPException(status_code=400, detail="Please choose a delivery area")
        delivery_area = (
            db.query(models.DeliveryArea)
            .filter(models.DeliveryArea.id == payload.delivery_area_id)
            .first()
        )
        if not delivery_area or not delivery_area.is_active:
            raise HTTPException(status_code=400, detail="Selected delivery area is not available")
        if not payload.address:
            raise HTTPException(status_code=400, detail="Delivery address is required")
        delivery_fee = delivery_area.fee
        delivery_area_name = delivery_area.name
    # PICKUP -> delivery_area stays None, delivery_fee stays 0

    order_items = []
    subtotal = 0.0

    for line in payload.items:
        product = db.query(models.Product).filter(models.Product.id == line.product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {line.product_id} not found")
        if not product.is_available:
            raise HTTPException(status_code=400, detail=f"'{product.name}' is currently unavailable")

        unit_price = product.price
        if line.size == "large" and product.price_large:
            unit_price = product.price_large

        line_subtotal = round(unit_price * line.quantity, 2)
        subtotal += line_subtotal

        order_items.append(
            models.OrderItem(
                product_id=product.id,
                product_name_snapshot=product.name,
                price_snapshot=unit_price,
                size=line.size,
                quantity=line.quantity,
                subtotal=line_subtotal,
                special_instructions=line.special_instructions,
            )
        )

    subtotal = round(subtotal, 2)
    total = round(subtotal + delivery_fee, 2)
    now = datetime.utcnow()

    # ---- Order-number assignment: MAX()+1 alone is a classic race
    # condition under concurrent checkouts (two requests can read the same
    # MAX before either commits). order_number has a UNIQUE constraint, so
    # instead we retry on collision -- this is safe under SQLite AND
    # Postgres without needing a DB-specific sequence/locking strategy. ----
    for attempt in range(5):
        order = models.Order(
            order_number=next_order_number(db),
            user_id=user.id,
            status=models.OrderStatus.PENDING,
            order_type=payload.order_type,
            subtotal=subtotal,
            delivery_fee=delivery_fee,
            delivery_area_id=delivery_area.id if delivery_area else None,
            delivery_area_name_snapshot=delivery_area_name,
            total=total,
            customer_name=payload.customer_name,
            phone=payload.phone,
            address=payload.address,
            building=payload.building,
            apartment=payload.apartment,
            notes=payload.notes,
            idempotency_key=payload.idempotency_key,
            created_at=now,
            cancellation_deadline=now + timedelta(minutes=settings.CANCELLATION_WINDOW_MINUTES),
            items=order_items,
        )
        db.add(order)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            # Duplicate idempotency_key raced in concurrently -> return the
            # winner instead of erroring out the user.
            if payload.idempotency_key:
                winner = (
                    db.query(models.Order)
                    .filter(models.Order.idempotency_key == payload.idempotency_key)
                    .first()
                )
                if winner:
                    return winner
            # Otherwise assume it was an order_number collision and retry
            # with a freshly-read next number.
            order_items = [
                models.OrderItem(
                    product_id=i.product_id,
                    product_name_snapshot=i.product_name_snapshot,
                    price_snapshot=i.price_snapshot,
                    size=i.size,
                    quantity=i.quantity,
                    subtotal=i.subtotal,
                    special_instructions=i.special_instructions,
                )
                for i in order_items
            ]
            continue
        db.refresh(order)
        return order

    raise HTTPException(status_code=500, detail="Could not create order, please try again")


def cancel_order(db: Session, user: models.User, order_id: str) -> models.Order:
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.user_id != user.id:
        raise HTTPException(status_code=403, detail="You cannot cancel another customer's order")
    if order.status == models.OrderStatus.CANCELLED:
        raise HTTPException(status_code=400, detail="Order is already cancelled")
    if order.status != models.OrderStatus.PENDING:
        raise HTTPException(status_code=400, detail="Order can no longer be cancelled")
    if datetime.utcnow() > order.cancellation_deadline:
        raise HTTPException(status_code=400, detail="Cancellation period has expired")

    order.status = models.OrderStatus.CANCELLED
    order.cancelled_at = datetime.utcnow()
    db.commit()
    db.refresh(order)
    return order


def update_status(db: Session, order_id: str, new_status: models.OrderStatus) -> models.Order:
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    allowed = _allowed_next(order)
    if new_status not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot move order from {order.status} to {new_status}",
        )

    order.status = new_status
    now = datetime.utcnow()
    if new_status == models.OrderStatus.ACCEPTED:
        order.accepted_at = now
    elif new_status == models.OrderStatus.CANCELLED:
        order.cancelled_at = now
    elif new_status == models.OrderStatus.DELIVERED:
        order.delivered_at = now

    db.commit()
    db.refresh(order)
    return order
