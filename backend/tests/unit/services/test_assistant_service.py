import io
import json
from urllib import error

import pytest

from app.config import settings
from app.services.assistant_service import AssistantService


class FakeOllamaResponse:
    def __init__(self, content: str):
        self._payload = json.dumps({"message": {"content": content}}).encode(
            "utf-8"
        )

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def read(self):
        return self._payload


def make_complete_content(reply: str = "Got it.", **overrides) -> str:
    fields = {
        "reply": reply,
        "task_name": "Gym",
        "task_day": 15,
        "time_12h": "9:00 AM",
        "duration_hours": 1,
        "duration_minutes": 0,
    }
    fields.update(overrides)
    return json.dumps(fields)


def patch_urlopen(mocker, content: str | None = None, side_effect=None):
    target = "app.services.assistant_service.request.urlopen"
    if side_effect is not None:
        return mocker.patch(target, side_effect=side_effect)
    return mocker.patch(target, return_value=FakeOllamaResponse(content))


def test_chat_returns_complete_task_draft_when_all_fields_valid(mocker):
    patch_urlopen(mocker, make_complete_content(reply="Awesome, scheduling now."))
    svc = AssistantService()
    result = svc.chat(
        [{"role": "user", "content": "Gym tomorrow at 9 AM for an hour"}],
        active_year=2026,
        active_month=1,
    )
    assert result["is_complete"] is True
    assert result["missing_fields"] == []
    assert result["task_draft"] == {
        "task_name": "Gym",
        "task_day": 15,
        "time_12h": "9:00 AM",
        "duration_hours": 1,
        "duration_minutes": 0,
    }
    assert result["reply_text"] == "Awesome, scheduling now."


def test_chat_uses_canned_reply_when_complete_and_llm_reply_blank(mocker):
    patch_urlopen(mocker, make_complete_content(reply=""))
    svc = AssistantService()
    result = svc.chat(
        [{"role": "user", "content": "Gym"}],
        active_year=2026,
        active_month=1,
    )
    assert result["is_complete"] is True
    assert (
        result["reply_text"]
        == "Perfect. I have everything I need and will add the task now."
    )


def test_chat_reports_missing_fields_for_partial_json(mocker):
    partial = json.dumps({"task_name": "Gym"})
    patch_urlopen(mocker, partial)
    svc = AssistantService()
    result = svc.chat(
        [{"role": "user", "content": "Schedule gym"}],
        active_year=2026,
        active_month=1,
    )
    assert result["is_complete"] is False
    assert result["task_draft"] is None
    assert set(result["missing_fields"]) == {
        "task_day",
        "time_12h",
        "duration_hours",
        "duration_minutes",
    }
    assert (
        result["reply_text"]
        == "What day of the month should I schedule it on?"
    )


def test_chat_marks_day_above_month_max_as_missing(mocker):
    patch_urlopen(mocker, make_complete_content(task_day=32))
    svc = AssistantService()
    result = svc.chat(
        [{"role": "user", "content": "Gym on the 32nd"}],
        active_year=2026,
        active_month=1,
    )
    assert "task_day" in result["missing_fields"]
    assert result["is_complete"] is False
    assert result["task_draft"] is None


def test_chat_marks_day_30_as_missing_in_february(mocker):
    patch_urlopen(mocker, make_complete_content(task_day=30))
    svc = AssistantService()
    result = svc.chat(
        [{"role": "user", "content": "Gym Feb 30"}],
        active_year=2026,
        active_month=2,
    )
    assert "task_day" in result["missing_fields"]
    assert result["is_complete"] is False


def test_chat_marks_all_fields_missing_when_ollama_returns_garbage(mocker):
    patch_urlopen(mocker, "I don't know how to help with that.")
    svc = AssistantService()
    result = svc.chat(
        [{"role": "user", "content": "huh"}],
        active_year=2026,
        active_month=1,
    )
    assert result["is_complete"] is False
    assert result["task_draft"] is None
    assert set(result["missing_fields"]) == {
        "task_name",
        "task_day",
        "time_12h",
        "duration_hours",
        "duration_minutes",
    }


def test_chat_parses_json_wrapped_in_code_fences(mocker):
    inner = make_complete_content(reply="Done.")
    fenced = f"```json\n{inner}\n```"
    patch_urlopen(mocker, fenced)
    svc = AssistantService()
    result = svc.chat(
        [{"role": "user", "content": "Gym"}],
        active_year=2026,
        active_month=1,
    )
    assert result["is_complete"] is True
    assert result["task_draft"]["task_name"] == "Gym"


def test_chat_treats_zero_hours_and_zero_minutes_as_missing(mocker):
    patch_urlopen(
        mocker,
        make_complete_content(duration_hours=0, duration_minutes=0),
    )
    svc = AssistantService()
    result = svc.chat(
        [{"role": "user", "content": "Gym for zero time"}],
        active_year=2026,
        active_month=1,
    )
    assert "duration_hours" in result["missing_fields"]
    assert "duration_minutes" in result["missing_fields"]
    assert result["is_complete"] is False


@pytest.mark.parametrize(
    "raw,canonical",
    [
        ("9 AM", "9:00 AM"),
        ("2:30 pm", "2:30 PM"),
    ],
)
def test_chat_normalizes_time_12h_to_canonical_format(mocker, raw, canonical):
    patch_urlopen(mocker, make_complete_content(time_12h=raw))
    svc = AssistantService()
    result = svc.chat(
        [{"role": "user", "content": "Gym"}],
        active_year=2026,
        active_month=1,
    )
    assert result["is_complete"] is True
    assert result["task_draft"]["time_12h"] == canonical


def test_chat_raises_runtime_error_when_ollama_unreachable(mocker):
    patch_urlopen(mocker, side_effect=error.URLError("connection refused"))
    svc = AssistantService()
    with pytest.raises(RuntimeError, match="Could not connect to Ollama"):
        svc.chat(
            [{"role": "user", "content": "Gym"}],
            active_year=2026,
            active_month=1,
        )


def test_chat_raises_runtime_error_on_http_error(mocker):
    http_err = error.HTTPError(
        url="http://127.0.0.1:11434/api/chat",
        code=500,
        msg="Internal Server Error",
        hdrs={},
        fp=io.BytesIO(b"server exploded"),
    )
    patch_urlopen(mocker, side_effect=http_err)
    svc = AssistantService()
    with pytest.raises(RuntimeError, match=r"Ollama API error \(500\)"):
        svc.chat(
            [{"role": "user", "content": "Gym"}],
            active_year=2026,
            active_month=1,
        )


def test_chat_raises_runtime_error_when_not_configured(monkeypatch):
    monkeypatch.setattr(settings, "OLLAMA_BASE_URL", "")
    svc = AssistantService()
    with pytest.raises(RuntimeError, match="not configured"):
        svc.chat(
            [{"role": "user", "content": "Gym"}],
            active_year=2026,
            active_month=1,
        )
