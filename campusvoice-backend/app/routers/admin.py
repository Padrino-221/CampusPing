import io
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, Body
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, delete, text
from sqlalchemy.orm import joinedload

from app.database import get_db
from app.middleware.auth import require_admin
from app.models.candidate import Candidate
from app.models.student import StudentDirectory
from app.models.sender_id import SenderID
from app.models.campaign import Campaign, CampaignLog
from app.models.credits import CreditPackage, CreditTransaction
from app.models.institution import Institution
from app.models.setting import PlatformSetting
from app.utils.phone import normalize_phone
from app.utils.security import hash_password
from app.config import settings
from app.services.arkesel import arkesel

router = APIRouter(prefix="/api/admin", tags=["Admin"])

# ─── Institutions ────────────────────────────────────────────────

@router.get("/institutions")
async def list_institutions(
    db: AsyncSession = Depends(get_db),
    _=Depends(require_admin)
):
    result = await db.execute(select(Institution).order_by(Institution.name))
    return [
        {"id": str(i.id), "name": i.name, "slug": i.slug, "country": i.country, "is_active": i.is_active}
        for i in result.scalars().all()
    ]

@router.put("/institutions/{institution_id}")
async def update_institution(
    institution_id: uuid.UUID,
    name: str = Body(None), slug: str = Body(None), country: str = Body(None),
    db: AsyncSession = Depends(get_db),
    _=Depends(require_admin)
):
    result = await db.execute(select(Institution).where(Institution.id == institution_id))
    inst = result.scalar_one_or_none()
    if not inst:
        raise HTTPException(404, "Institution not found")
    if name is not None:
        inst.name = name
    if slug is not None:
        existing = await db.execute(
            select(Institution).where(Institution.slug == slug, Institution.id != institution_id)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(400, "Institution with this slug already exists")
        inst.slug = slug
    if country is not None:
        inst.country = country
    await db.commit()
    await db.refresh(inst)
    return {"id": str(inst.id), "name": inst.name, "slug": inst.slug, "country": inst.country}

@router.delete("/institutions/{institution_id}")
async def delete_institution(
    institution_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_admin)
):
    result = await db.execute(select(Institution).where(Institution.id == institution_id))
    inst = result.scalar_one_or_none()
    if not inst:
        raise HTTPException(404, "Institution not found")
    await db.delete(inst)
    await db.commit()
    return {"message": "Institution deleted"}

@router.post("/institutions", status_code=201)
async def create_institution(
    name: str = Body(...), slug: str = Body(...), country: str = Body("Ghana"),
    db: AsyncSession = Depends(get_db),
    _=Depends(require_admin)
):
    existing = await db.execute(select(Institution).where(Institution.slug == slug))
    if existing.scalar_one_or_none():
        raise HTTPException(400, "Institution with this slug already exists")
    inst = Institution(name=name, slug=slug, country=country)
    db.add(inst)
    await db.commit()
    await db.refresh(inst)
    return {"id": str(inst.id), "name": inst.name, "slug": inst.slug}

# ─── Candidates ──────────────────────────────────────────────────

@router.get("/candidates")
async def list_candidates(
    page: int = 1, limit: int = 20,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_admin)
):
    offset = (page - 1) * limit
    result = await db.execute(
        select(Candidate).order_by(Candidate.created_at.desc()).offset(offset).limit(limit)
    )
    total = await db.execute(select(func.count(Candidate.id)))
    return {
        "candidates": [
            {
                "id": str(c.id), "full_name": c.full_name, "email": c.email,
                "phone": c.phone, "position": c.position, "credits_balance": c.credits_balance,
                "is_active": c.is_active, "is_verified": c.is_verified,
                "institution_id": str(c.institution_id), "created_at": c.created_at.isoformat(),
            }
            for c in result.scalars().all()
        ],
        "total": total.scalar(),
        "page": page, "limit": limit,
    }

