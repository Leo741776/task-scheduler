"""
validators.py
- Defines validation helpers for activity fields and scheduling inputs.
- Enforces duration and priority rules for activity data.
- Validates schedule time bounds and required activity collections.
"""

from datetime import datetime
from typing import Sequence, Any

def validate_activity_duration(duration_minutes: int) -> None:
    if duration_minutes is None:
        raise ValueError("Activity duration is required")
    if duration_minutes <= 0:
        raise ValueError("Activity duration must be greater than 0 minutes")


def validate_activity_priority(priority: int) -> None:
    if priority is None:
        raise ValueError("Activity priority is required")
    if priority < 1 or priority > 5:
        raise ValueError("Activity priority must be between 1 and 5")

def validate_schedule_times(start_time: datetime, end_time: datetime) -> None:
    if start_time is None or end_time is None:
        raise ValueError("Schedule start_time and end_time are required")
    if start_time >= end_time:
        raise ValueError("Schedule start_time must be before end_time")


def validate_activities_for_schedule(activities: Sequence[Any]) -> None:
    if not activities or len(activities) == 0:
        raise ValueError("No activities provided to generate schedule")
