"""
auth.py
- Defines authentication endpoints for user registration and login.
- Validates credentials against the `User` model using database queries.
- Applies password hashing and verification through security utilities.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError

from app.database import get_db
from app.models.user import User
from app.schemas.auth import TokenResponse
from app.schemas.user import UserCreate, UserLogin, UserResponse
from app.utils.jwt import create_access_token
from app.utils.security import hash_password, verify_password

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(user_data: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(
        User.username == user_data.username
    ).first()

    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User already exists")

    email = user_data.email or f"{user_data.username}@example.com"
    hashed_pw = hash_password(user_data.password)

    new_user = User(
        username=user_data.username,
        email=email,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        hashed_password=hashed_pw
    )

    db.add(new_user)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User already exists")

    db.refresh(new_user)

    return new_user

@router.post("/login", response_model=TokenResponse)
def login_user(login_data: UserLogin, db: Session = Depends(get_db)):
    if not login_data.username and not login_data.email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Provide username or email")

    user = None

    if login_data.username:
        user = db.query(User).filter(User.username == login_data.username).first()
    elif login_data.email:
        user = db.query(User).filter(User.email == login_data.email).first()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    access_token = create_access_token(user.id)
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )
