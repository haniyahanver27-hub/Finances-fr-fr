import React from 'react';

const MarketFloorPage = () => {
  return (
    <div className="animate-fade-in">
      <h2>Market Floor</h2>
      <div className="glass-panel" style={{padding: 'var(--space-md)', marginTop: 'var(--space-md)'}}>
        <p className="text-muted" style={{fontSize: '0.875rem', marginBottom: 'var(--space-md)'}}>
          📉 Market data is delayed by 15 minutes (free tier)
        </p>
        <input type="text" placeholder="Search for a ticker symbol (e.g. AAPL)" />
      </div>
    </div>
  );
};

export default MarketFloorPage;
