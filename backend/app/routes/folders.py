"""
folders.py
- Defines FastAPI endpoints for creating, reading, updating, and deleting folders.
- Enforces per-user folder name uniqueness via DB IntegrityError handling (returns 409).
- Restricts access to folders owned by the current user dependency.
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps.auth import get_current_user_id
from app.models.folder import Folder
from app.schemas.folder import FolderCreate, FolderUpdate, FolderResponse

router = APIRouter(
    prefix="/folders",
    tags=["Folders"]
)


@router.post("", response_model=FolderResponse, response_model_exclude_none=True, status_code=status.HTTP_201_CREATED)
def create_folder(
    folder_in: FolderCreate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    folder = Folder(
        user_id=user_id,
        name=folder_in.name,
        color=folder_in.color,
    )
    db.add(folder)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A folder with this name already exists",
        )
    db.refresh(folder)
    return folder


@router.get("", response_model=List[FolderResponse], response_model_exclude_none=True)
def get_folders(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    return db.query(Folder).filter(Folder.user_id == user_id).all()


@router.patch("/{folder_id}", response_model=FolderResponse, response_model_exclude_none=True)
def update_folder(
    folder_id: int,
    folder_in: FolderUpdate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    folder = (
        db.query(Folder)
        .filter(Folder.id == folder_id, Folder.user_id == user_id)
        .first()
    )
    if not folder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found")

    update_data = folder_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(folder, field, value)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A folder with this name already exists",
        )
    db.refresh(folder)
    return folder


@router.delete("/{folder_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_folder(
    folder_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    folder = (
        db.query(Folder)
        .filter(Folder.id == folder_id, Folder.user_id == user_id)
        .first()
    )
    if not folder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found")

    db.delete(folder)
    db.commit()
    return None
