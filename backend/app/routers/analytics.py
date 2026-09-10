from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_admin
from app.services import analytics_service as svc

router = APIRouter(prefix="/admin/analytics", tags=["analytics"])


def _resolve_range(preset: Optional[str], start: Optional[datetime], end: Optional[datetime]):
    """Presets: today, yesterday, 7d, 30d, 90d, year. Falls back to explicit start/end."""
    if start or end:
        return start, end
    if not preset or preset == "all":
        return None, None

    now = datetime.utcnow()
    today0 = now.replace(hour=0, minute=0, second=0, microsecond=0)

    if preset == "today":
        return today0, now
    if preset == "yesterday":
        return today0 - timedelta(days=1), today0
    if preset == "7d":
        return today0 - timedelta(days=7), now
    if preset == "30d":
        return today0 - timedelta(days=30), now
    if preset == "90d":
        return today0 - timedelta(days=90), now
    if preset == "year":
        return today0.replace(month=1, day=1), now
    return None, None


@router.get("/overview")
def overview(
    preset: Optional[str] = Query(None),
    start: Optional[datetime] = None,
    end: Optional[datetime] = None,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    s, e = _resolve_range(preset, start, end)
    return svc.overview(db, s, e)


@router.get("/revenue")
def revenue(
    preset: Optional[str] = Query(None),
    start: Optional[datetime] = None,
    end: Optional[datetime] = None,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    s, e = _resolve_range(preset, start, end)
    return {
        "series": svc.revenue_over_time(db, s, e),
        "orders_by_status": svc.orders_by_status(db, s, e),
    }


@router.get("/products")
def products(
    preset: Optional[str] = Query(None),
    start: Optional[datetime] = None,
    end: Optional[datetime] = None,
    limit: int = 10,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    s, e = _resolve_range(preset, start, end)
    return svc.top_products(db, s, e, limit)


@router.get("/categories")
def categories(
    preset: Optional[str] = Query(None),
    start: Optional[datetime] = None,
    end: Optional[datetime] = None,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    s, e = _resolve_range(preset, start, end)
    return svc.revenue_by_category(db, s, e)


@router.get("/customers")
def customers(
    preset: Optional[str] = Query(None),
    start: Optional[datetime] = None,
    end: Optional[datetime] = None,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    s, e = _resolve_range(preset, start, end)
    return svc.customer_stats(db, s, e)


@router.get("/peak-hours")
def peak_hours_ep(
    preset: Optional[str] = Query(None),
    start: Optional[datetime] = None,
    end: Optional[datetime] = None,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    s, e = _resolve_range(preset, start, end)
    return {"hours": svc.peak_hours(db, s, e), "days": svc.peak_days(db, s, e)}


@router.get("/cancellations")
def cancellations_ep(
    preset: Optional[str] = Query(None),
    start: Optional[datetime] = None,
    end: Optional[datetime] = None,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    s, e = _resolve_range(preset, start, end)
    return svc.cancellations(db, s, e)


@router.get("/delivery")
def delivery_ep(
    preset: Optional[str] = Query(None),
    start: Optional[datetime] = None,
    end: Optional[datetime] = None,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    s, e = _resolve_range(preset, start, end)
    return {
        "order_type_distribution": svc.order_type_distribution(db, s, e),
        "by_area": svc.delivery_area_stats(db, s, e),
        "payment_methods": svc.payment_method_distribution(db, s, e),
    }
