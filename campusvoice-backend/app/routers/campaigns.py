import uuid
import asyncio
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel

from app.database import get_db
from app.middleware.auth import get_current_candidate
from app.models.candidate import Candidate
from app.models.campaign import Campaign, CampaignLog
from app.models.sender_id import SenderID
from app.services.filter_engine import get_filtered_count_async
from app.services.credits import deduct_credits, add_credits
from app.utils.sms import calculate_sms_units
from app.tasks.send_campaign import run_dispatch_sync
from app.tasks.celery_app import _redis_available
from app.config import settings

router = APIRouter(prefix="/api/campaigns", tags=["Campaigns"])


class CampaignCreate(BaseModel):
    title: Optional[str] = None
    message: str
    sender_id_ref: Optional[uuid.UUID] = None
    filters: Optional[dict] = {}
    custom_recipients: Optional[list[str]] = None
    scheduled_at: Optional[datetime] = None


class CampaignUpdate(BaseModel):
    title: Optional[str] = None
    message: Optional[str] = None
    sender_id_ref: Optional[uuid.UUID] = None
    filters: Optional[dict] = None
    custom_recipients: Optional[list[str]] = None
    scheduled_at: Optional[datetime] = None


def campaign_to_dict(c: Campaign) -> dict:
    return {
        "id": str(c.id),
        "candidate_id": str(c.candidate_id),
        "sender_id_ref": str(c.sender_id_ref) if c.sender_id_ref else None,
        "title": c.title,
        "message": c.message,
        "filters": c.filters,
        "custom_recipients": c.custom_recipients,
        "recipient_count": c.recipient_count,
        "credits_used": c.credits_used,
        "status": c.status,
        "scheduled_at": c.scheduled_at.isoformat() if c.scheduled_at else None,
        "sent_at": c.sent_at.isoformat() if c.sent_at else None,
        "created_at": c.created_at.isoformat() if c.created_at else None,
    }


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_campaign(
    body: CampaignCreate,
    db: AsyncSession = Depends(get_db),
    candidate: Candidate = Depends(get_current_candidate)
):
    # Validate sender ID if provided
    if body.sender_id_ref:
        sid_result = await db.execute(
            select(SenderID).where(
                SenderID.id == body.sender_id_ref,
                SenderID.candidate_id == candidate.id,
                SenderID.status == "approved"
            )
        )
        if not sid_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Sender ID not found or not approved"
            )

    # Calculate audience count and credits estimate
    if body.custom_recipients:
        seen = set()
        cleaned = []
        for p in body.custom_recipients:
            s = p.strip()
            if s and s not in seen:
                seen.add(s)
                cleaned.append(s)
        recipient_count = len(cleaned)
        custom_recipients = cleaned
    else:
        recipient_count = await get_filtered_count_async(db, candidate.institution_id, body.filters or {})
        custom_recipients = None
    sms_units = calculate_sms_units(body.message)
    credits_needed = recipient_count * sms_units

    campaign = Campaign(
        candidate_id=candidate.id,
        sender_id_ref=body.sender_id_ref,
        title=body.title,
        message=body.message,
        filters=body.filters or {},
        custom_recipients=custom_recipients,
        recipient_count=recipient_count,
        credits_used=credits_needed,
        status="draft",
        scheduled_at=body.scheduled_at,
    )
    db.add(campaign)
    await db.commit()
    await db.refresh(campaign)
    return campaign_to_dict(campaign)


@router.get("/")
async def list_campaigns(
    db: AsyncSession = Depends(get_db),
    candidate: Candidate = Depends(get_current_candidate),
    page: int = 1,
    limit: int = 20
):
    offset = (page - 1) * limit
    result = await db.execute(
        select(Campaign)
        .where(Campaign.candidate_id == candidate.id)
        .order_by(Campaign.created_at.desc())
        .offset(offset).limit(limit)
    )
    campaigns = result.scalars().all()
    total = await db.execute(
        select(func.count(Campaign.id)).where(Campaign.candidate_id == candidate.id)
    )
    return {
        "campaigns": [campaign_to_dict(c) for c in campaigns],
        "total": total.scalar(),
        "page": page,
        "limit": limit
    }


@router.get("/{campaign_id}")
async def get_campaign(
    campaign_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    candidate: Candidate = Depends(get_current_candidate)
):
    result = await db.execute(
        select(Campaign).where(Campaign.id == campaign_id, Campaign.candidate_id == candidate.id)
    )
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    # Compute delivery stats
    stats_result = await db.execute(
        select(CampaignLog.status, func.count(CampaignLog.id))
        .where(CampaignLog.campaign_id == campaign_id)
        .group_by(CampaignLog.status)
    )
    stats_raw = stats_result.fetchall()
    stats = {row[0]: row[1] for row in stats_raw}

    data = campaign_to_dict(campaign)
    data["stats"] = {
        "sent": stats.get("sent", 0),
        "delivered": stats.get("delivered", 0),
        "failed": stats.get("failed", 0),
        "queued": stats.get("queued", 0),
    }
    return data


