from functools import lru_cache

from supabase import Client, create_client

from app.config import get_settings


@lru_cache
def get_supabase() -> Client:
    """Backend client using the service role key. Bypasses RLS — only ever
    query with an explicit user_id filter derived from the verified JWT."""
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_service_role_key)
