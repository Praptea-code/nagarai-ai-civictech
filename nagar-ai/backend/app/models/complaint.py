from pydantic import BaseModel


class ComplaintCreate(BaseModel):
    description: str
    latitude: float
    longitude: float
    ward: str | None = None
    municipality: str | None = None


class ComplaintResponse(BaseModel):
    id: str
    status: str
    category: str | None = None
    severity: str | None = None
    ai_summary: str | None = None
    ai_confidence: float | None = None
