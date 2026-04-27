from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
import numpy as np
import pandas as pd
from sklearn.neighbors import NearestNeighbors
from sklearn.linear_model import LinearRegression
from datetime import datetime, timedelta

app = FastAPI(title="Smart PG Finder - AI Microservice")

# --- Schemas ---
class UserPreferences(BaseModel):
    max_budget: float
    preferred_facilities_count: int
    importance_score: float # 0 to 1 scale of how much they value high ratings

class PgItem(BaseModel):
    id: str
    rent: float
    facilities_count: int
    pg_score: float

class RecommendRequest(BaseModel):
    preferences: UserPreferences
    available_pgs: List[PgItem]

class OccupancyHistory(BaseModel):
    days_ago: int
    occupants: int

class PredictOccupancyRequest(BaseModel):
    pg_id: str
    total_beds: int
    history: List[OccupancyHistory]

class FraudCheckRequest(BaseModel):
    name: str
    rent: float
    address: str
    city: str
    facilities: List[str]
    other_pgs: List[Dict[str, Any]] # To check for duplicates

class LifestyleProfile(BaseModel):
    sleep: int # 1-5
    clean: int # 1-5
    social: int # 1-5
    diet: int # 1-5
    music: int # 1-5
    smoker: bool

class RoommateMatchRequest(BaseModel):
    user_lifestyle: LifestyleProfile
    occupants_lifestyles: List[LifestyleProfile]

class ReviewSummaryRequest(BaseModel):
    reviews: List[str]

class ReviewSummaryResponse(BaseModel):
    pros: List[str]
    cons: List[str]
    sentiment_score: float # 0.0 to 1.0

class FloorOccupancy(BaseModel):
    floor_number: int
    total_beds: int
    occupied_beds: int
    upcoming_vacancies: int # beds where booking ends in < 14 days

class VacancyForecastRequest(BaseModel):
    pg_id: str
    floors: List[FloorOccupancy]

class VacancyForecastResponse(BaseModel):
    risk_level: str # Low, Moderate, High
    predicted_vacancies_next_month: int
    suggestion: str
    recommended_discount: int # percentage



# --- Endpoints ---
@app.get("/health")
def health_check():
    return {"status": "AI Model Server is active"}

@app.post("/recommend")
def recommend_pgs(req: RecommendRequest):
    """
    Smart recommendation engine using a weighted scoring system:
    - Hard budget filter: PGs over max_budget are excluded first
    - Rent score: Lower rent within budget = higher score
    - Facilities score: Match to requested facility count
    - PG Score: Weighted by importance_score
    Results sorted by match_score descending (best match first).
    """
    if not req.available_pgs:
        return {"recommendations": []}

    df = pd.DataFrame([pg.dict() for pg in req.available_pgs])
    
    max_budget = req.preferences.max_budget
    min_facilities = req.preferences.preferred_facilities_count
    importance = req.preferences.importance_score  # 0 = price matters most, 1 = quality matters most

    # ─── Step 1: Hard budget filter ───────────────────────────────────────────
    within_budget = df[df['rent'] <= max_budget].copy()
    over_budget = df[df['rent'] > max_budget].copy()
    
    # If nothing within budget, relax to show closest affordable options
    if within_budget.empty:
        within_budget = df.copy()

    # ─── Step 2: Weighted scoring (all components range 0-1) ──────────────────
    def score_pg(row):
        # Rent score: closer to budget (but cheaper) = better
        # e.g., budget=5000, rent=3000 => rent_score = 1.0
        #       budget=5000, rent=5000 => rent_score = 0.0 (at max)
        rent_range = max(max_budget, 1)
        rent_score = 1.0 - (row['rent'] / rent_range)  # lower rent = higher score
        rent_score = max(0.0, min(1.0, rent_score))

        # Facilities score: penalize if below requested count
        fac_diff = abs(row['facilities_count'] - min_facilities)
        fac_score = max(0.0, 1.0 - (fac_diff / max(min_facilities + 1, 5)))

        # PG Score (0-5 normalized to 0-1)
        quality_score = row['pg_score'] / 5.0

        # Weighted total: importance_score controls price-vs-quality tradeoff
        price_weight = 1.0 - importance
        quality_weight = importance

        total = (price_weight * rent_score) + \
                (quality_weight * quality_score) + \
                (0.3 * fac_score)  # facilities always matter somewhat

        return round(total, 4)

    within_budget['match_score'] = within_budget.apply(score_pg, axis=1)
    within_budget_sorted = within_budget.sort_values('match_score', ascending=False)

    # ─── Step 3: Build response (best matches first) ──────────────────────────
    recommendations = []
    for _, row in within_budget_sorted.iterrows():
        recommendations.append({
            "pg_id": row['id'],
            "match_distance": round(1.0 - row['match_score'], 4),  # lower = better
            "match_score": row['match_score']
        })

    # Optionally append over-budget PGs at the bottom (so UI can show them grayed out)
    for _, row in over_budget.sort_values('rent').iterrows():
        recommendations.append({
            "pg_id": row['id'],
            "match_distance": 999.0,  # sentinel: over budget
            "match_score": 0.0
        })

    return {"recommendations": recommendations}

