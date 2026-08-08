"""
scheduler.py
- Defines `SchedulerService` for ordering activities and generating time-block schedules.
- Supports schedule generation from `Activity` objects or plain dictionaries.
- Applies optional scheduling constraints such as minimum rest intervals.
"""

from typing import List, Dict, Optional, Union, Any
from datetime import datetime, timedelta
from app.models.activity import Activity

ScheduleItem = Dict[str, Any]

class SchedulerService:
    def __init__(self):
        pass

    def generate_schedule(
        self,
        activities: List[Union[Activity, Dict[str, Any]]],
        start_time: datetime,
        end_time: datetime,
        constraints: Optional[Dict] = None
    ) -> List[ScheduleItem]:

        schedule: List[ScheduleItem] = []

        current_time = start_time

        for activity in activities:
            if isinstance(activity, dict):
                title = activity.get("title")
                duration_minutes = activity.get("duration_minutes")
            else:
                title = activity.title
                duration_minutes = activity.duration_minutes

            if not title or duration_minutes is None:
                continue

            duration = timedelta(minutes=duration_minutes)

            if current_time + duration > end_time:
                break

            schedule.append({
                "title": title,
                "start_time": current_time,
                "end_time": current_time + duration
            })

            current_time += duration

            if constraints and "min_rest_minutes" in constraints:
                current_time += timedelta(minutes=constraints["min_rest_minutes"])
        
        return schedule

    def sort_activities_by_priority(self, activities: List[Activity]) -> List[Activity]:
        return sorted(
            activities,
            key=lambda a: (-a.priority, a.duration_minutes)
        )
