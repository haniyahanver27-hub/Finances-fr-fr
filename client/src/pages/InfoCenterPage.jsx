const InfoCenterPage = () => {
  return (
    <div className="animate-fade-in">
      <h2>Info Center</h2>
      <div className="glass-panel" style={{padding: 'var(--space-md)', marginTop: 'var(--space-md)', textAlign: 'center'}}>
        <h3 style={{marginBottom: 'var(--space-sm)'}}>Block Blast: Financial Edition</h3>
        <p className="text-muted" style={{marginBottom: 'var(--space-xl)'}}>Clear lines to unlock market lessons!</p>
        
        <div style={{
          width: '240px', 
          height: '240px', 
          background: 'var(--bg-tertiary)', 
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(8, 1fr)',
          gap: '2px',
          border: '1px solid var(--glass-border)'
        }}>
          {/* Placeholder grid */}
          {Array.from({length: 64}).map((_, i) => (
            <div key={i} style={{background: 'var(--bg-secondary)'}}></div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default InfoCenterPage;