@router.put("/candidates/{candidate_id}/toggle")
async def toggle_candidate(
    candidate_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_admin)
):
    result = await db.execute(select(Candidate).where(Candidate.id == candidate_id))
    candidate = result.scalar_one_or_none()
    if not candidate:
        raise HTTPException(404, "Candidate not found")
    candidate.is_active = not candidate.is_active
    await db.commit()
    return {"id": str(candidate.id), "is_active": candidate.is_active}

@router.delete("/candidates/{candidate_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_candidate(
    candidate_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_admin)
):
    result = await db.execute(select(Candidate).where(Candidate.id == candidate_id))
    candidate = result.scalar_one_or_none()
    if not candidate:
        raise HTTPException(404, "Candidate not found")
    await db.delete(candidate)
    await db.commit()

@router.get("/candidates/{candidate_id}/campaigns")
async def get_candidate_campaigns(
    candidate_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_admin)
):
    result = await db.execute(
        select(Campaign).where(Campaign.candidate_id == candidate_id).order_by(Campaign.created_at.desc())
    )
    return [
        {
            "id": str(c.id), "title": c.title, "status": c.status,
            "recipient_count": c.recipient_count, "credits_used": c.credits_used,
            "created_at": c.created_at.isoformat(),
        }
        for c in result.scalars().all()
    ]

# ─── Sender IDs ──────────────────────────────────────────────────

@router.get("/sender-ids/pending")
async def list_pending_sender_ids(
    db: AsyncSession = Depends(get_db),
    _=Depends(require_admin)
):
    result = await db.execute(
        select(SenderID).where(SenderID.status == "pending")
        .options(joinedload(SenderID.candidate))
        .order_by(SenderID.created_at.desc())
    )
    return [
        {
            "id": str(s.id), "sender_name": s.sender_name, "status": s.status,
            "candidate_name": s.candidate.full_name if s.candidate else None,
            "candidate_id": str(s.candidate_id), "created_at": s.created_at.isoformat(),
        }
        for s in result.unique().scalars().all()
    ]

@router.get("/sender-ids")
async def list_all_sender_ids(
    db: AsyncSession = Depends(get_db),
    _=Depends(require_admin)
):
    result = await db.execute(
        select(SenderID).options(joinedload(SenderID.candidate)).order_by(SenderID.created_at.desc())
    )
    return [
        {
            "id": str(s.id), "sender_name": s.sender_name, "status": s.status,
            "candidate_name": s.candidate.full_name if s.candidate else None,
            "candidate_id": str(s.candidate_id), "rejection_note": s.rejection_note,
            "reviewed_at": s.reviewed_at.isoformat() if s.reviewed_at else None,
            "created_at": s.created_at.isoformat(),
        }
        for s in result.unique().scalars().all()
    ]

@router.put("/sender-ids/{sender_id}/approve")
async def approve_sender_id(
    sender_id: uuid.UUID, arkesel_ref: str = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_admin)
):
    result = await db.execute(select(SenderID).where(SenderID.id == sender_id))
    s = result.scalar_one_or_none()
    if not s:
        raise HTTPException(404, "Sender ID not found")
    s.status = "approved"
    s.arkesel_ref = arkesel_ref
    s.reviewed_at = datetime.utcnow()
    await db.commit()
    return {"id": str(s.id), "status": "approved"}

@router.put("/sender-ids/{sender_id}/reject")
async def reject_sender_id(
    sender_id: uuid.UUID, rejection_note: str = "",
    db: AsyncSession = Depends(get_db),
    _=Depends(require_admin)
):
    result = await db.execute(select(SenderID).where(SenderID.id == sender_id))
    s = result.scalar_one_or_none()
    if not s:
        raise HTTPException(404, "Sender ID not found")
    s.status = "rejected"
    s.rejection_note = rejection_note
    s.reviewed_at = datetime.utcnow()
    await db.commit()
    return {"id": str(s.id), "status": "rejected"}

# ─── Student Directory ──────────────────────────────────────────

