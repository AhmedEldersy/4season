from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.security import decode_token
from app import models

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception
    payload = decode_token(token)
    if not payload or "sub" not in payload:
        raise credentials_exception
    user = db.query(models.User).filter(models.User.id == payload["sub"]).first()
    if not user or not user.is_active:
        raise credentials_exception
    return user


def get_current_admin(user: models.User = Depends(get_current_user)) -> models.User:
    if user.role not in (models.RoleEnum.ADMIN, models.RoleEnum.OWNER):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return user


def require_complete_profile(user: models.User = Depends(get_current_user)) -> models.User:
    """Google sign-ins can land with a name+email and nothing else. The
    frontend already forces these accounts to /complete-profile before
    letting them navigate anywhere else, but that's a UI redirect only --
    someone could otherwise call POST /orders directly with a valid token
    and no phone on file. This closes that gap server-side too.
    """
    if not (user.phone and user.phone.strip()):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please complete your profile (phone number) before placing an order.",
        )
    return user
