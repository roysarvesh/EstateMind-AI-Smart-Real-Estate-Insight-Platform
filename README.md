# RealtyAI - Smart Real Estate Insight Platform

A comprehensive AI-powered real estate analytics platform that provides price predictions and time series forecasting for various regions using Machine Learning and Prophet models.

## Table of Contents

- [Features](#features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Running the Application](#running-the-application)
- [Models](#models)
- [License](#license)

## Features

### Price Prediction
- Predict real estate prices based on property features
- Input parameters: Location, City, BHK, Total Area, Price per SQFT, Bathrooms, Balcony
- Uses BaggingRegressor ML pipeline for accurate predictions

### Time Series Forecasting
- Single Region Forecast: Detailed forecast with confidence intervals for one region
- Multi-Region Comparison: Compare forecasts across multiple regions
- Region Statistics: Historical data analysis and market insights
- Forecast horizon: 1-36 months
- Prophet-based forecasting models

### Visualization
- Interactive charts with Recharts
- Historical data vs. forecast comparison
- Confidence interval visualization
- Responsive design for all devices

## Technology Stack

### Backend
- Framework: FastAPI 0.104.0+
- ML Libraries: 
  - scikit-learn 1.7.1
  - Prophet 1.1.0+
  - pandas 2.0.0+
  - numpy 1.24.0+
- Model Serialization: joblib 1.3.0+
- Server: Uvicorn (with standard extras)

### Frontend
- Framework: React 18
- Charts: Recharts
- Icons: React Icons (Font Awesome)
- HTTP Client: Fetch API
- Build Tool: Create React App

### Package Management
- Backend: uv (Astral's fast Python package installer)
- Frontend: npm/yarn

## Project Structure

```
RealtyAI_Infosys_Internship_Aug2025/
│
├── backend/
│   ├── main.py                    # FastAPI application
│   ├── feature_engineering.py     # Feature engineering transformer
│   ├── pyproject.toml            # uv dependencies
│   └── README.md                 # Backend documentation
│
├── frontend/
│   ├── public/
│   │   ├── index.html
│   │   └── manifest.json
│   ├── src/
│   │   ├── components/
│   │   │   ├── PriceForecasting.js   # Time series forecasting UI
│   │   │   └── PricePrediction.js    # Price prediction UI
│   │   ├── App.js
│   │   ├── App.css
│   │   ├── index.js
│   │   └── index.css
│   ├── package.json
│   └── README.md
│
├── Models/
│   ├── real_estate_pipeline_v20250915_182141.joblib   # Price prediction model
│   └── all_region_models.joblib                        # Prophet time series models
│
├── Notebooks/
│   ├── RealEstate_Feature_Engineering_and_training.ipynb
│   ├── Time_Series_Fore_Casting.ipynb
│   ├── EDA_price_prediction.ipynb
│   └── ... (other analysis notebooks)
│
├── AI Project_ RealtyAI Smart Real Estate Insight Platform.pdf
├── LICENSE
└── README.md                      # This file
```

## Prerequisites

Before you begin, ensure you have the following installed:

### System Requirements
- Operating System: Windows 10/11, macOS, or Linux
- Python: 3.10 or higher (required for scikit-learn 1.7.1)
- Node.js: 16.x or higher
- npm: 8.x or higher (comes with Node.js)

### Package Managers
- uv: Fast Python package installer ([Installation Guide](https://github.com/astral-sh/uv))
- npm/yarn: For frontend dependencies

## Installation & Setup

### Step 1: Clone the Repository

```bash
cd d:\dev\test\internship
git clone https://github.com/AabidMK/RealtyAI_Infosys_Internship_Aug2025.git
cd RealtyAI_Infosys_Internship_Aug2025
```

### Step 2: Backend Setup

#### 2.1 Install uv (Python Package Manager)

**For Windows:**
```powershell
# Download and run the installer
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
```

**For macOS/Linux:**
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

Verify installation:
```bash
uv --version
```

#### 2.2 Install Backend Dependencies

```bash
cd backend
uv sync
```

This will install all required packages from `pyproject.toml`:
- FastAPI
- Uvicorn with standard extras
- scikit-learn 1.7.1 (exact version for model compatibility)
- Prophet
- pandas, numpy, joblib, pydantic

#### 2.3 Verify Model Files

Ensure the following model files exist in the `Models/` directory:
```
Models/
├── real_estate_pipeline_v20250915_182141.joblib
└── all_region_models.joblib
```

If missing, download from the project repository or train new models using the provided notebooks.

### Step 3: Frontend Setup

#### 3.1 Navigate to Frontend Directory

```bash
cd ../frontend
```

#### 3.2 Install Node Dependencies

```bash
npm install
```

This will install:
- React and React-DOM
- Recharts
- React Icons
- Other development dependencies

## Running the Application

### Start Backend Server

Open a terminal and run:

```bash
cd backend
uv run uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

**Expected Output:**
```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

Backend will be available at: **http://127.0.0.1:8000**

### Start Frontend Development Server

Open a **new terminal** and run:

```bash
cd frontend
npm start
```

**Expected Output:**
```
Compiled successfully!

You can now view frontend in the browser.

  Local:            http://localhost:3000
  On Your Network:  http://192.168.x.x:3000
```

Frontend will be available at: **http://localhost:3000**

## Models

### Price Prediction Model
- Algorithm: BaggingRegressor with Decision Tree base estimators
- Features: Location, City, BHK, Total_Area, Price_per_SQFT, Bathroom, Balcony
- Training Data: Real estate listings from multiple Indian cities
- File: `real_estate_pipeline_v20250915_182141.joblib`

### Time Series Forecasting Models
- Algorithm: Facebook Prophet
- Regions: 50+ US states/regions
- Training Period: 1996-2018 (historical ZHVI data)
- Forecast Capability: Up to 36 months ahead
- File: `all_region_models.joblib`

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.