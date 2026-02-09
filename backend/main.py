from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware 
from pydantic import BaseModel
import joblib
import pandas as pd
import os
from typing import Dict, Optional

# ----------------------------
# Model Paths
# ----------------------------
REAL_ESTATE_MODEL_DIR = r"D:\EstateMind AI- Smart Real Estate Insight Platform\Models\real_estate_pipeline_v20250915_182141.joblib"  # Directory for price models
TS_MODELS_PATH = r"D:\EstateMind AI- Smart Real Estate Insight Platform\Models\all_region_models.joblib"

# ----------------------------
# FastAPI Setup
# ----------------------------
app = FastAPI(title="Real Estate AI API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Load TS models
ts_models = joblib.load(TS_MODELS_PATH)

# Real Estate Predictor Class (from working code)
class RealEstatePredictor:
    def __init__(self, model_dir: str = REAL_ESTATE_MODEL_DIR):
        self.model_dir = model_dir
        self.pipeline = None

    def load_model(self):
        self.pipeline = joblib.load(REAL_ESTATE_MODEL_DIR)

    def predict(self, property_data: Dict) -> float:
        if self.pipeline is None:
            self.load_model()
        df = pd.DataFrame([property_data])
        prediction = self.pipeline.predict(df)
        return float(prediction[0])

# Initialize predictor
real_estate_predictor = RealEstatePredictor()
real_estate_predictor.load_model()

# ----------------------------
# Request Models 
# ----------------------------
class PriceRequest(BaseModel):
    Location: str
    City: str
    BHK: int
    Total_Area: float
    Price_per_SQFT: float
    Bathroom: int  
    Balcony: Optional[bool] = None  


class ForecastRequest(BaseModel):
    region: str
    horizon: int


# ----------------------------
# Routes
# ----------------------------
@app.post("/predict_price")
def predict_price(request: PriceRequest):
    try:
        property_data = request.dict()  # Direct dict conversion like working code
        price = real_estate_predictor.predict(property_data)
        return {
            "property_data": property_data,
            "predicted_price": price,
            "predicted_price_crores": price / 100  # Optional, from working code
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/forecast")
def forecast(request: ForecastRequest):
    try:
        if request.region not in ts_models:
            raise HTTPException(status_code=404, detail="Region not found")

        model = ts_models[request.region]
        if isinstance(model, dict):  # Handle dict inside dict case
            model = list(model.values())[0]

        historical_df = model.history.copy()
        historical_df = historical_df.rename(columns={"ds": "Month", "y": "Historical Price"})
        
        future = model.make_future_dataframe(periods=request.horizon, freq="ME")
        forecast = model.predict(future)
        
        last_training_date = model.history["ds"].max()
        
        forecasted_periods = forecast[forecast["ds"] > last_training_date].copy()
        forecasted_periods = forecasted_periods.rename(
            columns={"ds": "Month", "yhat": "Forecasted Price", 
                    "yhat_lower": "Lower Bound", "yhat_upper": "Upper Bound"}
        )
        
        return {
            "historical": historical_df[["Month", "Historical Price"]].to_dict(orient="records"),
            "forecast": forecasted_periods[["Month", "Forecasted Price", "Lower Bound", "Upper Bound"]].to_dict(orient="records"),
            "last_training_date": last_training_date.isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/available_regions")
def get_available_regions():
    try:
        regions = list(ts_models.keys())
        return {"regions": regions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
