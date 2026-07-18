import uuid
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Text, Integer
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(String, nullable=False, default="citizen") # citizen, officer, admin
    phone_number = Column(String, nullable=True)
    ward = Column(String, nullable=True) # E.g., 'Ward 4 (Malleswaram)'

    complaints = relationship("Complaint", back_populates="citizen", foreign_keys="[Complaint.citizen_id]")


class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(String, primary_key=True, default=generate_uuid)
    description = Column(Text, nullable=False)
    category = Column(String, nullable=False, index=True) # Sanitation, Water Supply, etc.
    priority = Column(String, nullable=False, index=True) # Critical, High, Medium, Low
    country = Column(String, default="India", nullable=False)
    state = Column(String, nullable=False, index=True)
    district = Column(String, nullable=False, index=True)
    city = Column(String, nullable=False, index=True)
    locality = Column(String, nullable=False, index=True)
    pincode = Column(String, nullable=True)
    formatted_address = Column(Text, nullable=True)
    pipeline_stage = Column(String, nullable=False, default="Officer_Review", index=True) # Intake, AI_Classification, Priority_Assignment, Department_Assignment, Officer_Review, In_Progress, Resolved
    citizen_name = Column(String, nullable=True)
    submission_hour = Column(Integer, nullable=True)
    resolved_duration_hours = Column(Float, nullable=True)
    
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    image_data = Column(Text, nullable=True) # Can store base64 representation of complaint image
    status = Column(String, nullable=False, default="Pending", index=True) # Pending, Assigned, In_Progress, Resolved
    
    # AI Pipeline Metadata Fields
    department = Column(String, nullable=True)
    resolution_time = Column(String, nullable=True) # Estimated ETA
    priority_reasoning = Column(Text, nullable=True)
    officer_recommendation = Column(String, nullable=True)
    
    # Municipal Actions Fields
    officer_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    resolved_at = Column(DateTime, nullable=True)
    
    # Relationships
    citizen_id = Column(String, ForeignKey("users.id"), nullable=False)
    citizen = relationship("User", back_populates="complaints", foreign_keys=[citizen_id])
    
    duplicate_group_id = Column(String, ForeignKey("duplicate_groups.id"), nullable=True)
    duplicate_group = relationship("DuplicateGroup", back_populates="secondary_complaints", foreign_keys=[duplicate_group_id])


class DuplicateGroup(Base):
    __tablename__ = "duplicate_groups"

    id = Column(String, primary_key=True, default=generate_uuid)
    primary_complaint_id = Column(String, ForeignKey("complaints.id", ondelete="SET NULL"), nullable=True)
    similarity_score = Column(Float, nullable=False, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    primary_complaint = relationship("Complaint", foreign_keys=[primary_complaint_id])
    secondary_complaints = relationship("Complaint", back_populates="duplicate_group", foreign_keys="[Complaint.duplicate_group_id]")
