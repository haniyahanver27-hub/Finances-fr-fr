import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const CampusStandings = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [userBadges, setUserBadges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        // Fetch clan snapshots for leaderboard
        const { data: snapshots } = await supabase
          .from('clan_snapshots')
          .select('clan_id, total_value, daily_return_pct, clans(name)')
          .order('total_value', { ascending: false })
          .limit(10);

        if (snapshots) {
          setLeaderboard(snapshots);
        }

        // Fetch user badges
        const session = await supabase.auth.getSession();
        if (session?.data?.session?.user?.id) {
          const { data: badges } = await supabase
            .from('user_badges')
            .select('badges(name, icon, description)')
            .eq('user_id', session.data.session.user.id);

          if (badges) {
            setUserBadges(badges.map(b => b.badges));
          }
        }
      } catch (err) {
        console.error('Failed to fetch leaderboard:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  return (
    <div className="animate-slide-up">
      <h2>Campus Standings</h2>
      
      <div className="glass-panel" style={{padding: 'var(--space-md)', marginTop: 'var(--space-md)'}}>
        <h3 style={{marginBottom: 'var(--space-sm)'}}>🏆 Leaderboard</h3>
        <p className="text-muted" style={{ marginBottom: 'var(--space-md)' }}>Tracking all clans across campus</p>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-lg)', color: 'var(--text-secondary)' }}>
            Loading leaderboard...
          </div>
        ) : leaderboard.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {leaderboard.map((clan, idx) => (
              <div 
                key={clan.clan_id} 
                className="glass-panel"
                style={{
                  padding: 'var(--space-md)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-md)',
                  borderLeft: `3px solid ${
                    idx === 0 ? 'var(--accent-yellow)' :
                    idx === 1 ? 'var(--accent-cyan)' :
                    idx === 2 ? '#cd7f32' :
                    'var(--glass-border)'
                  }`
                }}
              >
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', minWidth: '40px' }}>
                  {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>
                    {clan.clans?.name || 'Unknown Clan'}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Portfolio: ${(clan.total_value || 100000).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ 
                    fontSize: '1rem', 
                    fontWeight: 'bold',
                    color: (clan.daily_return_pct || 0) >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'
                  }}>
                    {((clan.daily_return_pct || 0) >= 0 ? '+' : '')}{(clan.daily_return_pct || 0).toFixed(2)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 'var(--space-lg)', color: 'var(--text-secondary)' }}>
            No clans on leaderboard yet
          </div>
        )}
      </div>
      
      <div className="glass-panel" style={{padding: 'var(--space-md)', marginTop: 'var(--space-lg)'}}>
        <h3 style={{marginBottom: 'var(--space-sm)'}}>👑 Your Badges</h3>
        <div style={{display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap'}}>
          {userBadges.length > 0 ? (
            userBadges.map((badge, i) => (
              <div 
                key={i}
                className="glass-panel"
                style={{ 
                  padding: 'var(--space-md)', 
                  textAlign: 'center',
                  minWidth: '100px',
                  transition: 'all 0.3s'
                }}
              >
                <div style={{fontSize: '2rem', marginBottom: '0.5rem'}}>
                  {badge.icon}
                </div>
                <div style={{fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '0.25rem'}}>
                  {badge.name}
                </div>
                <div style={{fontSize: '0.65rem', color: 'var(--text-secondary)'}}>
                  {badge.description}
                </div>
              </div>
            ))
          ) : (
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Keep trading to earn badges! 🚀
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CampusStandings;
