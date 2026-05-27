import random
from datetime import timedelta, datetime
from fastapi import APIRouter, Depends, HTTPException, Response, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from app.database import get_db
from app.config import settings
from app.models.candidate import Candidate
from app.models.institution import Institution
from app.models.setting import PlatformSetting
from app.models.password_reset import PasswordReset
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
from app.utils.phone import normalize_phone, to_international_format
from app.services.arkesel import arkesel
from app.middleware.auth import get_current_candidate
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from pydantic import BaseModel

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


class GoogleTokenRequest(BaseModel):
    token: str
    institution_id: str


class ForgotPasswordRequest(BaseModel):
    phone: str


class VerifyOtpRequest(BaseModel):
    phone: str
    code: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

@router.post("/register", response_model=CandidateResponse, status_code=status.HTTP_201_CREATED)
async def register(
    schema: CandidateCreate,
    db: AsyncSession = Depends(get_db)
):
    # Block registration with the super admin email
    if schema.email == settings.ADMIN_EMAIL:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This email address is reserved"
        )

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
        # Auto-verify the default super admin email to make onboarding simpler
        is_verified=False
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
    stmt = select(Candidate).options(joinedload(Candidate.institution)).where(Candidate.email == schema.email)
    result = await db.execute(stmt)
    candidate = result.scalar_one_or_none()
    
    if not candidate or not candidate.hashed_password or not verify_password(schema.password, candidate.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email credentials or password"
        )

    # Check maintenance mode (skip for superadmin)
    if not candidate.is_superadmin:
        maint = await db.get(PlatformSetting, "maintenance_enabled")
        if maint and maint.value == "true":
            msg_setting = await db.get(PlatformSetting, "maintenance_message")
            detail = msg_setting.value if msg_setting and msg_setting.value else "Platform is under maintenance. Please try again later."
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=detail,
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
        samesite="none" if is_prod else "lax",
        path="/"
    )
    
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
        expires=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
        secure=is_prod,
        samesite="none" if is_prod else "lax",
        path="/"
    )
    
    if candidate and candidate.institution:
        candidate.institution_name = candidate.institution.name

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
async def me(
    current_candidate: Candidate = Depends(get_current_candidate),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Candidate).options(joinedload(Candidate.institution)).where(Candidate.id == current_candidate.id)
    )
    candidate = result.unique().scalar_one_or_none()
    if candidate and candidate.institution:
        candidate.institution_name = candidate.institution.name
    return candidate


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
    if schema.institution_id is not None:
        inst_stmt = select(Institution).where(Institution.id == schema.institution_id)
        inst_result = await db.execute(inst_stmt)
        if not inst_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The specified institution does not exist"
            )
        current_candidate.institution_id = schema.institution_id

    await db.commit()
    await db.refresh(current_candidate)

    # Fetch the institution name separately to avoid identity map stale relationships
    inst_result = await db.execute(
        select(Institution).where(Institution.id == current_candidate.institution_id)
    )
    institution = inst_result.scalar_one_or_none()
    current_candidate.institution_name = institution.name if institution else None

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
        samesite="none" if is_prod else "lax",
        path="/"
    )
    
    return {"message": "Session token refreshed successfully"}


