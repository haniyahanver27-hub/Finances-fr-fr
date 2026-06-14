import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';

const MarketFloorPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedStock, setSelectedStock] = useState(null);
  const [stockData, setStockData] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch (err) {
      console.error('Search failed:', err);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectStock = async (symbol) => {
    setSelectedStock(symbol);
    setLoading(true);
    try {
      const res = await fetch(`/api/stocks/quote/${symbol}`);
      const data = await res.json();
      setStockData(data);
      setSearchResults([]);
      setSearchQuery('');
    } catch (err) {
      console.error('Failed to fetch quote:', err);
      setStockData(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <h2>Market Floor</h2>
      <div className="glass-panel" style={{padding: 'var(--space-md)', marginTop: 'var(--space-md)'}}>
        <p className="text-muted" style={{fontSize: '0.875rem', marginBottom: 'var(--space-md)'}}>
          📉 Market data is delayed by 15 minutes (free tier)
        </p>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
          <input 
            type="text" 
            placeholder="Search for a ticker symbol (e.g. AAPL)" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 1 }}
          />
          <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem' }}>
            <Search size={20} />
          </button>
        </form>

        {searchResults.length > 0 && (
          <div style={{ marginBottom: 'var(--space-md)' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: 'var(--space-sm)' }}>
              Search Results:
            </div>
            {searchResults.map(result => (
              <div 
                key={result.symbol} 
                className="glass-panel"
                onClick={() => handleSelectStock(result.symbol)}
                style={{ 
                  padding: 'var(--space-sm)', 
                  marginBottom: 'var(--space-sm)',
                  cursor: 'pointer',
                  border: '1px solid var(--accent-cyan)',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>
                  {result.symbol} - {result.description}
                </div>
              </div>
            ))}
          </div>
        )}

        {stockData && (
          <div className="glass-panel" style={{ padding: 'var(--space-lg)', marginTop: 'var(--space-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-md)' }}>
              <div>
                <h3 style={{ margin: 0, marginBottom: '0.5rem' }}>{selectedStock}</h3>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  {stockData.name || 'Stock Data'}
                </div>
              </div>
              <button 
                className="btn btn-secondary"
                onClick={() => setSelectedStock(null)}
                style={{ fontSize: '0.8rem', padding: '0.4rem' }}
              >
                Clear
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Current Price</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--accent-cyan)' }}>
                  ${stockData.c?.toFixed(2) || 'N/A'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Daily Change</div>
                <div style={{ 
                  fontSize: '1.5rem', 
                  fontWeight: 'bold',
                  color: (stockData.d || 0) >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'
                }}>
                  {((stockData.d || 0) >= 0 ? '+' : '')}{stockData.d?.toFixed(2) || '0.00'} ({stockData.dp?.toFixed(2) || '0.00'}%)
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>High</div>
                <div style={{ fontSize: '1rem' }}>${stockData.h?.toFixed(2) || 'N/A'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Low</div>
                <div style={{ fontSize: '1rem' }}>${stockData.l?.toFixed(2) || 'N/A'}</div>
              </div>
            </div>
          </div>
        )}

        {!selectedStock && !searchResults.length && (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 'var(--space-lg)' }}>
            Search for a ticker to see live quotes
          </div>
        )}
      </div>
    </div>
  );
};

export default MarketFloorPage;
