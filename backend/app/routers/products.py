import os
import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.deps import get_current_admin
from app.config import settings

router = APIRouter(tags=["products"])


@router.get("/products", response_model=List[schemas.ProductOut])
def list_products(
    db: Session = Depends(get_db),
    category_id: Optional[str] = None,
    q: Optional[str] = Query(None, description="Search by name/description"),
):
    query = db.query(models.Product).filter(models.Product.is_available == True)  # noqa: E712
    if category_id:
        query = query.filter(models.Product.category_id == category_id)
    if q:
        like = f"%{q}%"
        query = query.join(models.Category).filter(
            or_(
                models.Product.name.ilike(like) if db.bind.dialect.name != "sqlite" else models.Product.name.like(like),
                models.Product.description.like(like),
                models.Category.name.like(like),
            )
        )
    return query.all()


@router.get("/products/{product_id}", response_model=schemas.ProductOut)
def get_product(product_id: str, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


# ---------------- Admin ----------------
@router.get("/admin/products", response_model=List[schemas.ProductOut])
def admin_list_products(db: Session = Depends(get_db), _admin=Depends(get_current_admin)):
    return db.query(models.Product).all()


@router.post("/admin/products", response_model=schemas.ProductOut)
def create_product(payload: schemas.ProductIn, db: Session = Depends(get_db), _admin=Depends(get_current_admin)):
    product = models.Product(**payload.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.patch("/admin/products/{product_id}", response_model=schemas.ProductOut)
def update_product(
    product_id: str,
    payload: schemas.ProductIn,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    for field, value in payload.model_dump().items():
        setattr(product, field, value)
    product.needs_review = False
    db.commit()
    db.refresh(product)
    return product


@router.delete("/admin/products/{product_id}")
def delete_product(product_id: str, db: Session = Depends(get_db), _admin=Depends(get_current_admin)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    db.delete(product)
    db.commit()
    return {"detail": "Product deleted"}


@router.post("/admin/uploads/image")
def upload_image(file: UploadFile = File(...), _admin=Depends(get_current_admin)):
    """Local-disk storage by default. Swap the body of this function for a
    Cloudinary/S3 client in production -- callers only ever see a URL back.

    Validation below never trusts the client-supplied filename/extension
    alone (that's trivially spoofable) -- it re-checks the actual bytes with
    Pillow, and always writes out a fresh UUID filename so nothing from the
    original name (including any path traversal like ../../) ever reaches
    the filesystem.
    """
    ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
    ALLOWED_PIL_FORMATS = {"JPEG", "PNG", "WEBP"}
    MAX_SIZE_BYTES = 5 * 1024 * 1024  # 5MB

    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="نوع الملف غير مسموح. استخدم JPG أو PNG أو WEBP.")

    raw = file.file.read(MAX_SIZE_BYTES + 1)
    if len(raw) > MAX_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="حجم الصورة أكبر من الحد المسموح (5MB).")
    if not raw:
        raise HTTPException(status_code=400, detail="الملف فاضي")

    # Re-derive the real format from the actual bytes -- a renamed .php or
    # .svg-with-script can claim any Content-Type/extension it likes, but it
    # can't fake what Pillow actually decodes.
    try:
        from PIL import Image
        import io

        img = Image.open(io.BytesIO(raw))
        img.verify()
        real_format = (img.format or "").upper()
    except Exception:
        raise HTTPException(status_code=400, detail="الملف ده مش صورة صالحة")

    if real_format not in ALLOWED_PIL_FORMATS:
        raise HTTPException(status_code=400, detail="نوع الصورة غير مدعوم. استخدم JPG أو PNG أو WEBP.")

    ext = {"JPEG": ".jpg", "PNG": ".png", "WEBP": ".webp"}[real_format]
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    filename = f"{uuid.uuid4().hex}{ext}"
    path = os.path.join(settings.UPLOAD_DIR, filename)
    with open(path, "wb") as f:
        f.write(raw)
    return {"url": f"/uploads/{filename}"}
