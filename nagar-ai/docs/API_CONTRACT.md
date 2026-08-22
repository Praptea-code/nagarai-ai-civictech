# API contract — citizen-facing endpoints

Base URL: `/api/v1`

All endpoints require a valid Supabase JWT in `Authorization: Bearer <token>` except
where noted. This contract is fixed — do not change field names or types without logging
the change in `docs/DECISION_LOG.md` and flagging it. Person 2's admin dashboard builds
against these same shapes.

## POST /complaints
Create a new complaint.

Request (`multipart/form-data`):
| Field | Type | Required |
|---|---|---|
| description | string | yes |
| category | string (enum: pothole, garbage, water_leakage, streetlight, flooding, drainage, other) | yes |
| latitude | float | yes |
| longitude | float | yes |
| ward | string | no |
| municipality | string | no |
| image | file (jpeg/png, max 8MB) | no |

Response `201`:
```json
{
  "id": "uuid",
  "status": "submitted",
  "category": "pothole",
  "severity": "high",
  "ai_summary": "Large pothole near college gate causing safety risks",
  "ai_confidence": 0.94,
  "duplicate_of_complaint_id": null,
  "image_url": "https://.../complaint_1823.jpg",
  "created_at": "2026-08-18T10:03:00Z"
}
```
The response's `category` field echoes back exactly what the citizen submitted — it is
not AI-generated and no model runs on the uploaded photo (the photo is stored as
evidence only). `ai_summary` and `ai_confidence` still come from NLP on the description
text.
Response `422`: FastAPI's default Pydantic validation error shape (missing description,
invalid lat/lng, etc).

## GET /complaints/mine
Returns complaints for the authenticated citizen.

Query params: `status` (optional filter), `limit` (default 20), `offset` (default 0)

Response `200`:
```json
{
  "items": [
    {
      "id": "uuid",
      "description": "...",
      "category": "pothole",
      "severity": "high",
      "status": "assigned",
      "department": "Road Infrastructure",
      "created_at": "...",
      "updated_at": "..."
    }
  ],
  "total": 12
}
```

## GET /complaints/{id}
Returns a single complaint, including status history, for its owner.

Response `200`:
```json
{
  "id": "uuid",
  "description": "...",
  "status": "in_progress",
  "status_history": [
    { "status": "submitted", "created_at": "..." },
    { "status": "assigned", "created_at": "..." }
  ],
  "image_url": "...",
  "duplicate_of_complaint_id": null
}
```
Response `403` if the complaint doesn't belong to the requesting citizen. RLS already
prevents this at the database layer — this check is defense in depth, not the primary
guard.

## Auth
Signup, login, and logout go through the Supabase Auth JS SDK directly from the
frontend. There is no custom `/auth/*` FastAPI endpoint — do not build one.