@router.put("/{campaign_id}")
async def update_campaign(
    campaign_id: uuid.UUID,
    body: CampaignUpdate,
    db: AsyncSession = Depends(get_db),
    candidate: Candidate = Depends(get_current_candidate)
):
    result = await db.execute(
        select(Campaign).where(Campaign.id == campaign_id, Campaign.candidate_id == candidate.id)
    )
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    if campaign.status != "draft":
        raise HTTPException(status_code=400, detail="Only draft campaigns can be edited")

    if body.title is not None:
        campaign.title = body.title
    if body.message is not None:
        campaign.message = body.message
        sms_units = calculate_sms_units(body.message)
        campaign.credits_used = campaign.recipient_count * sms_units
    if body.sender_id_ref is not None:
        campaign.sender_id_ref = body.sender_id_ref
    if body.filters is not None:
        campaign.filters = body.filters
        campaign.custom_recipients = None
        campaign.recipient_count = await get_filtered_count_async(db, candidate.institution_id, body.filters)
        sms_units = calculate_sms_units(campaign.message)
        campaign.credits_used = campaign.recipient_count * sms_units
    if body.custom_recipients is not None:
        seen = set()
        cleaned = []
        for p in body.custom_recipients:
            s = p.strip()
            if s and s not in seen:
                seen.add(s)
                cleaned.append(s)
        campaign.custom_recipients = cleaned
        campaign.filters = {}
        campaign.recipient_count = len(cleaned)
        sms_units = calculate_sms_units(campaign.message)
        campaign.credits_used = campaign.recipient_count * sms_units
    if body.scheduled_at is not None:
        campaign.scheduled_at = body.scheduled_at

    await db.commit()
    await db.refresh(campaign)
    return campaign_to_dict(campaign)


@router.post("/{campaign_id}/send")
async def send_campaign(
    campaign_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    candidate: Candidate = Depends(get_current_candidate)
):
    result = await db.execute(
        select(Campaign).where(Campaign.id == campaign_id, Campaign.candidate_id == candidate.id)
    )
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    if campaign.status != "draft":
        raise HTTPException(status_code=400, detail="Only draft campaigns can be sent")

    credits_needed = campaign.credits_used
    if credits_needed <= 0:
        if campaign.custom_recipients:
            count = len(campaign.custom_recipients)
        else:
            count = await get_filtered_count_async(db, candidate.institution_id, campaign.filters or {})
        sms_units = calculate_sms_units(campaign.message)
        credits_needed = count * sms_units
        campaign.recipient_count = count
        campaign.credits_used = credits_needed

    # Deduct credits (raises 402 if insufficient)
    await deduct_credits(db, candidate.id, credits_needed, str(campaign_id))

    # Dispatch — Celery in dev (with Redis), sync in prod
    campaign.status = "queued"
    await db.commit()

    use_celery = settings.ENVIRONMENT == "development" and _redis_available
    if use_celery:
        from app.tasks.send_campaign import dispatch_campaign
        dispatch_campaign.apply_async((str(campaign_id),))
    else:
        await asyncio.to_thread(run_dispatch_sync, str(campaign_id))

    # Re-fetch to get updated status and counts
    result = await db.execute(
        select(Campaign).where(Campaign.id == campaign_id, Campaign.candidate_id == candidate.id)
    )
    campaign = result.scalar_one_or_none()

    return {
        "message": "Campaign sent successfully",
        "campaign_id": str(campaign_id),
        "status": campaign.status if campaign else "unknown",
        "recipient_count": campaign.recipient_count if campaign else 0,
        "credits_used": campaign.credits_used if campaign else 0,
    }


@router.post("/{campaign_id}/schedule")
async def schedule_campaign(
    campaign_id: uuid.UUID,
    scheduled_at: datetime,
    db: AsyncSession = Depends(get_db),
    candidate: Candidate = Depends(get_current_candidate)
):
    result = await db.execute(
        select(Campaign).where(Campaign.id == campaign_id, Campaign.candidate_id == candidate.id)
    )
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    if campaign.status != "draft":
        raise HTTPException(status_code=400, detail="Only draft campaigns can be scheduled")

    credits_needed = campaign.credits_used
    await deduct_credits(db, candidate.id, credits_needed, str(campaign_id))

    campaign.status = "queued"
    campaign.scheduled_at = scheduled_at
    await db.commit()

    use_celery = settings.ENVIRONMENT == "development" and _redis_available
    if use_celery:
        from app.tasks.send_campaign import dispatch_campaign
        dispatch_campaign.apply_async((str(campaign_id),), eta=scheduled_at)
    else:
        print(f"[Dispatch] Celery unavailable — sending scheduled campaign immediately")
        await asyncio.to_thread(run_dispatch_sync, str(campaign_id))

    return {"message": f"Campaign scheduled for {scheduled_at.isoformat()}", "campaign_id": str(campaign_id)}


@router.delete("/{campaign_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_campaign(
    campaign_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    candidate: Candidate = Depends(get_current_candidate)
):
    result = await db.execute(
        select(Campaign).where(Campaign.id == campaign_id, Campaign.candidate_id == candidate.id)
    )
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    if campaign.status != "draft":
        raise HTTPException(status_code=400, detail="Only draft campaigns can be deleted")
    await db.delete(campaign)
    await db.commit()
