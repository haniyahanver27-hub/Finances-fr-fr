const AboutPage = () => {
  return (
    <div className="about-page animate-fade-in">
      <div className="money-bill bill-one" aria-hidden="true">$</div>
      <div className="money-bill bill-two" aria-hidden="true">$</div>
      <div className="money-bill bill-three" aria-hidden="true">$</div>

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
