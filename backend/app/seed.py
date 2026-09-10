"""
Seed the database with:
  1. An admin/owner account
  2. The real 4Seasons menu (categories + products) extracted from the
     provided menu photos
  3. A handful of demo customers + historical orders, purely so the
     Analytics dashboard has something to chart in local development.

Run with:  python -m app.seed
Re-running is safe -- it skips anything that already exists, except the
demo historical orders block which only runs on a completely empty orders
table (so it never pollutes a real restaurant's data).
"""
import random
from datetime import datetime, timedelta

from app.database import SessionLocal, Base, engine
from app import models
from app.security import hash_password
from app.menu_data import MENU, NEEDS_REVIEW
from app.config import settings

Base.metadata.create_all(bind=engine)


def seed_admin(db):
    existing = db.query(models.User).filter(models.User.email == settings.ADMIN_EMAIL).first()
    if existing:
        print(f"Admin already exists: {settings.ADMIN_EMAIL}")
        return existing
    admin = models.User(
        name="4Season Owner",
        email=settings.ADMIN_EMAIL,
        password_hash=hash_password(settings.ADMIN_PASSWORD),
        role=models.RoleEnum.OWNER,
    )
    db.add(admin)
    db.commit()
    print(f"Created admin account: {settings.ADMIN_EMAIL} / {settings.ADMIN_PASSWORD}")
    return admin


def seed_menu(db):
    if db.query(models.Category).count() > 0:
        print("Menu already seeded, skipping.")
        return

    for order_idx, (cat_name, cat_data) in enumerate(MENU.items()):
        category = models.Category(name=cat_name, sort_order=order_idx, is_active=True)
        db.add(category)
        db.flush()

        for name, price_medium, price_large in cat_data["items"]:
            needs_review = (cat_name, name) in NEEDS_REVIEW
            base_price = price_medium if price_medium is not None else price_large
            product = models.Product(
                category_id=category.id,
                name=name,
                description="",
                price=base_price,
                price_large=price_large if cat_data["has_sizes"] else None,
                is_available=True,
                needs_review=needs_review,
            )
            db.add(product)
    db.commit()
    total_products = db.query(models.Product).count()
    total_categories = db.query(models.Category).count()
    print(f"Seeded {total_categories} categories / {total_products} products from the 4Seasons menu.")


DEFAULT_DELIVERY_AREAS = []  # Intentionally empty: the previous seed used Cairo-area
# placeholders (Nasr City, Heliopolis...) that don't match this restaurant's real
# location. The admin adds real delivery areas from /admin/delivery-areas instead.


def seed_delivery_areas(db):
    if db.query(models.DeliveryArea).count() > 0:
        print("Delivery areas already seeded, skipping.")
        return
    if not DEFAULT_DELIVERY_AREAS:
        print("No default delivery areas configured -- add real ones from /admin/delivery-areas.")
        return
    for idx, (name, fee) in enumerate(DEFAULT_DELIVERY_AREAS):
        db.add(models.DeliveryArea(name=name, fee=fee, is_active=True, sort_order=idx))
    db.commit()
    print(f"Seeded {len(DEFAULT_DELIVERY_AREAS)} delivery areas.")


DEMO_CUSTOMERS = [
    ("Mona Fathy", "mona@example.com", "01011112222"),
    ("Youssef Adel", "youssef@example.com", "01022223333"),
    ("Sara Hassan", "sara@example.com", "01033334444"),
    ("Omar Khaled", "omar@example.com", "01044445555"),
    ("Nourhan Tarek", "nourhan@example.com", "01055556666"),
]


