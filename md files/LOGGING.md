# Logging standard — citizen flow

Every function in `backend/app/services/*.py` and `backend/app/routers/*.py` must log
three things: entry, successful exit, and errors. No function is exempt, including small
helpers — a missing log is why a bug takes an hour to find instead of ten seconds.

## Backend (Python) setup
`backend/app/core/logging.py`:
```python
import logging
import sys

def setup_logging(level: str = "INFO") -> logging.Logger:
    logger = logging.getLogger("nagar_ai")
    logger.setLevel(getattr(logging, level.upper(), logging.INFO))

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(name)s: %(message)s"))
    logger.addHandler(handler)

    return logger
```
Call `setup_logging(settings.LOG_LEVEL)` once, in `app/main.py`, at startup. All
service/router loggers are children of `nagar_ai`, so they inherit the level and
handler through propagation. If nothing calls `setup_logging()`, Python's last-resort
handler silently drops every INFO record - wiring it in is mandatory, not optional.

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
type LogLevel = "info" | "warn" | "error";

export function log(level: LogLevel, message: string, data?: unknown) {
  const timestamp = new Date().toISOString();
  console[level](`[${timestamp}] [${level.toUpperCase()}] ${message}`, data ?? "");
}
```
Use it in every client function that calls the API or Supabase:
```typescript
export async function submitComplaint(input: ComplaintInput) {
  log("info", "submitComplaint sending", { hasImage: !!input.image, descLen: input.description.length });
  try {
    const res = await fetch("/api/v1/complaints", { method: "POST", body: toFormData(input) });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const json = await res.json();
    log("info", "submitComplaint success", { id: json.id, status: json.status });
    return json;
  } catch (err) {
    log("error", "submitComplaint failed", { message: String(err) });
    throw err;
  }
}
```

## Where logs go
- Backend: stdout (visible in `docker logs` / uvicorn output). No file handler —
  container stdout is the source of truth for a project this size; add one only if a
  grader or teammate explicitly asks for persisted files.
- Frontend: browser console during development. That's sufficient for a 5-day project —
  don't add a remote logging service unless explicitly asked.
