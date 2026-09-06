from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Dict, Any
import datetime
import predictor

router = APIRouter()

class PredictRequest(BaseModel):
    commodity: str
    state: str
    days_ahead: int = 7

@router.post("/")
async def get_prediction(req: PredictRequest, request: Request) -> Dict[str, Any]:
    db = request.app.state.db
    artifact = predictor.load_model()
    if not artifact:
        raise HTTPException(
            status_code=503,
            detail="Model not trained yet. Run 'python train.py' in the ml-service folder first."
        )

    # Query MongoDB for recent prices to calculate lag features
    records = list(db.dailyprices.find(
        {
            "commodity": {"$regex": req.commodity, "$options": "i"},
            "state": {"$regex": req.state, "$options": "i"},
        },
        {"modalPrice": 1, "arrivalDate": 1, "_id": 0}
    ).sort("arrivalDate", -1).limit(35))

    # Calculate lag features from real data
    prices = [r["modalPrice"] for r in records if r.get("modalPrice")]

    if len(prices) >= 7:
        lag_7 = prices[6]          # price 7 days ago
        lag_30 = prices[min(29, len(prices)-1)]  # price 30 days ago (or oldest)
        rolling_mean_7 = sum(prices[:7]) / 7
    elif len(prices) > 0:
        # Less than 7 data points — use what we have
        lag_7 = prices[-1]
        lag_30 = prices[-1]
        rolling_mean_7 = sum(prices) / len(prices)
    else:
        # No data in DB — cannot predict meaningfully
        raise HTTPException(
            status_code=404,
            detail=f"No price data found for {req.commodity} in {req.state}. Seed the database first."
        )

    target_date = datetime.datetime.now() + datetime.timedelta(days=req.days_ahead)

    try:
        result = predictor.predict_price(
            artifact=artifact,
            commodity=req.commodity,
            state=req.state,
            month=target_date.month,
            day_of_week=target_date.weekday(),
            day_of_year=target_date.timetuple().tm_yday,
            lag_7=lag_7,
            lag_30=lag_30,
            rolling_mean_7=rolling_mean_7
        )
        # Confidence decreases the further ahead we predict
        result['confidence'] = round(max(0.95 - (req.days_ahead * 0.02), 0.50), 2)
        result['input_summary'] = {
            'commodity': req.commodity,
            'state': req.state,
            'days_ahead': req.days_ahead,
            'data_points_used': len(prices),
            'latest_price': prices[0] if prices else None
        }
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/model/metrics")
async def get_model_metrics():
    artifact = predictor.load_model()
    if not artifact:
        raise HTTPException(status_code=503, detail="Model not trained yet. Run 'python train.py' first.")
    return {
        "metrics": artifact.get('metrics', {}),
        "model_type": "XGBoost Regressor",
        "features": artifact.get('feature_cols', []),
        "status": "trained"
    }
