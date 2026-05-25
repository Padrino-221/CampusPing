from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

# Async Engine and Session for FastAPI
async_engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    future=True,
    pool_pre_ping=True
)

AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# Declarative Base for Models
Base = declarative_base()

# Sync Engine and Session for Celery Tasks
sync_engine = create_engine(
    settings.SYNC_DATABASE_URL,
    pool_pre_ping=True
)

SyncSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=sync_engine
)

# FastAPI Dependency for Database Sessions
async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

# Helper for Sync Operations (Celery background tasks)
def get_sync_db():
    db = SyncSessionLocal()
    try:
        return db
    except Exception:
        db.close()
        raise
