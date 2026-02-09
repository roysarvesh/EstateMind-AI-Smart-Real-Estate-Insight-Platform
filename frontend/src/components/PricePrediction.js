import React, { useState } from 'react';
import { FaHome, FaBath, FaRulerCombined, FaMapMarkerAlt, FaBuilding, FaRupeeSign, FaMoneyBillWave } from 'react-icons/fa';

const PricePrediction = () => {
  const [propertyTitle, setPropertyTitle] = useState('');
  const [location, setLocation] = useState('');
  const [totalArea, setTotalArea] = useState(1200);
  const [baths, setBaths] = useState(2);
  const [balcony, setBalcony] = useState('Yes');
  const [predictionResult, setPredictionResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Extract BHK from property title
  const extractBHK = (title) => {
    const match = title.match(/(\d+)\s*BHK/i);
    return match ? parseInt(match[1]) : null;
  };

  // Extract property type from title
  const extractPropertyType = (title) => {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('independent house')) return 'Independent House';
    if (lowerTitle.includes('flat')) return 'Flat';
    if (lowerTitle.includes('villa')) return 'Villa';
    return 'Other';
  };

  // Extract city from location
  const extractCity = (location) => {
    const parts = location.split(',');
    return parts[parts.length - 1].trim();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setPredictionResult(null);

    // Extract BHK from property title
    const bhk = extractBHK(propertyTitle) || 2;

    // Prepare data matching your backend's PriceRequest model
    const requestData = {
      Location: location,
      City: location.split(',').pop()?.trim() || 'Unknown', // Extract city from location
      BHK: bhk,
      Total_Area: parseFloat(totalArea),
      Price_per_SQFT: 5000, // You may want to add this as an input field
      Bathroom: parseInt(baths),
      Balcony: balcony === 'Yes'
    };

    try {
      const response = await fetch('http://127.0.0.1:8000/predict_price', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Error: ${response.status}`);
      }

      const data = await response.json();
      setPredictionResult(data);
    } catch (err) {
      setError(err.message || 'Failed to get prediction');
      console.error('Prediction error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const bhk = extractBHK(propertyTitle);
  const propertyType = extractPropertyType(propertyTitle);

  return (
    <div className="price-prediction">
      <h2><FaHome /> House Price Prediction</h2>
      
      <div className="form-description">
        <p>Enter the property details below to get the predicted price</p>
      </div>
      
      <form onSubmit={handleSubmit} className="prediction-form">
        <div className="form-row">
          <div className="form-column">
            <h3><FaBuilding /> Property Details</h3>
            
            <div className="form-group">
              <label htmlFor="propertyTitle"><FaHome /> Property Title *</label>
              <input
                type="text"
                id="propertyTitle"
                value={propertyTitle}
                onChange={(e) => setPropertyTitle(e.target.value)}
                placeholder="e.g., 2 BHK Flat in Andheri"
                className="animated-input"
              />
              <small>Enter the property type including BHK information</small>
            </div>
            
            <div className="form-group">
              <label htmlFor="location"><FaMapMarkerAlt /> Location *</label>
              <input
                type="text"
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Andheri, Mumbai"
                className="animated-input"
              />
              <small>Enter location in format: Area, City</small>
            </div>
            
            <div className="form-group">
              <label htmlFor="totalArea"><FaRulerCombined /> Total Area (sq ft)</label>
              <input
                type="number"
                id="totalArea"
                min="100"
                max="10000"
                value={totalArea}
                onChange={(e) => setTotalArea(parseInt(e.target.value) || 0)}
                className="animated-input"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="baths"><FaBath /> Number of Bathrooms</label>
              <input
                type="number"
                id="baths"
                min="1"
                max="10"
                value={baths}
                onChange={(e) => setBaths(parseInt(e.target.value) || 0)}
                className="animated-input"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="balcony">Balcony</label>
              <select
                id="balcony"
                value={balcony}
                onChange={(e) => setBalcony(e.target.value)}
                className="animated-input"
              >
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
            
            {propertyTitle && (
              <div className="extracted-info animated-card">
                <h3>📋 Extracted Information</h3>
                <div className="info-cards">
                  <div className="info-card">
                    <strong>PropertyParams Type:</strong> {propertyType}
                  </div>
                  {bhk ? (
                    <div className="info-card success">
                      <strong>BHK:</strong> {bhk} (extracted from title)
                    </div>
                  ) : (
                    <div className="info-card warning">
                      <strong>BHK:</strong> Not found in title
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="form-actions">
          <button 
            type="submit" 
            className="predict-button animated-button"
            disabled={isLoading}
          >
            {isLoading ? '🔮 Predicting...' : <><FaMoneyBillWave /> Predict Price</>}
          </button>
        </div>
      </form>
      
      {error && (
        <div className="error-message animated-error">
          {error}
        </div>
      )}
      
      {predictionResult && (
        <div className="prediction-result">
          <h3>Predicted Price</h3>
          <p className="price">₹{predictionResult.predicted_price.toFixed(2)} Lakhs</p>
          <p className="price-crores">(₹{predictionResult.predicted_price_crores.toFixed(2)} Crores)</p>
        </div>
      )}
    </div>
  );
};

export default PricePrediction;