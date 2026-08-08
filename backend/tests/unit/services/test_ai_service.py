from datetime import datetime, timedelta

import pytest

from app.services.ai_service import AIService


def test_ai_sorts_internally_by_priority_descending():
    svc = AIService()
    start = datetime(2026, 1, 1, 9, 0)
    end = datetime(2026, 1, 1, 13, 0)
    activities = [
        {"title": "low", "priority": 1, "duration_minutes": 30},
        {"title": "high", "priority": 5, "duration_minutes": 30},
        {"title": "mid", "priority": 3, "duration_minutes": 30},
    ]
    result = svc.generate_schedule(activities, start, end)
    assert [r["title"] for r in result] == ["high", "mid", "low"]


@pytest.mark.parametrize(
    "start,end",
    [
        (datetime(2026, 1, 1, 10, 0), datetime(2026, 1, 1, 9, 0)),
        (datetime(2026, 1, 1, 9, 0), datetime(2026, 1, 1, 9, 0)),
    ],
)
def test_ai_returns_empty_when_end_is_le_start(start, end):
    svc = AIService()
    activities = [{"title": "task", "priority": 3, "duration_minutes": 30}]
    assert svc.generate_schedule(activities, start, end) == []


def test_ai_defaults_missing_duration_to_60_minutes():
    svc = AIService()
    start = datetime(2026, 1, 1, 9, 0)
    end = datetime(2026, 1, 1, 11, 0)
    activities = [{"title": "no-dur", "priority": 3}]
    result = svc.generate_schedule(activities, start, end)
    assert len(result) == 1
    assert result[0]["end_time"] - result[0]["start_time"] == timedelta(
        minutes=60
    )


def test_ai_skips_activity_with_no_title():
    svc = AIService()
    start = datetime(2026, 1, 1, 9, 0)
    end = datetime(2026, 1, 1, 11, 0)
    activities = [
        {"priority": 3, "duration_minutes": 30},
        {"title": "good", "priority": 3, "duration_minutes": 30},
    ]
    result = svc.generate_schedule(activities, start, end)
    assert [r["title"] for r in result] == ["good"]
    assert result[0]["start_time"] == start


def test_ai_skips_non_positive_duration_values():
    svc = AIService()
    start = datetime(2026, 1, 1, 9, 0)
    end = datetime(2026, 1, 1, 11, 0)
    activities = [
        {"title": "zero", "priority": 5, "duration_minutes": 0},
        {"title": "negative", "priority": 4, "duration_minutes": -10},
        {"title": "good", "priority": 3, "duration_minutes": 30},
    ]
    result = svc.generate_schedule(activities, start, end)
    assert [r["title"] for r in result] == ["good"]


def test_ai_skips_non_int_duration_values():
    svc = AIService()
    start = datetime(2026, 1, 1, 9, 0)
    end = datetime(2026, 1, 1, 11, 0)
    activities = [
        {"title": "str-dur", "priority": 5, "duration_minutes": "60"},
        {"title": "float-dur", "priority": 4, "duration_minutes": 60.0},
        {"title": "good", "priority": 3, "duration_minutes": 30},
    ]
    result = svc.generate_schedule(activities, start, end)
    assert [r["title"] for r in result] == ["good"]


def test_ai_single_fitting_activity_produces_one_block():
    svc = AIService()
    start = datetime(2026, 1, 1, 9, 0)
    end = datetime(2026, 1, 1, 10, 0)
    activities = [{"title": "task", "priority": 3, "duration_minutes": 30}]
    result = svc.generate_schedule(activities, start, end)
    assert result == [
        {
            "title": "task",
            "start_time": start,
            "end_time": start + timedelta(minutes=30),
        }
    ]


def test_ai_terminates_when_next_activity_would_exceed_end():
    # 60 min window. After sorting, first (priority 5, 30 min) fits;
    # second (priority 4, 45 min) does not since 30 + 45 = 75 > 60.
    svc = AIService()
    start = datetime(2026, 1, 1, 9, 0)
    end = datetime(2026, 1, 1, 10, 0)
    activities = [
        {"title": "first", "priority": 5, "duration_minutes": 30},
        {"title": "second", "priority": 4, "duration_minutes": 45},
    ]
    result = svc.generate_schedule(activities, start, end)
    assert [r["title"] for r in result] == ["first"]
