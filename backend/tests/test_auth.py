from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException
from supabase import AuthApiError

from app import auth as auth_module
from app.auth import get_current_user_id


@pytest.fixture
def mock_supabase(monkeypatch):
    client = MagicMock()
    monkeypatch.setattr(auth_module, "get_supabase", lambda: client)
    return client


def test_valid_token_returns_user_id(mock_supabase):
    mock_supabase.auth.get_user.return_value = SimpleNamespace(
        user=SimpleNamespace(id="user-123")
    )
    user_id = get_current_user_id(authorization="Bearer good-token")
    assert user_id == "user-123"
    mock_supabase.auth.get_user.assert_called_once_with("good-token")


def test_missing_bearer_prefix_rejected(mock_supabase):
    with pytest.raises(HTTPException) as exc:
        get_current_user_id(authorization="not-a-bearer-token")
    assert exc.value.status_code == 401
    mock_supabase.auth.get_user.assert_not_called()


def test_missing_header_rejected(mock_supabase):
    with pytest.raises(HTTPException) as exc:
        get_current_user_id(authorization=None)
    assert exc.value.status_code == 401


def test_supabase_rejects_token(mock_supabase):
    mock_supabase.auth.get_user.side_effect = AuthApiError("invalid", 401, "invalid")
    with pytest.raises(HTTPException) as exc:
        get_current_user_id(authorization="Bearer bad-token")
    assert exc.value.status_code == 401


def test_no_user_on_response_rejected(mock_supabase):
    mock_supabase.auth.get_user.return_value = SimpleNamespace(user=None)
    with pytest.raises(HTTPException) as exc:
        get_current_user_id(authorization="Bearer stale-token")
    assert exc.value.status_code == 401
