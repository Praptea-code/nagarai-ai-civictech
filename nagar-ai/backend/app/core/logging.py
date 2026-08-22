import logging
import sys


def setup_logging(level: str = "INFO") -> logging.Logger:
    """Configure the root logger so every __name__ logger emits records.

    Services and routers log via ``logging.getLogger(__name__)`` (names like
    ``app.services.db``), whose ancestry ends at the root logger — a handler on
    any differently-named branch would never receive their records.
    """
    logger = logging.getLogger()
    logger.setLevel(getattr(logging, level.upper(), logging.INFO))

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(name)s: %(message)s"))
    logger.addHandler(handler)

    return logger
