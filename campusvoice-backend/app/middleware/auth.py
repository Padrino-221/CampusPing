from fastapi import Request, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.candidate import Candidate
from app.models.setting import PlatformSetting
from app.utils.security import decode_token
from app.config import settings

async def get_current_candidate(
    request: Request,
    db: AsyncSession = Depends(get_db)
) -> Candidate:
    """
    Dependency that retrieves the currently authenticated candidate from the JWT access token
    stored in secure HTTPOnly cookies.
    """
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    candidate_id = payload.get("sub")
    if not candidate_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload is missing candidate identity",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Query database for candidate
    stmt = select(Candidate).where(Candidate.id == candidate_id)
    result = await db.execute(stmt)
    candidate = result.scalar_one_or_none()
    
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authenticated candidate user not found",
        )
        
    if not candidate.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Candidate account is currently deactivated",
        )

    # Check maintenance mode (skip for admin)
    if candidate.email != settings.ADMIN_EMAIL:
        maint = await db.get(PlatformSetting, "maintenance_enabled")
        if maint and maint.value == "true":
            msg_setting = await db.get(PlatformSetting, "maintenance_message")
            detail = msg_setting.value if msg_setting and msg_setting.value else "Platform is under maintenance. Please try again later."
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=detail,
            )
        
    return candidate

async def require_admin(
    current_candidate: Candidate = Depends(get_current_candidate)
) -> Candidate:
    """
    Dependency that restricts route access to Super Admins (matching the configured admin email).
    """
    if current_candidate.email != settings.ADMIN_EMAIL:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted: Super Admin credentials required",
        )
    return current_candidate
