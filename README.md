EstateMind AI – Smart Real Estate Insight Platform

A comprehensive AI-powered real estate analytics platform that provides price prediction and time series market forecasting across regions using Machine Learning and Prophet models.
Built with FastAPI, React, scikit-learn, and Prophet, the platform combines predictive modeling with intuitive visual dashboards.

📌 Features
🏡 Price Prediction

Predict real estate prices based on:

Location

City

BHK

Total Area

Price per SQFT

Bathrooms

Balcony

Model: BaggingRegressor (Decision Tree base estimators)
File: real_estate_pipeline_v20250915_182141.joblib

📈 Time Series Forecasting

Single Region Market Forecast

Multi-Region Forecast Comparison

Historical Trend Analysis & Market Insights

Confidence Interval Visualization

Forecast Horizon: 1–36 months
Model: Prophet
File: all_region_models.joblib

🎨 Visualization

Interactive charts (Recharts)

Forecast vs. Actual graphs

Confidence intervals

Mobile-friendly responsive UI

🛠 Technology Stack
Backend

FastAPI (0.104+)

scikit-learn (1.7.1)

Prophet (1.1.0+)

pandas, numpy, joblib

uv (Python package manager)

Server: Uvicorn

Frontend

React 18

Recharts

React Icons

Fetch API

Create React App

📂 Project Structure
EstateMind-AI-Smart-Real-Estate-Insight-Platform/
│
├── backend/
│   ├── main.py
│   ├── feature_engineering.py
│   ├── pyproject.toml
│   └── README.md
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── PriceForecasting.js
│   │   │   └── PricePrediction.js
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
│
├── Models/
│   ├── real_estate_pipeline.joblib
│   └── all_region_models.joblib
│
├── Notebooks/
│   ├── Feature Engineering & Training
│   ├── Time Series Forecasting
│   ├── EDA Notebooks
│
├── LICENSE
└── README.md

🚀 Installation & Setup
1️⃣ Clone the Repository
git clone https://github.com/roysarvesh/EstateMind-AI-Smart-Real-Estate-Insight-Platform.git
cd EstateMind-AI-Smart-Real-Estate-Insight-Platform

🖥 Backend Setup
Install uv

Windows:

powershell -c "irm https://astral.sh/uv/install.ps1 | iex"


macOS/Linux:

curl -LsSf https://astral.sh/uv/install.sh | sh

Install Dependencies
cd backend
uv sync

Run Backend
uv run uvicorn main:app --reload --host 127.0.0.1 --port 8000

🌐 Frontend Setup
cd frontend
npm install
npm start


Frontend URL:

http://localhost:3000


Backend URL:

http://127.0.0.1:8000

📊 Models
Price Prediction Model

BaggingRegressor

Features: Location, City, BHK, Area, Price/SQFT, Bathrooms, Balcony

File: real_estate_pipeline_v20250915_182141.joblib

Prophet Time Series Models

50+ US regions

Forecast horizon: 36 months

File: all_region_models.joblib

📄 License

This project is licensed under the MIT License.

👌 README is ready.

Now follow these steps to fix your Git conflict:
