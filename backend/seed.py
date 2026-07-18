import sys
import os
from datetime import datetime, timedelta
import random

# Adjust python path to find 'app'
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, engine, Base
from app.models import User, Complaint, DuplicateGroup
from app.auth import hash_password

def seed_database():
    # Make sure tables exist and drop old database to recreate fresh schemas
    db_path = "./nagarsetu.db"
    if os.path.exists(db_path):
        try:
            db = SessionLocal()
            db.close()
            # Drop all table data
            Base.metadata.drop_all(bind=engine)
            print("Dropped old database tables successfully.")
        except Exception as e:
            print(f"Error resetting database tables: {e}")

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    try:
        print("Seeding database with rich, realistic Indian administrative data...")

        # 1. Create Users
        citizen_pwd = hash_password("demo_pass_123!")
        officer_pwd = hash_password("demo_pass_123!")
        
        demo_citizen = User(
            username="demo_citizen",
            email="citizen@nagarsetu.gov.in",
            hashed_password=citizen_pwd,
            full_name="Rahul Sharma",
            role="citizen",
            phone_number="+91 98450 11223",
            ward="All Wards"
        )
        
        demo_officer = User(
            username="demo_officer",
            email="officer@nagarsetu.gov.in",
            hashed_password=officer_pwd,
            full_name="Commissioner Rajesh Kumar",
            role="officer",
            phone_number="+91 94480 55443",
            ward="All Wards"
        )
        
        db.add(demo_citizen)
        db.add(demo_officer)
        db.commit()
        db.refresh(demo_citizen)
        db.refresh(demo_officer)

        # 2. Seed Complaints across India (37 complaints)
        # Setup Indian Location Details
        # State -> District -> City -> Area/Locality -> Pincode -> Lat/Lng
        indian_localities = {
            "Maharashtra": {
                "district": "Mumbai City",
                "city": "Mumbai",
                "localities": [
                    {"name": "Dadar", "pincode": "400028", "coords": (19.0178, 72.8426)},
                    {"name": "Bandra", "pincode": "400050", "coords": (19.0596, 72.8295)},
                    {"name": "Colaba", "pincode": "400005", "coords": (18.9067, 72.8147)},
                    {"name": "Shivaji Park", "pincode": "400028", "coords": (19.0261, 72.8373)}
                ]
            },
            "Delhi": {
                "district": "New Delhi",
                "city": "New Delhi",
                "localities": [
                    {"name": "Connaught Place", "pincode": "110001", "coords": (28.6304, 77.2177)},
                    {"name": "Karol Bagh", "pincode": "110005", "coords": (28.6508, 77.1904)},
                    {"name": "Saket", "pincode": "110017", "coords": (28.5244, 77.2066)},
                    {"name": "Dwarka", "pincode": "110075", "coords": (28.5860, 77.0589)}
                ]
            },
            "Karnataka": {
                "district": "Bengaluru Urban",
                "city": "Bengaluru",
                "localities": [
                    {"name": "Malleswaram", "pincode": "560003", "coords": (12.9982, 77.5714)},
                    {"name": "Indiranagar", "pincode": "560038", "coords": (12.9784, 77.6408)},
                    {"name": "Jayanagar", "pincode": "560011", "coords": (12.9304, 77.5812)},
                    {"name": "Whitefield", "pincode": "560066", "coords": (12.9698, 77.7499)},
                    {"name": "Koramangala", "pincode": "560034", "coords": (12.9352, 77.6244)}
                ]
            },
            "Telangana": {
                "district": "Hyderabad",
                "city": "Hyderabad",
                "localities": [
                    {"name": "Gachibowli", "pincode": "500032", "coords": (17.4483, 78.3488)},
                    {"name": "Banjara Hills", "pincode": "500034", "coords": (17.4156, 78.4414)},
                    {"name": "Jubilee Hills", "pincode": "500033", "coords": (17.4278, 78.4069)}
                ]
            },
            "Tamil Nadu": {
                "district": "Chennai",
                "city": "Chennai",
                "localities": [
                    {"name": "Mylapore", "pincode": "600004", "coords": (13.0330, 80.2690)},
                    {"name": "Adyar", "pincode": "600020", "coords": (13.0012, 80.2565)},
                    {"name": "T. Nagar", "pincode": "600017", "coords": (13.0418, 80.2341)}
                ]
            }
        }

        citizen_names = [
            "Amit Patel", "Priya Nair", "Vikram Sen", "Sneha Rao", "Rohan Mehta", 
            "Ananya Deshmukh", "Kavitha Swamy", "Suresh Kumar", "Deepa Reddy", "Nikhil Gupta",
            "Vijay Singh", "Pooja Hegde", "Arjun Bhat", "Aditi Sharma", "Harish K."
        ]

        raw_complaints = [
            # Water Supply
            {
                "desc": "Heavy drinking water leakage from pipeline valve under Shivaji Park main gate, wasting thousands of liters.",
                "cat": "Water Supply", "prio": "High", "dept": "Water Supply & Sewerage Board",
                "eta": "24 Hours", "reason": "Fresh water line rupture in public recreation park.",
                "officer": "K. Ramesh (Water Inspector)", "status": "In_Progress", "stage": "In_Progress",
                "state": "Maharashtra", "loc": "Shivaji Park", "days_ago": 4, "hour": 9
            },
            {
                "desc": "Water supply pressure is extremely low in Malleswaram 8th cross layout. High floors get no water.",
                "cat": "Water Supply", "prio": "Medium", "dept": "Water Supply & Sewerage Board",
                "eta": "48 Hours", "reason": "Low pipeline pressure in domestic distribution line.",
                "officer": "K. Ramesh (Water Inspector)", "status": "Assigned", "stage": "Officer_Review",
                "state": "Karnataka", "loc": "Malleswaram", "days_ago": 6, "hour": 7
            },
            {
                "desc": "Highly turbid and mud-filled water coming out of water taps in Karol Bagh. Unsafe for cooking.",
                "cat": "Water Supply", "prio": "High", "dept": "Water Supply & Sewerage Board",
                "eta": "24 Hours", "reason": "Mixing of municipal drinking supply with soil. Biological safety warning.",
                "officer": "K. Ramesh (Water Inspector)", "status": "Pending", "stage": "Officer_Review",
                "state": "Delhi", "loc": "Karol Bagh", "days_ago": 1, "hour": 6
            },
            {
                "desc": "Broken valve on main supply header near Banjara Hills road no 12. Water gushing onto road.",
                "cat": "Water Supply", "prio": "High", "dept": "Water Supply & Sewerage Board",
                "eta": "24 Hours", "reason": "Fresh water main line burst blocking local traffic.",
                "officer": "K. Ramesh (Water Inspector)", "status": "Resolved", "stage": "Resolved",
                "state": "Telangana", "loc": "Banjara Hills", "days_ago": 12, "hour": 14,
                "notes": "Replaced pressure valve gasket, sealed joints. Cleared road on July 10.", "res_hours": 16.5
            },
            {
                "desc": "Water pipeline leak near Adyar telephone exchange, creating a stagnant pool.",
                "cat": "Water Supply", "prio": "Medium", "dept": "Water Supply & Sewerage Board",
                "eta": "48 Hours", "reason": "Secondary leakage on pavement.",
                "officer": "K. Ramesh (Water Inspector)", "status": "Resolved", "stage": "Resolved",
                "state": "Tamil Nadu", "loc": "Adyar", "days_ago": 18, "hour": 11,
                "notes": "Welded steel sleeve over pipeline rupture. Done July 3.", "res_hours": 32.0
            },

            # Sanitation
            {
                "desc": "Stinking sewer water overflowing from open manholes on Bandra West main shopping lane. Pedestrians can't walk.",
                "cat": "Sanitation", "prio": "Critical", "dept": "Health and Sanitation Commission",
                "eta": "12 Hours", "reason": "Sewer overflow in highly crowded shopping strip represents immediate biological hazard.",
                "officer": "Dr. A. Sharma (Chief Sanitation Officer)", "status": "In_Progress", "stage": "In_Progress",
                "state": "Maharashtra", "loc": "Bandra", "days_ago": 2, "hour": 18
            },
            {
                "desc": "Blocked drainage line causing backflow and raw sewage flooding in basement apartments of Dwarka Sector 6.",
                "cat": "Sanitation", "prio": "Critical", "dept": "Health and Sanitation Commission",
                "eta": "12 Hours", "reason": "Fecal backup inside residential structures represents active disease outbreak vector.",
                "officer": "Dr. A. Sharma (Chief Sanitation Officer)", "status": "Pending", "stage": "Officer_Review",
                "state": "Delhi", "loc": "Dwarka", "days_ago": 1, "hour": 22
            },
            {
                "desc": "Public toilet blocks in Gachibowli tech corridor are completely choked, unusable, and stinking.",
                "cat": "Sanitation", "prio": "Medium", "dept": "Health and Sanitation Commission",
                "eta": "24 Hours", "reason": "Public utility sanitation. Placed in standard cleaning queue.",
                "officer": "Dr. A. Sharma (Chief Sanitation Officer)", "status": "Resolved", "stage": "Resolved",
                "state": "Telangana", "loc": "Gachibowli", "days_ago": 15, "hour": 10,
                "notes": "Cleared drainage blocks, restored flushing pump, sanitized restrooms. Done July 8.", "res_hours": 14.0
            },
            {
                "desc": "Foul-smelling sewer water leaking onto the pavement opposite Mylapore temple gate.",
                "cat": "Sanitation", "prio": "High", "dept": "Health and Sanitation Commission",
                "eta": "24 Hours", "reason": "Sanitation issue near prominent place of worship.",
                "officer": "Dr. A. Sharma (Chief Sanitation Officer)", "status": "Resolved", "stage": "Resolved",
                "state": "Tamil Nadu", "loc": "Mylapore", "days_ago": 22, "hour": 16,
                "notes": "Jetted drain lines and replaced broken manhole concrete lid.", "res_hours": 20.0
            },

            # Roads/Potholes
            {
                "desc": "Massive pothole crater on Dadar main road, causing vehicles to bottom out and bike accidents.",
                "cat": "Roads/Potholes", "prio": "High", "dept": "Public Works Department",
                "eta": "24 Hours", "reason": "Deep asphalt crater on high-speed lane. Threat to two-wheeler safety.",
                "officer": "S. Murthy (PWD Inspector)", "status": "In_Progress", "stage": "In_Progress",
                "state": "Maharashtra", "loc": "Dadar", "days_ago": 3, "hour": 17
            },
            {
                "desc": "Huge crater pothole in Connaught Place inner circle, causing traffic bottlenecks.",
                "cat": "Roads/Potholes", "prio": "Medium", "dept": "Public Works Department",
                "eta": "48 Hours", "reason": "Traffic disruption in commercial district. Slotted for cold asphalt patch.",
                "officer": "S. Murthy (PWD Inspector)", "status": "Pending", "stage": "Officer_Review",
                "state": "Delhi", "loc": "Connaught Place", "days_ago": 1, "hour": 8
            },
            {
                "desc": "Road tar dug up by electrical board left unfinished for 2 weeks in Indiranagar 100 feet road corner.",
                "cat": "Roads/Potholes", "prio": "Medium", "dept": "Public Works Department",
                "eta": "48 Hours", "reason": "Pedestrian obstacle and dust generator. Scheduled for resurfacing.",
                "officer": "S. Murthy (PWD Inspector)", "status": "Assigned", "stage": "Officer_Review",
                "state": "Karnataka", "loc": "Indiranagar", "days_ago": 8, "hour": 12
            },
            {
                "desc": "Broken pavement tiles on Koramangala main footpath raising tripping risk.",
                "cat": "Roads/Potholes", "prio": "Low", "dept": "Public Works Department",
                "eta": "72 Hours", "reason": "Minor pathway damage. Scheduled on routine maintenance.",
                "officer": "S. Murthy (PWD Inspector)", "status": "Resolved", "stage": "Resolved",
                "state": "Karnataka", "loc": "Koramangala", "days_ago": 25, "hour": 15,
                "notes": "Re-laid pavement tiles on Koramangala 4th block walkway. Inspected July 1.", "res_hours": 48.5
            },

            # Electricity
            {
                "desc": "High voltage transformer sparks flashing on overhead poles near Whitefield main crossing, very loud noise.",
                "cat": "Electricity", "prio": "Critical", "dept": "Electricity Distribution Board",
                "eta": "12 Hours", "reason": "Spark discharge from high voltage transformers poses fire hazard and risk of blast.",
                "officer": "V. Prasad (Lineman Overseer)", "status": "Pending", "stage": "Officer_Review",
                "state": "Karnataka", "loc": "Whitefield", "days_ago": 2, "hour": 21
            },
            {
                "desc": "Streetlights completely dark on Dwarka block G lane for 4 nights, feels extremely unsafe.",
                "cat": "Electricity", "prio": "Medium", "dept": "Electricity Distribution Board",
                "eta": "48 Hours", "reason": "Light blackout in residential lane, pedestrian safety concerns.",
                "officer": "V. Prasad (Lineman Overseer)", "status": "Assigned", "stage": "Officer_Review",
                "state": "Delhi", "loc": "Dwarka", "days_ago": 5, "hour": 20
            },
            {
                "desc": "Loose power line wire hanging down to pedestrian level outside T. Nagar shops.",
                "cat": "Electricity", "prio": "Critical", "dept": "Electricity Distribution Board",
                "eta": "12 Hours", "reason": "Hanging live wires pose immediate electrocution hazard to shopper transit.",
                "officer": "V. Prasad (Lineman Overseer)", "status": "Resolved", "stage": "Resolved",
                "state": "Tamil Nadu", "loc": "T. Nagar", "days_ago": 14, "hour": 23,
                "notes": "De-energized line segment, spliced cable and elevated pole fasteners. Done July 5.", "res_hours": 5.5
            },

            # Waste Management
            {
                "desc": "Construction debris and plastic bags dumped illegally in Shivaji Park corner.",
                "cat": "Waste Management", "prio": "Medium", "dept": "Health and Sanitation Commission",
                "eta": "48 Hours", "reason": "Public dumping. Sweeper truck dispatch scheduled.",
                "officer": "Dr. A. Sharma (Chief Sanitation Officer)", "status": "Assigned", "stage": "Officer_Review",
                "state": "Maharashtra", "loc": "Shivaji Park", "days_ago": 7, "hour": 11
            },
            {
                "desc": "Garbage overflow from municipal dump bins at Malleswaram metro gate. Dogs tearing bags open.",
                "cat": "Waste Management", "prio": "Critical", "dept": "Health and Sanitation Commission",
                "eta": "12 Hours", "reason": "Solid waste overflow blocking pedestrian walkway near public transit nodes.",
                "officer": "Dr. A. Sharma (Chief Sanitation Officer)", "status": "Pending", "stage": "Officer_Review",
                "state": "Karnataka", "loc": "Malleswaram", "days_ago": 1, "hour": 8
            },
            {
                "desc": "Huge pile of dry plastic waste dumped near Jayanagar Lake entrance.",
                "cat": "Waste Management", "prio": "Medium", "dept": "Health and Sanitation Commission",
                "eta": "48 Hours", "reason": "Environmental littering in public lake boundary.",
                "officer": "Dr. A. Sharma (Chief Sanitation Officer)", "status": "Resolved", "stage": "Resolved",
                "state": "Karnataka", "loc": "Jayanagar", "days_ago": 20, "hour": 9,
                "notes": "Cleared 2 tons of plastic waste using landfill dump loaders. Done June 30.", "res_hours": 36.0
            },

            # Public Health
            {
                "desc": "Extreme mosquito breeding in waterlogged empty plots in Whitefield. Malaria cases are spiking.",
                "cat": "Public Health", "prio": "High", "dept": "Health and Sanitation Commission",
                "eta": "24 Hours", "reason": "Stagnant pools trigger vector-borne disease outbreak alert.",
                "officer": "Dr. A. Sharma (Chief Sanitation Officer)", "status": "Pending", "stage": "Officer_Review",
                "state": "Karnataka", "loc": "Whitefield", "days_ago": 1, "hour": 19
            },
            {
                "desc": "Stray dogs chasing and biting residents near Saket park gate, children are terrified.",
                "cat": "Public Health", "prio": "Medium", "dept": "Health and Sanitation Commission",
                "eta": "48 Hours", "reason": "Stray animal aggression warning. Animal control team routed.",
                "officer": "Dr. A. Sharma (Chief Sanitation Officer)", "status": "Assigned", "stage": "Officer_Review",
                "state": "Delhi", "loc": "Saket", "days_ago": 4, "hour": 16
            }
        ]

        # Duplicate complaints to link and merge
        duplicate_complaints_data = [
            # Group 1 duplicates in Malleswaram
            {
                "desc": "Massive pile of garbage overflowing onto the road at Malleswaram metro exit. Very bad smell in the area.",
                "cat": "Waste Management", "prio": "Critical", "dept": "Health and Sanitation Commission",
                "eta": "12 Hours", "reason": "Waste blocking pedestrian pathway.",
                "officer": "Dr. A. Sharma (Chief Sanitation Officer)", "status": "Pending", "stage": "Officer_Review",
                "state": "Karnataka", "loc": "Malleswaram", "days_ago": 1, "hour": 9
            },
            {
                "desc": "Metro station entrance in Malleswaram is smelling bad due to trash overflow. Bins are completely full.",
                "cat": "Waste Management", "prio": "Critical", "dept": "Health and Sanitation Commission",
                "eta": "12 Hours", "reason": "Trash heap near metro station.",
                "officer": "Dr. A. Sharma (Chief Sanitation Officer)", "status": "Pending", "stage": "Officer_Review",
                "state": "Karnataka", "loc": "Malleswaram", "days_ago": 1, "hour": 10
            },
            
            # Group 2 duplicates in Bandra, Mumbai
            {
                "desc": "Raw sewage water leaking from drains onto Bandra shopping pathway, smells disgusting.",
                "cat": "Sanitation", "prio": "Critical", "dept": "Health and Sanitation Commission",
                "eta": "12 Hours", "reason": "Fecal leak on pedestrian path.",
                "officer": "Dr. A. Sharma (Chief Sanitation Officer)", "status": "Pending", "stage": "Officer_Review",
                "state": "Maharashtra", "loc": "Bandra", "days_ago": 2, "hour": 19
            }
        ]

        inserted_complaints = []
        
        # Insert initial complaints
        for idx, rc in enumerate(raw_complaints):
            state_info = indian_localities[rc["state"]]
            locality_info = [l for l in state_info["localities"] if l["name"] == rc["loc"]][0]
            
            # Setup coordinates with small random noise so markers don't overlap exactly
            lat = locality_info["coords"][0] + random.uniform(-0.002, 0.002)
            lng = locality_info["coords"][1] + random.uniform(-0.002, 0.002)
            
            comp = Complaint(
                description=rc["desc"],
                category=rc["cat"],
                priority=rc["prio"],
                country="India",
                state=rc["state"],
                district=state_info["district"],
                city=state_info["city"],
                locality=rc["loc"],
                pincode=locality_info["pincode"],
                formatted_address=f"{rc['loc']}, {state_info['city']}, {state_info['district']}, {rc['state']} - {locality_info['pincode']}, India",
                pipeline_stage=rc["stage"],
                citizen_name=random.choice(citizen_names),
                submission_hour=rc["hour"],
                latitude=lat,
                longitude=lng,
                status=rc["status"],
                department=rc["dept"],
                resolution_time=rc["eta"],
                priority_reasoning=rc["reason"],
                officer_recommendation=rc["officer"],
                citizen_id=demo_citizen.id,
                created_at=datetime.utcnow() - timedelta(days=rc["days_ago"], hours=random.randint(1, 10)),
                officer_notes=rc.get("notes"),
                resolved_duration_hours=rc.get("res_hours")
            )
            
            if rc["status"] == "Resolved":
                comp.resolved_at = datetime.utcnow() - timedelta(days=rc["days_ago"] - 1)
                
            db.add(comp)
            inserted_complaints.append(comp)
            
        db.commit()

        # Seed Duplicate Group 1 (Malleswaram Metro station garbage)
        primary_malleswaram = [c for c in inserted_complaints if "Garbage overflow from municipal dump bins at Malleswaram" in c.description]
        if primary_malleswaram:
            primary_comp = primary_malleswaram[0]
            group1 = DuplicateGroup(
                primary_complaint_id=primary_comp.id,
                similarity_score=0.925,
                created_at=datetime.utcnow()
            )
            db.add(group1)
            db.commit()
            db.refresh(group1)
            
            primary_comp.duplicate_group_id = group1.id
            db.add(primary_comp)
            
            # Add secondary malleswaram duplicates
            for dc in duplicate_complaints_data[:2]:
                state_info = indian_localities["Karnataka"]
                loc = [l for l in state_info["localities"] if l["name"] == "Malleswaram"][0]
                lat = loc["coords"][0] + random.uniform(-0.0005, 0.0005)
                lng = loc["coords"][1] + random.uniform(-0.0005, 0.0005)
                
                dup_comp = Complaint(
                    description=dc["desc"],
                    category=dc["cat"],
                    priority=dc["prio"],
                    country="India",
                    state=dc["state"],
                    district=state_info["district"],
                    city=state_info["city"],
                    locality=dc["loc"],
                    pincode=loc["pincode"],
                    formatted_address=f"{dc['loc']}, {state_info['city']}, {state_info['district']}, {dc['state']} - {loc['pincode']}, India",
                    pipeline_stage=dc["stage"],
                    citizen_name=random.choice(citizen_names),
                    submission_hour=dc["hour"],
                    latitude=lat,
                    longitude=lng,
                    status=dc["status"],
                    department=dc["dept"],
                    resolution_time=dc["eta"],
                    priority_reasoning=dc["reason"],
                    officer_recommendation=dc["officer"],
                    citizen_id=demo_citizen.id,
                    duplicate_group_id=group1.id,
                    created_at=datetime.utcnow() - timedelta(days=dc["days_ago"], hours=random.randint(1, 4))
                )
                db.add(dup_comp)
            db.commit()

        # Seed Duplicate Group 2 (Bandra sewer leak)
        primary_bandra = [c for c in inserted_complaints if "Bandra West main shopping lane" in c.description]
        if primary_bandra:
            primary_comp = primary_bandra[0]
            group2 = DuplicateGroup(
                primary_complaint_id=primary_comp.id,
                similarity_score=0.895,
                created_at=datetime.utcnow()
            )
            db.add(group2)
            db.commit()
            db.refresh(group2)
            
            primary_comp.duplicate_group_id = group2.id
            db.add(primary_comp)
            
            # Add secondary bandra duplicate
            dc = duplicate_complaints_data[2]
            state_info = indian_localities["Maharashtra"]
            loc = [l for l in state_info["localities"] if l["name"] == "Bandra"][0]
            lat = loc["coords"][0] + random.uniform(-0.0005, 0.0005)
            lng = loc["coords"][1] + random.uniform(-0.0005, 0.0005)
            
            dup_comp = Complaint(
                description=dc["desc"],
                category=dc["cat"],
                priority=dc["prio"],
                country="India",
                state=dc["state"],
                district=state_info["district"],
                city=state_info["city"],
                locality=dc["loc"],
                pincode=loc["pincode"],
                formatted_address=f"{dc['loc']}, {state_info['city']}, {state_info['district']}, {dc['state']} - {loc['pincode']}, India",
                pipeline_stage=dc["stage"],
                citizen_name=random.choice(citizen_names),
                submission_hour=dc["hour"],
                latitude=lat,
                longitude=lng,
                status=dc["status"],
                department=dc["dept"],
                resolution_time=dc["eta"],
                priority_reasoning=dc["reason"],
                officer_recommendation=dc["officer"],
                citizen_id=demo_citizen.id,
                duplicate_group_id=group2.id,
                created_at=datetime.utcnow() - timedelta(days=dc["days_ago"], hours=random.randint(1, 4))
            )
            db.add(dup_comp)
            db.commit()

        # Seed additional generic complaints to reach 38 total (various cities, categories, dates)
        categories_list = ["Sanitation", "Water Supply", "Roads/Potholes", "Electricity", "Public Health", "Waste Management"]
        priorities_list = ["Critical", "High", "Medium", "Low"]
        stages_list = ["Officer_Review", "In_Progress", "Resolved"]
        statuses_list = ["Pending", "Assigned", "In_Progress", "Resolved"]
        
        descriptions_pool = [
            "Flickering streetlight bulbs posing safety threat at night.",
            "Stagnant puddle near shopping center exit breeding mosquitoes.",
            "Water distribution pipeline leakage causing mud on pathways.",
            "Pothole clusters developed on bypass road lane causing minor accidents.",
            "Solid waste sweepers not showing up this week, leaves piling.",
            "Sewer line backpressure causing bad odor in commercial block.",
            "Transformer sparks during rain showers, power cut reported.",
            "Dumping of empty plastic cups and debris near local garden park."
        ]

        states = list(indian_localities.keys())

        # Generate 14 more complaints to reach 38 total
        for i in range(14):
            rand_state = random.choice(states)
            state_info = indian_localities[rand_state]
            locality_info = random.choice(state_info["localities"])
            
            lat = locality_info["coords"][0] + random.uniform(-0.003, 0.003)
            lng = locality_info["coords"][1] + random.uniform(-0.003, 0.003)
            
            rand_desc = f"{random.choice(descriptions_pool)} (Location: {locality_info['name']})"
            rand_cat = random.choice(categories_list)
            rand_prio = random.choice(priorities_list)
            rand_status = random.choice(statuses_list)
            rand_stage = "Resolved" if rand_status == "Resolved" else random.choice(["Officer_Review", "In_Progress"])
            
            from app.ai.router import route_department
            route_info = route_department(rand_cat)
            
            days_ago = random.randint(2, 28)
            hour = random.randint(0, 23)
            
            comp = Complaint(
                description=rand_desc,
                category=rand_cat,
                priority=rand_prio,
                country="India",
                state=rand_state,
                district=state_info["district"],
                city=state_info["city"],
                locality=locality_info["name"],
                pincode=locality_info["pincode"],
                formatted_address=f"{locality_info['name']}, {state_info['city']}, {state_info['district']}, {rand_state} - {locality_info['pincode']}, India",
                pipeline_stage=rand_stage,
                citizen_name=random.choice(citizen_names),
                submission_hour=hour,
                latitude=lat,
                longitude=lng,
                status=rand_status,
                department=route_info["department"],
                resolution_time=route_info["base_eta"],
                priority_reasoning="System heuristic check.",
                officer_recommendation=route_info["officer"],
                citizen_id=demo_citizen.id,
                created_at=datetime.utcnow() - timedelta(days=days_ago, hours=random.randint(1, 10)),
                resolved_duration_hours=random.uniform(4.0, 72.0) if rand_status == "Resolved" else None
            )
            
            if rand_status == "Resolved":
                comp.resolved_at = comp.created_at + timedelta(hours=int(comp.resolved_duration_hours or 24))
                comp.officer_notes = "Resolved by field sanitation/PWD crew. Verified operational."
                
            db.add(comp)
            
        db.commit()
        print("Database seeded with 38 Indian complaints across 5 States successfully!")
        
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
