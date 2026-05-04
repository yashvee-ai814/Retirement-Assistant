import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_db
from ..db.models import User, UserProfile, LoginEvent
from .models import LoginRequest, LoginResponse, RegisterRequest, RegisterResponse

auth_router = APIRouter(prefix="/auth", tags=["auth"])


@auth_router.post("/login", response_model=LoginResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)) -> LoginResponse:
    result = await db.execute(select(User).where(User.username == req.username))
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="User not found. Please create an account first.",
        )

    user.login_count = (user.login_count or 0) + 1
    user.last_login_at = datetime.now(timezone.utc)
    db.add(LoginEvent(user_id=user.id, username=user.username, action="login"))
    await db.commit()
    await db.refresh(user)
    return LoginResponse(user_id=user.id, username=user.username)


@auth_router.post("/register", response_model=RegisterResponse, status_code=201)
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)) -> RegisterResponse:
    result = await db.execute(select(User).where(User.username == req.username))
    if result.scalar_one_or_none() is not None:
        raise HTTPException(status_code=409, detail="Username already taken.")

    user = User(
        id=str(uuid.uuid4()),
        username=req.username,
        login_count=1,
        last_login_at=datetime.now(timezone.utc),
    )
    db.add(user)
    db.add(UserProfile(id=str(uuid.uuid4()), user_id=user.id))
    db.add(LoginEvent(user_id=user.id, username=user.username, action="register"))
    await db.commit()
    await db.refresh(user)
    return RegisterResponse(user_id=user.id, username=user.username, created=True)


@auth_router.get("/me", response_model=LoginResponse)
async def get_me(user_id: str, db: AsyncSession = Depends(get_db)) -> LoginResponse:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return LoginResponse(user_id=user.id, username=user.username)
