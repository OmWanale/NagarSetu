import re
import logging
from app.config import settings

logger = logging.getLogger(__name__)

# Initialize local pipeline variable
classifier_pipeline = None
torch_available = False

try:
    import torch
    from transformers import pipeline
    torch_available = True
except ImportError:
    logger.warning("Torch/Transformers not installed. Running AI Classifier in high-fidelity regex/keyword fallback mode.")

def load_model():
    global classifier_pipeline
    if not torch_available:
        return None
    
    if classifier_pipeline is None:
        try:
            logger.info("Initializing local DistilBERT classification pipeline...")
            # We use a zero-shot classifier or a tiny finetuned model.
            # For demonstration, a standard text-classification pipeline on a lightweight model is ideal
            # Or we can lazy-download a tiny model like 'prajjwal1/bert-tiny' or 'distilbert-base-uncased'
            classifier_pipeline = pipeline(
                "zero-shot-classification",
                model="typeform/distilbert-base-uncased-mnli",
                device=-1, # Force CPU to avoid CUDA dependency issues
                model_kwargs={"cache_dir": settings.MODEL_CACHE_DIR}
            )
            logger.info("Local DistilBERT Zero-Shot classifier loaded successfully.")
        except Exception as e:
            logger.error(f"Error loading DistilBERT model: {e}. Falling back to rule-based classifier.")
            classifier_pipeline = None
    return classifier_pipeline

# Rich list of keyword matches for highly accurate fallback routing
MUNICIPAL_TAXONOMY = {
    "Sanitation": [
        r"sewage", r"drain", r"gutter", r"stink", r"smell", r"septic", r"overflowing manhole", 
        r"leakage of sewer", r"choked pipe", r"public toilet", r"foul odor", r"slum sanitation"
    ],
    "Water Supply": [
        r"water supply", r"leakage", r"pipeline", r"pipe burst", r"dry tap", r"no water", 
        r"muddy water", r"contamination", r"borewell", r"low pressure", r"water tanker", r"drinking water"
    ],
    "Roads/Potholes": [
        r"pothole", r"broken road", r"crater", r"speedbreaker", r"road repair", r"asphalt", 
        r"pavement", r"footpath", r"mud road", r"manhole cover missing", r"dug up road", r"tarring"
    ],
    "Electricity": [
        r"streetlight", r"street light", r"sparking", r"power cut", r"blackout", r"wire hanging", 
        r"broken pole", r"transformer spark", r"power fluctuation", r"high voltage", r"no power"
    ],
    "Public Health": [
        r"mosquito", r"dengue", r"malaria", r"stray dogs", r"dog bite", r"fogging", r"spraying", 
        r"epidemic", r"dead animal", r"medical waste", r"hospital hygiene"
    ],
    "Waste Management": [
        r"garbage", r"trash", r"litter", r"dustbin", r"waste collector", r"plastic pile", 
        r"sweeper", r"debris dumping", r"dry leaves", r"compost", r"solid waste"
    ]
}

def rule_based_classify(text: str) -> str:
    text_lower = text.lower()
    scores = {cat: 0 for cat in MUNICIPAL_TAXONOMY.keys()}
    
    for category, patterns in MUNICIPAL_TAXONOMY.items():
        for pattern in patterns:
            matches = len(re.findall(pattern, text_lower))
            scores[category] += matches * 2 # Give keyword direct matches high weight
            
            # Simple word overlap fallback
            words = pattern.split(' ')
            if len(words) > 1:
                word_matches = sum(1 for w in words if w in text_lower)
                scores[category] += word_matches * 0.5
                
    best_cat = max(scores, key=scores.get)
    if scores[best_cat] > 0:
        return best_cat
    
    # Default fallback based on common municipal patterns
    if "light" in text_lower or "wire" in text_lower:
        return "Electricity"
    if "water" in text_lower:
        return "Water Supply"
    if "road" in text_lower or "hole" in text_lower:
        return "Roads/Potholes"
    if "garbage" in text_lower or "waste" in text_lower:
        return "Waste Management"
        
    return "Sanitation" # Safe default

def classify_complaint(text: str) -> str:
    model = load_model()
    if model is not None:
        try:
            labels = list(MUNICIPAL_TAXONOMY.keys())
            result = model(text, candidate_labels=labels)
            predicted_label = result["labels"][0]
            # Verify confidence score > 0.4, otherwise double check with rules
            if result["scores"][0] > 0.4:
                return predicted_label
            else:
                rule_label = rule_based_classify(text)
                return rule_label
        except Exception as e:
            logger.warning(f"Error during transformer inference: {e}. Using rule fallback.")
            return rule_based_classify(text)
    else:
        return rule_based_classify(text)