@router.get("/students")
async def list_students(
    institution_id: str = None, search: str = "",
    gender: str = None, level: int = None,
    department: str = None, faculty: str = None,
    page: int = 1, limit: int = 20,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_admin)
):
    conditions = [StudentDirectory.is_active == True]
    if institution_id:
        conditions.append(StudentDirectory.institution_id == institution_id)
    if search:
        conditions.append(
            StudentDirectory.full_name.ilike(f"%{search}%") |
            StudentDirectory.phone.ilike(f"%{search}%")
        )
    if gender:
        conditions.append(StudentDirectory.gender == gender)
    if level:
        conditions.append(StudentDirectory.level == level)
    if department:
        conditions.append(StudentDirectory.department == department)
    if faculty:
        conditions.append(StudentDirectory.faculty == faculty)
    offset = (page - 1) * limit
    result = await db.execute(
        select(StudentDirectory).where(and_(*conditions))
        .order_by(StudentDirectory.created_at.desc()).offset(offset).limit(limit)
    )
    total = await db.execute(
        select(func.count(StudentDirectory.id)).where(and_(*conditions))
    )
    return {
        "students": [
            {
                "id": str(s.id), "full_name": s.full_name, "phone": s.phone,
                "gender": s.gender, "level": s.level, "department": s.department,
                "faculty": s.faculty, "programme": s.programme,
                "student_id": s.student_id, "is_active": s.is_active,
                "institution_id": str(s.institution_id),
            }
            for s in result.scalars().all()
        ],
        "total": total.scalar(),
        "page": page, "limit": limit,
    }

@router.post("/students/import")
async def import_students(
    file: UploadFile = File(...), institution_id: str = Form(...),
    db: AsyncSession = Depends(get_db),
    _=Depends(require_admin)
):
    if not file.filename.endswith((".csv", ".xlsx")):
        raise HTTPException(400, "Only .csv or .xlsx files accepted")

    contents = await file.read()

    if file.filename.endswith(".csv"):
        import csv
        text = contents.decode("utf-8-sig")
        reader = csv.DictReader(io.StringIO(text))
        rows = list(reader)
    else:
        import pandas as pd
        df = pd.read_excel(io.BytesIO(contents), dtype=str)
        df = df.fillna("")
        rows = df.to_dict("records")

    imported = 0
    skipped = 0
    errors = []

    for i, row in enumerate(rows):
        try:
            phone_input = row.get("phone", "")
            phone = normalize_phone(str(phone_input))
            if not phone:
                errors.append({
                    "row": i + 1,
                    "reason": f"Invalid or non-Ghanaian mobile number format: '{phone_input}'"
                })
                skipped += 1
                continue

            existing = await db.execute(
                select(StudentDirectory).where(
                    StudentDirectory.institution_id == institution_id,
                    StudentDirectory.phone == phone
                )
            )
            existing_row = existing.scalar_one_or_none()

            data = {
                "full_name": row.get("full_name", ""),
                "phone": phone,
                "gender": row.get("gender"),
                "level": int(row["level"]) if row.get("level") else None,
                "department": row.get("department"),
                "faculty": row.get("faculty"),
                "programme": row.get("programme"),
            }

            if existing_row:
                for k, v in data.items():
                    setattr(existing_row, k, v)
                skipped += 1
            else:
                student = StudentDirectory(institution_id=institution_id, **data)
                db.add(student)
                imported += 1

        except Exception as e:
            errors.append({"row": i + 1, "reason": str(e)})
            skipped += 1

    await db.commit()
    return {"imported": imported, "skipped": skipped, "errors": errors}

@router.get("/students/template")
async def download_template(_=Depends(require_admin)):
    import csv
    import io
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["phone", "full_name", "gender", "level", "department", "faculty", "programme"])
    writer.writerow(["0241234567", "John Doe", "male", "200", "Computer Science", "Science", "BSc Computer Science"])
    from fastapi.responses import Response
    return Response(
        content=output.getvalue().encode("utf-8-sig"),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=student_import_template.csv"}
    )


@router.delete("/students/{student_id}")
async def delete_student(
    student_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_admin)
):
    result = await db.execute(select(StudentDirectory).where(StudentDirectory.id == student_id))
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(404, "Student not found")
    await db.delete(student)
    await db.commit()
    return {"message": "Student deleted"}

