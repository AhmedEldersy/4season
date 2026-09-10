from datetime import datetime, timedelta

from sqlalchemy import func, extract, case
from sqlalchemy.orm import Session

from app import models

VALID_REVENUE_STATUSES = [
    models.OrderStatus.ACCEPTED,
    models.OrderStatus.PREPARING,
    models.OrderStatus.READY,
    models.OrderStatus.OUT_FOR_DELIVERY,
    models.OrderStatus.DELIVERED,
]


def _range_filter(query, column, start, end):
    if start:
        query = query.filter(column >= start)
    if end:
        query = query.filter(column <= end)
    return query


def overview(db: Session, start: datetime = None, end: datetime = None) -> dict:
    base = db.query(models.Order).filter(models.Order.status.in_(VALID_REVENUE_STATUSES))
    base = _range_filter(base, models.Order.created_at, start, end)

    total_revenue = base.with_entities(func.coalesce(func.sum(models.Order.total), 0)).scalar()
    total_orders = base.with_entities(func.count(models.Order.id)).scalar()
    aov = round(total_revenue / total_orders, 2) if total_orders else 0

    total_customers = db.query(func.count(models.User.id)).filter(
        models.User.role == models.RoleEnum.CUSTOMER
    ).scalar()

    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_q = db.query(models.Order).filter(
        models.Order.status.in_(VALID_REVENUE_STATUSES),
        models.Order.created_at >= today_start,
    )
    today_revenue = today_q.with_entities(func.coalesce(func.sum(models.Order.total), 0)).scalar()
    today_orders = today_q.with_entities(func.count(models.Order.id)).scalar()

    pending_orders = db.query(func.count(models.Order.id)).filter(
        models.Order.status == models.OrderStatus.PENDING
    ).scalar()
    completed_orders = db.query(func.count(models.Order.id)).filter(
        models.Order.status == models.OrderStatus.DELIVERED
    ).scalar()

    return {
        "total_revenue": round(total_revenue, 2),
        "total_orders": total_orders,
        "average_order_value": aov,
        "total_customers": total_customers,
        "today_revenue": round(today_revenue, 2),
        "today_orders": today_orders,
        "pending_orders": pending_orders,
        "completed_orders": completed_orders,
    }


def revenue_over_time(db: Session, start: datetime = None, end: datetime = None) -> list:
    q = db.query(
        func.date(models.Order.created_at).label("day"),
        func.coalesce(func.sum(models.Order.total), 0).label("revenue"),
        func.count(models.Order.id).label("orders"),
    ).filter(models.Order.status.in_(VALID_REVENUE_STATUSES))
    q = _range_filter(q, models.Order.created_at, start, end)
    q = q.group_by("day").order_by("day")
    return [{"date": str(r.day), "revenue": round(r.revenue, 2), "orders": r.orders} for r in q.all()]


def orders_by_status(db: Session, start: datetime = None, end: datetime = None) -> list:
    q = db.query(models.Order.status, func.count(models.Order.id).label("count"))
    q = _range_filter(q, models.Order.created_at, start, end)
    q = q.group_by(models.Order.status)
    return [{"status": r.status.value, "count": r.count} for r in q.all()]


def top_products(db: Session, start: datetime = None, end: datetime = None, limit: int = 10) -> list:
    q = db.query(
        models.OrderItem.product_name_snapshot.label("name"),
        func.sum(models.OrderItem.quantity).label("units_sold"),
        func.sum(models.OrderItem.subtotal).label("revenue"),
    ).join(models.Order, models.Order.id == models.OrderItem.order_id).filter(
        models.Order.status.in_(VALID_REVENUE_STATUSES)
    )
    q = _range_filter(q, models.Order.created_at, start, end)
    q = q.group_by(models.OrderItem.product_name_snapshot).order_by(func.sum(models.OrderItem.quantity).desc()).limit(limit)
    return [{"name": r.name, "units_sold": int(r.units_sold), "revenue": round(r.revenue, 2)} for r in q.all()]


def revenue_by_category(db: Session, start: datetime = None, end: datetime = None) -> list:
    q = db.query(
        models.Category.name.label("category"),
        func.coalesce(func.sum(models.OrderItem.subtotal), 0).label("revenue"),
    ).join(models.Product, models.Product.category_id == models.Category.id) \
     .join(models.OrderItem, models.OrderItem.product_id == models.Product.id) \
     .join(models.Order, models.Order.id == models.OrderItem.order_id) \
     .filter(models.Order.status.in_(VALID_REVENUE_STATUSES))
    q = _range_filter(q, models.Order.created_at, start, end)
    q = q.group_by(models.Category.name).order_by(func.sum(models.OrderItem.subtotal).desc())
    return [{"category": r.category, "revenue": round(r.revenue, 2)} for r in q.all()]


def customer_stats(db: Session, start: datetime = None, end: datetime = None) -> dict:
    total_customers = db.query(func.count(models.User.id)).filter(
        models.User.role == models.RoleEnum.CUSTOMER
    ).scalar()

    q = _range_filter(
        db.query(func.count(models.User.id)).filter(models.User.role == models.RoleEnum.CUSTOMER),
        models.User.created_at, start, end,
    )
    new_customers = q.scalar()

    per_customer = db.query(
        models.Order.user_id, func.count(models.Order.id).label("orders")
    ).filter(models.Order.status.in_(VALID_REVENUE_STATUSES)).group_by(models.Order.user_id).all()
    returning = sum(1 for r in per_customer if r.orders > 1)

    top_customers_q = db.query(
        models.User.name, models.User.email,
        func.coalesce(func.sum(models.Order.total), 0).label("spent"),
        func.count(models.Order.id).label("orders"),
    ).join(models.Order, models.Order.user_id == models.User.id).filter(
        models.Order.status.in_(VALID_REVENUE_STATUSES)
    ).group_by(models.User.id).order_by(func.sum(models.Order.total).desc()).limit(10)

    return {
        "total_customers": total_customers,
        "new_customers": new_customers,
        "returning_customers": returning,
        "top_customers": [
            {"name": r.name, "email": r.email, "spent": round(r.spent, 2), "orders": r.orders}
            for r in top_customers_q.all()
        ],
    }


