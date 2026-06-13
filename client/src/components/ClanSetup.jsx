import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

const ClanSetup = ({ user, onClanJoined }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [clanName, setClanName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generateInviteCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleCreateClan = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const code = generateInviteCode();
      
      // Insert clan
      const { data: clanData, error: clanError } = await supabase
        .from('clans')
        .insert([{ name: clanName, invite_code: code }])
        .select()
        .single();
        
      if (clanError) throw clanError;

      // Update user profile with clan_id
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ clan_id: clanData.id })
        .eq('id', user.id);
        
      if (profileError) throw profileError;

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
      // Find clan by invite code
      const { data: clans, error: fetchError } = await supabase
        .from('clans')
        .select('*')
        .eq('invite_code', inviteCode.toUpperCase());
        
      if (fetchError) throw fetchError;
      if (!clans || clans.length === 0) throw new Error('Invalid invite code');
      
      const clan = clans[0];

      // Update user profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ clan_id: clan.id })
        .eq('id', user.id);
        
      if (profileError) throw profileError;

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
