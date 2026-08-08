from datetime import datetime, timedelta

from app.models.activity import Activity
from app.services.scheduler import SchedulerService


def make_activity(title, priority, duration_minutes):
    return Activity(
        title=title, priority=priority, duration_minutes=duration_minutes
    )


def test_sort_orders_by_descending_priority():
    svc = SchedulerService()
    low = make_activity("low", priority=1, duration_minutes=30)
    high = make_activity("high", priority=5, duration_minutes=30)
    mid = make_activity("mid", priority=3, duration_minutes=30)
    result = svc.sort_activities_by_priority([low, high, mid])
    assert [a.title for a in result] == ["high", "mid", "low"]


def test_sort_ties_broken_by_ascending_duration():
    svc = SchedulerService()
    long_p5 = make_activity("long5", priority=5, duration_minutes=60)
    short_p5 = make_activity("short5", priority=5, duration_minutes=15)
    mid_p5 = make_activity("mid5", priority=5, duration_minutes=30)
    result = svc.sort_activities_by_priority([long_p5, short_p5, mid_p5])
    assert [a.title for a in result] == ["short5", "mid5", "long5"]


def test_sort_returns_new_list_without_mutating_input():
    svc = SchedulerService()
    a = make_activity("a", priority=1, duration_minutes=30)
    b = make_activity("b", priority=5, duration_minutes=30)
    original = [a, b]
    result = svc.sort_activities_by_priority(original)
    assert original[0] is a and original[1] is b
    assert result is not original


def test_generate_schedule_empty_list_returns_empty_list():
    svc = SchedulerService()
    start = datetime(2026, 1, 1, 9, 0)
    end = datetime(2026, 1, 1, 17, 0)
    assert svc.generate_schedule([], start, end) == []


def test_generate_schedule_single_fitting_activity():
    svc = SchedulerService()
    start = datetime(2026, 1, 1, 9, 0)
    end = datetime(2026, 1, 1, 10, 0)
    activity = make_activity("task", priority=3, duration_minutes=30)
    result = svc.generate_schedule([activity], start, end)
    assert result == [
        {
            "title": "task",
            "start_time": start,
            "end_time": start + timedelta(minutes=30),
        }
    ]


def test_generate_schedule_packs_activities_sequentially_in_input_order():
    svc = SchedulerService()
    start = datetime(2026, 1, 1, 9, 0)
    end = datetime(2026, 1, 1, 12, 0)
    a = make_activity("first", priority=1, duration_minutes=30)
    b = make_activity("second", priority=5, duration_minutes=30)
    c = make_activity("third", priority=3, duration_minutes=30)
    result = svc.generate_schedule([a, b, c], start, end)
    assert [r["title"] for r in result] == ["first", "second", "third"]
    assert result[0]["start_time"] == start
    assert result[1]["start_time"] == start + timedelta(minutes=30)
    assert result[2]["start_time"] == start + timedelta(minutes=60)


def test_generate_schedule_does_not_internally_sort_by_priority():
    svc = SchedulerService()
    start = datetime(2026, 1, 1, 9, 0)
    end = datetime(2026, 1, 1, 11, 0)
    low = make_activity("low", priority=1, duration_minutes=30)
    high = make_activity("high", priority=5, duration_minutes=30)
    result = svc.generate_schedule([low, high], start, end)
    assert [r["title"] for r in result] == ["low", "high"]


def test_generate_schedule_skips_missing_title_and_continues():
    svc = SchedulerService()
    start = datetime(2026, 1, 1, 9, 0)
    end = datetime(2026, 1, 1, 11, 0)
    no_title = {"title": "", "duration_minutes": 30}
    good = make_activity("good", priority=3, duration_minutes=30)
    result = svc.generate_schedule([no_title, good], start, end)
    assert len(result) == 1
    assert result[0]["title"] == "good"
    assert result[0]["start_time"] == start


def test_generate_schedule_skips_none_duration_and_continues():
    svc = SchedulerService()
    start = datetime(2026, 1, 1, 9, 0)
    end = datetime(2026, 1, 1, 11, 0)
    no_dur = {"title": "no-duration", "duration_minutes": None}
    good = make_activity("good", priority=3, duration_minutes=30)
    result = svc.generate_schedule([no_dur, good], start, end)
    assert len(result) == 1
    assert result[0]["title"] == "good"
    assert result[0]["start_time"] == start


def test_generate_schedule_inserts_rest_gap_between_blocks():
    svc = SchedulerService()
    start = datetime(2026, 1, 1, 9, 0)
    end = datetime(2026, 1, 1, 12, 0)
    a = make_activity("a", priority=3, duration_minutes=30)
    b = make_activity("b", priority=3, duration_minutes=30)
    result = svc.generate_schedule(
        [a, b], start, end, constraints={"min_rest_minutes": 15}
    )
    assert result[0]["start_time"] == start
    assert result[0]["end_time"] == start + timedelta(minutes=30)
    assert result[1]["start_time"] == start + timedelta(minutes=45)
    assert result[1]["end_time"] == start + timedelta(minutes=75)


def test_generate_schedule_accepts_mixed_orm_and_dict_inputs():
    svc = SchedulerService()
    start = datetime(2026, 1, 1, 9, 0)
    end = datetime(2026, 1, 1, 11, 0)
    orm = make_activity("orm-task", priority=3, duration_minutes=30)
    as_dict = {"title": "dict-task", "duration_minutes": 30}
    result = svc.generate_schedule([orm, as_dict], start, end)
    assert [r["title"] for r in result] == ["orm-task", "dict-task"]
    assert result[1]["start_time"] == start + timedelta(minutes=30)


def test_generate_schedule_stops_at_first_overflow_not_skip_and_continue():
    # A fits (30 min in 60 min window), B does not fit (30 + 45 > 60),
    # C would fit if B were skipped (30 + 15 <= 60). Only A should land.
    svc = SchedulerService()
    start = datetime(2026, 1, 1, 9, 0)
    end = datetime(2026, 1, 1, 10, 0)
    a = make_activity("A", priority=3, duration_minutes=30)
    b = make_activity("B", priority=3, duration_minutes=45)
    c = make_activity("C", priority=3, duration_minutes=15)
    result = svc.generate_schedule([a, b, c], start, end)
    assert [r["title"] for r in result] == ["A"]


def test_rest_gap_is_counted_in_fit_check():
    # Without rest gap, B fits exactly at the window boundary (30 + 30 == 60).
    # With a 15-minute rest gap, the second block would start at 9:45 and end
    # at 10:15, exceeding the 10:00 window end, so B must not be scheduled.
    svc = SchedulerService()
    start = datetime(2026, 1, 1, 9, 0)
    end = datetime(2026, 1, 1, 10, 0)
    a = make_activity("A", priority=3, duration_minutes=30)
    b = make_activity("B", priority=3, duration_minutes=30)

    no_gap = svc.generate_schedule([a, b], start, end)
    assert [r["title"] for r in no_gap] == ["A", "B"]

    with_gap = svc.generate_schedule(
        [a, b], start, end, constraints={"min_rest_minutes": 15}
    )
    assert [r["title"] for r in with_gap] == ["A"]
