"""
ai_service.py
- Defines `AIService` for generating schedule blocks from activities and time bounds.
- Orders activities by priority and fits them into a valid time window.
- Returns structured schedule items with `title`, `start_time`, and `end_time`.
"""

from typing import List, Dict, Any
from datetime import datetime, timedelta


class AIService:
    def generate_schedule(
        self,
        activities: List[Dict[str, Any]],
        start_time: datetime,
        end_time: datetime
    ) -> List[Dict[str, Any]]:
        if end_time <= start_time:
            return []

        activities_sorted = sorted(activities, key=lambda x: x.get("priority", 0), reverse=True)

        scheduled_activities: List[Dict[str, Any]] = []
        current_time = start_time

        for activity in activities_sorted:
            title = activity.get("title")
            duration = activity.get("duration_minutes", 60)

            if not title:
                continue
            if not isinstance(duration, int) or duration <= 0:
                continue

            activity_start = current_time
            activity_end = activity_start + timedelta(minutes=duration)

            if activity_end > end_time:
                break

            scheduled_activities.append({
                "title": title,
                "start_time": activity_start,
                "end_time": activity_end,
            })

            current_time = activity_end

        return scheduled_activities
