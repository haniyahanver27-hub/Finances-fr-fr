import { useState } from 'react';
import { supabase } from '../supabaseClient';

const ClanSetup = ({ onClanJoined }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [clanName, setClanName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreateClan = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data: clanData, error: clanError } = await supabase
        .rpc('create_clan', { clan_name: clanName.trim() })
        .single();
      if (clanError) throw clanError;

      onClanJoined(clanData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinClan = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data: clan, error: joinError } = await supabase
        .rpc('join_clan', { invite_code_input: inviteCode.trim() })
        .single();
      if (joinError) throw joinError;

      onClanJoined(clan);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="glass-panel modal-content animate-slide-up">
        <h2 style={{ textAlign: 'center', marginBottom: 'var(--space-md)' }}>
          You need a Clan!
        </h2>
        <p className="text-muted" style={{ textAlign: 'center', marginBottom: 'var(--space-lg)' }}>
          Join an existing clan or start your own to begin paper trading.
        </p>
        
        {error && (
          <div style={{ color: 'var(--accent-red)', marginBottom: 'var(--space-md)', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
          <button 
            className={`btn ${!isCreating ? 'btn-primary' : 'btn-secondary'}`} 
            style={{ flex: 1 }}
            onClick={() => setIsCreating(false)}
          >
            Join
          </button>
          <button 
            className={`btn ${isCreating ? 'btn-primary' : 'btn-secondary'}`} 
            style={{ flex: 1 }}
            onClick={() => setIsCreating(true)}
          >
            Create
          </button>
        </div>

        {isCreating ? (
          <form onSubmit={handleCreateClan} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <input
              type="text"
              placeholder="Clan Name"
              value={clanName}
              onChange={(e) => setClanName(e.target.value)}
              required
            />
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Processing...' : 'Create Clan'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoinClan} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <input
              type="text"
              placeholder="Invite Code (e.g. X7F9A)"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              required
            />
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Processing...' : 'Join Clan'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ClanSetup;
