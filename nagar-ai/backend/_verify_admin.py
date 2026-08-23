"""One-off import check for the admin router changes."""
import sys

sys.path.insert(0, ".")

try:
    from app.main import app  # noqa: F401
    from app.models.complaint import ComplaintUpdate

    print("IMPORTS_OK")

    spec = app.openapi()
    for path, ops in sorted(spec["paths"].items()):
        if "/admin" in path:
            print("ROUTE:", sorted(ops.keys()), path)

    print("CORS methods check:")
    from app.core.config import settings
    print("  origins:", settings.CORS_ORIGINS)

    u = ComplaintUpdate(status="in_progress", note="crew scheduled")
    print("model ok:", u.status, u.note)
except Exception as exc:
    print(f"FAILED: {type(exc).__name__}: {exc}")
    sys.exit(1)
