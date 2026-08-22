"""Database service — Supabase client wrapper."""

import logging

from supabase import create_client

from app.core.config import settings

logger = logging.getLogger(__name__)

supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
