from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status

from app.models.candidate import Candidate
from app.models.credits import CreditTransaction


async def get_balance(db: AsyncSession, candidate_id) -> int:
    """Returns the current credits balance for a candidate."""
    result = await db.execute(select(Candidate).where(Candidate.id == candidate_id))
    candidate = result.scalar_one_or_none()
    return candidate.credits_balance if candidate else 0


async def deduct_credits(db: AsyncSession, candidate_id, amount: int, campaign_id: str):
    """
    Atomically deducts credits from a candidate's balance.
    Raises 402 if balance is insufficient.
    """
    result = await db.execute(select(Candidate).where(Candidate.id == candidate_id))
    candidate = result.scalar_one_or_none()

    if not candidate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found")

    if candidate.credits_balance < amount:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"Insufficient credits. Required: {amount}, Available: {candidate.credits_balance}"
        )

    candidate.credits_balance -= amount

    transaction = CreditTransaction(
        candidate_id=candidate_id,
        type="deduction",
        amount=-amount,
        balance_after=candidate.credits_balance,
        reference=str(campaign_id),
        description=f"Campaign dispatch: {amount} SMS units"
    )
    db.add(transaction)
    await db.commit()
    return candidate.credits_balance


async def add_credits(db: AsyncSession, candidate_id, amount: int, reference: str, description: str):
    """
    Credits a candidate's account with SMS units and logs the transaction.
    """
    result = await db.execute(select(Candidate).where(Candidate.id == candidate_id))
    candidate = result.scalar_one_or_none()

    if not candidate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found")

    candidate.credits_balance += amount

    transaction = CreditTransaction(
        candidate_id=candidate_id,
        type="purchase",
        amount=amount,
        balance_after=candidate.credits_balance,
        reference=reference,
        description=description
    )
    db.add(transaction)
    await db.commit()
    return candidate.credits_balance
