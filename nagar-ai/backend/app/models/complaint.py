from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

ComplaintCategory = Literal[
    "pothole",
    "garbage",
    "water_leakage",
    "streetlight",
    "flooding",
    "drainage",
    "other",
]

ComplaintSeverity = Literal["low", "medium", "high", "critical"]

ComplaintStatus = Literal[
    "submitted",
    "under_review",
    "assigned",
    "in_progress",
    "resolved",
    "rejected",
    "duplicate",
]

# Single source of truth for submission constraints, shared by the Pydantic
# model and the multipart Form() declarations in routers/citizen.py so both
# paths stay identical. Matches docs/API_CONTRACT.md and the client-side
# checks in apps/citizen/app/submit/page.tsx.
MAX_DESCRIPTION_LENGTH = 2000
MAX_IMAGES = 5
LATITUDE_MIN = -90.0
LATITUDE_MAX = 90.0
LONGITUDE_MIN = -180.0
LONGITUDE_MAX = 180.0


class ComplaintCreate(BaseModel):
    description: str = Field(min_length=1, max_length=MAX_DESCRIPTION_LENGTH)
    category: ComplaintCategory
    latitude: float = Field(ge=LATITUDE_MIN, le=LATITUDE_MAX)
    longitude: float = Field(ge=LONGITUDE_MIN, le=LONGITUDE_MAX)
    ward: str | None = None
    municipality: str | None = None

    @field_validator("description")
    @classmethod
    def description_not_blank(cls, value: str) -> str:
        """Reject whitespace-only descriptions that satisfy min_length=1."""
        if not value.strip():
            raise ValueError("description must not be blank")
        return value


class ComplaintResponse(BaseModel):
    id: str
    status: str
    category: str | None = None
    severity: str | None = None
    ai_summary: str | None = None
    ai_confidence: float | None = None


class ComplaintUpdate(BaseModel):
    """Admin mutation payload for PATCH /admin/complaints/{id}.

    At least one field must be set; the router rejects empty bodies. `note` is
    persisted to complaint_status_history (the audit trail), not the complaints
    row, so every admin action stays attributable and timestamped.
    """

    status: ComplaintStatus | None = None
    note: str | None = Field(default=None, max_length=MAX_DESCRIPTION_LENGTH)
    department_id: UUID | None = None

    @field_validator("note")
    @classmethod
    def note_not_blank(cls, value: str | None) -> str | None:
        if value is not None and not value.strip():
            raise ValueError("note must not be blank")
        return value
