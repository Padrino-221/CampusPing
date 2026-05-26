import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

class CandidateBase(BaseModel):
    full_name: str = Field(..., max_length=255)
    email: str = Field(..., max_length=255)
    phone: Optional[str] = Field(None, max_length=20)
    position: Optional[str] = Field(None, max_length=255)

class CandidateCreate(CandidateBase):
    password: str = Field(..., min_length=6)
    institution_id: uuid.UUID

class CandidateUpdate(BaseModel):
    full_name: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=20)
    position: Optional[str] = Field(None, max_length=255)
    password: Optional[str] = Field(None, min_length=6)
    institution_id: Optional[uuid.UUID] = None

class CandidateResponse(CandidateBase):
    id: uuid.UUID
    institution_id: uuid.UUID
    institution_name: Optional[str] = None
    profile_photo: Optional[str] = None
    credits_balance: int
    is_active: bool
    is_verified: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class CandidateLogin(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    message: str
    candidate: CandidateResponse
