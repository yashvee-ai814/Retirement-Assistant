import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_db
from ..db.models import User, UserProfile
from .models import UserProfileData

profile_router = APIRouter(tags=["profile"])


@profile_router.get("/users/{user_id}/profile", response_model=UserProfileData)
async def get_profile(user_id: str, db: AsyncSession = Depends(get_db)) -> UserProfileData:
    result = await db.execute(select(User).where(User.id == user_id))
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="User not found")

    result = await db.execute(select(UserProfile).where(UserProfile.user_id == user_id))
    profile = result.scalar_one_or_none()
    if profile is None:
        return UserProfileData()

    return UserProfileData(
        age=profile.age,
        current_pot=profile.current_pot,
        monthly_personal=profile.monthly_personal,
        monthly_employer=profile.monthly_employer,
        target_annual_income=profile.target_annual_income,
        retirement_age=profile.retirement_age,
        annual_growth_rate=profile.annual_growth_rate,
        inflation_rate=profile.inflation_rate,
    )


@profile_router.put("/users/{user_id}/profile", response_model=UserProfileData)
async def update_profile(
    user_id: str,
    data: UserProfileData,
    db: AsyncSession = Depends(get_db),
) -> UserProfileData:
    result = await db.execute(select(User).where(User.id == user_id))
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="User not found")

    result = await db.execute(select(UserProfile).where(UserProfile.user_id == user_id))
    profile = result.scalar_one_or_none()
    if profile is None:
        profile = UserProfile(id=str(uuid.uuid4()), user_id=user_id)
        db.add(profile)

    update_data = data.model_dump(exclude_none=True)
    for field, value in update_data.items():
        setattr(profile, field, value)

    await db.commit()
    await db.refresh(profile)

    return UserProfileData(
        age=profile.age,
        current_pot=profile.current_pot,
        monthly_personal=profile.monthly_personal,
        monthly_employer=profile.monthly_employer,
        target_annual_income=profile.target_annual_income,
        retirement_age=profile.retirement_age,
        annual_growth_rate=profile.annual_growth_rate,
        inflation_rate=profile.inflation_rate,
    )
