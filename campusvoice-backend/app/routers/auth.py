from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, Response, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.config import settings
from app.models.candidate import Candidate
from app.models.institution import Institution
from app.schemas.candidate import (
    CandidateCreate,
    CandidateLogin,
    CandidateUpdate,
    CandidateResponse,
    TokenResponse
)
from app.utils.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token
)
from app.middleware.auth import get_current_candidate

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/register", response_model=CandidateResponse, status_code=status.HTTP_201_CREATED)
async def register(
    schema: CandidateCreate,
    db: AsyncSession = Depends(get_db)
):
    # Check if candidate email already exists
    stmt = select(Candidate).where(Candidate.email == schema.email)
    result = await db.execute(stmt)
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A candidate with this email address already exists"
        )
    
    # Check if institution exists
    inst_stmt = select(Institution).where(Institution.id == schema.institution_id)
    inst_result = await db.execute(inst_stmt)
    if not inst_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The specified institution does not exist"
        )
    
    # Block registration with reserved admin email
    if schema.email.lower() == settings.ADMIN_EMAIL.lower():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This email address is reserved"
        )

    # Create candidate
    new_candidate = Candidate(
        institution_id=schema.institution_id,
        full_name=schema.full_name,
        email=schema.email,
        phone=schema.phone,
        position=schema.position,
        hashed_password=hash_password(schema.password),
        credits_balance=0,
        is_active=True,
        is_verified=False,
    )
    
    db.add(new_candidate)
    await db.commit()
    await db.refresh(new_candidate)
    return new_candidate


@router.post("/login", response_model=TokenResponse)
async def login(
    schema: CandidateLogin,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    # Retrieve Candidate
    stmt = select(Candidate).where(Candidate.email == schema.email)
    result = await db.execute(stmt)
    candidate = result.scalar_one_or_none()
    
    if not candidate or not verify_password(schema.password, candidate.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email credentials or password"
        )
    
    if not candidate.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This candidate account has been deactivated"
        )
    
    # Generate tokens
    access_token = create_access_token(subject=candidate.id)
    refresh_token = create_refresh_token(subject=candidate.id)
    
    # Set cookies
    is_prod = settings.ENVIRONMENT == "production"
    
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        expires=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        secure=is_prod,
        samesite="strict",
        path="/"
    )
    
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
        expires=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
        secure=is_prod,
        samesite="strict",
        path="/"
    )
    
    return {
        "message": "Login successful",
        "candidate": candidate
    }


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(key="access_token", path="/")
    response.delete_cookie(key="refresh_token", path="/")
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=CandidateResponse)
async def me(current_candidate: Candidate = Depends(get_current_candidate)):
    return current_candidate


@router.put("/me", response_model=CandidateResponse)
async def update_me(
    schema: CandidateUpdate,
    db: AsyncSession = Depends(get_db),
    current_candidate: Candidate = Depends(get_current_candidate)
):
    if schema.full_name is not None:
        current_candidate.full_name = schema.full_name
    if schema.phone is not None:
        current_candidate.phone = schema.phone
    if schema.position is not None:
        current_candidate.position = schema.position
    if schema.password is not None:
        current_candidate.hashed_password = hash_password(schema.password)

    await db.commit()
    await db.refresh(current_candidate)
    return current_candidate


@router.post("/refresh")
async def refresh(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token session missing"
        )
    
    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session refresh token"
        )
    
    candidate_id = payload.get("sub")
    stmt = select(Candidate).where(Candidate.id == candidate_id)
    result = await db.execute(stmt)
    candidate = result.scalar_one_or_none()
    
    if not candidate or not candidate.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Candidate session deactivated or invalid"
        )
        
    # Generate new access token
    new_access_token = create_access_token(subject=candidate.id)
    
    is_prod = settings.ENVIRONMENT == "production"
    response.set_cookie(
        key="access_token",
        value=new_access_token,
        httponly=True,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        expires=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        secure=is_prod,
        samesite="strict",
        path="/"
    )
    
    return {"message": "Session token refreshed successfully"}
