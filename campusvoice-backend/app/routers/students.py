from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, distinct, func, and_
from typing import Optional
from pydantic import BaseModel

from app.database import get_db
from app.models.student import StudentDirectory
from app.services.filter_engine import get_filtered_count_async
from app.middleware.auth import get_current_candidate, require_admin
from app.models.candidate import Candidate

router = APIRouter(prefix="/api/students", tags=["Students"])


@router.get("/filters/options")
async def get_filter_options(
    institution_id: str,
    db: AsyncSession = Depends(get_db),
    _: Candidate = Depends(get_current_candidate)
):
    """
    Returns all unique filter dimension values for a given institution.
    Used to populate the multi-select dropdowns in the campaign builder.
    """
    async def fetch_distinct(col):
        result = await db.execute(
            select(distinct(col)).where(
                StudentDirectory.institution_id == institution_id,
                StudentDirectory.is_active == True,
                col.isnot(None)
            ).order_by(col)
        )
        return [r[0] for r in result.fetchall() if r[0]]

    genders = await fetch_distinct(StudentDirectory.gender)
    levels = await fetch_distinct(StudentDirectory.level)
    departments = await fetch_distinct(StudentDirectory.department)
    faculties = await fetch_distinct(StudentDirectory.faculty)
    halls = await fetch_distinct(StudentDirectory.hall)

    return {
        "genders": genders,
        "levels": sorted([int(l) for l in levels if l]),
        "departments": departments,
        "faculties": faculties,
        "halls": halls,
    }


class CountRequest(BaseModel):
    institution_id: str
    filters: Optional[dict] = {}


@router.post("/count")
async def get_student_count(
    body: CountRequest,
    db: AsyncSession = Depends(get_db),
    _: Candidate = Depends(get_current_candidate)
):
    """
    Returns real-time audience count for given filters.
    Debounce is handled on the frontend (400ms).
    """
    count = await get_filtered_count_async(db, body.institution_id, body.filters)
    return {"count": count}


@router.get("/directory")
async def list_student_directory(
    search: str = "",
    page: int = 1,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    candidate: Candidate = Depends(get_current_candidate)
):
    conditions = [
        StudentDirectory.institution_id == candidate.institution_id,
        StudentDirectory.is_active == True,
    ]
    if search:
        conditions.append(
            StudentDirectory.full_name.ilike(f"%{search}%") |
            StudentDirectory.phone.ilike(f"%{search}%")
        )
    offset = (page - 1) * limit
    result = await db.execute(
        select(StudentDirectory).where(and_(*conditions))
        .order_by(StudentDirectory.full_name.asc()).offset(offset).limit(limit)
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
            }
            for s in result.scalars().all()
        ],
        "total": total.scalar(),
        "page": page, "limit": limit,
    }
