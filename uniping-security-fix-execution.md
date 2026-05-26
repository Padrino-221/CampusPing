# Execution Order: Secure Refactoring of UniPing Backend & Frontend Utilities

You are a deterministic, high-reliability software engineering agent. Your task is to refactor the UniPing codebase to resolve four verified security vulnerabilities. 

Strictly implement the exact logic blocks provided below. Do not alter existing database model names, do not invent new utility functions outside of these changes, and do not modify endpoints not explicitly mentioned.

---

## Task 1: Fix Race Condition in Credit Deduction
* **Target File:** `app/services/credits.py`
* **Objective:** Replace the non-atomic read-then-write credit check pattern with an atomic database-level compare-and-swap `UPDATE` statement using a `WHERE` balance constraint.

### Implementation Code:
Replace your existing `deduct_credits` function completely with this precise block:

```python
from sqlalchemy import select, update
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.candidate import Candidate
from app.models.credits import CreditTransaction

async def deduct_credits(db: AsyncSession, candidate_id: int, amount: int, campaign_id: str) -> int:
    """
    Atomically deducts credits using a single UPDATE with a WHERE guard clause
    to prevent double-spend concurrency exploits.
    """
    # Executing atomic state transition directly via the DB engine
    stmt = (
        update(Candidate)
        .where(Candidate.id == candidate_id, Candidate.credits_balance >= amount)
        .values(credits_balance=Candidate.credits_balance - amount)
        .returning(Candidate.credits_balance)
    )
    result = await db.execute(stmt)
    row = result.fetchone()
    
    if not row:
        # Check if the failure was due to missing user or insufficient credit
        exists = await db.execute(select(Candidate.id).where(Candidate.id == candidate_id))
        if not exists.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found")
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"Insufficient credits. Required: {amount}"
        )
        
    new_balance = row[0]
    
    # Log the verified transaction within the same atomic database session
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
Task 2: Fix Double-Credit Verification/Webhook Race Condition
Target File: app/routers/credits.py

Objective: Implement a claim-check pattern using .where(CreditTransaction.type == "pending") so concurrent network requests cannot double-credit a user wallet balance.

Implementation Code:
Refactor the /verify and /webhook endpoint routers inside app/routers/credits.py to match this exact logical routing block:

Python
import hmac
import hashlib
import json
import httpx
from fastapi import Request, Depends, HTTPException, APIRouter
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import update
from app.db import get_db
from app.models.candidate import Candidate
from app.models.credits import CreditTransaction
from app.config import settings

router = APIRouter()
PAYSTACK_BASE = "[https://api.paystack.co](https://api.paystack.co)"

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
        
    # Claim check pattern: Only target row if state is still 'pending'
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
    
    # Execute atomic wallet incrementation
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
        
    data = json.loads(payload)
    if data.get("event") != "charge.success":
        return {"message": "Ignored"}
        
    ref = data["data"]["reference"]
    
    # Claim check execution matching identical verify safety mechanics
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
Task 3: Harmonize JavaScript and Python Emoji Character Length Rules
Target Backend File: app/utils/sms.py

Target Frontend File: src/utils/smsCalculator.js (or respective path inside your web-app architecture)

Objective: Ensure characters outside the BMP (such as emoji surrogate pairs) map to length-2 uniformly across the frontend calculator and backend processor to align exactly with carrier billing standards.

Python Backend Sub-task (app/utils/sms.py):
Ensure the calculate_sms_units calculation function uses explicit surrogate identification loops:

Python
def calculate_sms_units(message: str) -> int:
    if not message:
        return 0
    is_unicode = detect_unicode(message)
    if is_unicode:
        length = 0
        for c in message:
            # Force non-BMP characters to evaluate to length-2 matching surrogate rules
            if ord(c) > 0xFFFF:
                length += 2
            else:
                length += 1
        if length <= 70:
            return 1
        return -(-length // 67)
    else:
        length = get_gsm7_message_length(message)
        if length <= 160:
            return 1
        return -(-length // 153)
JavaScript Frontend Sub-task (smsCalculator.js):
Update the counter logic code block exactly like this:

JavaScript
export function calculateSmsUnits(message) {
  if (!message) return { units: 0, remaining: 0, isUnicode: false };
  const isUnicode = detectUnicode(message);
  
  if (isUnicode) {
    // JavaScript string expansion map to compute true multi-byte carrier weights
    const length = [...message].reduce((acc, c) => acc + (c.length === 2 ? 2 : 1), 0);
    
    if (length <= 70) return { units: 1, remaining: 70 - length, isUnicode: true };
    const parts = Math.ceil(length / 67);
    return { units: parts, remaining: parts * 67 - length, isUnicode: true };
  }
  
  const length = getGsm7Length(message);
  if (length <= 160) return { units: 1, remaining: 160 - length, isUnicode: false };
  const parts = Math.ceil(length / 153);
  return { units: parts, remaining: parts * 153 - length, isUnicode: false };
}
Task 4: Lockdown Phone Normalization & Guard CSV Student Import Loops
Target Files: app/utils/phone.py and app/routers/admin.py

Objective: Replace weak regex replacements with strict Ghanaian telco mobile prefix lookup validation blocks, and throw explicit layout validation failures during student file parsing imports.

Implementation Code (app/utils/phone.py):
Python
import re

GHANA_MOBILE_PREFIXES = {
    "020", "023", "024", "025", "026", "027", "028", "029",
    "050", "053", "054", "055", "056", "057", "058", "059",
}

def normalize_phone(phone: str) -> str:
    """
    Strips non-digit noise and normalizes phone records to local '0XXXXXXXXX' layout.
    Returns empty string if string fails Ghanaian network definitions.
    """
    if not phone or not isinstance(phone, str):
        return ""
        
    phone = re.sub(r"[^\d+]", "", phone.strip())
    if not phone:
        return ""
        
    if phone.startswith("+233"):
        phone = "0" + phone[4:]
    elif phone.startswith("233") and len(phone) >= 12:
        phone = "0" + phone[3:]
    elif phone.startswith("00233"):
        phone = "0" + phone[5:]
        
    if len(phone) == 10 and phone.startswith("0"):
        if phone[0:3] in GHANA_MOBILE_PREFIXES:
            return phone
            
    if len(phone) == 9 and not phone.startswith("0"):
        candidate = "0" + phone
        if candidate[0:3] in GHANA_MOBILE_PREFIXES:
            return candidate
            
    return ""
Implementation Code (app/routers/admin.py):
Locate the import_students function loop configuration and modify the validation section precisely as specified below:

Python
# Insert this verification blocker inside your student row iterator loop:
phone_input = row.get("phone", "")
phone = normalize_phone(str(phone_input))

if not phone:
    errors.append({
        "row": i + 1, 
        "reason": f"Invalid or non-Ghanaian mobile number format: '{phone_input}'"
    })
    skipped += 1
    continue

***

### How to execute this with your CLI tool:
Run your terminal tool and pass the target files alongside this execution script file:

```bash
aider app/services/credits.py app/routers/credits.py app/utils/sms.py app/utils/phone.py app/ro