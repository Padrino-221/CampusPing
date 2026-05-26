import uuid
import hashlib
import hmac
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from pydantic import BaseModel
import httpx

from app.database import get_db
from app.middleware.auth import get_current_candidate
from app.models.candidate import Candidate
from app.models.credits import CreditPackage, CreditTransaction
from app.services.credits import get_balance
from app.config import settings

router = APIRouter(prefix="/api/credits", tags=["Credits"])

PAYSTACK_BASE = "https://api.paystack.co"


@router.get("/balance")
async def get_credit_balance(
    db: AsyncSession = Depends(get_db),
    candidate: Candidate = Depends(get_current_candidate)
):
    balance = await get_balance(db, candidate.id)
    return {"balance": balance, "candidate_id": str(candidate.id)}


@router.get("/transactions")
async def list_transactions(
    db: AsyncSession = Depends(get_db),
    candidate: Candidate = Depends(get_current_candidate),
    page: int = 1,
    limit: int = 20
):
    offset = (page - 1) * limit
    result = await db.execute(
        select(CreditTransaction)
        .where(CreditTransaction.candidate_id == candidate.id)
        .order_by(CreditTransaction.created_at.desc())
        .offset(offset).limit(limit)
    )
    transactions = result.scalars().all()
    return [
        {
            "id": str(t.id),
            "type": t.type,
            "amount": t.amount,
            "balance_after": t.balance_after,
            "reference": t.reference,
            "description": t.description,
            "created_at": t.created_at.isoformat()
        }
        for t in transactions
    ]


@router.get("/packages")
async def list_packages(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(CreditPackage).where(CreditPackage.is_active == True).order_by(CreditPackage.price_ghs)
    )
    packages = result.scalars().all()
    return [
        {
            "id": str(p.id),
            "name": p.name,
            "credits": p.credits,
            "price_ghs": float(p.price_ghs)
        }
        for p in packages
    ]


class PurchaseRequest(BaseModel):
    package_id: uuid.UUID


@router.post("/purchase")
async def purchase_credits(
    body: PurchaseRequest,
    db: AsyncSession = Depends(get_db),
    candidate: Candidate = Depends(get_current_candidate)
):
    result = await db.execute(
        select(CreditPackage).where(CreditPackage.id == body.package_id, CreditPackage.is_active == True)
    )
    package = result.scalar_one_or_none()
    if not package:
        raise HTTPException(status_code=404, detail="Credit package not found or inactive")

    reference = f"PAY-{uuid.uuid4().hex[:12].upper()}"
    amount_pesewas = int(package.price_ghs * 100)

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{PAYSTACK_BASE}/transaction/initialize",
            json={
                "email": candidate.email,
                "amount": amount_pesewas,
                "reference": reference,
                "callback_url": f"{settings.FRONTEND_URL}/credits",
                "metadata": {
                    "candidate_id": str(candidate.id),
                    "package_name": package.name,
                    "credits": package.credits
                }
            },
            headers={
                "Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}",
                "Content-Type": "application/json"
            }
        )
        data = resp.json()

    if not data.get("status"):
        raise HTTPException(status_code=502, detail=f"Paystack init failed: {data.get('message', 'unknown error')}")

    transaction = CreditTransaction(
        candidate_id=candidate.id,
        type="pending",
        amount=package.credits,
        balance_after=candidate.credits_balance,
        reference=reference,
        description=f"Pending purchase: {package.name} ({package.credits} credits)"
    )
    db.add(transaction)
    await db.commit()

    return {
        "message": "Purchase initiated",
        "reference": reference,
        "authorization_url": data["data"]["authorization_url"],
        "access_code": data["data"]["access_code"],
        "package": package.name,
        "credits": package.credits,
        "amount_ghs": float(package.price_ghs)
    }


@router.post("/verify")
async def verify_payment(
    request: Request,
    db: AsyncSession = Depends(get_db),
    candidate: Candidate = Depends(get_current_candidate)
):
    body = await request.json()
    reference = body.get("reference")
    if not reference:
        raise HTTPException(status_code=400, detail="Missing reference")

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{PAYSTACK_BASE}/transaction/verify/{reference}",
            headers={"Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}"}
        )
        data = resp.json()

    if not data.get("status") or data["data"]["status"] != "success":
        raise HTTPException(status_code=400, detail="Payment not successful")

    # Atomic claim check: only claim if still 'pending'
    stmt = (
        update(CreditTransaction)
        .where(CreditTransaction.reference == reference, CreditTransaction.type == "pending")
        .values(type="completed")
        .returning(CreditTransaction.id, CreditTransaction.candidate_id, CreditTransaction.amount)
    )
    result = await db.execute(stmt)
    row = result.fetchone()
    if not row:
        return {"message": "Already processed"}

    txn_id, txn_candidate_id, txn_amount = row

    await db.execute(
        update(Candidate)
        .where(Candidate.id == txn_candidate_id)
        .values(credits_balance=Candidate.credits_balance + txn_amount)
    )
    await db.commit()

    return {"message": "Credited successfully"}


@router.post("/webhook")
async def payment_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    payload = await request.body()
    signature = request.headers.get("x-paystack-signature", "")

    computed = hmac.new(
        settings.PAYSTACK_SECRET_KEY.encode(),
        payload,
        hashlib.sha512
    ).hexdigest()

    if not hmac.compare_digest(computed, signature):
        raise HTTPException(status_code=403, detail="Invalid webhook signature")

    import json
    data = json.loads(payload)
    if data.get("event") != "charge.success":
        return {"message": "Ignored"}

    ref = data["data"]["reference"]

    # Atomic claim check: only claim if still 'pending'
    stmt = (
        update(CreditTransaction)
        .where(CreditTransaction.reference == ref, CreditTransaction.type == "pending")
        .values(type="completed")
        .returning(CreditTransaction.id, CreditTransaction.candidate_id, CreditTransaction.amount)
    )
    result = await db.execute(stmt)
    row = result.fetchone()
    if not row:
        return {"message": "Already processed or not found"}

    txn_id, txn_candidate_id, txn_amount = row

    await db.execute(
        update(Candidate)
        .where(Candidate.id == txn_candidate_id)
        .values(credits_balance=Candidate.credits_balance + txn_amount)
    )
    await db.commit()

    return {"message": "Webhook processed successfully"}
