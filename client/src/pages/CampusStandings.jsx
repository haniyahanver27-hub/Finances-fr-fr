import { useMemo } from 'react';
import { BookOpen, Crown, Gem, Trophy, Vote, Waves } from 'lucide-react';
import { badgeCatalog, leaderboard } from '../data/demoContent';

const iconMap = { BookOpen, Crown, Gem, Trophy, Vote, Waves };

const CampusStandings = ({ portfolio, profile }) => {
  const clanValue = useMemo(() => portfolio.cash + portfolio.positions.reduce((total, position) => (
    total + position.quantity * position.avgPrice
  ), 0), [portfolio]);

  const rows = leaderboard.map((row) => (
    row.clan === 'Demo Alpha Clan'
      ? { ...row, returnPct: Number(((clanValue - 100000) / 100000 * 100).toFixed(1)) }
      : row
  )).sort((a, b) => b.returnPct - a.returnPct);

  return (
    <div className="standings-page animate-slide-up">
      <header className="page-heading">
        <div>
          <p className="eyebrow">Campus Arena</p>
          <h2>Standings</h2>
        </div>
        <span className="delay-pill">refreshes every 60s</span>
      </header>

      <section className="leaderboard-list">
        {rows.map((row, index) => (
          <article key={row.clan} className={row.clan === profile?.clans?.name ? 'rank-row current' : 'rank-row'}>
            <div className="rank-number">#{index + 1}</div>
            <div className="rank-main">
              <strong>{row.clan}</strong>
              <span>{row.campus}</span>
            </div>
            <div className={row.returnPct >= 0 ? 'rank-return positive' : 'rank-return negative'}>
              {row.returnPct >= 0 ? '+' : ''}{row.returnPct}%
            </div>
          </article>
        ))}
      </section>

      <section className="badge-grid" aria-label="Badges">
        {badgeCatalog.map((badge, index) => {
          const Icon = iconMap[badge.icon] || Trophy;
          const earned = index < 2 || portfolio.trades.length > 0;
          return (
            <article key={badge.name} className={earned ? 'badge-card earned' : 'badge-card'}>
              <Icon size={22} />
              <strong>{badge.name}</strong>
              <span>{badge.description}</span>
            </article>
          );
        })}
      </section>
    </div>
  );
};

export default CampusStandings;
