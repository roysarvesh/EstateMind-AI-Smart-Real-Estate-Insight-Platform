from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import pandas as pd
import os
from typing import Dict, Optional

# -----------------------------------------------------
# Model Paths (AUTO-DETECT for Render & Local systems)
# -----------------------------------------------------

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

REAL_ESTATE_MODEL_PATH = os.path.join(
    BASE_DIR,
    "Models",
    "real_estate_pipeline_v20250915_182141.joblib"
)

TS_MODELS_PATH = os.path.join(
    BASE_DIR,
    "Models",
    "all_region_models.joblib"
)

# -----------------------------------------------------
# FastAPI Setup
# -----------------------------------------------------
app = FastAPI(title="EstateMind AI Backend API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # You can restrict to frontend domain later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------------------------------
# Load Models
# -----------------------------------------------------

# Prophet models for forecasting
try:
    ts_models = joblib.load(TS_MODELS_PATH)
except Exception as e:
    raise RuntimeError(f"Failed to load time series models: {str(e)}")


# ML Pipeline for price prediction
class RealEstatePredictor:
    def __init__(self, model_path: str):
        self.model_path = model_path
        self.pipeline = None

    def load_model(self):
        self.pipeline = joblib.load(self.model_path)

    def predict(self, property_data: Dict) -> float:
        if self.pipeline is None:
            self.load_model()

        df = pd.DataFrame([property_data])
        prediction = self.pipeline.predict(df)
        return float(prediction[0])


# Initialize Predictor
real_estate_predictor = RealEstatePredictor(REAL_ESTATE_MODEL_PATH)
real_estate_predictor.load_model()

# -----------------------------------------------------
# Request Models
# -----------------------------------------------------

class PriceRequest(BaseModel):
    Location: str
    City: str
    BHK: int
    Total_Area: float
    Price_per_SQFT: float
    Bathroom: int
    Balcony: Optional[int] = None


class ForecastRequest(BaseModel):
    region: str
    horizon: int


# -----------------------------------------------------
# API Endpoints
# -----------------------------------------------------

@app.get("/healthz")
def health_check():
    """Health check for Render."""
    return {"status": "ok"}


@app.post("/predict_price")
def predict_price(request: PriceRequest):
    try:
        property_data = request.dict()
        price = real_estate_predictor.predict(property_data)

        return {
            "property_data": property_data,
            "predicted_price": price,
            "predicted_price_crores": price / 100,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/forecast")
def forecast(request: ForecastRequest):
    try:
        if request.region not in ts_models:
            raise HTTPException(status_code=404, detail="Region not found")

        model = ts_models[request.region]

        # Some Prophet models saved as dicts
        if isinstance(model, dict):
            model = list(model.values())[0]

        historical_df = model.history.copy()
        historical_df = historical_df.rename(columns={"ds": "Month", "y": "Historical Price"})

        future = model.make_future_dataframe(periods=request.horizon, freq="ME")
        forecast = model.predict(future)

        last_training_date = model.history["ds"].max()

        forecasted_periods = forecast[forecast["ds"] > last_training_date].copy()
        forecasted_periods = forecasted_periods.rename(
            columns={
                "ds": "Month",
                "yhat": "Forecasted Price",
                "yhat_lower": "Lower Bound",
                "yhat_upper": "Upper Bound",
            }
        )

        return {
            "historical": historical_df[["Month", "Historical Price"]].to_dict(orient="records"),
            "forecast": forecasted_periods[
                ["Month", "Forecasted Price", "Lower Bound", "Upper Bound"]
            ].to_dict(orient="records"),
            "last_training_date": last_training_date.isoformat(),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/available_regions")
def available_regions():
    try:
        return {"regions": list(ts_models.keys())}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

