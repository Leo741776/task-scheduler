from datetime import datetime

import pytest
from pydantic import ValidationError

from app.routes.assistant import AssistantChatRequest
from app.schemas.activity import ActivityCreate, ActivityUpdate
from app.schemas.schedule import ScheduleCreate, ScheduleItem
from app.schemas.user import UserCreate, UserLogin


def make_user_payload(**overrides):
    payload = {
        "first_name": "Alice",
        "last_name": "Smith",
        "username": "alice",
        "password": "password123",
        "email": "alice@example.com",
    }
    payload.update(overrides)
    return payload


def make_activity_payload(**overrides):
    payload = {
        "title": "Study",
        "duration_minutes": 30,
        "priority": 3,
    }
    payload.update(overrides)
    return payload


def make_chat_message(content="hi"):
    return {"role": "user", "content": content}


def _error_locs(exc_info):
    return [err["loc"] for err in exc_info.value.errors()]


def _field_in_errors(exc_info, field_name):
    return any(field_name in loc for loc in _error_locs(exc_info))


def test_user_create_rejects_password_shorter_than_minimum():
    with pytest.raises(ValidationError) as exc_info:
        UserCreate(**make_user_payload(password="12345"))
    assert _field_in_errors(exc_info, "password")


def test_user_create_accepts_password_at_minimum_length():
    user = UserCreate(**make_user_payload(password="123456"))
    assert user.password == "123456"


def test_activity_create_rejects_duration_minutes_zero():
    with pytest.raises(ValidationError) as exc_info:
        ActivityCreate(**make_activity_payload(duration_minutes=0))
    assert _field_in_errors(exc_info, "duration_minutes")


def test_activity_create_rejects_negative_duration_minutes():
    with pytest.raises(ValidationError) as exc_info:
        ActivityCreate(**make_activity_payload(duration_minutes=-1))
    assert _field_in_errors(exc_info, "duration_minutes")


def test_activity_create_accepts_valid_payload():
    activity = ActivityCreate(**make_activity_payload())
    assert activity.duration_minutes == 30
    assert activity.priority == 3
    assert activity.title == "Study"


def test_activity_create_rejects_priority_above_five():
    with pytest.raises(ValidationError) as exc_info:
        ActivityCreate(**make_activity_payload(priority=6))
    assert _field_in_errors(exc_info, "priority")


def test_assistant_chat_request_rejects_more_than_30_messages():
    messages = [make_chat_message() for _ in range(31)]
    with pytest.raises(ValidationError) as exc_info:
        AssistantChatRequest(
            messages=messages, active_year=2026, active_month=1
        )
    assert _field_in_errors(exc_info, "messages")


def test_assistant_chat_request_accepts_exactly_30_messages():
    messages = [make_chat_message() for _ in range(30)]
    req = AssistantChatRequest(
        messages=messages, active_year=2026, active_month=1
    )
    assert len(req.messages) == 30


def test_user_create_rejects_invalid_email_format():
    with pytest.raises(ValidationError) as exc_info:
        UserCreate(**make_user_payload(email="not-an-email"))
    assert _field_in_errors(exc_info, "email")


def test_user_create_rejects_dot_local_email_domain():
    with pytest.raises(ValidationError) as exc_info:
        UserCreate(**make_user_payload(email="alice@server.local"))
    assert _field_in_errors(exc_info, "email")


def test_user_login_rejects_payload_missing_both_username_and_email():
    with pytest.raises(ValidationError):
        UserLogin(password="password123")


def test_activity_update_rejects_duration_minutes_zero():
    with pytest.raises(ValidationError) as exc_info:
        ActivityUpdate(duration_minutes=0)
    assert _field_in_errors(exc_info, "duration_minutes")


def test_activity_update_rejects_priority_above_five():
    with pytest.raises(ValidationError) as exc_info:
        ActivityUpdate(priority=6)
    assert _field_in_errors(exc_info, "priority")


def test_activity_update_accepts_empty_payload():
    update = ActivityUpdate()
    assert update.model_dump(exclude_unset=True) == {}


def test_schedule_create_rejects_missing_start_time():
    with pytest.raises(ValidationError) as exc_info:
        ScheduleCreate(end_time=datetime(2026, 1, 1, 10, 0))
    assert _field_in_errors(exc_info, "start_time")


def test_schedule_create_accepts_minimal_valid_payload():
    schedule = ScheduleCreate(
        start_time=datetime(2026, 1, 1, 9, 0),
        end_time=datetime(2026, 1, 1, 10, 0),
    )
    assert schedule.start_time == datetime(2026, 1, 1, 9, 0)
    assert schedule.end_time == datetime(2026, 1, 1, 10, 0)
    assert schedule.schedule == []


def test_schedule_item_rejects_empty_title():
    with pytest.raises(ValidationError) as exc_info:
        ScheduleItem(
            title="",
            start_time=datetime(2026, 1, 1, 9, 0),
            end_time=datetime(2026, 1, 1, 10, 0),
        )
    assert _field_in_errors(exc_info, "title")


def test_activity_create_accepts_optional_task_group_id():
    activity = ActivityCreate(
        **make_activity_payload(task_group_id="group-abc")
    )
    assert activity.task_group_id == "group-abc"


def test_activity_create_omitting_task_group_id_defaults_to_none():
    activity = ActivityCreate(**make_activity_payload())
    assert activity.task_group_id is None


def test_activity_update_accepts_task_group_id():
    update = ActivityUpdate(task_group_id="grp-1")
    assert update.task_group_id == "grp-1"
    assert "task_group_id" in update.model_dump(exclude_unset=True)


def test_activity_create_rejects_task_group_id_longer_than_255_chars():
    with pytest.raises(ValidationError) as exc_info:
        ActivityCreate(**make_activity_payload(task_group_id="x" * 256))
    assert _field_in_errors(exc_info, "task_group_id")
