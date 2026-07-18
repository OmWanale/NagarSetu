from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime

from app.database import get_db
from app.models import Complaint, DuplicateGroup, User
from app.schemas import ComplaintResponse, ComplaintUpdateStatus
from app.auth import get_current_officer_optional

router = APIRouter()

@router.put("/complaints/{complaint_id}/status", response_model=ComplaintResponse)
def update_complaint_status(
    complaint_id: str,
    status_update: ComplaintUpdateStatus,
    db: Session = Depends(get_db),
    current_officer: User = Depends(get_current_officer_optional)
):
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found"
        )
        
    complaint.status = status_update.status
    if status_update.notes:
        complaint.officer_notes = status_update.notes
        
    if status_update.status == "Resolved":
        complaint.resolved_at = datetime.utcnow()
        
    db.commit()
    db.refresh(complaint)
    return complaint

@router.post("/duplicates/{group_id}/merge")
def merge_duplicate_group(
    group_id: str,
    db: Session = Depends(get_db),
    current_officer: User = Depends(get_current_officer_optional)
):
    group = db.query(DuplicateGroup).filter(DuplicateGroup.id == group_id).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Duplicate group not found"
        )
        
    # Mark all secondary complaints as Resolved (as a duplicate of the primary)
    primary_id = group.primary_complaint_id
    secondary_complaints = group.secondary_complaints
    
    for comp in secondary_complaints:
        comp.status = "Resolved"
        comp.resolved_at = datetime.utcnow()
        comp.officer_notes = f"Auto-resolved. Checked by AI and merged as duplicate of primary incident ID: {primary_id}"
        db.add(comp)
        
    # Delete the duplicate group once merged/resolved
    db.delete(group)
    db.commit()
    
    return {"status": "success", "message": f"Successfully merged duplicate group {group_id}. Secondary complaints resolved."}
