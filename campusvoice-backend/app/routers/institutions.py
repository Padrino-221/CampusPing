from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.institution import Institution

router = APIRouter(prefix="/api/institutions", tags=["Institutions"])

@router.get("/")
async def list_institutions(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Institution).where(Institution.is_active == True).order_by(Institution.name)
    )
    institutions = result.scalars().all()
    return [
        {
            "id": str(inst.id),
            "name": inst.name,
            "slug": inst.slug,
            "country": inst.country,
        }
        for inst in institutions
    ]
