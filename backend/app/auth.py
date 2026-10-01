from fastapi import Header, HTTPException
from supabase import AuthApiError

from app.db import get_supabase


def get_current_user_id(authorization: str | None = Header(default=None)) -> str:
    """Verify the bearer token against Supabase's own auth endpoint and
    return the user id. Never trust a user_id from the request body.

    Delegates verification to Supabase (GET /auth/v1/user) instead of
    decoding the JWT locally — avoids hardcoding the signing algorithm,
    which Supabase projects may serve as either a static HS256 secret or
    rotating asymmetric keys."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")

    token = authorization.removeprefix("Bearer ")

    try:
        response = get_supabase().auth.get_user(token)
    except AuthApiError as exc:
        raise HTTPException(status_code=401, detail="Invalid token") from exc

    if not response or not response.user:
        raise HTTPException(status_code=401, detail="Invalid token")

    return response.user.id
