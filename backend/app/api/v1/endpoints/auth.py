"""Authentication API endpoints."""

from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.auth import authenticate_user, create_access_token, get_current_user

router = APIRouter()


class LoginRequest(BaseModel):
    """Request model for login."""
    password: str
    remember_me: bool = False


class LoginResponse(BaseModel):
    """Response model for login."""
    access_token: str
    token_type: str


class VerifyResponse(BaseModel):
    """Response model for token verification."""
    valid: bool


@router.post("/login", response_model=LoginResponse)
async def login(login_request: LoginRequest):
    """
    Authenticate user and return JWT token.
    
    Args:
        login_request: Login credentials with password and optional remember_me flag
        
    Returns:
        LoginResponse: JWT access token and type
        
    Raises:
        HTTPException: 401 if password is invalid
    """
    # Authenticate user
    if not authenticate_user(login_request.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access token with custom expiration if remember_me is enabled
    # Default: 7 days, Remember Me: 30 days
    if login_request.remember_me:
        expires_delta = timedelta(days=30)
    else:
        expires_delta = None  # Use default from settings (7 days)
    
    access_token = create_access_token(data={"sub": "user"}, expires_delta=expires_delta)
    
    return LoginResponse(
        access_token=access_token,
        token_type="bearer"
    )


@router.get("/verify", response_model=VerifyResponse)
async def verify_token(current_user: str = Depends(get_current_user)):
    """
    Verify if the provided JWT token is valid.
    
    Args:
        current_user: Current authenticated user (from dependency)
        
    Returns:
        VerifyResponse: Token validity status
    """
    return VerifyResponse(valid=True)
