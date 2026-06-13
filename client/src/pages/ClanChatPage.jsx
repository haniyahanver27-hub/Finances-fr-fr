import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Play } from 'lucide-react';

const ClanChatPage = ({ session, profile }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [keywords, setKeywords] = useState([]);
  const messagesEndRef = useRef(null);

  const clanId = profile?.clan_id;

  // Load keywords and initial messages
  useEffect(() => {
    if (!clanId) return;

    const fetchInitialData = async () => {
      // 1. Fetch keywords from backend proxy (which reads financialKeywords.json)
      try {
        // We'll just fetch a static array we could host or define, but let's assume we fetch them
        // For now, let's just use a hardcoded list of terms to highlight to save a fetch, or fetch them if needed
        // The PRD says "parses text for known keywords from a local array client-side"
        // I will define a small client-side dictionary of terms to parse:
        const localKeywords = ['diversification', 'portfolio', 'shorting', 'bull market', 'bear market', 'dividend', 'etf', 'ipo', 'options', 'margin', 'volatility'];
        setKeywords(localKeywords);
      } catch (e) {
        console.error("Failed to load keywords");
      }

      // 2. Fetch last 50 messages
      const { data, error } = await supabase
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
  }, [clanId]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !clanId) return;

    const content = newMessage;
    setNewMessage('');

    // 1. Insert user message to DB
    const { error } = await supabase.from('messages').insert([{
      clan_id: clanId,
      user_id: session.user.id,
      content: content,
      is_ai: false
    }]);

    if (error) {
      console.error('Error sending message:', error);
      return;
    }

    // 2. If message mentions @alphameow, call AI
    if (content.toLowerCase().includes('@alphameow')) {
      try {
        const aiResponse = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: content,
            context: messages.slice(-5) // Send last 5 messages for context
          })
        });
        const data = await aiResponse.json();

        if (data.reply) {
          await supabase.from('messages').insert([{
            clan_id: clanId,
            content: data.reply,
            is_ai: true
          }]);
        }
      } catch (err) {
        console.error("Alpha Meow is sleeping", err);
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
      
      // We will make Alpha Meow say it in chat!
      await supabase.from('messages').insert([{
        clan_id: clanId,
        content: `**${data.term.toUpperCase()}**: ${data.definition ? data.definition + " " : ""}${data.analogy}`,
        is_ai: true
      }]);

      // Trigger SFX (Meow)
      const sfxResponse = await fetch('/api/sfx/meow', { method: 'POST' });
      const blob = await sfxResponse.blob();
      const audioUrl = URL.createObjectURL(blob);
      new Audio(audioUrl).play();
    } catch (err) {
      console.error("Failed to explain jargon", err);
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
        <h3 style={{fontSize: '1.2rem'}}>{profile.clans?.name || 'Clan'}</h3>
        <p className="text-muted" style={{fontSize: '0.8rem'}}>Invite Code: <strong>{profile.clans?.invite_code}</strong></p>
      </div>
      
      <div className="chat-container" style={{ flex: 1, overflowY: 'auto', marginBottom: 'var(--space-md)' }}>
        {messages.map((msg) => (
          <div key={msg.id} className={`chat-message ${msg.is_ai ? 'ai' : (msg.user_id === session.user.id ? 'self' : 'other')}`}>
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
