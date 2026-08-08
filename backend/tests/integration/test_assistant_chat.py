import json
from urllib import error


class FakeOllamaResponse:
    def __init__(self, content: str):
        self._payload = json.dumps(
            {"message": {"content": content}}
        ).encode("utf-8")

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


URLOPEN_TARGET = "app.services.assistant_service.request.urlopen"


def _post_chat(client, **request_overrides):
    payload = {
        "messages": [{"role": "user", "content": "Schedule gym."}],
        "active_year": 2026,
        "active_month": 1,
    }
    payload.update(request_overrides)
    return client.post("/assistant/chat", json=payload)


def test_assistant_chat_returns_complete_task_draft_on_valid_response(
    client, mocker
):
    mocker.patch(
        URLOPEN_TARGET,
        return_value=FakeOllamaResponse(
            make_complete_content(reply="All set.")
        ),
    )
    response = _post_chat(client)
    assert response.status_code == 200
    body = response.json()
    assert body["is_complete"] is True
    assert body["missing_fields"] == []
    assert body["task_draft"] == {
        "task_name": "Gym",
        "task_day": 15,
        "time_12h": "9:00 AM",
        "duration_hours": 1,
        "duration_minutes": 0,
    }
    assert body["reply_text"] == "All set."


def test_assistant_chat_reports_missing_fields_for_partial_llm_json(
    client, mocker
):
    mocker.patch(
        URLOPEN_TARGET,
        return_value=FakeOllamaResponse(json.dumps({"task_name": "Gym"})),
    )
    response = _post_chat(client)
    assert response.status_code == 200
    body = response.json()
    assert body["is_complete"] is False
    assert body["task_draft"] is None
    assert set(body["missing_fields"]) >= {
        "task_day",
        "time_12h",
        "duration_hours",
        "duration_minutes",
    }
    assert body["reply_text"]


def test_assistant_chat_rejects_more_than_30_messages_with_400(client):
    too_many = [
        {"role": "user", "content": f"msg {i}"} for i in range(31)
    ]
    response = _post_chat(client, messages=too_many)
    assert response.status_code == 400
    body = response.json()
    assert "detail" in body


def test_assistant_chat_returns_503_when_ollama_unreachable(client, mocker):
    mocker.patch(
        URLOPEN_TARGET,
        side_effect=error.URLError("connection refused"),
    )
    response = _post_chat(client)
    assert response.status_code == 503
    body = response.json()
    assert "detail" in body
    assert "ollama" in body["detail"].lower()


def test_assistant_chat_returns_200_with_all_fields_missing_for_garbage_llm_output(
    client, mocker
):
    mocker.patch(
        URLOPEN_TARGET,
        return_value=FakeOllamaResponse("I don't know how to help with that."),
    )
    response = _post_chat(client)
    assert response.status_code == 200
    body = response.json()
    assert body["is_complete"] is False
    assert body["task_draft"] is None
    assert set(body["missing_fields"]) == {
        "task_name",
        "task_day",
        "time_12h",
        "duration_hours",
        "duration_minutes",
    }
