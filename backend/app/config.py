from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    supabase_url: str
    supabase_service_role_key: str
    frontend_origin: str = "http://localhost:5173"

    cron_secret: str = ""
    vault_path: str = ""

    anthropic_api_key: str = ""
    claude_model: str = "claude-sonnet-5"


@lru_cache
def get_settings() -> Settings:
    return Settings()
