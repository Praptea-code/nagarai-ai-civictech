# Logging standard — citizen flow

Every function in `backend/app/services/*.py` and `backend/app/routers/*.py` must log
three things: entry, successful exit, and errors. No function is exempt, including small
helpers — a missing log is why a bug takes an hour to find instead of ten seconds.

## Backend (Python) setup
`backend/app/logging_config.py`:
```python
import logging
import sys

def configure_logging():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
        handlers=[
            logging.StreamHandler(sys.stdout),
            logging.FileHandler("logs/citizen-flow.log"),
        ],
    )
```
Call `configure_logging()` once, in `app/main.py`, at startup.

## Pattern every function follows
```python
import logging
logger = logging.getLogger(__name__)

def classify_complaint_text(text: str) -> dict:
    logger.info("classify_complaint_text called | text_len=%d", len(text))
    try:
        result = _run_model(text)
        logger.info(
            "classify_complaint_text success | category=%s severity=%s confidence=%.2f",
            result["category"], result["severity"], result["confidence"],
        )
        return result
    except Exception:
        logger.exception("classify_complaint_text failed | text_len=%d", len(text))
        raise
```
Rules:
- Name the function explicitly in the message — don't rely on `%(name)s` alone; it's
  easier to `grep` a function name in the message body.
- Log input *sizes/shapes*, not raw content, for anything containing PII (full complaint
  text, coordinates, image bytes) — log `len(text)`, not `text` itself.
- Never log secrets, tokens, or the Supabase service-role key, even at DEBUG level.
- Use `logger.exception()` (not `logger.error()`) inside an `except` block — it captures
  the stack trace automatically.
- Re-raise after logging unless you're intentionally handling the error. Silently
  swallowing exceptions is not allowed.

## Frontend (TypeScript)
`apps/citizen/lib/logger.ts`:
```typescript
type Level = "info" | "warn" | "error";

function log(level: Level, fn: string, message: string, meta?: Record<string, unknown>) {
  const entry = { level, fn, message, meta, ts: new Date().toISOString() };
  // eslint-disable-next-line no-console
  console[level === "info" ? "log" : level](JSON.stringify(entry));
}

export const logger = {
  info: (fn: string, message: string, meta?: Record<string, unknown>) => log("info", fn, message, meta),
  warn: (fn: string, message: string, meta?: Record<string, unknown>) => log("warn", fn, message, meta),
  error: (fn: string, message: string, meta?: Record<string, unknown>) => log("error", fn, message, meta),
};
```
Use it in every client function that calls the API or Supabase:
```typescript
export async function submitComplaint(data: ComplaintInput) {
  logger.info("submitComplaint", "submitting", { hasImage: !!data.image });
  try {
    const res = await fetch("/api/v1/complaints", { method: "POST", body: toFormData(data) });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const json = await res.json();
    logger.info("submitComplaint", "success", { id: json.id, status: json.status });
    return json;
  } catch (err) {
    logger.error("submitComplaint", "failed", { error: String(err) });
    throw err;
  }
}
```

## Where logs go
- Backend: `logs/citizen-flow.log` (add `logs/` to `.gitignore` — logs are never committed)
- Frontend: browser console during development. That's sufficient for a 5-day project —
  don't add a remote logging service unless explicitly asked.
