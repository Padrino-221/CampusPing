from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, text

from app.config import settings
from app.database import AsyncSessionLocal, sync_engine, Base
from app.models.institution import Institution
from app.models.candidate import Candidate
from app.models.credits import CreditPackage
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
async def seed_data():
    """Seed admin, institution, and default credit packages if they don't exist."""
    Base.metadata.create_all(bind=sync_engine)

    # Migrate: add sort_order column if missing (for existing databases)
    with sync_engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE credit_packages ADD COLUMN sort_order INTEGER DEFAULT 0"))
            conn.commit()
            print("[Migration] Added sort_order column to credit_packages")
        except Exception:
            conn.rollback()

    async with AsyncSessionLocal() as session:
        # ─── Seed Admin & Institution ───────────────────────────
        stmt = select(Candidate).where(Candidate.email == settings.ADMIN_EMAIL)
        res = await session.execute(stmt)
        existing_admin = res.scalar_one_or_none()

        if not existing_admin:
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
            print(f"Super Admin seeded successfully with email: {settings.ADMIN_EMAIL}")

        # ─── Seed Default Credit Packages ──────────────────────
        pkg_stmt = select(CreditPackage).limit(1)
        existing_pkg = (await session.execute(pkg_stmt)).scalar_one_or_none()

        if not existing_pkg:
            default_packages = [
                CreditPackage(name="Starter", credits=500, price_ghs=100.00, sort_order=0),
                CreditPackage(name="Bronze", credits=2_000, price_ghs=390.00, sort_order=1),
                CreditPackage(name="Silver", credits=5_000, price_ghs=950.00, sort_order=2),
                CreditPackage(name="Gold", credits=10_000, price_ghs=1_800.00, sort_order=3),
            ]
            for pkg in default_packages:
                session.add(pkg)
            print(f"Seeded {len(default_packages)} default credit packages")

        await session.commit()