# ─── Arkesel Balance ─────────────────────────────────────────────

@router.get("/credits/arkesel-balance")
async def get_arkesel_balance(_=Depends(require_admin)):
    result = await arkesel.check_balance()
    if result.get("status") == "success":
        data = result.get("data", {})
        return {
            "sms_balance": data.get("sms_balance", 0),
            "main_balance": data.get("main_balance", "GHS 0"),
        }
    return {"sms_balance": 0, "main_balance": "GHS 0"}

# ─── Transactions ─────────────────────────────────────────────────

@router.get("/transactions")
async def list_transactions(
    page: int = 1, limit: int = 50,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_admin)
):
    offset = (page - 1) * limit
    result = await db.execute(
        select(CreditTransaction)
        .options(joinedload(CreditTransaction.candidate))
        .order_by(CreditTransaction.created_at.desc())
        .offset(offset).limit(limit)
    )
    total = await db.execute(select(func.count(CreditTransaction.id)))
    return {
        "transactions": [
            {
                "id": str(t.id),
                "candidate_id": str(t.candidate_id),
                "candidate_name": t.candidate.full_name if t.candidate else None,
                "candidate_email": t.candidate.email if t.candidate else None,
                "type": t.type,
                "amount": t.amount,
                "balance_after": t.balance_after,
                "reference": t.reference,
                "description": t.description,
                "created_at": t.created_at.isoformat(),
            }
            for t in result.unique().scalars().all()
        ],
        "total": total.scalar(),
        "page": page, "limit": limit,
    }

# ─── Revenue ─────────────────────────────────────────────────────

@router.get("/revenue")
async def revenue_dashboard(
    db: AsyncSession = Depends(get_db),
    _=Depends(require_admin)
):
    # Total credits sold (purchase transactions)
    sold_result = await db.execute(
        select(func.coalesce(func.sum(CreditTransaction.amount), 0))
        .where(CreditTransaction.type == "purchase")
    )
    total_credits_sold = sold_result.scalar()

    # Total SMS units dispatched (sum of credits_used across completed campaigns)
    dispatched_result = await db.execute(
        select(func.coalesce(func.sum(Campaign.credits_used), 0))
        .where(Campaign.status == "completed")
    )
    total_sms_dispatched = dispatched_result.scalar()

    # Revenue by month (last 12 months)
    month_trunc = func.date_trunc("month", CreditTransaction.created_at)
    monthly_result = await db.execute(
        select(
            month_trunc.label("month"),
            func.sum(CreditTransaction.amount).label("credits"),
        )
        .where(
            CreditTransaction.type == "purchase",
            CreditTransaction.created_at >= func.now() - text("INTERVAL '12 months'")
        )
        .group_by(month_trunc)
        .order_by(month_trunc.desc())
    )

    revenue_by_month = []
    for row in monthly_result.fetchall():
        month_val = row.month
        if hasattr(month_val, 'strftime'):
            month_str = month_val.strftime("%Y-%m")
        else:
            month_str = str(month_val)[:7]
        revenue_by_month.append({"month": month_str, "credits_sold": int(row.credits)})

    # Total candidates
    candidates_result = await db.execute(select(func.count(Candidate.id)))
    total_candidates = candidates_result.scalar()

    # Total campaigns
    campaigns_result = await db.execute(select(func.count(Campaign.id)))
    total_campaigns = campaigns_result.scalar()

    return {
        "total_credits_sold": total_credits_sold,
        "total_sms_dispatched": total_sms_dispatched,
        "total_candidates": total_candidates,
        "total_campaigns": total_campaigns,
        "revenue_by_month": revenue_by_month,
    }

# ─── Credit Packages ─────────────────────────────────────────────

@router.get("/credit-packages")
async def list_credit_packages(
    db: AsyncSession = Depends(get_db),
    _=Depends(require_admin)
):
    result = await db.execute(
        select(CreditPackage).order_by(CreditPackage.credits.asc())
    )
    return [
        {
            "id": str(p.id), "name": p.name, "credits": p.credits,
            "price_ghs": float(p.price_ghs), "is_active": p.is_active,
        }
        for p in result.scalars().all()
    ]