@app.post("/predict-occupancy")
def predict_occupancy(req: PredictOccupancyRequest):
    """
    Given historical occupancy data, predict in how many days the PG will be 100% full.
    Uses Linear Regression.
    """
    if not req.history or len(req.history) < 2:
        # Not enough data, return naive fallback
        return {"predicted_full_date": "Insufficient data to predict", "days_until_full": -1}

    # Prepare data for regression
    # X = past days (negative integers, 0 means today)
    # y = occupants
    X = np.array([[-h.days_ago] for h in req.history])
    y = np.array([h.occupants for h in req.history])

    model = LinearRegression()
    model.fit(X, y)

    # The slope is the average new occupants per day
    slope = model.coef_[0]
    
    if slope <= 0:
        return {"predicted_full_date": "Never at current rate", "days_until_full": -1}

    # How many beds still empty?
    current_occupants = model.predict([[0]])[0] 
    empty_beds = req.total_beds - current_occupants

    if empty_beds <= 0:
         return {"predicted_full_date": "Already Full", "days_until_full": 0}

    # Calculate days
    days_until_full = empty_beds / slope
    
    # Cap to avoid absurd years in future
    if days_until_full > 365:
        return {"predicted_full_date": "Over 1 year", "days_until_full": 365}

    predicted_date = datetime.now() + timedelta(days=days_until_full)

    return {
        "predicted_full_date": predicted_date.strftime("%Y-%m-%d"),
        "days_until_full": round(days_until_full)
    }

@app.post("/detect-fraud")
def detect_fraud(req: FraudCheckRequest):
    """
    Detects suspicious PGs based on price/facility mismatch 
    (Too Good to be True) and duplicate listings.
    """
    is_suspicious = False
    reasons = []

    # 1. "Too Good To Be True" Check
    num_facilities = len(req.facilities)
    
    # Tiered logic: Low price with high facility count is suspicious
    if req.rent < 3000 and num_facilities > 5:
        is_suspicious = True
        reasons.append(f"Price is too low (₹{req.rent}) for {num_facilities} facilities. (Potential Fraud)")
    elif req.rent < 5000 and num_facilities > 8:
        is_suspicious = True
        reasons.append(f"Suspiciously high facility count ({num_facilities}) for budget price (₹{req.rent}).")
    elif req.rent < 8000 and num_facilities > 12:
        is_suspicious = True
        reasons.append("Premium facilities overkill for this price range. Possible misleading listing.")

    # 2. Duplicate Address Check
    # Simple check for identical address and city
    for pg in req.other_pgs:
        if (pg['address'].lower().strip() == req.address.lower().strip() and 
            pg['city'].lower().strip() == req.city.lower().strip()):
            is_suspicious = True
            reasons.append(f"Duplicate listing found: Address already registered as '{pg['name']}'.")
            break

    return {
        "is_suspicious": is_suspicious,
        "reasons": reasons
    }

    return {"scores": results}

