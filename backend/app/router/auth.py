import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.database import get_db
from ..db.models import User, UserProfile
from .models import LoginRequest, LoginResponse

auth_router = APIRouter(prefix="/auth", tags=["auth"])


@auth_router.post("/login", response_model=LoginResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)) -> LoginResponse:
    result = await db.execute(select(User).where(User.username == req.username))
    user = result.scalar_one_or_none()
    if user is None:
        user = User(id=str(uuid.uuid4()), username=req.username)
        db.add(user)
        profile = UserProfile(id=str(uuid.uuid4()), user_id=user.id)
        db.add(profile)
        await db.commit()
        await db.refresh(user)
    return LoginResponse(user_id=user.id, username=user.username)


@auth_router.get("/me", response_model=LoginResponse)
async def get_me(user_id: str, db: AsyncSession = Depends(get_db)) -> LoginResponse:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return LoginResponse(user_id=user.id, username=user.username)
