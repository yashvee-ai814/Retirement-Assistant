from typing import Literal, Optional
from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=50)


class LoginResponse(BaseModel):
    user_id: str
    username: str


class RegisterRequest(BaseModel):
    username: str = Field(min_length=1, max_length=50)


class RegisterResponse(BaseModel):
    user_id: str
    username: str
    created: bool = True


class UserProfileData(BaseModel):
    age: Optional[int] = Field(default=None, ge=16, le=100)
    current_pot: Optional[float] = Field(default=None, ge=0)
    monthly_personal: Optional[float] = Field(default=None, ge=0)
    monthly_employer: Optional[float] = Field(default=None, ge=0)
    target_annual_income: Optional[float] = Field(default=None, ge=0)
    retirement_age: Optional[int] = Field(default=None, ge=55, le=80)
    annual_growth_rate: Optional[float] = Field(default=None, ge=0, le=0.3)
    inflation_rate: Optional[float] = Field(default=None, ge=0, le=0.2)


class DocumentInfo(BaseModel):
    id: str
    original_name: str
    chunk_count: int
    status: str
    ingested_at: Optional[str] = None
    uploaded_by: Optional[str] = None


class ChatRequest(BaseModel):
    session_id: str = Field(min_length=1)
    user_id: str = Field(min_length=1)
    message: Optional[str] = None
    resume_input: Optional[dict] = None


class ToolCallInfo(BaseModel):
    name: str
    args: dict
    result: Optional[str] = None


class SourceReference(BaseModel):
    filename: str
    page: int
    excerpt: str


class PendingInterrupt(BaseModel):
    type: Literal["clarification"]
    question: Optional[str] = None


class ChatResponse(BaseModel):
    session_id: str
    reply: str
    status: Literal["complete", "awaiting_clarification"]
    pending_interrupt: Optional[PendingInterrupt] = None
    tool_calls_used: list[ToolCallInfo] = Field(default_factory=list)
    sources: list[SourceReference] = Field(default_factory=list)


class SessionInfo(BaseModel):
    id: str
    title: str
    created_at: str
    updated_at: str
