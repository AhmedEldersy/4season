import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Column, String, Float, Integer, Boolean, DateTime, ForeignKey, Text, Enum
)
from sqlalchemy.orm import relationship

from app.database import Base


def gen_id() -> str:
    return uuid.uuid4().hex


class RoleEnum(str, enum.Enum):
    CUSTOMER = "CUSTOMER"
    ADMIN = "ADMIN"
    OWNER = "OWNER"


class OrderStatus(str, enum.Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    PREPARING = "PREPARING"
    READY = "READY"
    OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY"
    DELIVERED = "DELIVERED"
    CANCELLED = "CANCELLED"


class OrderType(str, enum.Enum):
    PICKUP = "PICKUP"
    DELIVERY = "DELIVERY"


class PaymentMethod(str, enum.Enum):
    CASH_ON_DELIVERY = "CASH_ON_DELIVERY"


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=gen_id)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    phone = Column(String, nullable=True)
    address = Column(String, nullable=True)
    password_hash = Column(String, nullable=True)  # null when Google-only account
    google_id = Column(String, unique=True, nullable=True, index=True)
    role = Column(Enum(RoleEnum), default=RoleEnum.CUSTOMER, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    orders = relationship("Order", back_populates="user")


class Category(Base):
    __tablename__ = "categories"

    id = Column(String, primary_key=True, default=gen_id)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    image = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    products = relationship("Product", back_populates="category")


class Product(Base):
    __tablename__ = "products"

    id = Column(String, primary_key=True, default=gen_id)
    category_id = Column(String, ForeignKey("categories.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True, default="")
    price = Column(Float, nullable=False)          # base / medium price
    price_large = Column(Float, nullable=True)      # optional second size (large)
    image_url = Column(String, nullable=True)
    is_available = Column(Boolean, default=True)
    needs_review = Column(Boolean, default=False)   # flagged during menu-image import
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    category = relationship("Category", back_populates="products")


class DeliveryArea(Base):
    __tablename__ = "delivery_areas"

    id = Column(String, primary_key=True, default=gen_id)
    name = Column(String, nullable=False, unique=True)
    fee = Column(Float, nullable=False, default=0)
    is_active = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    orders = relationship("Order", back_populates="delivery_area")


class Order(Base):
    __tablename__ = "orders"

    id = Column(String, primary_key=True, default=gen_id)
    # Human-friendly sequential number (e.g. #1048). Assigned in application
    # code (see order_service.next_order_number) since SQLAlchemy/SQLite only
    # auto-increments the actual primary key, and our PK is a UUID string.
    order_number = Column(Integer, unique=True, nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)

    status = Column(Enum(OrderStatus), default=OrderStatus.PENDING, nullable=False)
    order_type = Column(Enum(OrderType), default=OrderType.DELIVERY, nullable=False)

    subtotal = Column(Float, nullable=False)
    delivery_fee = Column(Float, nullable=False, default=0)
    total = Column(Float, nullable=False)

    # Delivery area is a live FK for admin reporting (orders-per-area), but
    # the name + fee actually charged are snapshotted onto the order below so
    # that changing/deleting an area later never rewrites history.
    delivery_area_id = Column(String, ForeignKey("delivery_areas.id"), nullable=True)
    delivery_area_name_snapshot = Column(String, nullable=True)

    payment_method = Column(Enum(PaymentMethod), default=PaymentMethod.CASH_ON_DELIVERY)

    customer_name = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    address = Column(String, nullable=True)
    building = Column(String, nullable=True)
    apartment = Column(String, nullable=True)
    notes = Column(Text, nullable=True)

    # Client-generated idempotency key so double-clicking "Place order" (or a
    # retried request after a flaky network response) can never create two
    # orders. Unique + nullable so it's optional/backward compatible.
    idempotency_key = Column(String, unique=True, nullable=True, index=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    cancellation_deadline = Column(DateTime, nullable=False)
    accepted_at = Column(DateTime, nullable=True)
    cancelled_at = Column(DateTime, nullable=True)
    delivered_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    delivery_area = relationship("DeliveryArea", back_populates="orders")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(String, primary_key=True, default=gen_id)
    order_id = Column(String, ForeignKey("orders.id"), nullable=False)
    product_id = Column(String, ForeignKey("products.id"), nullable=True)

    product_name_snapshot = Column(String, nullable=False)
    price_snapshot = Column(Float, nullable=False)
    size = Column(String, nullable=True)  # e.g. "medium" / "large"
    quantity = Column(Integer, nullable=False, default=1)
    subtotal = Column(Float, nullable=False)
    special_instructions = Column(String, nullable=True)

    order = relationship("Order", back_populates="items")
