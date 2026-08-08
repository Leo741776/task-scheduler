"""
notification_service.py
- Schedules notifications for activities based on priority.
- Example intervals: High = 15 min, Medium = 1 hr, Low = 3 hr before start.
"""
from datetime import datetime, timedelta
from typing import Dict, Any, List

# Define notification intervals (in minutes) for each priority
PRIORITY_NOTIFICATION_INTERVALS = {
    5: 15,   # High priority: 15 minutes before
    4: 30,   # 30 minutes before
    3: 60,   # 1 hour before
    2: 120,  # 2 hours before
    1: 180,  # Low priority: 3 hours before
}

def get_notification_time(activity: Dict[str, Any]) -> datetime:
    """
    Returns the notification time for an activity based on its priority.
    """
    start_time = activity["start_time"]
    priority = activity.get("priority", 3)
    interval = PRIORITY_NOTIFICATION_INTERVALS.get(priority, 60)
    return start_time - timedelta(minutes=interval)

def schedule_notifications(activities: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Returns a list of notifications to be scheduled for the given activities.
    Each notification contains the activity title, scheduled notification time, and priority.
    """
    notifications = []
    for activity in activities:
        notification_time = get_notification_time(activity)
        notifications.append({
            "title": activity["title"],
            "priority": activity.get("priority", 3),
            "notification_time": notification_time,
        })
    return notifications
