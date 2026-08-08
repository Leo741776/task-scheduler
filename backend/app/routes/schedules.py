"""
schedules.py
- Defines the schedule generation endpoint for the API.
- Loads user activities, validates time windows, and builds a schedule via `SchedulerService`.
- Persists generated schedules and returns structured schedule data to the client.
"""

import json
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.activity import Activity
from app.models.schedule import Schedule
from app.schemas.schedule import ScheduleItem, ScheduleResponse, ScheduleCreate

from app.services.scheduler import SchedulerService
from app.services.notification_service import schedule_notifications

router = APIRouter(
    prefix="/schedules",
    tags=["Schedules"]
)

def get_current_user_id() -> int:
    return 1

scheduler = SchedulerService()

@router.post("/", response_model=ScheduleResponse, response_model_exclude_none=True, status_code=status.HTTP_201_CREATED)
def generate_schedule(payload: ScheduleCreate, db: Session = Depends(get_db)):
    user_id = get_current_user_id()

    if payload.end_time <= payload.start_time:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="end_time must be after start_time",
        )

    activities = db.query(Activity).filter(Activity.user_id == user_id).all()

    if not activities:
        raise HTTPException(status_code=404, detail="No activities found for this user")

    activities = scheduler.sort_activities_by_priority(activities)

    schedule_items_raw = scheduler.generate_schedule(
        activities=activities,
        start_time=payload.start_time,
        end_time=payload.end_time
    )

    if not schedule_items_raw:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Unable to fit any activities in the provided time window",
        )


    # Add priority to schedule_items for notification scheduling
    schedule_items: List[ScheduleItem] = []
    for activity, item in zip(activities, schedule_items_raw):
        # Attach priority if available
        item_dict = dict(item)
        item_dict["priority"] = getattr(activity, "priority", 3)
        schedule_items.append(ScheduleItem(**item_dict))

    # Schedule notifications for each activity (for now, just log/return them)
    notifications = schedule_notifications([
        {"title": item.title, "start_time": item.start_time, "priority": getattr(item, "priority", 3)}
        for item in schedule_items
    ])

    schedule = Schedule(
        user_id=user_id,
        title=payload.title or f"Schedule {payload.start_time.date()}",
        description=payload.description,
        start_time=payload.start_time,
        end_time=payload.end_time,
        activities_json=json.dumps([item.model_dump(mode="json") for item in schedule_items])
    )


    db.add(schedule)
    db.commit()
    db.refresh(schedule)

    # For demonstration, return notifications in the response (remove in production)
    response = ScheduleResponse(
        id=schedule.id,
        user_id=schedule.user_id,
        title=schedule.title,
        description=schedule.description,
        start_time=schedule.start_time,
        end_time=schedule.end_time,
        schedule=schedule_items,
        created_at=schedule.created_at,
        updated_at=schedule.updated_at,
    )
    # Attach notifications for now (not in schema, but for demo)
    response_dict = response.model_dump()
    response_dict["notifications"] = notifications
    return response_dict
