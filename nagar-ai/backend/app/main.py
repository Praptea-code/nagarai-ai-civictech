from fastapi import FastAPI
from app.routers import citizen, admin

app = FastAPI(title="Nagar AI Backend", version="0.1.0")

app.include_router(citizen.router, prefix="/api/v1", tags=["citizen"])
app.include_router(admin.router, prefix="/api/v1/admin", tags=["admin"])


@app.get("/health")
def health():
    return {"status": "ok"}