@app.post("/summarize-reviews", response_model=ReviewSummaryResponse)
def summarize_reviews(req: ReviewSummaryRequest):
    """
    Analyzes review text to extract common Pros and Cons using keyword mapping.
    Calculates overall sentiment based on the ratio of positive to negative mentions.
    """
    if not req.reviews:
        return {"pros": [], "cons": [], "sentiment_score": 0.5}

    pos_keywords = {
        "wifi": ["wifi", "internet", "speed", "connected"],
        "food": ["food", "breakfast", "dinner", "meals", "tasty", "delicious", "mess"],
        "clean": ["clean", "hygiene", "tidy", "washed", "spotless"],
        "staff": ["staff", "owner", "friendly", "helpful", "kind", "support"],
        "location": ["location", "proximity", "near", "college", "accessible"],
        "value": ["value", "affordable", "cheap", "fair", "deposit"],
        "peaceful": ["peaceful", "quiet", "study", "calm"]
    }

    neg_keywords = {
        "noise": ["noise", "loud", "disturb", "construction", "noisy"],
        "price": ["expensive", "costly", "overpriced", "fee", "hidden"],
        "dirty": ["dirty", "messy", "smell", "pests", "washroom", "unhygienic"],
        "staff_rude": ["rude", "unprofessional", "ignored", "strict", "shouting"],
        "food_bad": ["bland", "oil", "food_bad", "quality", "tasteless"],
        "slow_fix": ["delay", "broken", "leak", "plumbing", "electrical"]
    }

    pro_counts = {k: 0 for k in pos_keywords}
    con_counts = {k: 0 for k in neg_keywords}
    
    total_pos = 0
    total_neg = 0

    for review in req.reviews:
        text = review.lower()
        for pro, keywords in pos_keywords.items():
            if any(k in text for k in keywords):
                pro_counts[pro] += 1
                total_pos += 1
        for con, keywords in neg_keywords.items():
            if any(k in text for k in keywords):
                con_counts[con] += 1
                total_neg += 1

    # Format lists: Pick items mentioned at least once
    # Better: Pick items mentioned in > 20% of reviews
    min_mention = max(1, len(req.reviews) * 0.15)
    
    final_pros = [k.capitalize() for k, v in pro_counts.items() if v >= min_mention]
    final_cons = [k.replace("_", " ").capitalize() for k, v in con_counts.items() if v >= min_mention]

    # Calculate Sentiment: (Positive / (Positive + Negative))
    # Default 0.5 if no keywords found
    sentiment = 0.5
    if (total_pos + total_neg) > 0:
        sentiment = total_pos / (total_pos + total_neg)

    return {
        "pros": final_pros[:5],   # Top 5 pros
        "cons": final_cons[:5],   # Top 5 cons
        "sentiment_score": round(sentiment, 2)
    }

@app.post("/vacancy-forecast", response_model=VacancyForecastResponse)
def vacancy_forecast(req: VacancyForecastRequest):
    """
    Predicts vacancy risk and suggests yield management strategies (discounts).
    """
    total_beds = sum(f.total_beds for f in req.floors)
    total_occupied = sum(f.occupied_beds for f in req.floors)
    total_upcoming = sum(f.upcoming_vacancies for f in req.floors)
    
    if total_beds == 0:
        return {"risk_level": "Low", "predicted_vacancies_next_month": 0, "suggestion": "Add beds to start tracking", "recommended_discount": 0}

    current_occupancy_rate = total_occupied / total_beds
    # Expected vacancy rate after upcoming departures
    # Note: in a real system we'd use Poisson distribution for new arrivals, but 
    # for this "Smart" feature we'll use a direct risk heuristic.
    future_occupancy_rate = (total_occupied - total_upcoming) / total_beds
    
    risk_level = "Low"
    recommended_discount = 0
    suggestion = "Everything looks stable. Maintain current pricing."

    if future_occupancy_rate < 0.6:
        risk_level = "High"
        recommended_discount = 15
        suggestion = f"Major vacancy risk detected. {total_upcoming} beds opening soon with low overall occupancy. Offer a 15% 'Early Bird' discount now."
    elif future_occupancy_rate < 0.85:
        risk_level = "Moderate"
        recommended_discount = 10
        suggestion = "Moderate vacancy expected. A 10% discount for the next 48 hours could help maintain 90%+ occupancy."
    elif total_upcoming > 0:
        risk_level = "Low"
        recommended_discount = 5
        suggestion = "Predicting minor vacancies. A 5% loyalty incentive for renewals might be effective."

    return {
        "risk_level": risk_level,
        "predicted_vacancies_next_month": total_upcoming + (total_beds - total_occupied),
        "suggestion": suggestion,
        "recommended_discount": recommended_discount
    }



if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
