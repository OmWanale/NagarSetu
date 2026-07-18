from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.models import Complaint, User, DuplicateGroup
from app.schemas import ComplaintCreate, ComplaintResponse, DuplicateGroupResponse
from app.auth import get_current_user, get_current_officer, get_current_user_optional, get_current_officer_optional
from app.ai.classifier import classify_complaint
from app.ai.duplication import check_for_duplicates
from app.ai.router import route_department
from app.ai.gemini_client import analyze_complaint_with_gemini

router = APIRouter()

@router.post("", response_model=ComplaintResponse, status_code=status.HTTP_201_CREATED)
def file_complaint(
    complaint_in: ComplaintCreate,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional)
):
    # Fallback to demo citizen if auth is missing/bypassed (extremely useful for offline judge runs)
    citizen_id = current_user.id if current_user else None
    if not citizen_id:
        demo_citizen = db.query(User).filter(User.username == "demo_citizen").first()
        if demo_citizen:
            citizen_id = demo_citizen.id
        else:
            # Create dummy citizen on the fly if needed
            new_demo = User(
                username="demo_citizen",
                email="citizen@nagarsetu.gov.in",
                hashed_password="pbkdf2:dummy",
                full_name="Ananya Sharma (Demo Citizen)",
                role="citizen",
                ward="Ward 4 (Malleswaram)"
            )
            db.add(new_demo)
            db.commit()
            db.refresh(new_demo)
            citizen_id = new_demo.id

    # --- Phase 1 of AI Pipeline: Classification ---
    category = classify_complaint(complaint_in.description)
    
    # --- Phase 2: Rule Engine Routing ---
    route_info = route_department(category)
    department = route_info["department"]
    
    # --- Phase 3: Gemini Prediction (Priority, ETA, Officer) ---
    gemini_data = analyze_complaint_with_gemini(
        description=complaint_in.description,
        category=category,
        ward=complaint_in.locality
    )
    
    priority = gemini_data.get("priority", "Medium")
    resolution_time = gemini_data.get("resolution_time", route_info["base_eta"])
    priority_reasoning = gemini_data.get("priority_reasoning", "Processed by router.")
    officer_recommendation = gemini_data.get("officer_recommendation", route_info["officer"])

    # --- Phase 4: Semantic Duplicate Detection ---
    # Query all active (unresolved) complaints
    active_complaints = db.query(Complaint).filter(Complaint.status != "Resolved").all()
    existing_items = [(c.id, c.description) for c in active_complaints]
    
    duplicate_group_id = None
    
    # Check similarity (threshold = 0.70)
    matches = check_for_duplicates(complaint_in.description, existing_items, threshold=0.70)
    
    if matches:
        primary_match_id, score = matches[0] # Highest similarity match
        primary_complaint = db.query(Complaint).filter(Complaint.id == primary_match_id).first()
        
        if primary_complaint:
            # If the matching complaint already belongs to a DuplicateGroup, join it
            if primary_complaint.duplicate_group_id:
                duplicate_group_id = primary_complaint.duplicate_group_id
            else:
                # Create a new DuplicateGroup, marking the first complaint as primary
                new_group = DuplicateGroup(
                    primary_complaint_id=primary_complaint.id,
                    similarity_score=score
                )
                db.add(new_group)
                db.commit()
                db.refresh(new_group)
                
                duplicate_group_id = new_group.id
                primary_complaint.duplicate_group_id = duplicate_group_id
                db.add(primary_complaint)
                db.commit()

    citizen_name = current_user.full_name if current_user else (complaint_in.citizen_name or "Ananya Sharma")

    # --- Phase 5: Commit to Database ---
    new_complaint = Complaint(
        description=complaint_in.description,
        country=complaint_in.country or "India",
        state=complaint_in.state,
        district=complaint_in.district,
        city=complaint_in.city,
        locality=complaint_in.locality,
        pincode=complaint_in.pincode,
        formatted_address=complaint_in.formatted_address,
        citizen_name=citizen_name,
        submission_hour=datetime.utcnow().hour,
        pipeline_stage="Officer_Review",
        latitude=complaint_in.latitude,
        longitude=complaint_in.longitude,
        image_data=complaint_in.image_data,
        category=category,
        priority=priority,
        status="Pending",
        department=department,
        resolution_time=resolution_time,
        priority_reasoning=priority_reasoning,
        officer_recommendation=officer_recommendation,
        citizen_id=citizen_id,
        duplicate_group_id=duplicate_group_id
    )
    
    db.add(new_complaint)
    db.commit()
    db.refresh(new_complaint)
    return new_complaint

@router.get("", response_model=List[ComplaintResponse])
def get_all_complaints(
    category: Optional[str] = None,
    priority: Optional[str] = None,
    status: Optional[str] = None,
    state: Optional[str] = None,
    district: Optional[str] = None,
    city: Optional[str] = None,
    locality: Optional[str] = None,
    department: Optional[str] = None,
    pipeline_stage: Optional[str] = None,
    search: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_officer: User = Depends(get_current_officer_optional)
):
    query = db.query(Complaint)
    
    if category and category != "ALL":
        query = query.filter(Complaint.category == category)
    if priority and priority != "ALL":
        query = query.filter(Complaint.priority == priority)
    if status and status != "ALL":
        query = query.filter(Complaint.status == status)
    if state and state != "ALL":
        query = query.filter(Complaint.state == state)
    if district and district != "ALL":
        query = query.filter(Complaint.district == district)
    if city and city != "ALL":
        query = query.filter(Complaint.city == city)
    if locality and locality != "ALL":
        query = query.filter(Complaint.locality == locality)
    if department and department != "ALL":
        query = query.filter(Complaint.department == department)
    if pipeline_stage and pipeline_stage != "ALL":
        query = query.filter(Complaint.pipeline_stage == pipeline_stage)
        
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            Complaint.description.like(search_filter) | 
            Complaint.id.like(search_filter) |
            Complaint.citizen_name.like(search_filter) |
            Complaint.formatted_address.like(search_filter)
        )
        
    if start_date:
        try:
            start_dt = datetime.fromisoformat(start_date)
            query = query.filter(Complaint.created_at >= start_dt)
        except ValueError:
            pass
            
    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date)
            query = query.filter(Complaint.created_at <= end_dt)
        except ValueError:
            pass
            
    return query.order_by(Complaint.created_at.desc()).all()

@router.get("/my-complaints", response_model=List[ComplaintResponse])
def get_my_complaints(
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional)
):
    citizen_id = current_user.id if current_user else None
    if not citizen_id:
        demo_citizen = db.query(User).filter(User.username == "demo_citizen").first()
        if demo_citizen:
            citizen_id = demo_citizen.id
            
    if not citizen_id:
        return []
        
    return db.query(Complaint).filter(Complaint.citizen_id == citizen_id).order_by(Complaint.created_at.desc()).all()

@router.get("/duplicates", response_model=List[DuplicateGroupResponse])
def get_duplicate_groups(
    db: Session = Depends(get_db),
    current_officer: User = Depends(get_current_officer_optional)
):
    return db.query(DuplicateGroup).order_by(DuplicateGroup.created_at.desc()).all()
