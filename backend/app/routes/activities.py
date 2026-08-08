"""
activities.py
- Defines FastAPI endpoints for creating, reading, updating, and deleting activities.
- Uses request/response schemas and SQLAlchemy sessions for data validation and persistence.
- Restricts access to activities owned by the current user dependency.
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps.auth import get_current_user_id
from app.models.activity import Activity
from app.models.folder import Folder
from app.schemas.activity import ActivityCreate, ActivityUpdate, ActivityResponse

router = APIRouter(
    prefix="/activities",
    tags=["Activities"]
)


def _verify_folder_owned(db: Session, folder_id: int, user_id: int) -> None:
    """Reject folder_id values that don't belong to the current user.
    Returns 404 (not 403) so unowned ids look identical to nonexistent ones."""
    folder = (
        db.query(Folder)
        .filter(Folder.id == folder_id, Folder.user_id == user_id)
        .first()
    )
    if not folder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Folder not found",
        )


@router.post("", response_model=ActivityResponse, response_model_exclude_none=True, status_code=status.HTTP_201_CREATED)
def create_activity(
    activity_in: ActivityCreate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    if activity_in.folder_id is not None:
        _verify_folder_owned(db, activity_in.folder_id, user_id)

    activity = Activity(
        user_id=user_id,
        title=activity_in.title,
        description=activity_in.description,
        duration_minutes=activity_in.duration_minutes,
        priority=activity_in.priority,
        folder_id=activity_in.folder_id,
        completed=activity_in.completed,
        task_group_id=activity_in.task_group_id,
    )
    db.add(activity)
    db.commit()
    db.refresh(activity)
    return activity

@router.get("", response_model=List[ActivityResponse], response_model_exclude_none=True)
def get_activities(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    activities = db.query(Activity).filter(Activity.user_id == user_id).all()
    return activities

@router.get("/{activity_id}", response_model=ActivityResponse, response_model_exclude_none=True)
def get_activity(
    activity_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    activity = (
        db.query(Activity)
        .filter(Activity.id == activity_id, Activity.user_id == user_id)
        .first()
    )
    if not activity:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activity not found")
    return activity

@router.patch("/{activity_id}", response_model=ActivityResponse, response_model_exclude_none=True)
def update_activity(
    activity_id: int,
    activity_in: ActivityUpdate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    activity = (
        db.query(Activity)
        .filter(Activity.id == activity_id, Activity.user_id == user_id)
        .first()
    )
    if not activity:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activity not found")

    update_data = activity_in.model_dump(exclude_unset=True)

    if "folder_id" in update_data and update_data["folder_id"] is not None:
        _verify_folder_owned(db, update_data["folder_id"], user_id)

    for field, value in update_data.items():
        setattr(activity, field, value)

    db.commit()
    db.refresh(activity)
    return activity

@router.delete("/groups/{task_group_id}")
def delete_activity_group(
    task_group_id: str,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    activities = (
        db.query(Activity)
        .filter(
            Activity.task_group_id == task_group_id,
            Activity.user_id == user_id,
        )
        .all()
    )

    if not activities:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activity group not found",
        )

    deleted_count = len(activities)

    for activity in activities:
        db.delete(activity)

    db.commit()

    return {"deleted": deleted_count}

@router.delete("/{activity_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_activity(
    activity_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    activity = (
        db.query(Activity)
        .filter(Activity.id == activity_id, Activity.user_id == user_id)
        .first()
    )
    if not activity:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activity not found")

    db.delete(activity)
    db.commit()
    return None
