from typing import Literal

from pydantic import BaseModel

ComplaintCategory = Literal[
    "pothole",
    "garbage",
    "water_leakage",
    "streetlight",
    "flooding",
    "drainage",
    "other",
]


class ComplaintCreate(BaseModel):
    description: str
    category: ComplaintCategory
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
