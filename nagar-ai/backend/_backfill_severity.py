#!/usr/bin/env python3
"""One-off backfill: reclassify severity for complaints with severity IS NULL.

Run from backend/: venv/bin/python _backfill_severity.py
"""

import asyncio
import os

import httpx

from app.services.nlp import classify_complaint_text

SUPABASE_URL = os.environ["SUPABASE_URL"]
KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
HEADERS = {"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}


def fetch_null_severity() -> list[dict]:
    res = httpx.get(
        f"{SUPABASE_URL}/rest/v1/complaints",
        params={"select": "id,description,severity,ai_confidence", "severity": "is.null"},
        headers=HEADERS,
        timeout=30,
    )
    res.raise_for_status()
    return res.json()


def patch(complaint_id: str, severity: str | None, confidence: float) -> None:
    res = httpx.patch(
        f"{SUPABASE_URL}/rest/v1/complaints",
        params={"id": f"eq.{complaint_id}"},
        headers=HEADERS,
        json={"severity": severity, "ai_confidence": confidence},
        timeout=30,
    )
    res.raise_for_status()


async def main() -> None:
    rows = fetch_null_severity()
    print(f"complaints needing classification: {len(rows)}")
    for row in rows:
        result = await classify_complaint_text(row["description"])
        patch(row["id"], result["severity"], result["confidence"])
        print(
            f"  {row['id'][:8]}  severity={result['severity']!s:9s} "
            f"conf={result['confidence']:.3f}  {row['description'][:50]!r}"
        )


if __name__ == "__main__":
    asyncio.run(main())
