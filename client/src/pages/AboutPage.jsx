import React from 'react';

const AboutPage = () => {
  return (
    <div className="animate-fade-in">
      <h1 className="text-center" style={{marginTop: '2rem'}}>Future Fortune Hack</h1>
      <p className="text-center text-muted" style={{marginBottom: '2rem'}}>Your Clan Awaits</p>
      
      <div className="glass-panel" style={{padding: 'var(--space-xl)', textAlign: 'center'}}>
        <h2>Welcome to Future Fortune Hack</h2>
        <p style={{marginTop: 'var(--space-md)'}}>
          A gamified, social-first paper trading application where you learn stock market investing through peer collaboration.
        </p>
        <button className="btn btn-primary" style={{marginTop: 'var(--space-xl)'}}>
          Get Started
        </button>
      </div>
    </div>
  );
};

export default AboutPage;
