import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware

from app.config import settings
from app.database import Base, engine
from app.routers import auth, categories, products, orders, admin, analytics, ws, delivery_areas

Base.metadata.create_all(bind=engine)

# Belt-and-suspenders: works whether or not the platform actually exposes a
# `VERCEL` env var to Python functions (that assumption turned out to be
# unreliable in practice). If the configured upload directory isn't
# writable -- as on Vercel's mostly-read-only filesystem -- fall back to
# /tmp, which is writable on every serverless platform, instead of crashing
# the whole app on import.
try:
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
except OSError:
    settings.UPLOAD_DIR = "/tmp/uploads"
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

app = FastAPI(title="4Season API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Needed by Authlib's OAuth state handling
app.add_middleware(SessionMiddleware, secret_key=settings.SECRET_KEY)

app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

app.include_router(auth.router)
app.include_router(categories.router)
app.include_router(products.router)
app.include_router(orders.router)
app.include_router(admin.router)
app.include_router(analytics.router)
app.include_router(ws.router)
app.include_router(delivery_areas.router)


@app.get("/health")
def health():
    return {"status": "ok"}
