import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel, Field

from app.database import get_db
from app.middleware.auth import get_current_candidate
from app.models.candidate import Candidate
from app.models.sender_id import SenderID
from app.models.campaign import Campaign

router = APIRouter(prefix="/api/sender-ids", tags=["Sender IDs"])

class SenderIDCreate(BaseModel):
    sender_name: str = Field(..., min_length=1, max_length=11)

@router.post("/", status_code=status.HTTP_201_CREATED)
async def submit_sender_id(
    body: SenderIDCreate,
    db: AsyncSession = Depends(get_db),
    candidate: Candidate = Depends(get_current_candidate)
):
    # Validate: max 3 sender IDs per candidate
    count_result = await db.execute(
        select(func.count(SenderID.id)).where(SenderID.candidate_id == candidate.id)
    )
    if (count_result.scalar() or 0) >= 3:
        raise HTTPException(status_code=400, detail="Maximum of 3 sender IDs allowed per candidate")

    # Validate alphanumeric
    if not body.sender_name.replace(" ", "").isalnum():
        raise HTTPException(status_code=400, detail="Sender name must be alphanumeric (no special characters)")

    sender_id = SenderID(
        candidate_id=candidate.id,
        sender_name=body.sender_name.strip(),
        status="pending"
    )
    db.add(sender_id)
    await db.commit()
    await db.refresh(sender_id)
    return {
        "id": str(sender_id.id),
        "sender_name": sender_id.sender_name,
        "status": sender_id.status,
        "created_at": sender_id.created_at.isoformat()
    }

@router.get("/")
async def list_sender_ids(
    db: AsyncSession = Depends(get_db),
    candidate: Candidate = Depends(get_current_candidate)
):
    result = await db.execute(
        select(SenderID)
        .where(SenderID.candidate_id == candidate.id)
        .order_by(SenderID.created_at.desc())
    )
    sender_ids = result.scalars().all()
    return [
        {
            "id": str(s.id),
            "sender_name": s.sender_name,
            "status": s.status,
            "rejection_note": s.rejection_note,
            "reviewed_at": s.reviewed_at.isoformat() if s.reviewed_at else None,
            "created_at": s.created_at.isoformat()
        }
        for s in sender_ids
    ]

@router.delete("/{sender_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_sender_id(
    sender_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    candidate: Candidate = Depends(get_current_candidate)
):
    result = await db.execute(
        select(SenderID).where(SenderID.id == sender_id, SenderID.candidate_id == candidate.id)
    )
    sid = result.scalar_one_or_none()
    if not sid:
        raise HTTPException(status_code=404, detail="Sender ID not found")

    # Check if it's in use by any campaign
    in_use = await db.execute(
        select(func.count(Campaign.id)).where(Campaign.sender_id_ref == sender_id)
    )
    if (in_use.scalar() or 0) > 0:
        raise HTTPException(status_code=400, detail="Cannot delete a sender ID that is in use by campaigns")

    await db.delete(sid)
    await db.commit()
