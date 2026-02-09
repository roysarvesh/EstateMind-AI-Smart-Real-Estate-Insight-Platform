import React, { useState } from 'react';
import { FaHome, FaChartLine, FaCompass } from 'react-icons/fa';
import './App.css';
import PricePrediction from './components/PricePrediction';
import PriceForecasting from './components/PriceForecasting';

function App() {
  const [activeTab, setActiveTab] = useState('prediction');

  return (
    <div className="App">
      <header className="App-header">
        <h1 className="main-header">
          <span className="house-icon">
            <FaHome className="app-logo" />
          </span>
          House Price Prediction & Forecasting
        </h1>
      </header>
      
      <div className="navigation-container">
        <aside className="sidebar">
          <h3><FaCompass /> Navigation</h3>
          <button 
            className={activeTab === 'prediction' ? 'nav-button active' : 'nav-button'}
            onClick={() => setActiveTab('prediction')}
          >
            <span><FaHome /> Price Prediction</span>
          </button>
          <button 
            className={activeTab === 'forecasting' ? 'nav-button active' : 'nav-button'}
            onClick={() => setActiveTab('forecasting')}
          >
            <span><FaChartLine /> Price Forecasting</span>
          </button>
        </aside>
        
        <main className="main-content">
          <div className="tab-content active">
            {activeTab === 'prediction' ? (
              <div className="tab-panel">
                <PricePrediction />
              </div>
            ) : (
              <div className="tab-panel">
                <PriceForecasting />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;