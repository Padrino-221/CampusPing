from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.config import settings
from app.database import AsyncSessionLocal, sync_engine, Base
from app.models.institution import Institution
from app.models.candidate import Candidate
from app.utils.security import hash_password
from app.routers import auth, campaigns, credits, sender_ids, students, institutions, admin

app = FastAPI(
    title=settings.APP_NAME,
    description="CampusAlerts Bulk SMS Campaign Platform Backend Service",
    version="1.0.0"
)

# CORS Configuration
origins = [settings.FRONTEND_URL]
if settings.FRONTEND_LAN_URL:
    origins.append(settings.FRONTEND_LAN_URL)
if settings.CORS_ORIGINS:
    origins.extend([o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()])
# Always add CF Pages URL for production deployments
if settings.ENVIRONMENT != "development":
    origins.append("https://campusalerts.pages.dev")
if settings.ENVIRONMENT == "development":
    origins.extend(["http://localhost:5173", "http://localhost:5174", "http://localhost:5175"])

print(f"[CORS] Allowed origins: {origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
async def seed_admin():
    """
    On application startup, seed the super admin candidate and a default institution
    if they do not already exist. No dummy data is created.
    """
    Base.metadata.create_all(bind=sync_engine)
    async with AsyncSessionLocal() as session:
        # Check if admin already exists
        stmt = select(Candidate).where(Candidate.email == settings.ADMIN_EMAIL)
        res = await session.execute(stmt)
        existing_admin = res.scalar_one_or_none()
        
        if existing_admin:
            return

        # Create a default institution for the admin
        inst_stmt = select(Institution).where(Institution.slug == "default")
        inst_res = await session.execute(inst_stmt)
        inst = inst_res.scalar_one_or_none()

        if not inst:
            inst = Institution(
                name="Default Institution",
                slug="default",
                country="Ghana",
                is_active=True
            )
            session.add(inst)
            await session.flush()

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
        session.add(admin_candidate)
        await session.commit()
        print(f"Super Admin seeded successfully with email: {settings.ADMIN_EMAIL}")