@router.post("/google", response_model=TokenResponse)
async def google_auth(
    body: GoogleTokenRequest,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    """Authenticate or register a user via Google ID token."""
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Google authentication is not configured"
        )

    try:
        idinfo = id_token.verify_oauth2_token(
            body.token,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID,
        )
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google token"
        )

    google_id = idinfo["sub"]
    email = idinfo.get("email", "")
    name = idinfo.get("name", "")
    picture = idinfo.get("picture")

    # Look up by google_id first, then by email
    stmt = select(Candidate).where(Candidate.google_id == google_id)
    result = await db.execute(stmt)
    candidate = result.scalar_one_or_none()

    if not candidate:
        # Check if an account with this email exists (link it)
        stmt = select(Candidate).where(Candidate.email == email)
        result = await db.execute(stmt)
        candidate = result.scalar_one_or_none()

        if candidate:
            candidate.google_id = google_id
            if picture and not candidate.profile_photo:
                candidate.profile_photo = picture
            await db.commit()
            await db.refresh(candidate)
        else:
            # Validate institution
            inst_stmt = select(Institution).where(Institution.id == body.institution_id)
            inst_result = await db.execute(inst_stmt)
            if not inst_result.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Please select a valid institution"
                )

            candidate = Candidate(
                institution_id=body.institution_id,
                full_name=name,
                email=email,
                google_id=google_id,
                profile_photo=picture,
                credits_balance=0,
                is_active=True,
                is_verified=True,
            )
            db.add(candidate)
            await db.commit()
            await db.refresh(candidate)

    # Check maintenance mode (skip for superadmin)
    if not candidate.is_superadmin:
        maint = await db.get(PlatformSetting, "maintenance_enabled")
        if maint and maint.value == "true":
            msg_setting = await db.get(PlatformSetting, "maintenance_message")
            detail = msg_setting.value if msg_setting and msg_setting.value else "Platform is under maintenance. Please try again later."
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=detail,
            )

    if not candidate.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated"
        )

    # Generate tokens and set cookies
    access_token = create_access_token(subject=candidate.id)
    refresh_token = create_refresh_token(subject=candidate.id)

    is_prod = settings.ENVIRONMENT == "production"

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        expires=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        secure=is_prod,
        samesite="none" if is_prod else "lax",
        path="/"
    )

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
        expires=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
        secure=is_prod,
        samesite="none" if is_prod else "lax",
        path="/"
    )

    return {
        "message": "Google authentication successful",
        "candidate": candidate
    }


@router.post("/forgot-password")
async def forgot_password(
    body: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db)
):
    phone = normalize_phone(body.phone)
    if not phone:
        return {"message": "If that phone is registered, an OTP has been sent."}

    stmt = select(Candidate).where(Candidate.phone == phone)
    result = await db.execute(stmt)
    candidate = result.scalar_one_or_none()

    if not candidate or not candidate.hashed_password:
        return {"message": "If that phone is registered, an OTP has been sent."}

    code = f"{random.randint(0, 999999):06d}"
    expires_at = datetime.utcnow() + timedelta(minutes=10)

    reset = PasswordReset(phone=phone, code=code, expires_at=expires_at)
    db.add(reset)
    await db.commit()

    try:
        recipient = to_international_format(phone)
        if recipient:
            await arkesel.send_bulk(
                settings.ARKESEL_SENDER_ID,
                f"Your CampusAlerts password reset code is: {code}. Valid for 10 minutes.",
                [recipient],
            )
    except Exception as e:
        print(f"[ForgotPassword] SMS send failed: {e}")

    return {"message": "If that phone is registered, an OTP has been sent."}


@router.post("/verify-reset-otp")
async def verify_reset_otp(
    body: VerifyOtpRequest,
    db: AsyncSession = Depends(get_db)
):
    phone = normalize_phone(body.phone)
    if not phone:
        raise HTTPException(status_code=400, detail="Invalid phone number")

    stmt = select(PasswordReset).where(
        PasswordReset.phone == phone,
        PasswordReset.code == body.code,
        PasswordReset.used == False,
        PasswordReset.expires_at > datetime.utcnow(),
    ).order_by(PasswordReset.created_at.desc())

    result = await db.execute(stmt)
    reset = result.scalar_one_or_none()

    if not reset:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    reset.used = True
    await db.commit()

    candidate_stmt = select(Candidate).where(Candidate.phone == phone)
    candidate_result = await db.execute(candidate_stmt)
    candidate = candidate_result.scalar_one_or_none()

    if not candidate:
        raise HTTPException(status_code=400, detail="Account not found")

    reset_token = create_access_token(
        subject=str(candidate.id),
        expires_delta=timedelta(minutes=5),
    )

    return {"reset_token": reset_token}


@router.post("/reset-password")
async def reset_password(
    body: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db)
):
    payload = decode_token(body.token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    candidate_id = payload.get("sub")
    stmt = select(Candidate).where(Candidate.id == candidate_id)
    result = await db.execute(stmt)
    candidate = result.scalar_one_or_none()

    if not candidate or not candidate.is_active:
        raise HTTPException(status_code=400, detail="Account not found or inactive")

    candidate.hashed_password = hash_password(body.new_password)
    await db.commit()

    return {"message": "Password reset successfully"}