@router.delete("/credit-packages/{package_id}")
async def delete_credit_package(
    package_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_admin)
):
    result = await db.execute(select(CreditPackage).where(CreditPackage.id == package_id))
    pkg = result.scalar_one_or_none()
    if not pkg:
        raise HTTPException(404, "Credit package not found")
    await db.delete(pkg)
    await db.commit()
    return {"message": "Package deleted"}

@router.post("/credit-packages", status_code=201)
async def create_credit_package(
    name: str = Body(...), credits: int = Body(...), price_ghs: float = Body(...),
    db: AsyncSession = Depends(get_db),
    _=Depends(require_admin)
):
    pkg = CreditPackage(name=name, credits=credits, price_ghs=price_ghs)
    db.add(pkg)
    await db.commit()
    await db.refresh(pkg)
    return {"id": str(pkg.id), "name": pkg.name, "credits": pkg.credits, "price_ghs": float(pkg.price_ghs)}

# ─── System Settings ────────────────────────────────────────────

@router.post("/system/reset")
async def reset_database(
    db: AsyncSession = Depends(get_db),
    _=Depends(require_admin)
):
    """Deletes all data from all tables, then re-creates only the admin account."""

    # Delete in correct dependency order (children first)
    await db.execute(text("DELETE FROM campaign_logs"))
    await db.execute(text("DELETE FROM campaigns"))
    await db.execute(text("DELETE FROM credit_transactions"))
    await db.execute(text("DELETE FROM sender_ids"))
    await db.execute(text("DELETE FROM student_directories"))
    await db.execute(text("DELETE FROM candidates"))
    await db.execute(text("DELETE FROM credit_packages"))
    await db.execute(text("DELETE FROM institutions"))
    await db.commit()

    # Re-seed a minimal institution and admin candidate (no dummy data)
    inst = Institution(name="Default Institution", slug="default", country="Ghana", is_active=True)
    db.add(inst)
    await db.flush()

    admin_candidate = Candidate(
        institution_id=inst.id,
        full_name="Platform Admin",
        email=settings.ADMIN_EMAIL,
        phone="0240000000",
        position="Super Administrator",
        hashed_password=hash_password(settings.ADMIN_PASSWORD),
        credits_balance=10000,
        is_active=True,
        is_verified=True
    )
    db.add(admin_candidate)
    await db.commit()

    return {"message": "Database reset complete. All data cleared. Admin account preserved."}

# ─── Manual Credit Adjustment ─────────────────────────────────────

@router.put("/candidates/{candidate_id}/credits")
async def adjust_candidate_credits(
    candidate_id: uuid.UUID,
    amount: int = Body(...),
    reason: str = Body(""),
    db: AsyncSession = Depends(get_db),
    _=Depends(require_admin)
):
    result = await db.execute(select(Candidate).where(Candidate.id == candidate_id))
    candidate = result.scalar_one_or_none()
    if not candidate:
        raise HTTPException(404, "Candidate not found")

    txn_type = "purchase" if amount > 0 else "deduction"
    new_balance = candidate.credits_balance + amount
    if new_balance < 0:
        raise HTTPException(400, "Insufficient credits — deduction exceeds balance")

    candidate.credits_balance = new_balance

    txn = CreditTransaction(
        candidate_id=candidate_id,
        type=txn_type,
        amount=abs(amount),
        balance_after=new_balance,
        reference=f"admin-{uuid.uuid4().hex[:8]}",
        description=reason or f"Admin {txn_type}",
    )
    db.add(txn)
    await db.commit()
    return {"id": str(candidate_id), "credits_balance": new_balance, "type": txn_type, "amount": abs(amount)}

# ─── All Campaigns (read-only) ──────────────────────────────────