def seed_demo_orders(db):
    if db.query(models.Order).count() > 0:
        print("Orders already exist, skipping demo order generation.")
        return

    customers = []
    for name, email, phone in DEMO_CUSTOMERS:
        user = models.User(
            name=name, email=email, phone=phone,
            password_hash=hash_password("Demo@12345"),
            role=models.RoleEnum.CUSTOMER,
        )
        db.add(user)
        customers.append(user)
    db.commit()

    products = db.query(models.Product).all()
    if not products:
        print("No products found -- run seed_menu first.")
        return

    delivery_areas = db.query(models.DeliveryArea).filter(models.DeliveryArea.is_active.is_(True)).all()

    statuses_pool = (
        [models.OrderStatus.DELIVERED] * 6
        + [models.OrderStatus.CANCELLED] * 1
        + [models.OrderStatus.PENDING] * 1
    )

    now = datetime.utcnow()
    order_number = 1000
    for day_offset in range(30):
        day = now - timedelta(days=day_offset)
        orders_today = random.randint(1, 6)
        for _ in range(orders_today):
            customer = random.choice(customers)
            hour = random.choice([12, 13, 14, 19, 20, 21, 22])
            created_at = day.replace(hour=hour, minute=random.randint(0, 59), second=0, microsecond=0)

            n_items = random.randint(1, 3)
            chosen = random.sample(products, min(n_items, len(products)))
            order_items = []
            subtotal = 0.0
            for p in chosen:
                qty = random.randint(1, 2)
                line_total = round(p.price * qty, 2)
                subtotal += line_total
                order_items.append(
                    models.OrderItem(
                        product_id=p.id,
                        product_name_snapshot=p.name,
                        price_snapshot=p.price,
                        size="medium",
                        quantity=qty,
                        subtotal=line_total,
                    )
                )

            status = random.choice(statuses_pool)

            # ~65% delivery / 35% pickup, matching the mix in the product spec
            is_delivery = delivery_areas and random.random() < 0.65
            if is_delivery:
                area = random.choice(delivery_areas)
                order_type = models.OrderType.DELIVERY
                delivery_fee = area.fee
                delivery_area_id = area.id
                delivery_area_name = area.name
                address = "Smoud, El Shahatia, Alexandria"
            else:
                order_type = models.OrderType.PICKUP
                delivery_fee = 0
                delivery_area_id = None
                delivery_area_name = None
                address = None

            total = round(subtotal + delivery_fee, 2)

            order_number += 1
            order = models.Order(
                order_number=order_number,
                user_id=customer.id,
                status=status,
                order_type=order_type,
                subtotal=round(subtotal, 2),
                delivery_fee=delivery_fee,
                delivery_area_id=delivery_area_id,
                delivery_area_name_snapshot=delivery_area_name,
                total=total,
                customer_name=customer.name,
                phone=customer.phone,
                address=address,
                created_at=created_at,
                updated_at=created_at,
                cancellation_deadline=created_at + timedelta(minutes=settings.CANCELLATION_WINDOW_MINUTES),
                cancelled_at=created_at + timedelta(minutes=3) if status == models.OrderStatus.CANCELLED else None,
                delivered_at=created_at + timedelta(minutes=40) if status == models.OrderStatus.DELIVERED else None,
                items=order_items,
            )
            db.add(order)
    db.commit()
    print(f"Seeded demo historical orders for analytics ({db.query(models.Order).count()} total).")


def main():
    import sys

    # Demo customers + ~100 historical orders are only useful for showing
    # off the analytics dashboard with something on it. They're OFF by
    # default now -- a fresh `python -m app.seed` gives you a clean admin
    # panel (real menu + your own delivery areas, zero fake orders/customers)
    # so you can actually test with your own data instead of digging through
    # placeholders. Pass --with-demo-data to bring the old behavior back.
    with_demo_data = "--with-demo-data" in sys.argv

    db = SessionLocal()
    try:
        seed_admin(db)
        seed_menu(db)
        seed_delivery_areas(db)
        if with_demo_data:
            seed_demo_orders(db)
        else:
            print("Skipping demo customers/orders (pass --with-demo-data to include them).")
    finally:
        db.close()


if __name__ == "__main__":
    main()
