from fastapi import APIRouter, UploadFile, File, Form

router = APIRouter()


@router.post("/complaints")
async def create_complaint(
    description: str = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    ward: str | None = Form(None),
    municipality: str | None = Form(None),
    image: UploadFile | None = File(None),
):
    return {"status": "stub"}


@router.get("/complaints")
async def list_my_complaints():
    return {"complaints": []}


@router.get("/complaints/{complaint_id}")
async def get_complaint(complaint_id: str):
    return {"id": complaint_id, "status": "stub"}
