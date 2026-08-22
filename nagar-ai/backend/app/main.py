from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import citizen, admin

app = FastAPI(title="Nagar AI Backend", version="0.1.0")

# The citizen SPA calls this API cross-origin from the browser; without CORS
# middleware the preflight OPTIONS dies with 405 and the browser blocks POSTs.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(citizen.router, prefix="/api/v1", tags=["citizen"])
app.include_router(admin.router, prefix="/api/v1/admin", tags=["admin"])


@app.get("/health")
def health():
    return {"status": "ok"}
