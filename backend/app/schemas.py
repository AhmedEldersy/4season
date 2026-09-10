import re
from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, EmailStr, Field, model_validator

from app.models import RoleEnum, OrderStatus, OrderType, PaymentMethod

# Egyptian mobile numbers: 11 digits, starting with 01 (010/011/012/015...).
PHONE_PATTERN = r"^01\d{9}$"
PHONE_ERROR = "رقم الموبايل لازم يكون 11 رقم ويبدأ بـ 01"


# ---------- Auth ----------
class RegisterIn(BaseModel):
    name: str
    email: EmailStr
    phone: str = Field(pattern=PHONE_PATTERN)
    password: str = Field(min_length=6)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


class UserOut(BaseModel):
    id: str
    name: str
    email: str
    phone: Optional[str] = None
    address: Optional[str] = None
    role: RoleEnum
    # False for Google sign-ins that skipped providing a phone number --
    # the frontend forces these to /complete-profile before anything else.
    # Computed here (not a DB column) so it's always derived from the real
    # phone value and can never drift out of sync.
    profile_complete: bool = True

    class Config:
        from_attributes = True

    @model_validator(mode="after")
    def _compute_profile_complete(self):
        self.profile_complete = bool(self.phone and self.phone.strip())
        return self


class UserUpdateIn(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None

    @model_validator(mode="after")
    def _no_blank_phone(self):
        # Allows omitting phone entirely (unset -> don't touch it), but any
        # value that IS provided must be a full, valid Egyptian mobile
        # number -- otherwise "complete your profile" could be satisfied
        # with garbage and require_complete_profile would still pass it.
        if self.phone is not None and not re.match(PHONE_PATTERN, self.phone.strip()):
            raise ValueError(PHONE_ERROR)
        return self


# ---------- Categories ----------
class CategoryOut(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    image: Optional[str] = None
    is_active: bool
    sort_order: int

    class Config:
        from_attributes = True


class CategoryIn(BaseModel):
    name: str
    description: Optional[str] = None
    image: Optional[str] = None
    is_active: bool = True
    sort_order: int = 0


# ---------- Products ----------
class ProductOut(BaseModel):
    id: str
    category_id: str
    name: str
    description: Optional[str] = ""
    price: float
    price_large: Optional[float] = None
    image_url: Optional[str] = None
    is_available: bool
    needs_review: bool

    class Config:
        from_attributes = True


class ProductIn(BaseModel):
    category_id: str
    name: str
    description: Optional[str] = ""
    price: float
    price_large: Optional[float] = None
    image_url: Optional[str] = None
    is_available: bool = True


# ---------- Delivery Areas ----------
class DeliveryAreaOut(BaseModel):
    id: str
    name: str
    fee: float
    is_active: bool
    sort_order: int

    class Config:
        from_attributes = True


class DeliveryAreaAdminOut(DeliveryAreaOut):
    orders_count: int = 0


class DeliveryAreaIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    fee: float = Field(ge=0)
    is_active: bool = True
    sort_order: int = 0


# ---------- Cart / Orders ----------
class OrderItemIn(BaseModel):
    product_id: str
    size: Optional[str] = "medium"
    quantity: int = Field(gt=0)
    special_instructions: Optional[str] = None


class CheckoutIn(BaseModel):
    customer_name: str
    phone: str = Field(pattern=PHONE_PATTERN)
    order_type: OrderType
    # Required for DELIVERY, ignored for PICKUP
    delivery_area_id: Optional[str] = None
    address: Optional[str] = None
    building: Optional[str] = None
    apartment: Optional[str] = None
    notes: Optional[str] = None
    items: List[OrderItemIn]
    # Optional client-generated key (e.g. a UUID minted once per checkout
    # attempt) so retried/double-clicked submissions are safely deduplicated.
    idempotency_key: Optional[str] = None


class OrderItemOut(BaseModel):
    id: str
    product_id: Optional[str]
    product_name_snapshot: str
    price_snapshot: float
    size: Optional[str]
    quantity: int
    subtotal: float
    special_instructions: Optional[str] = None

    class Config:
        from_attributes = True


class OrderOut(BaseModel):
    id: str
    order_number: int
    status: OrderStatus
    order_type: OrderType
    subtotal: float
    delivery_fee: float
    delivery_area_name_snapshot: Optional[str] = None
    total: float
    payment_method: PaymentMethod
    customer_name: str
    phone: str
    address: Optional[str] = None
    building: Optional[str] = None
    apartment: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    cancellation_deadline: datetime
    accepted_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    items: List[OrderItemOut] = []

    class Config:
        from_attributes = True


class OrderStatusUpdateIn(BaseModel):
    status: OrderStatus


# ---------- Analytics ----------
class RangeQuery(BaseModel):
    start: Optional[datetime] = None
    end: Optional[datetime] = None
