import io
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, Body
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
from app.utils.phone import normalize_phone
from app.services.credits import add_credits

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
                "faculty": s.faculty, "hall": s.hall, "programme": s.programme,
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
            phone = normalize_phone(row.get("phone", ""))
            if not phone:
                errors.append({"row": i + 1, "reason": "Missing or invalid phone"})
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
                "hall": row.get("hall"),
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
    writer.writerow(["phone", "full_name", "gender", "level", "department", "faculty", "hall", "programme"])
    writer.writerow(["0241234567", "John Doe", "male", "200", "Computer Science", "Science", "Legon Hall", "BSc Computer Science"])
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
