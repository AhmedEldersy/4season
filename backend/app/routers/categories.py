from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.deps import get_current_admin

router = APIRouter(tags=["categories"])


@router.get("/categories", response_model=List[schemas.CategoryOut])
def list_categories(db: Session = Depends(get_db)):
    return db.query(models.Category).filter(models.Category.is_active == True).order_by(  # noqa: E712
        models.Category.sort_order
    ).all()


@router.get("/admin/categories", response_model=List[schemas.CategoryOut])
def admin_list_categories(db: Session = Depends(get_db), _admin=Depends(get_current_admin)):
    return db.query(models.Category).order_by(models.Category.sort_order).all()


@router.post("/admin/categories", response_model=schemas.CategoryOut)
def create_category(payload: schemas.CategoryIn, db: Session = Depends(get_db), _admin=Depends(get_current_admin)):
    category = models.Category(**payload.model_dump())
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@router.patch("/admin/categories/{category_id}", response_model=schemas.CategoryOut)
def update_category(
    category_id: str,
    payload: schemas.CategoryIn,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    category = db.query(models.Category).filter(models.Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    for field, value in payload.model_dump().items():
        setattr(category, field, value)
    db.commit()
    db.refresh(category)
    return category


@router.delete("/admin/categories/{category_id}")
def delete_category(category_id: str, db: Session = Depends(get_db), _admin=Depends(get_current_admin)):
    category = db.query(models.Category).filter(models.Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    # Category.category_id on Product is NOT NULL -- deleting a category that
    # still has products would either raise a raw IntegrityError (if FK
    # enforcement is on) or silently orphan those products (invisible on the
    # menu, or a 500 when anything tries to render their category name).
    # Deactivating is always safe; deleting only ever is once it's empty.
    products_count = (
        db.query(func.count(models.Product.id)).filter(models.Product.category_id == category_id).scalar()
    )
    if products_count:
        raise HTTPException(
            status_code=400,
            detail=(
                f"لا يمكن حذف هذا الصنف لأنه يحتوي على {products_count} منتج. "
                "عطّل الصنف بدلاً من حذفه، أو احذف/نقل المنتجات أولاً."
            ),
        )

    db.delete(category)
    db.commit()
    return {"detail": "Category deleted"}
