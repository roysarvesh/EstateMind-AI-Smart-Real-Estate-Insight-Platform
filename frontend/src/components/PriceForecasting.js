import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area } from 'recharts';
import { FaChartLine, FaGlobeAmericas, FaCalendarAlt, FaChartBar, FaInfoCircle, FaExchangeAlt, FaDatabase, FaTimes, FaPlus } from 'react-icons/fa';

const PriceForecasting = () => {
  const [selectedRegions, setSelectedRegions] = useState([]);
  const [forecastMonths, setForecastMonths] = useState(12); // Changed from forecastDays
  const [analysisType, setAnalysisType] = useState('single');
  const [forecastData, setForecastData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [availableRegions, setAvailableRegions] = useState([]);
  
  const [selectedRegionForStats, setSelectedRegionForStats] = useState('');
  const [newRegion, setNewRegion] = useState('');

  // Fetch available regions on component mount
  useEffect(() => {
    const fetchRegions = async () => {
      try {
        const response = await fetch('http://127.0.0.1:8000/available_regions');
        if (!response.ok) throw new Error('Failed to fetch regions');
        const data = await response.json();
        setAvailableRegions(data.regions);
      } catch (err) {
        setError(err.message);
        console.error('Error fetching regions:', err);
      }
    };
    fetchRegions();
  }, []);

  // Handle forecast request - UPDATED to support multi-region
  const handleForecast = async () => {
    if (selectedRegions.length === 0) {
      setError('Please select at least one region');
      return;
    }

    setIsLoading(true);
    setError('');
    setForecastData(null);

    try {
      if (analysisType === 'single') {
        // Single region forecast
        const region = selectedRegions[0];
        const horizon = forecastMonths;

        const response = await fetch('http://127.0.0.1:8000/forecast', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            region: region,
            horizon: horizon
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || `Error: ${response.status}`);
        }

        const data = await response.json();
        
        // Transform historical data
        const historicalData = data.historical.map(item => ({
          ds: item.Month,
          yhat: item['Historical Price'],
          isHistorical: true
        }));

        // Transform forecast data
        const forecastDataTransformed = data.forecast.map(item => ({
          ds: item.Month,
          yhat: item['Forecasted Price'],
          yhat_lower: item['Lower Bound'],
          yhat_upper: item['Upper Bound'],
          isForecast: true
        }));

        // Combine historical and forecast data
        const combinedData = [...historicalData, ...forecastDataTransformed];

        // Get date range
        const startDate = new Date(combinedData[0].ds);
        const endDate = new Date(combinedData[combinedData.length - 1].ds);
        const forecastStartDate = new Date(forecastDataTransformed[0].ds);

        setForecastData({
          type: 'single',
          region: region,
          data: combinedData,
          startDate: startDate,
          endDate: endDate,
          forecastStartDate: forecastStartDate
        });
      } else if (analysisType === 'comparison') {
        // Multi-region comparison
        const horizon = forecastMonths;
        
        // Fetch forecasts for all selected regions in parallel
        const promises = selectedRegions.map(region =>
          fetch('http://127.0.0.1:8000/forecast', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              region: region,
              horizon: horizon
            }),
          }).then(async (response) => {
            if (!response.ok) {
              throw new Error(`Failed to fetch ${region}`);
            }
            const data = await response.json();
            return { region, data };
          })
        );

        const results = await Promise.all(promises);
        
        // Transform data for comparison chart - KEEP SEPARATION
        const comparisonData = results.map(({ region, data }) => {
          // Mark historical data
          const historicalData = data.historical.map(item => ({
            ds: item.Month,
            yhat: item['Historical Price'],
            isHistorical: true
          }));
          
          // Mark forecast data
          const forecastData = data.forecast.map(item => ({
            ds: item.Month,
            yhat: item['Forecasted Price'],
            isForecast: true
          }));
          
          return {
            region: region,
            historicalData: historicalData,
            forecastData: forecastData,
            allData: [...historicalData, ...forecastData]
          };
        });

        setForecastData({
          type: 'comparison',
          data: comparisonData
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to get forecast');
      console.error('Forecast error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle region selection for single region
  const handleSingleRegionChange = (e) => {
    const region = e.target.value;
    if (region) {
      setSelectedRegions([region]);
    } else {
      setSelectedRegions([]);
    }
  };

  // Add a new region to the selection
  const addRegion = () => {
    if (newRegion && !selectedRegions.includes(newRegion)) {
      setSelectedRegions([...selectedRegions, newRegion]);
      setNewRegion('');
    }
  };

  // Remove a region from the selection
  const removeRegion = (regionToRemove) => {
    setSelectedRegions(selectedRegions.filter(region => region !== regionToRemove));
  };

  // Initialize with first region selected
  useEffect(() => {
    if (selectedRegions.length === 0 && availableRegions.length > 0) {
      setSelectedRegions([availableRegions[0]]);
      setSelectedRegionForStats(availableRegions[0]);
    }
  }, [availableRegions, selectedRegions.length]);

  // Get forecast summary for single region
  const getForecastSummary = (forecastData) => {
    if (!forecastData || forecastData.length === 0) return null;
    
    // Find the point where forecast begins
    const forecastStartIndex = forecastData.findIndex(d => d.isForecast);
    if (forecastStartIndex === -1) return null;
    
    const forecastStart = forecastData[forecastStartIndex];
    const forecastEnd = forecastData[forecastData.length - 1];
    
    if (!forecastStart || !forecastEnd) return null;
    
    const currentValue = forecastStart.yhat;
    const forecastEndValue = forecastEnd.yhat;
    const totalChange = forecastEndValue - currentValue;
    const percentChange = (totalChange / currentValue) * 100;
    
    return {
      current_value: currentValue,
      forecast_end_value: forecastEndValue,
      forecast_start_value: currentValue,
      total_change: totalChange,
      percent_change: percentChange,
      max_forecast: Math.max(...forecastData.slice(forecastStartIndex).map(d => d.yhat)),
      min_forecast: Math.min(...forecastData.slice(forecastStartIndex).map(d => d.yhat)),
      forecast_periods: forecastData.length - forecastStartIndex
    };
  };

  // Render single region forecast - FIXED VERSION
  const renderSingleForecast = () => {
    if (!forecastData || forecastData.type !== 'single') return null;
    
    const data = forecastData.data;
    if (!data || data.length === 0) return null;

    // Separate historical and forecast data for calculations
    const historicalData = data.filter(d => d.isHistorical);
    const forecastOnlyData = data.filter(d => d.isForecast);

    // Calculate summary stats (only for forecast period)
    const firstForecastValue = forecastOnlyData[0]?.yhat;
    const lastForecastValue = forecastOnlyData[forecastOnlyData.length - 1]?.yhat;
    const totalChange = lastForecastValue - firstForecastValue;
    const percentChange = (totalChange / firstForecastValue) * 100;
    const maxValue = Math.max(...forecastOnlyData.map(d => d.yhat));
    const minValue = Math.min(...forecastOnlyData.map(d => d.yhat));
    
    // Format date range
    const forecastStartFormatted = forecastData.forecastStartDate.toLocaleDateString('en-US', { 
      month: 'short', 
      year: 'numeric' 
    });
    const endDateFormatted = forecastData.endDate.toLocaleDateString('en-US', { 
      month: 'short', 
      year: 'numeric' 
    });
    
    // Create a unified dataset with separate columns for historical and forecast
    const chartData = data.map(item => ({
      ds: item.ds,
      historical: item.isHistorical ? item.yhat : null,
      forecast: item.isForecast ? item.yhat : null,
      yhat_lower: item.isForecast ? item.yhat_lower : null,
      yhat_upper: item.isForecast ? item.yhat_upper : null
    }));
    
    return (
      <div className="single-forecast animated-result">
        <h3><FaChartLine /> Forecast for {forecastData.region}</h3>
        <div className="forecast-date-range" style={{ 
          textAlign: 'center', 
          marginBottom: '10px', 
          color: '#64748b',
          fontSize: '14px'
        }}>
          <strong>Forecast Period:</strong> {forecastStartFormatted} to {endDateFormatted}
        </div>
        <div className="chart-container animated-card">
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
              <XAxis 
                dataKey="ds" 
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return `${date.getMonth()+1}/${date.getFullYear()}`;
                }}
                stroke="#64748b"
              />
              <YAxis 
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                stroke="#64748b"
              />
              <Tooltip 
                formatter={(value, name) => {
                  if (value === null) return null;
                  if (name === 'historical') return [`$${value.toLocaleString()}`, 'Historical'];
                  if (name === 'forecast') return [`$${value.toLocaleString()}`, 'Forecast'];
                  if (name === 'yhat_upper') return [`$${value.toLocaleString()}`, 'Upper Bound'];
                  if (name === 'yhat_lower') return [`$${value.toLocaleString()}`, 'Lower Bound'];
                  return [`$${value.toLocaleString()}`, name];
                }}
                labelFormatter={(value) => new Date(value).toLocaleDateString()}
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                  border: '1px solid #cbd5e1', 
                  borderRadius: '10px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend />
              
              {/* Confidence interval shading - render FIRST so it's behind the lines */}
              <Area
                type="monotone"
                dataKey="yhat_upper"
                stroke="none"
                fill="#ff8c00"
                fillOpacity={0.2}
                name="Upper Bound"
                connectNulls={false}
              />
              <Area
                type="monotone"
                dataKey="yhat_lower"
                stroke="none"
                fill="white"
                fillOpacity={1}
                name="Lower Bound"
                connectNulls={false}
              />
              
              {/* Historical data line - BLUE */}
              <Line 
                type="monotone" 
                dataKey="historical" 
                name="Historical" 
                stroke="#0ea5e9" 
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6 }}
                connectNulls={false}
              />
              
              {/* Forecast data line - ORANGE */}
              <Line 
                type="monotone" 
                dataKey="forecast" 
                name="Forecast" 
                stroke="#ff8c00" 
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6 }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="forecast-summary animated-card">
          <h4><FaInfoCircle /> Forecast Summary</h4>
          <div className="summary-cards">
            <div className="summary-card">
              <strong>Starting Price</strong>
              <span>${firstForecastValue.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
            </div>
            <div className="summary-card">
              <strong>Ending Price</strong>
              <span>${lastForecastValue.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
            </div>
            <div className="summary-card">
              <strong>Expected Change</strong>
              <span className={percentChange >= 0 ? 'positive' : 'negative'}>
                {percentChange.toFixed(1)}%
              </span>
            </div>
            <div className="summary-card">
              <strong>Forecast Period</strong>
              <span>{forecastOnlyData.length} months</span>
            </div>
          </div>
          
          <div className="insights animated-card">
            <h4><FaInfoCircle /> Key Insights</h4>
            {percentChange > 5 ? (
              <div className="insight positive">
                <strong>📈 Positive Trend</strong>: {forecastData.region} shows strong growth potential with {percentChange.toFixed(1)}% expected increase.
              </div>
            ) : percentChange < -5 ? (
              <div className="insight negative">
                <strong>📉 Declining Trend</strong>: {forecastData.region} shows declining values with {percentChange.toFixed(1)}% expected decrease.
              </div>
            ) : (
              <div className="insight neutral">
                <strong>📊 Stable Market</strong>: {forecastData.region} shows relatively stable values with {percentChange.toFixed(1)}% expected change.
              </div>
            )}
            <div className="insight info">
              <strong>Forecast Range</strong>: ${minValue.toLocaleString(undefined, {maximumFractionDigits: 0})} - ${maxValue.toLocaleString(undefined, {maximumFractionDigits: 0})}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render multi-region comparison - UPDATED with separate historical/forecast lines
  const renderComparisonForecast = () => {
    if (!forecastData || forecastData.type !== 'comparison') return null;
    
    // Merge all dates from all regions
    const allDates = new Set();
    forecastData.data.forEach(regionData => {
      regionData.allData.forEach(item => allDates.add(item.ds));
    });
    
    // Create unified dataset with separate historical and forecast columns per region
    const sortedDates = Array.from(allDates).sort();
    const chartData = sortedDates.map(date => {
      const dataPoint = { ds: date };
      
      forecastData.data.forEach(regionData => {
        // Check historical data
        const historicalItem = regionData.historicalData.find(d => d.ds === date);
        if (historicalItem) {
          dataPoint[`${regionData.region}_historical`] = historicalItem.yhat;
        }
        
        // Check forecast data
        const forecastItem = regionData.forecastData.find(d => d.ds === date);
        if (forecastItem) {
          dataPoint[`${regionData.region}_forecast`] = forecastItem.yhat;
        }
      });
      
      return dataPoint;
    });
    
    const baseColors = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    const forecastColors = ['#ff8c00', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#f472b6'];
    
    return (
      <div className="comparison-forecast animated-result">
        <h3><FaExchangeAlt /> Multi-Region Forecast Comparison</h3>
        <div className="chart-container animated-card">
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
              <XAxis 
                dataKey="ds"
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return `${date.getMonth()+1}/${date.getFullYear()}`;
                }}
                stroke="#64748b"
              />
              <YAxis 
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                stroke="#64748b"
              />
              <Tooltip 
                formatter={(value, name) => {
                  if (value === null) return null;
                  const displayName = name.replace('_historical', ' (Historical)').replace('_forecast', ' (Forecast)');
                  return [`$${value.toLocaleString()}`, displayName];
                }}
                labelFormatter={(value) => new Date(value).toLocaleDateString()}
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                  border: '1px solid #cbd5e1', 
                  borderRadius: '10px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend 
                formatter={(value) => value.replace('_historical', ' (Hist)').replace('_forecast', ' (Forecast)')}
              />
              
              {/* Render historical lines (solid) */}
              {forecastData.data.map((regionData, index) => (
                <Line 
                  key={`${regionData.region}_historical`}
                  type="monotone" 
                  dataKey={`${regionData.region}_historical`}
                  name={`${regionData.region}_historical`}
                  stroke={baseColors[index % baseColors.length]} 
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6 }}
                  connectNulls={false}
                />
              ))}
              
              {/* Render forecast lines (different color/style) */}
              {forecastData.data.map((regionData, index) => (
                <Line 
                  key={`${regionData.region}_forecast`}
                  type="monotone" 
                  dataKey={`${regionData.region}_forecast`}
                  name={`${regionData.region}_forecast`}
                  stroke={forecastColors[index % forecastColors.length]} 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  activeDot={{ r: 6 }}
                  connectNulls={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="comparison-table animated-card">
          <h4><FaChartBar /> Forecast Summary by Region</h4>
          <table>
            <thead>
              <tr>
                <th>Region</th>
                <th>Forecast Start</th>
                <th>Forecast End</th>
                <th>Change %</th>
                <th>Change $</th>
              </tr>
            </thead>
            <tbody>
              {forecastData.data.map(regionData => {
                if (!regionData.forecastData || regionData.forecastData.length === 0) return null;
                
                // First forecast value (forecast start)
                const startValue = regionData.forecastData[0].yhat;
                
                // Last forecast value (forecast end)
                const lastValue = regionData.forecastData[regionData.forecastData.length - 1].yhat;
                
                // Calculate change ONLY for forecast period
                const changePercent = ((lastValue - startValue) / startValue) * 100;
                const changeDollar = lastValue - startValue;
                
                return (
                  <tr key={regionData.region}>
                    <td>{regionData.region}</td>
                    <td>${startValue.toLocaleString(undefined, {maximumFractionDigits: 0})}</td>
                    <td>${lastValue.toLocaleString(undefined, {maximumFractionDigits: 0})}</td>
                    <td className={changePercent >= 0 ? 'positive' : 'negative'}>
                      {changePercent.toFixed(1)}%
                    </td>
                    <td className={changeDollar >= 0 ? 'positive' : 'negative'}>
                      {changeDollar >= 0 ? '+' : ''}${Math.abs(changeDollar).toLocaleString(undefined, {maximumFractionDigits: 0})}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Render region statistics
  const renderStatistics = () => {
    if (!forecastData || forecastData.type !== 'statistics') return null;
    
    return (
      <div className="statistics-forecast animated-result">
        <h3><FaDatabase /> Region Statistics & Analysis</h3>
        
        <div className="region-selector-stats animated-card">
          <label htmlFor="regionSelect"><FaGlobeAmericas /> Select Region for Detailed Analysis:</label>
          <select 
            id="regionSelect"
            value={selectedRegionForStats}
            onChange={(e) => setSelectedRegionForStats(e.target.value)}
          >
            {selectedRegions.map(region => (
              <option key={region} value={region}>{region}</option>
            ))}
          </select>
        </div>
        
        {selectedRegionForStats && (
          <div className="region-detail animated-card">
            {forecastData.data
              .filter(item => item.region === selectedRegionForStats)
              .map(item => (
                <div key={item.region}>
                  <h4><FaInfoCircle /> Statistics for {item.region}</h4>
                  <div className="summary-cards">
                    <div className="summary-card">
                      <strong>Total Records</strong>
                      <span>{item.total_records.toLocaleString()}</span>
                    </div>
                    <div className="summary-card">
                      <strong>Latest ZHVI</strong>
                      <span>${item.latest_zhvi.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                    </div>
                    <div className="summary-card">
                      <strong>Average ZHVI</strong>
                      <span>${item.zhvi_mean.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                    </div>
                    <div className="summary-card">
                      <strong>ZHVI Range</strong>
                      <span>${item.zhvi_min.toLocaleString(undefined, {maximumFractionDigits: 0})} - ${item.zhvi_max.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                    </div>
                  </div>
                  <div className="info-message">
                    <strong>Data Period</strong>: {item.date_range}
                  </div>
                </div>
              ))}
          </div>
        )}
        
        {selectedRegions.length > 1 && (
          <div className="comparison-table animated-card">
            <h4><FaExchangeAlt /> Quick Region Comparison</h4>
            <table>
              <thead>
                <tr>
                  <th>Region</th>
                  <th>Latest ZHVI</th>
                  <th>Average ZHVI</th>
                  <th>Records</th>
                </tr>
              </thead>
              <tbody>
                {forecastData.data
                  .filter(item => selectedRegions.includes(item.region))
                  .map(item => (
                    <tr key={item.region}>
                      <td>{item.region}</td>
                      <td>${item.latest_zhvi.toLocaleString(undefined, {maximumFractionDigits: 0})}</td>
                      <td>${item.zhvi_mean.toLocaleString(undefined, {maximumFractionDigits: 0})}</td>
                      <td>{item.total_records.toLocaleString()}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="price-forecasting">
      <h2><FaChartLine /> Price Forecasting</h2>
      
      <div className="form-description">
        <p>Select regions and configure parameters to generate price forecasts</p>
      </div>
      
      <div className="forecasting-controls animated-card">
        <div className="control-group">
          
          <div className="form-group">
            <label><FaGlobeAmericas /> Select Regions</label>
            {analysisType === 'single' ? (
              <select
                value={selectedRegions[0] || ''}
                onChange={handleSingleRegionChange}
                className="animated-input"
              >
                <option value="">Select a region</option>
                {availableRegions.map(region => (
                  <option key={region} value={region}>{region}</option>
                ))}
              </select>
            ) : (
              <div className="multi-region-selector">
                <div className="region-input-container">
                  <select
                    value={newRegion}
                    onChange={(e) => setNewRegion(e.target.value)}
                    className="region-select-input animated-input"
                  >
                    <option value="">Select a region to add</option>
                    {availableRegions
                      .filter(region => !selectedRegions.includes(region))
                      .map(region => (
                        <option key={region} value={region}>{region}</option>
                      ))}
                  </select>
                  <button 
                    onClick={addRegion} 
                    className="add-region-button animated-button"
                    disabled={!newRegion}
                  >
                    <FaPlus />
                  </button>
                </div>
                
                <div className="selected-regions">
                  {selectedRegions.map(region => (
                    <div key={region} className="region-tag animated-card">
                      <span className="region-name">{region}</span>
                      <button 
                        onClick={() => removeRegion(region)} 
                        className="remove-region-button"
                      >
                        <FaTimes />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* UPDATED: Change slider to months */}
          <div className="form-group">
            <label><FaCalendarAlt /> Forecast Period (Months)</label>
            <input
              type="range"
              min="1"
              max="36"
              value={forecastMonths}
              onChange={(e) => setForecastMonths(parseInt(e.target.value))}
              className="animated-input forecast-slider"
            />
            <div className="slider-value-container">
              <span className="slider-value">{forecastMonths} months</span>
            </div>
          </div>

          <div className="form-group">
            <label><FaChartBar /> Analysis Type</label>
            <select
              value={analysisType}
              onChange={(e) => setAnalysisType(e.target.value)}
              className="animated-input"
            >
              <option value="single">Single Region Forecast</option>
              <option value="comparison">Multi-Region Comparison</option>
              <option value="statistics">Region Statistics</option>
            </select>
          </div>

          <div className="form-actions">
            <button 
              className="forecast-button"
              onClick={handleForecast}
              disabled={isLoading || selectedRegions.length === 0}
            >
              {isLoading ? 'Generating Forecast...' : 'Generate Forecast'}
            </button>
          </div>
        </div>
      </div>
      
      {error && (
        <div className="error-message animated-error">
          {error}
        </div>
      )}
      
      <div className="forecast-results">
        {forecastData && (
          <>
            {forecastData.type === 'single' && renderSingleForecast()}
            {forecastData.type === 'comparison' && renderComparisonForecast()}
            {forecastData.type === 'statistics' && renderStatistics()}
          </>
        )}
      </div>
    </div>
  );
};

export default PriceForecasting;