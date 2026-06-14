import MoneyRain from '../components/MoneyRain';

const AboutPage = ({ onNavigateToChat }) => {
  return (
    <div className="about-page animate-fade-in">
      <MoneyRain />
      
      <div className="money-bill bill-one" aria-hidden="true">$</div>
      <div className="money-bill bill-two" aria-hidden="true">$</div>
      <div className="money-bill bill-three" aria-hidden="true">$</div>

      <h1 className="text-center" style={{marginTop: '2rem'}}>PROJECT ALPHA</h1>
      <p className="text-center text-muted" style={{marginBottom: '2rem'}}>Gamified Social Investing</p>
      
      <div className="glass-panel" style={{padding: 'var(--space-xl)', textAlign: 'center'}}>
        <h2>Welcome to PROJECT ALPHA</h2>
        <p style={{marginTop: 'var(--space-md)'}}>
          A gamified, social-first paper trading application where you learn stock market investing through peer collaboration.
        </p>
        <p style={{marginTop: 'var(--space-md)', fontSize: '0.9rem', color: 'var(--text-secondary)'}}>
          Form a clan, vote on trades, compete on the leaderboard, and master the market with your crew.
        </p>
        <button 
          className="btn btn-primary" 
          onClick={onNavigateToChat}
          style={{marginTop: 'var(--space-xl)'}}
        >
          Get Started
        </button>
      </div>
    </div>
  );
};

export default AboutPage;
