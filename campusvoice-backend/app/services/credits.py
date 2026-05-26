from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from fastapi import HTTPException, status

from app.models.candidate import Candidate
from app.models.credits import CreditTransaction


async def get_balance(db: AsyncSession, candidate_id) -> int:
    """Returns the current credits balance for a candidate."""
    result = await db.execute(select(Candidate).where(Candidate.id == candidate_id))
    candidate = result.scalar_one_or_none()
    return candidate.credits_balance if candidate else 0


async def deduct_credits(db: AsyncSession, candidate_id, amount: int, campaign_id: str) -> int:
    """
    Atomically deducts credits using a single UPDATE with a WHERE guard clause
    to prevent double-spend concurrency exploits.
    """
    stmt = (
        update(Candidate)
        .where(Candidate.id == candidate_id, Candidate.credits_balance >= amount)
        .values(credits_balance=Candidate.credits_balance - amount)
        .returning(Candidate.credits_balance)
    )
    result = await db.execute(stmt)
    row = result.fetchone()

    if not row:
        exists = await db.execute(select(Candidate.id).where(Candidate.id == candidate_id))
        if not exists.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found")
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"Insufficient credits. Required: {amount}"
        )

    new_balance = row[0]

    transaction = CreditTransaction(
        candidate_id=candidate_id,
        type="deduction",
        amount=-amount,
        balance_after=new_balance,
        reference=str(campaign_id),
        description=f"Campaign dispatch: {amount} SMS units"
    )
    db.add(transaction)
    await db.commit()
    return new_balance


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
