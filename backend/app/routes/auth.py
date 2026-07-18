from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta

from app.database import get_db
from app.models import User
from app.schemas import UserCreate, UserResponse, Token
from app.auth import hash_password, verify_password, create_access_token, settings

router = APIRouter()

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    # Check if username or email exists
    db_user = db.query(User).filter((User.username == user_in.username) | (User.email == user_in.email)).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email already registered"
        )
    
    hashed = hash_password(user_in.password)
    new_user = User(
        username=user_in.username,
        email=user_in.email,
        hashed_password=hashed,
        full_name=user_in.full_name,
        role=user_in.role or "citizen",
        phone_number=user_in.phone_number,
        ward=user_in.ward or "Ward 4 (Malleswaram)"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/token", response_model=Token)
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(), 
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role}, 
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.post("/demo-login", response_model=Token)
def demo_login(role: str = "judge", db: Session = Depends(get_db)):
    # Look for existing demo user or create on the fly
    demo_username = f"demo_{role}"
    demo_user = db.query(User).filter(User.username == demo_username).first()
    
    if not demo_user:
        # Create a pre-configured demo user
        full_names = {
          "citizen": "Ananya Sharma (Demo Citizen)",
          "officer": "Commissioner Rajesh Kumar (Demo Inspector)",
          "judge": "Hackathon Judge (Municipal Executive)"
        }
        
        roles = {
          "citizen": "citizen",
          "officer": "officer",
          "judge": "officer" # Judges get officer access to view dashboards
        }
        
        email = f"{role}@nagarsetu.gov.in"
        pwd = hash_password("demo_pass_123!")
        
        demo_user = User(
            username=demo_username,
            email=email,
            hashed_password=pwd,
            full_name=full_names.get(role, "Demo User"),
            role=roles.get(role, "citizen"),
            phone_number="+91 99999 88888",
            ward="Ward 4 (Malleswaram)" if role == "citizen" else "All Wards"
        )
        db.add(demo_user)
        db.commit()
        db.refresh(demo_user)
        
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": demo_user.username, "role": demo_user.role}, 
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": demo_user
    }
