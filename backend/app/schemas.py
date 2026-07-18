from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

# --- User Schemas ---
class UserBase(BaseModel):
    username: str
    email: EmailStr
    full_name: str
    phone_number: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None

class UserCreate(UserBase):
    password: str
    role: Optional[str] = "citizen" # citizen, officer, admin

class UserResponse(UserBase):
    id: str
    role: str

    class Config:
        from_attributes = True


# --- Authentication Token Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None


# --- Complaint Schemas ---
class ComplaintBase(BaseModel):
    description: str
    country: str = "India"
    state: str
    district: str
    city: str
    locality: str
    pincode: Optional[str] = None
    formatted_address: Optional[str] = None
    citizen_name: Optional[str] = None
    latitude: float
    longitude: float
    image_data: Optional[str] = None # Base64 string of image

class ComplaintCreate(ComplaintBase):
    pass

class ComplaintResponse(BaseModel):
    id: str
    description: str
    category: str
    priority: str
    country: str
    state: str
    district: str
    city: str
    locality: str
    pincode: Optional[str] = None
    formatted_address: Optional[str] = None
    pipeline_stage: str
    citizen_name: Optional[str] = None
    submission_hour: Optional[int] = None
    resolved_duration_hours: Optional[float] = None
    latitude: float
    longitude: float
    image_data: Optional[str] = None
    status: str
    department: Optional[str] = None
    resolution_time: Optional[str] = None
    priority_reasoning: Optional[str] = None
    officer_recommendation: Optional[str] = None
    officer_notes: Optional[str] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None
    citizen_id: str

    class Config:
        from_attributes = True

class ComplaintUpdateStatus(BaseModel):
    status: str
    notes: Optional[str] = None


# --- Duplicate Detection Schemas ---
class ComplaintSummary(BaseModel):
    id: str
    description: str
    city: str
    locality: str
    created_at: datetime

    class Config:
        from_attributes = True

class DuplicateGroupResponse(BaseModel):
    id: str
    similarity_score: float
    primary_complaint: ComplaintSummary
    secondary_complaints: List[ComplaintSummary]
    created_at: datetime

    class Config:
        from_attributes = True


# --- Analytics Schemas ---
class DashboardStats(BaseModel):
    total_complaints: int
    critical_complaints: int
    pending_complaints: int
    resolved_complaints: int
    duplicate_saved: int

class CategoryCount(BaseModel):
    category: str
    count: int

class DepartmentCount(BaseModel):
    department: str
    count: int

class DailyTrend(BaseModel):
    date: str
    count: int

class WardCount(BaseModel):
    ward: str
    count: int

class AnalyticsSummary(BaseModel):
    categories: List[CategoryCount]
    departments: List[DepartmentCount]
    trends: List[DailyTrend]
    wards: List[WardCount]
