import React from 'react';

const CampusStandings = () => {
  return (
    <div className="animate-slide-up">
      <h2>Campus Standings</h2>
      <div className="glass-panel" style={{padding: 'var(--space-md)', marginTop: 'var(--space-md)'}}>
        <h3 style={{marginBottom: 'var(--space-sm)'}}>Leaderboard</h3>
        <p className="text-muted">Tracking all clans across campus</p>
      </div>
      
      <div className="glass-panel" style={{padding: 'var(--space-md)', marginTop: 'var(--space-lg)'}}>
        <h3 style={{marginBottom: 'var(--space-sm)'}}>Your Badges</h3>
        <div style={{display: 'flex', gap: 'var(--space-sm)'}}>
          <span style={{fontSize: '2rem', opacity: 0.5}}>💎</span>
          <span style={{fontSize: '2rem', opacity: 0.5}}>👑</span>
          <span style={{fontSize: '2rem', opacity: 0.5}}>🐳</span>
        </div>
      </div>
    </div>
  );
};

export default CampusStandings;
