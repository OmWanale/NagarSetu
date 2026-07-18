import json
import logging
import requests
from app.config import settings
from app.ai.router import route_department

logger = logging.getLogger(__name__)

def analyze_complaint_with_gemini(description: str, category: str, ward: str) -> dict:
    """
    Sends the complaint details to Gemini 2.5 Flash to determine:
    1. Priority level (Critical, High, Medium, Low)
    2. Detailed priority reasoning
    3. Custom Resolution ETA
    4. Recommended Officer
    """
    
    # Pre-fetch default department routing info for fallback/system context
    route_info = route_department(category)
    
    if not settings.GEMINI_API_KEY:
        logger.info("GEMINI_API_KEY not found. Invoking Local Heuristic Simulation Engine.")
        return generate_simulated_ai_response(description, category, ward, route_info)
        
    prompt = f"""
    You are an AI Municipal Operations Assistant for Nagar City.
    Analyze the following citizen complaint and provide a structured JSON response.

    Complaint Text: "{description}"
    Category: {category}
    Ward: {ward}
    Default Assigned Department: {route_info['department']}
    Default Assigned Officer: {route_info['officer']}

    Rules for priority and ETA:
    - Critical (12 Hours ETA): Active physical danger, severe public health hazard (sewage leaks, toxic overflows), fire risk, sparking wires, or grid collapses.
    - High (24 Hours ETA): Massive fresh water line breaks, blocking primary transit roads, complete streetlight failure over large commercial areas.
    - Medium (48 Hours ETA): Small potholes, standard streetlight bulb fuses, minor garbage pileup, low water pressure.
    - Low (72 Hours): Non-urgent issues, cosmetic road wear, scheduled park cleaning, leaf sweeping.

    Your response must be a valid JSON object ONLY, with no markdown styling (do not include ```json), matching this structure:
    {{
      "priority": "Critical" | "High" | "Medium" | "Low",
      "priority_reasoning": "A concise, professional one-sentence justification explaining why this priority was chosen relative to public safety/health.",
      "resolution_time": "12 Hours" | "24 Hours" | "48 Hours" | "72 Hours",
      "officer_recommendation": "Name of the default officer or a specific specialist if applicable"
    }}
    """
    
    try:
        # Standard HTTP post to Gemini API (v1beta endpoint)
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={settings.GEMINI_API_KEY}"
        headers = {"Content-Type": "application/json"}
        payload = {
            "contents": [{
                "parts": [{"text": prompt}]
            }],
            "generationConfig": {
                "responseMimeType": "application/json"
            }
        }
        
        response = requests.post(url, headers=headers, json=payload, timeout=8)
        if response.status_code == 200:
            res_json = response.json()
            raw_text = res_json['candidates'][0]['content']['parts'][0]['text']
            
            # Clean text just in case Gemini wrapped it
            raw_text = raw_text.strip().replace("```json", "").replace("```", "")
            parsed_result = json.loads(raw_text)
            
            # Sanity checks
            if "priority" in parsed_result and "priority_reasoning" in parsed_result:
                logger.info("Successfully fetched Gemini API inference.")
                return {
                    "priority": parsed_result.get("priority", "Medium"),
                    "priority_reasoning": parsed_result.get("priority_reasoning", "Standard routing applied."),
                    "resolution_time": parsed_result.get("resolution_time", route_info["base_eta"]),
                    "officer_recommendation": parsed_result.get("officer_recommendation", route_info["officer"])
                }
        
        logger.warning(f"Gemini API returned status code {response.status_code}. Falling back to simulation.")
    except Exception as e:
        logger.error(f"Gemini API connection error: {e}. Falling back to simulation.")
        
    return generate_simulated_ai_response(description, category, ward, route_info)


def generate_simulated_ai_response(description: str, category: str, ward: str, route_info: dict) -> dict:
    """
    Local heuristic fallback that generates high-fidelity context-specific NLP responses.
    """
    desc_lower = description.lower()
    
    # 1. Defaults from rule engine
    priority = "Medium"
    reasoning = "Scheduled based on municipal queue guidelines and standard safety impact metrics."
    eta = route_info["base_eta"]
    officer = route_info["officer"]
    
    # 2. Contextual heuristic adjustments
    if category == "Sanitation":
        if any(term in desc_lower for term in ["sewage", "foul", "stink", "overflow", "manhole", "septic"]):
            priority = "Critical"
            reasoning = "Backed-up sewage or overflowing waste in residential areas represents an immediate bio-hazard and public disease vector, necessitating emergency 12-hour resolution."
            eta = "12 Hours"
        else:
            priority = "High"
            reasoning = "Public sanitation reports are prioritized to limit spread of odors and contamination near footpaths."
            eta = "24 Hours"
            
    elif category == "Water Supply":
        if any(term in desc_lower for term in ["burst", "flood", "massive", "gushing", "main line"]):
            priority = "High"
            reasoning = "Large scale potable water pipeline rupture causing localized flooding and water pressure depletion across wards."
            eta = "24 Hours"
        elif "no water" in desc_lower or "dry" in desc_lower:
            priority = "High"
            reasoning = "Complete loss of water supply in residential blocks requires rapid inspection of line valves."
            eta = "24 Hours"
            
    elif category == "Electricity":
        if any(term in desc_lower for term in ["spark", "fire", "hanging", "wire", "shock", "current"]):
            priority = "Critical"
            reasoning = "Live spark discharge or hanging wire represents an active electrocution and structural fire hazard."
            eta = "12 Hours"
        else:
            priority = "Medium"
            reasoning = "Fused streetlight fixtures or bulb replacement request, slotted into standard electrical maintenance queue."
            eta = "48 Hours"
            
    elif category == "Roads/Potholes":
        if any(term in desc_lower for term in ["accident", "crashed", "craters", "huge pothole", "rims"]):
            priority = "High"
            reasoning = "Dangerous potholes positioned along high-speed corridors posing immediate vehicle damage and motorist safety threats."
            eta = "24 Hours"
        else:
            priority = "Medium"
            reasoning = "Standard road distress reported. Scheduled for asphalt patching batch work."
            eta = "48 Hours"
            
    elif category == "Public Health":
        if any(term in desc_lower for term in ["dengue", "mosquitoes", "mosquito", "malaria"]):
            priority = "High"
            reasoning = "Mosquito breeding triggers disease vector warnings, requiring urgent mosquito fogging and pesticide spraying."
            eta = "24 Hours"
        elif "dog" in desc_lower or "bite" in desc_lower:
            priority = "High"
            reasoning = "Aggressive stray dogs reported near community zones. Routed to veterinary health dispatch."
            eta = "24 Hours"

    return {
        "priority": priority,
        "priority_reasoning": reasoning,
        "resolution_time": eta,
        "officer_recommendation": officer
    }