@router.get("/campaigns")
async def list_all_campaigns(
    page: int = 1, limit: int = 20,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_admin)
):
    offset = (page - 1) * limit
    result = await db.execute(
        select(Campaign).options(joinedload(Campaign.candidate))
        .order_by(Campaign.created_at.desc()).offset(offset).limit(limit)
    )
    total = await db.execute(select(func.count(Campaign.id)))
    return {
        "campaigns": [
            {
                "id": str(c.id), "title": c.title, "status": c.status,
                "recipient_count": c.recipient_count, "credits_used": c.credits_used,
                "candidate_name": c.candidate.full_name if c.candidate else None,
                "created_at": c.created_at.isoformat(),
            }
            for c in result.unique().scalars().all()
        ],
        "total": total.scalar(),
        "page": page, "limit": limit,
    }


@router.get("/poll-delivery")
async def poll_delivery():
    """
    Public endpoint to poll Arkesel for delivery reports of pending "sent" messages.
    Call via cron-job.org every 5 minutes to replace Celery Beat.
    """
    from app.database import get_sync_db
    from app.models.campaign import CampaignLog

    sync_db = get_sync_db()
    try:
        pending = sync_db.query(CampaignLog).filter(
            CampaignLog.status == "sent",
            CampaignLog.arkesel_msg_id.isnot(None)
        ).limit(500).all()

        updated = 0
        for log in pending:
            try:
                report = arkesel.get_delivery_report_sync(log.arkesel_msg_id)
                data = report.get("data", {})
                status = data.get("status") if isinstance(data, dict) else None
                if status:
                    status = status.lower()
                if status == "delivered":
                    log.status = "delivered"
                    log.delivered_at = datetime.utcnow()
                    updated += 1
                elif status in ("failed", "rejected", "undelivered"):
                    log.status = "failed"
                    log.error_message = f"Provider: {status}"
                    updated += 1
            except Exception as e:
                print(f"[Poll] Failed for log {log.id}: {e}")

        if updated:
            sync_db.commit()
        return {"polled": len(pending), "updated": updated}
    finally:
        sync_db.close()


# ─── Platform Settings (Maintenance Mode) ────────────────────────

@router.get("/system/settings")
async def get_platform_settings(
    db: AsyncSession = Depends(get_db),
    _=Depends(require_admin)
):
    stmt = select(PlatformSetting)
    result = await db.execute(stmt)
    rows = result.scalars().all()
    return {row.key: row.value for row in rows}


class MaintenanceToggle(BaseModel):
    enabled: bool
    message: str = ""

@router.put("/system/maintenance")
async def toggle_maintenance(
    body: MaintenanceToggle,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_admin)
):
    setting = await db.get(PlatformSetting, "maintenance_enabled")
    if setting:
        setting.value = "true" if body.enabled else ""
    else:
        db.add(PlatformSetting(key="maintenance_enabled", value="true" if body.enabled else ""))

    msg_setting = await db.get(PlatformSetting, "maintenance_message")
    if msg_setting:
        msg_setting.value = body.message
    else:
        db.add(PlatformSetting(key="maintenance_message", value=body.message))

    await db.commit()
    return {"enabled": body.enabled, "message": body.message}


# ─── System Health ───────────────────────────────────────────────

@router.get("/system/health")
async def system_health(
    db: AsyncSession = Depends(get_db),
    _=Depends(require_admin)
):
    from app.database import get_sync_db
    db_status = "healthy"
    try:
        sync_db = get_sync_db()
        sync_db.execute(text("SELECT 1"))
        sync_db.close()
    except Exception:
        db_status = "unhealthy"

    sms_balance = None
    try:
        bal = await arkesel.check_balance()
        if bal.get("status") == "success":
            sms_balance = bal.get("data", {}).get("sms_balance", 0)
    except Exception:
        sms_balance = None

    counts = {}
    for table, model_cls in [
        ("candidates", Candidate),
        ("students", StudentDirectory),
        ("campaigns", Campaign),
        ("institutions", Institution),
        ("sender_ids", SenderID),
    ]:
        c = await db.execute(select(func.count()).select_from(model_cls))
        counts[table] = c.scalar()

    return {
        "database": db_status,
        "sms_balance": sms_balance,
        "counts": counts,
    }