def peak_hours(db: Session, start: datetime = None, end: datetime = None) -> list:
    q = db.query(
        extract("hour", models.Order.created_at).label("hour"),
        func.count(models.Order.id).label("orders"),
    )
    q = _range_filter(q, models.Order.created_at, start, end)
    q = q.group_by("hour").order_by("hour")
    return [{"hour": int(r.hour), "orders": r.orders} for r in q.all()]


def peak_days(db: Session, start: datetime = None, end: datetime = None) -> list:
    # extract('dow', ...) is portable across SQLite and PostgreSQL via
    # SQLAlchemy (SQLite: 0=Sunday..6=Saturday; Postgres: same convention),
    # unlike the previous func.strftime('%w', ...) which is SQLite-only and
    # would break in production on Postgres.
    q = db.query(
        extract("dow", models.Order.created_at).label("dow"),
        func.count(models.Order.id).label("orders"),
        func.coalesce(func.sum(models.Order.total), 0).label("revenue"),
    ).filter(models.Order.status.in_(VALID_REVENUE_STATUSES))
    q = _range_filter(q, models.Order.created_at, start, end)
    q = q.group_by("dow").order_by("dow")
    names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    return [
        {"day": names[int(r.dow)], "orders": r.orders, "revenue": round(r.revenue, 2)}
        for r in q.all()
    ]


def order_type_distribution(db: Session, start: datetime = None, end: datetime = None) -> list:
    q = db.query(
        models.Order.order_type,
        func.count(models.Order.id).label("orders"),
        func.coalesce(func.sum(models.Order.total), 0).label("revenue"),
    ).filter(models.Order.status.in_(VALID_REVENUE_STATUSES))
    q = _range_filter(q, models.Order.created_at, start, end)
    q = q.group_by(models.Order.order_type)
    return [
        {"order_type": r.order_type.value, "orders": r.orders, "revenue": round(r.revenue, 2)}
        for r in q.all()
    ]


def delivery_area_stats(db: Session, start: datetime = None, end: datetime = None) -> list:
    q = db.query(
        models.DeliveryArea.name.label("area"),
        func.count(models.Order.id).label("orders"),
        func.coalesce(func.sum(models.Order.total), 0).label("revenue"),
        func.coalesce(func.sum(models.Order.delivery_fee), 0).label("delivery_fees_collected"),
    ).join(models.Order, models.Order.delivery_area_id == models.DeliveryArea.id).filter(
        models.Order.status.in_(VALID_REVENUE_STATUSES)
    )
    q = _range_filter(q, models.Order.created_at, start, end)
    q = q.group_by(models.DeliveryArea.name).order_by(func.count(models.Order.id).desc())
    return [
        {
            "area": r.area,
            "orders": r.orders,
            "revenue": round(r.revenue, 2),
            "delivery_fees_collected": round(r.delivery_fees_collected, 2),
        }
        for r in q.all()
    ]


def payment_method_distribution(db: Session, start: datetime = None, end: datetime = None) -> list:
    q = db.query(
        models.Order.payment_method,
        func.count(models.Order.id).label("orders"),
    ).filter(models.Order.status.in_(VALID_REVENUE_STATUSES))
    q = _range_filter(q, models.Order.created_at, start, end)
    q = q.group_by(models.Order.payment_method)
    return [{"payment_method": r.payment_method.value, "orders": r.orders} for r in q.all()]


def cancellations(db: Session, start: datetime = None, end: datetime = None) -> dict:
    total_q = _range_filter(db.query(func.count(models.Order.id)), models.Order.created_at, start, end)
    total_orders = total_q.scalar()

    cancelled_q = _range_filter(
        db.query(func.count(models.Order.id)).filter(models.Order.status == models.OrderStatus.CANCELLED),
        models.Order.created_at, start, end,
    )
    cancelled_count = cancelled_q.scalar()

    lost_revenue_q = _range_filter(
        db.query(func.coalesce(func.sum(models.Order.total), 0)).filter(
            models.Order.status == models.OrderStatus.CANCELLED
        ),
        models.Order.created_at, start, end,
    )
    lost_revenue = lost_revenue_q.scalar()

    trend_q = db.query(
        func.date(models.Order.created_at).label("day"),
        func.count(models.Order.id).label("count"),
    ).filter(models.Order.status == models.OrderStatus.CANCELLED)
    trend_q = _range_filter(trend_q, models.Order.created_at, start, end)
    trend_q = trend_q.group_by("day").order_by("day")

    rate = round((cancelled_count / total_orders) * 100, 2) if total_orders else 0

    return {
        "cancelled_count": cancelled_count,
        "cancellation_rate_pct": rate,
        "revenue_lost": round(lost_revenue, 2),
        "trend": [{"date": str(r.day), "count": r.count} for r in trend_q.all()],
    }
