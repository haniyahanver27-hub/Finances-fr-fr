import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Play } from 'lucide-react';
import { fetchAlphaMeowReply, playAlphaMeowSound } from '../utils/alphaMeow';

const FINANCIAL_KEYWORDS = ['diversification', 'portfolio', 'shorting', 'bull market', 'bear market', 'dividend', 'etf', 'ipo', 'options', 'margin', 'volatility'];

const ClanChatPage = ({ session, profile }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [keywords, setKeywords] = useState(FINANCIAL_KEYWORDS);
  const [clanBalance, setClanBalance] = useState(100000);
  const [positions, setPositions] = useState([]);
  const [activeVotes, setActiveVotes] = useState({});
  const [userVotes, setUserVotes] = useState({});
  const messagesEndRef = useRef(null);
  const localIdRef = useRef(0);

  const clanId = profile?.clan_id;
  const isDemo = session?.user?.id?.startsWith('demo-');

  const nextLocalId = (prefix) => {
    localIdRef.current += 1;
    return `${prefix}-${localIdRef.current}`;
  };

  // Load keywords and initial messages
  useEffect(() => {
    if (!clanId) return;

    if (isDemo) {
      const fetchDemoData = async () => {
        setMessages([
          {
            id: 'demo-alpha-welcome',
            content: 'Alpha Meow is awake. Try @alphameow with any finance question.',
            is_ai: true,
          },
        ]);
      };

      fetchDemoData();
      return;
    }

    const fetchInitialData = async () => {
      // 1. Fetch keywords from backend proxy (which reads financialKeywords.json)
      try {
        // We'll just fetch a static array we could host or define, but let's assume we fetch them
        // For now, let's just use a hardcoded list of terms to highlight to save a fetch, or fetch them if needed
        // The PRD says "parses text for known keywords from a local array client-side"
        // I will define a small client-side dictionary of terms to parse:
        setKeywords(FINANCIAL_KEYWORDS);
      } catch {
        console.error("Failed to load keywords");
      }

      // 2. Fetch clan portfolio data
      try {
        const posRes = await fetch(`/api/trades/positions/${clanId}`);
        const posData = await posRes.json();
        if (posData.cash !== undefined) setClanBalance(posData.cash);
        if (posData.positions) setPositions(posData.positions);
      } catch (err) {
        console.error("Failed to fetch positions:", err);
      }

      // 3. Fetch active trade proposals
      try {
        const propsRes = await fetch(`/api/trades/proposals/${clanId}`);
        const propsData = await propsRes.json();
        if (propsData.proposals) {
          const voteMap = {};
          propsData.proposals.forEach(p => {
            voteMap[p.id] = { yes: 0, no: 0, total: 0 };
          });
          setActiveVotes(voteMap);
        }
      } catch (err) {
        console.error("Failed to fetch proposals:", err);
      }

      // 4. Fetch last 50 messages
      const { data } = await supabase
        .from('messages')
        .select(`
          id, content, timestamp, is_ai, user_id,
          profiles (username)
        `)
        .eq('clan_id', clanId)
        .order('timestamp', { ascending: true })
        .limit(50);
        
      if (data) setMessages(data);
    };

    fetchInitialData();

    // 3. Subscribe to new messages
    const channel = supabase
      .channel(`room:${clanId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `clan_id=eq.${clanId}`
      }, async (payload) => {
        // Fetch the username for the new message
        if (payload.new.user_id) {
          const { data } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', payload.new.user_id)
            .single();
          
          payload.new.profiles = data;
        }
        
        setMessages(prev => [...prev, payload.new]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clanId, isDemo]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !clanId) return;

    const content = newMessage;
    setNewMessage('');
    const localUserMessage = {
      id: nextLocalId('local-user'),
      clan_id: clanId,
      user_id: session.user.id,
      content,
      is_ai: false,
      profiles: { username: profile?.username },
    };

    if (isDemo) {
      setMessages(prev => [...prev, localUserMessage]);
    }

    // 1. Insert user message to DB
    if (!isDemo) {
      const { error } = await supabase.from('messages').insert([{
        clan_id: clanId,
        user_id: session.user.id,
        content: content,
        is_ai: false
      }]);

      if (error) {
        console.error('Error sending message:', error);
        setMessages(prev => [...prev, localUserMessage]);
      }
    }

    // 2. If message mentions @alphameow, call AI
    if (content.toLowerCase().includes('@alphameow')) {
      playAlphaMeowSound();
      const reply = await fetchAlphaMeowReply(content, messages.slice(-5));

      if (reply) {
        if (isDemo) {
          setMessages(prev => [...prev, {
            id: nextLocalId('local-alpha'),
            clan_id: clanId,
            content: reply,
            is_ai: true,
          }]);
        } else {
          await supabase.from('messages').insert([{
            clan_id: clanId,
            content: reply,
            is_ai: true
          }]);
        }
      }
    }
  };

  const handleJargonTap = async (term) => {
    try {
      const response = await fetch('/api/ai/jargon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ term })
      });
      const data = await response.json();
      
      const alphaMessageContent = {
        clan_id: clanId,
        content: `**${data.term.toUpperCase()}**: ${data.definition ? data.definition + " " : ""}${data.analogy}`,
        is_ai: true
      };

      const alphaMessage = {
        id: nextLocalId('local-jargon'),
        ...alphaMessageContent
      };

      if (isDemo) {
        setMessages(prev => [...prev, alphaMessage]);
      } else {
        await supabase.from('messages').insert([alphaMessageContent]);
      }

      // Trigger SFX (Meow)
      playAlphaMeowSound();
    } catch (err) {
      console.error("Failed to explain jargon", err);
    }
  };

  const handleVote = async (proposalId, voteYes) => {
    try {
      const response = await fetch('/api/trades/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposal_id: proposalId,
          user_id: session.user.id,
          vote: voteYes
        })
      });
      const data = await response.json();
      
      if (response.ok) {
        setUserVotes(prev => ({ ...prev, [proposalId]: voteYes }));
        if (data.voteCount) {
          setActiveVotes(prev => ({
            ...prev,
            [proposalId]: data.voteCount
          }));
        }
        if (data.proposalStatus === 'passed') {
          playAlphaMeowSound();
        }
      }
    } catch (err) {
      console.error("Failed to vote:", err);
    }
  };

  // Helper to highlight jargon in text
  const parseContent = (content) => {
    if (!content) return '';
    let parsedContent = [content];

    keywords.forEach(keyword => {
      const regex = new RegExp(`\\b(${keyword})\\b`, 'gi');
      parsedContent = parsedContent.flatMap(part => {
        if (typeof part !== 'string') return [part];
        const pieces = part.split(regex);
        return pieces.map((piece, i) => {
          if (piece.toLowerCase() === keyword.toLowerCase()) {
            return (
              <span 
                key={`${keyword}-${i}`} 
                className="jargon-highlight"
                onClick={() => handleJargonTap(keyword)}
              >
                {piece}
              </span>
            );
          }
          return piece;
        });
      });
    });

    return parsedContent;
  };

  if (!clanId) {
    return <div style={{padding: '2rem', textAlign: 'center'}}>Join a clan to see the chat!</div>;
  }

  return (
    <div className="animate-slide-up" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="glass-panel" style={{padding: 'var(--space-sm) var(--space-md)', marginBottom: 'var(--space-md)'}}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
          <div>
            <h3 style={{fontSize: '1.2rem', margin: 0}}>{profile.clans?.name || 'Clan'}</h3>
            <p className="text-muted" style={{fontSize: '0.8rem', margin: '4px 0 0 0'}}>Invite Code: <strong>{profile.clans?.invite_code}</strong></p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Portfolio Value</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--accent-green)' }}>
              ${clanBalance?.toLocaleString('en-US', { maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
        {positions.length > 0 && (
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Holdings: {positions.map(p => `${p.quantity.toFixed(2)} ${p.symbol}`).join(', ')}
          </div>
        )}
      </div>
      
      <div className="chat-container" style={{ flex: 1, overflowY: 'auto', marginBottom: 'var(--space-md)' }}>
        {messages.map((msg) => (
          <div key={msg.id}>
            {msg.message_type === 'vote_result' && (
              <div className="glass-panel" style={{ padding: 'var(--space-sm)', marginBottom: 'var(--space-md)', backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
                <div style={{ fontSize: '0.85rem' }}>{msg.content}</div>
              </div>
            )}
            {msg.message_type === 'trade_alert' && !msg.content.includes('Vote PASSED') && !msg.content.includes('Vote FAILED') && (
              <div className="vote-card glass-panel" style={{ padding: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: 'var(--space-sm)' }}>
                  {msg.content}
                </div>
                {activeVotes[msg.id]?.total < 3 && !userVotes[msg.id] && (
                  <div className="vote-buttons">
                    <button 
                      className="btn btn-primary" 
                      onClick={() => handleVote(msg.id, true)}
                      style={{ fontSize: '0.85rem', padding: '0.4rem' }}
                    >
                      ✅ Approve
                    </button>
                    <button 
                      className="btn btn-secondary" 
                      onClick={() => handleVote(msg.id, false)}
                      style={{ fontSize: '0.85rem', padding: '0.4rem' }}
                    >
                      ❌ Deny
                    </button>
                  </div>
                )}
                {activeVotes[msg.id] && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 'var(--space-sm)' }}>
                    Yes: {activeVotes[msg.id].yes} | No: {activeVotes[msg.id].no} | Total: {activeVotes[msg.id].total}
                  </div>
                )}
              </div>
            )}
            {msg.message_type !== 'vote_result' && msg.message_type !== 'trade_alert' && (
              <div className={`chat-message ${msg.is_ai ? 'ai' : (msg.user_id === session.user.id ? 'self' : 'other')}`}>
                {!msg.is_ai && msg.user_id !== session.user.id && (
                  <div style={{fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '4px'}}>
                    {msg.profiles?.username || 'Unknown Trader'}
                  </div>
                )}
                {msg.is_ai && (
                  <div style={{fontSize: '0.7rem', color: 'var(--accent-cyan)', marginBottom: '4px', fontWeight: 'bold'}}>
                    🐱 Alpha Meow
                  </div>
                )}
                <div style={{wordBreak: 'break-word'}}>
                  {parseContent(msg.content)}
                </div>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} style={{ display: 'flex', gap: 'var(--space-sm)' }}>
        <input 
          type="text" 
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message or @alphameow..." 
          style={{ flex: 1 }}
        />
        <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem' }}>
          <Play size={20} />
        </button>
      </form>
    </div>
  );
};

export default ClanChatPage;
