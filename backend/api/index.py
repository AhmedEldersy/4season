# Vercel's Python runtime auto-detects an ASGI `app` object exported from a
# file under /api and wraps it as a serverless function -- no uvicorn needed
# here, Vercel's own runtime serves it. This file is ONLY the deployment
# entrypoint; all real application code stays in app/*, unchanged from the
# uvicorn-based deployment (Render/Railway/local dev).
from app.main import app  # noqa: F401
