from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base, SessionLocal
from app.models import User, Complaint

# Import routes (will create files in routes/)
from app.routes import auth, complaints, officers, analytics

# Create database tables dynamically
Base.metadata.create_all(bind=engine)

# Auto-seed if database is empty (e.g. on Render fresh deploy)
def auto_seed_if_empty():
    db = SessionLocal()
    try:
        if db.query(Complaint).count() == 0:
            print("Database has zero complaints. Triggering automatic database seeding...")
            import sys
            import os
            backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            if backend_dir not in sys.path:
                sys.path.append(backend_dir)
            from seed import seed_database
            seed_database()
    except Exception as e:
        print(f"Auto-seed check note: {e}")
    finally:
        db.close()

auto_seed_if_empty()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    description="NagarSetu - AI Powered Municipal Complaint Intelligence System API"
)

# CORS configurations
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In development, allow all origins. Can restrict to specific domains later.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(complaints.router, prefix="/api/complaints", tags=["Complaints"])
app.include_router(officers.router, prefix="/api/officers", tags=["Officer Operations"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])

@app.get("/")
def read_root():
    return {
        "status": "online",
        "app": settings.PROJECT_NAME,
        "version": settings.PROJECT_VERSION,
        "documentation": "/docs"
    }
