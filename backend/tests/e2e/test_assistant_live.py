import pytest
from urllib import request

from app.config import settings
from app.services.assistant_service import AssistantService


def _ollama_reachable() -> bool:
    if not settings.OLLAMA_BASE_URL:
        return False
    try:
        url = f"{settings.OLLAMA_BASE_URL.rstrip('/')}/api/tags"
        with request.urlopen(url, timeout=2):
            return True
    except Exception:
        return False


pytestmark = [
    pytest.mark.e2e,
    pytest.mark.skipif(
        not _ollama_reachable(),
        reason=f"Ollama not reachable at {settings.OLLAMA_BASE_URL}",
    ),
]


REQUIRED_KEYS = {"reply_text", "is_complete", "missing_fields", "task_draft"}
REQUIRED_DRAFT_FIELDS = (
    "task_name",
    "task_day",
    "time_12h",
    "duration_hours",
    "duration_minutes",
)


def _assert_response_shape(result):
    assert isinstance(result, dict)
    assert REQUIRED_KEYS.issubset(set(result.keys()))
    assert isinstance(result["reply_text"], str)
    assert result["reply_text"], "reply_text must be a non-empty string"
    assert isinstance(result["is_complete"], bool)
    assert isinstance(result["missing_fields"], list)

    if result["is_complete"]:
        assert isinstance(result["task_draft"], dict)
        for field in REQUIRED_DRAFT_FIELDS:
            assert field in result["task_draft"], (
                f"task_draft missing required field: {field}"
            )
    else:
        assert result["task_draft"] is None
        assert len(result["missing_fields"]) > 0


def test_live_ollama_assistant_chat_returns_valid_response_shape():
    svc = AssistantService()
    result = svc.chat(
        messages=[
            {
                "role": "user",
                "content": "Schedule gym on day 18 at 7:30 PM for 1 hour",
            }
        ],
        active_year=2026,
        active_month=5,
    )
    _assert_response_shape(result)


def test_live_ollama_assistant_chat_handles_partial_prompt_shape():
    svc = AssistantService()
    result = svc.chat(
        messages=[{"role": "user", "content": "I want to add a task"}],
        active_year=2026,
        active_month=5,
    )
    _assert_response_shape(result)
