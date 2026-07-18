import math
import logging
from typing import List, Tuple, Dict
from app.config import settings

logger = logging.getLogger(__name__)

# Loader state
sentence_transformer_model = None
torch_available = False

try:
    import torch
    from sentence_transformers import SentenceTransformer, util
    torch_available = True
except ImportError:
    logger.warning("SentenceTransformers not installed. Running AI Duplicate Detector in pure-python TF-IDF fallback mode.")

def load_embedding_model():
    global sentence_transformer_model
    if not torch_available:
        return None
    
    if sentence_transformer_model is None:
        try:
            logger.info("Initializing SentenceTransformer model (all-MiniLM-L6-v2)...")
            sentence_transformer_model = SentenceTransformer(
                'all-MiniLM-L6-v2',
                cache_folder=settings.MODEL_CACHE_DIR
            )
            logger.info("SentenceTransformer model loaded successfully.")
        except Exception as e:
            logger.error(f"Error loading SentenceTransformer: {e}. Falling back to custom TF-IDF.")
            sentence_transformer_model = None
    return sentence_transformer_model

# --- Pure Python TF-IDF + Cosine Similarity Fallback ---
def tokenize(text: str) -> List[str]:
    # Extract lower alphanumeric words >= 3 chars
    return re_split_words(text.lower())

def re_split_words(text: str) -> List[str]:
    import re
    return re.findall(r'\b\w{3,}\b', text)

def compute_tf(tokens: List[str]) -> Dict[str, float]:
    tf = {}
    for token in tokens:
        tf[token] = tf.get(token, 0.0) + 1.0
    total = len(tokens) or 1.0
    return {k: v / total for k, v in tf.items()}

def compute_cosine_similarity(text1: str, text2: str) -> float:
    tokens1 = tokenize(text1)
    tokens2 = tokenize(text2)
    
    if not tokens1 or not tokens2:
        return 0.0
        
    tf1 = compute_tf(tokens1)
    tf2 = compute_tf(tokens2)
    
    # Vocabulary union
    vocab = set(tf1.keys()).union(set(tf2.keys()))
    
    dot_product = 0.0
    mag1 = 0.0
    mag2 = 0.0
    
    for term in vocab:
        val1 = tf1.get(term, 0.0)
        val2 = tf2.get(term, 0.0)
        dot_product += val1 * val2
        mag1 += val1 ** 2
        mag2 += val2 ** 2
        
    if mag1 == 0 or mag2 == 0:
        return 0.0
        
    return dot_product / (math.sqrt(mag1) * math.sqrt(mag2))

# --- Main Interface Functions ---
def check_for_duplicates(new_complaint_text: str, existing_complaints: List[Tuple[str, str]], threshold: float = 0.65) -> List[Tuple[str, float]]:
    """
    Compares the new complaint against a list of existing complaints (id, text).
    Returns a list of matching duplicates: [(complaint_id, similarity_score)]
    """
    if not existing_complaints:
        return []
        
    model = load_embedding_model()
    duplicates = []
    
    if model is not None:
        try:
            texts = [item[1] for item in existing_complaints]
            # Embed both new text and catalog
            new_emb = model.encode(new_complaint_text, convert_to_tensor=True)
            existing_embs = model.encode(texts, convert_to_tensor=True)
            
            # Compute cosine similarities
            cosine_scores = util.cos_sim(new_emb, existing_embs)[0]
            
            for idx, score in enumerate(cosine_scores):
                score_val = float(score.item())
                if score_val >= threshold:
                    comp_id = existing_complaints[idx][0]
                    duplicates.append((comp_id, score_val))
            
            # Sort by highest similarity
            duplicates.sort(key=lambda x: x[1], reverse=True)
            return duplicates
        except Exception as e:
            logger.warning(f"Error during SentenceTransformer embedding computation: {e}. Falling back to TF-IDF.")
            
    # TF-IDF Cosine Similarity Fallback
    for comp_id, text in existing_complaints:
        score = compute_cosine_similarity(new_complaint_text, text)
        if score >= threshold:
            duplicates.append((comp_id, score))
            
    duplicates.sort(key=lambda x: x[1], reverse=True)
    return duplicates
