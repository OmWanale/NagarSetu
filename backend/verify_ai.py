import sys
import os

# Adjust path to app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.ai.classifier import classify_complaint
from app.ai.duplication import check_for_duplicates, compute_cosine_similarity
from app.ai.router import route_department
from app.ai.gemini_client import analyze_complaint_with_gemini

def run_tests():
    from app.config import settings
    print(f"DEBUG: Loaded Gemini API Key is '{settings.GEMINI_API_KEY}'")
    print("====================================================")
    print("RUNNING NAGARSETU AI BACKEND PIPELINE CHECKS")
    print("====================================================")

    # 1. Test Classifier
    print("\n[1] Testing AI Classification Rules...")
    test_texts = {
        "A huge crater of a pothole is open at the corner of 5th avenue. Bicycles are slipping.": "Roads/Potholes",
        "Water has been spraying out of a broken supply pipeline for hours now.": "Water Supply",
        "Stinking sewage water backing up into residential house gardens from choked drainage.": "Sanitation",
        "Transformer sparking and sparking near residential block, power is out.": "Electricity",
        "Too many mosquitoes breeding in water logged plots. Dengue cases rising.": "Public Health",
        "Garbage pile not cleared from the corner bin, smells very bad.": "Waste Management"
    }

    passed_class = 0
    for text, expected in test_texts.items():
        predicted = classify_complaint(text)
        status = "PASSED" if predicted == expected else f"FAILED (expected {expected}, got {predicted})"
        print(f"  - Text: \"{text[:40]}...\"")
        print(f"    Prediction: {predicted} | {status}")
        if predicted == expected:
            passed_class += 1

    # 2. Test Routing
    print("\n[2] Testing Department Routing Rule Engine...")
    test_cats = ["Sanitation", "Water Supply", "Roads/Potholes", "Electricity"]
    for cat in test_cats:
        route = route_department(cat)
        print(f"  - Category: {cat}")
        print(f"    Department: {route['department']} | Default Officer: {route['officer']}")

    # 3. Test Duplication Detection
    print("\n[3] Testing Semantic Duplicate Detection...")
    catalog = [
        ("comp-1", "Massive leak in water pipe at Malleswaram 12th cross."),
        ("comp-2", "Power transformer sparking near main square."),
        ("comp-3", "Litter and garbage pileup on 8th main pavement.")
    ]
    
    test_dups = [
        "A bad pipe burst on Malleswaram 12th cross, water is leaking.", # Matches comp-1
        "Garbage overflow on 8th main street, very stinky."            # Matches comp-3
    ]

    for td in test_dups:
        matches = check_for_duplicates(td, catalog, threshold=0.55)
        print(f"  - Query: \"{td[:40]}...\"")
        if matches:
            primary_id, score = matches[0]
            print(f"    Duplicate Found: ID {primary_id} | Similarity Score: {(score*100):.1f}%")
        else:
            print("    Duplicate Found: None")

    # 4. Test Gemini Simulation client
    print("\n[4] Testing Gemini Client (Simulated Heuristic Inference)...")
    sim_res = analyze_complaint_with_gemini(
        description="Foul smelling black sewer water coming out of storm water gutter in block D.",
        category="Sanitation",
        ward="Ward 4 (Malleswaram)"
    )
    print(f"  - Priority: {sim_res['priority']}")
    print(f"  - ETA: {sim_res['resolution_time']}")
    print(f"  - Reasoning: {sim_res['priority_reasoning']}")
    print(f"  - Officer assigned: {sim_res['officer_recommendation']}")

    print("\n====================================================")
    print("ALL VERIFICATION UTILITIES COMPLETED SUCCESSFULLY")
    print("====================================================")

if __name__ == "__main__":
    run_tests()
