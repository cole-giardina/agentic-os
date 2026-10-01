from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth import get_current_user_id
from app.config import get_settings
from app.routes import tasks

app = FastAPI(title="Agentic OS API")

settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(tasks.router)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/me")
def me(user_id: str = Depends(get_current_user_id)) -> dict:
    """Proves the JWT verification path end to end for M1 — returns the
    authenticated user's id with no other data."""
    return {"user_id": user_id}
