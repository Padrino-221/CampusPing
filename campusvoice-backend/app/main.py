from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import select
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.database import AsyncSessionLocal
from app.models.institution import Institution
from app.models.candidate import Candidate
from app.utils.security import hash_password
from app.routers import auth, campaigns, credits, sender_ids, students, institutions, admin
from app.middleware.csrf import CSRFMiddleware

# Rate limiter
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title=settings.APP_NAME,
    description="CampusVoice Bulk SMS Campaign Platform Backend Service",
    version="1.0.0"
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# CSRF protection — verify X-Requested-With header on state-changing requests
app.add_middleware(CSRFMiddleware)

# Register Routers
app.include_router(auth.router)
app.include_router(campaigns.router)
app.include_router(credits.router)
app.include_router(sender_ids.router)
app.include_router(students.router)
app.include_router(institutions.router)
app.include_router(admin.router)

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "app_name": settings.APP_NAME,
        "environment": settings.ENVIRONMENT
    }

@app.on_event("startup")
async def seed_data():
    """
    On application startup, seed default institutions and the super admin candidate
    if they do not already exist. This ensures immediate usability of the platform.
    """
    async with AsyncSessionLocal() as session:
        # 1. Seed Institutions
        default_campuses = [
            {"name": "University of Energy and Natural Resources", "slug": "uenr", "country": "Ghana"},
            {"name": "Kwame Nkrumah University of Science and Technology", "slug": "knust", "country": "Ghana"},
            {"name": "University of Ghana", "slug": "ug", "country": "Ghana"}
        ]
        
        seeded_institutions = []
        for campus in default_campuses:
            stmt = select(Institution).where(Institution.slug == campus["slug"])
            res = await session.execute(stmt)
            existing = res.scalar_one_or_none()
            if not existing:
                new_inst = Institution(
                    name=campus["name"],
                    slug=campus["slug"],
                    country=campus["country"],
                    is_active=True
                )
                session.add(new_inst)
                seeded_institutions.append(new_inst)
            else:
                seeded_institutions.append(existing)
                
        await session.commit()
        
        # Resolve UENR as the default seeding institution for the admin candidate
        uenr_inst = next((i for i in seeded_institutions if i.slug == "uenr"), None)
        
        if uenr_inst:
            # 2. Seed Super Admin Candidate
            stmt = select(Candidate).where(Candidate.email == settings.ADMIN_EMAIL)
            res = await session.execute(stmt)
            existing_admin = res.scalar_one_or_none()
            
            if not existing_admin:
                admin_candidate = Candidate(
                    institution_id=uenr_inst.id,
                    full_name="Platform Admin",
                    email=settings.ADMIN_EMAIL,
                    phone="0240000000",
                    position="Super Administrator",
                    hashed_password=hash_password(settings.ADMIN_PASSWORD),
                    credits_balance=10000,
                    is_active=True,
                    is_verified=True,
                    is_admin=True,
                )
                session.add(admin_candidate)
                await session.commit()
                print(f"Super Admin seeded successfully with email: {settings.ADMIN_EMAIL}")
