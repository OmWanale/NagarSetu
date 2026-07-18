import hashlib
import os
import secrets
from datetime import datetime, timedelta
from typing import Optional
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import User

# Password hashing configuration (PBKDF2 with SHA-256)
# Native, cross-platform, zero dependencies, compile-free
HASH_ALGORITHM = "sha256"
ITERATIONS = 100000

def hash_password(password: str, salt: bytes = None) -> str:
    if salt is None:
        salt = os.urandom(16)
    pwd_bytes = password.encode('utf-8')
    key = hashlib.pbkdf2_hmac(HASH_ALGORITHM, pwd_bytes, salt, ITERATIONS)
    # Return salt and key combined as hex string
    return f"{salt.hex()}:{key.hex()}"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        salt_hex, key_hex = hashed_password.split(':')
        salt = bytes.fromhex(salt_hex)
        expected_key = bytes.fromhex(key_hex)
        
        pwd_bytes = plain_password.encode('utf-8')
        actual_key = hashlib.pbkdf2_hmac(HASH_ALGORITHM, pwd_bytes, salt, ITERATIONS)
        return secrets.compare_digest(expected_key, actual_key)
    except Exception:
        return False

# JWT Utility functions
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

# OAuth2 setup
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/token")
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="api/auth/token", auto_error=False)

def get_current_user_optional(token: Optional[str] = Depends(oauth2_scheme_optional), db: Session = Depends(get_db)) -> Optional[User]:
    if not token:
        return None
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # Decode the token
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
        
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception
    return user

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # Decode the token
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
        
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception
    return user

def get_current_officer(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in ["officer", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Municipal Officer permissions required"
        )
    return current_user

def get_current_officer_optional(
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
) -> User:
    if current_user and current_user.role in ["officer", "admin"]:
        return current_user
        
    demo_officer = db.query(User).filter(User.username == "demo_officer").first()
    if not demo_officer:
        demo_officer = User(
            username="demo_officer",
            email="officer@nagarsetu.gov.in",
            hashed_password="pbkdf2:dummy",
            full_name="Commissioner Rajesh Kumar (Demo Inspector)",
            role="officer",
            phone_number="+91 94480 55443",
            ward="All Wards"
        )
        db.add(demo_officer)
        db.commit()
        db.refresh(demo_officer)
    return demo_officer
