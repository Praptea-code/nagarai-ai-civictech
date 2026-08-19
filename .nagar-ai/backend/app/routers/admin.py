from fastapi import APIRouter

router = APIRouter()


@router.get("/complaints")
async def list_all_complaints():
    return {"complaints": []}


@router.patch("/complaints/{complaint_id}")
async def update_complaint(complaint_id: str):
    return {"id": complaint_id, "status": "stub"}


@router.get("/dashboard/summary")
async def dashboard_summary():
    return {"summary": "stub"}
