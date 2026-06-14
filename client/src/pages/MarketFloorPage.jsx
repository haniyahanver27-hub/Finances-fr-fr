import { useMemo, useState } from 'react';
import { Search, TrendingDown, TrendingUp } from 'lucide-react';

const MarketFloorPage = ({ portfolio, watchlist }) => {
  const [query, setQuery] = useState('');

  const filteredStocks = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return watchlist;
    return watchlist.filter((stock) => (
      stock.symbol.toLowerCase().includes(normalized) ||
      stock.name.toLowerCase().includes(normalized)
    ));
  }, [query, watchlist]);

  const heldSymbols = new Set(portfolio.positions.map((position) => position.symbol));

  const sparklinePath = (points) => {
    const step = 96 / Math.max(points.length - 1, 1);
    return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${index * step} ${60 - point}`).join(' ');
  };

  return (
    <div className="market-page animate-fade-in">
      <header className="page-heading">
        <div>
          <p className="eyebrow">Market Floor</p>
          <h2>Watchlist</h2>
        </div>
        <span className="delay-pill">15 min delay</span>
      </header>

      <label className="search-shell">
        <Search size={18} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search ticker or company" />
      </label>

      <div className="watchlist">
        {filteredStocks.map((stock) => {
          const isUp = stock.change >= 0;
          return (
            <article key={stock.symbol} className="stock-row">
              <div className="ticker-lockup">
                <strong>{stock.symbol}</strong>
                <span>{stock.name}</span>
              </div>

              <svg className="sparkline" viewBox="0 0 100 64" role="img" aria-label={`${stock.symbol} trend`}>
                <path d={sparklinePath(stock.points)} style={{ stroke: stock.theme }} />
              </svg>

              <div className="stock-price">
                <strong>${stock.price.toFixed(2)}</strong>
                <span className={isUp ? 'positive' : 'negative'}>
                  {isUp ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
                  {isUp ? '+' : ''}{stock.change}%
                </span>
              </div>

              <div className={heldSymbols.has(stock.symbol) ? 'holding-chip active' : 'holding-chip'}>
                {heldSymbols.has(stock.symbol) ? 'Held' : 'Scout'}
              </div>
            </article>
          );
        })}
        {!filteredStocks.length && <div className="empty-state">No stocks match that search.</div>}
      </div>
    </div>
  );
};

export default MarketFloorPage;
