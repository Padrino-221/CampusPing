import asyncio
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.candidate import Candidate
from app.models.institution import Institution

async def main():
    async with AsyncSessionLocal() as session:
        # Check candidates
        c_res = await session.execute(select(Candidate))
        candidates = c_res.scalars().all()
        print(f"Candidates found: {len(candidates)}")
        for c in candidates:
            print(f"- {c.full_name} ({c.email}) - Position: {c.position}, Verified: {c.is_verified}")

        # Check institutions
        i_res = await session.execute(select(Institution))
        institutions = i_res.scalars().all()
        print(f"Institutions found: {len(institutions)}")
        for i in institutions:
            print(f"- {i.name} (slug: {i.slug}), ID: {i.id}")

if __name__ == "__main__":
    asyncio.run(main())
