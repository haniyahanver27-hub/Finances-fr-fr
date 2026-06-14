import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Play, Plus, Send, X } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { financialKeywords, localJargon } from '../data/demoContent';
import { apiAudio, apiJson } from '../api';

const clanSize = 3;
let localId = 0;
const nextLocalId = (prefix) => {
  localId += 1;
  return `${prefix}-${localId}`;
};

const formatMoney = (value) => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0
}).format(value);

const ClanChatPage = ({
  session,
  profile,
  portfolio,
  setPortfolio,
  tradeProposals,
  setTradeProposals,
  watchlist,
  demoMessages,
  setDemoMessages,
  isDemo
}) => {
  const [remoteMessages, setRemoteMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedJargon, setSelectedJargon] = useState(null);
  const [showTradeWizard, setShowTradeWizard] = useState(false);
  const [tradeDraft, setTradeDraft] = useState({ symbol: 'NVDA', action: 'Buy', orderPct: 5 });
  const [actionError, setActionError] = useState('');
  const messagesEndRef = useRef(null);
  const messages = isDemo ? demoMessages : remoteMessages;

  const clanId = profile?.clan_id;
  const clanName = profile?.clans?.name || 'Demo Alpha Clan';
  const userId = session?.user?.id || 'demo-123';
  const currentUser = profile?.username || 'DemoTrader';

  const positionValue = useMemo(() => portfolio.positions.reduce((total, position) => {
    const quote = watchlist.find((item) => item.symbol === position.symbol);
    return total + position.quantity * (quote?.price || position.avgPrice);
  }, 0), [portfolio.positions, watchlist]);

  const totalValue = portfolio.cash + positionValue;
  const dailyReturn = 5.7;

  useEffect(() => {
    if (isDemo) return;
    if (!clanId) return;

    const fetchInitialData = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('id, content, timestamp, is_ai, user_id, message_type, profiles (username)')
        .eq('clan_id', clanId)
        .order('timestamp', { ascending: true })
        .limit(50);

      if (error) {
        setActionError(error.message);
        return;
      }
      setRemoteMessages(data || []);
    };

    fetchInitialData();

    const channel = supabase
      .channel(`room:${clanId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `clan_id=eq.${clanId}`
      }, async (payload) => {
        if (payload.new.user_id) {
          const { data } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', payload.new.user_id)
            .single();

          payload.new.profiles = data;
        }

        setRemoteMessages((current) => current.some((message) => message.id === payload.new.id)
          ? current
          : [...current, payload.new]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clanId, isDemo]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, tradeProposals]);

  const appendDemoMessage = (message) => {
    const next = { id: nextLocalId('message'), ...message };
    setDemoMessages((current) => [...current, next]);
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    if (!newMessage.trim() || !clanId) return;

    const content = newMessage.trim();
    setNewMessage('');
    setActionError('');

    if (isDemo) {
      appendDemoMessage({
        user_id: userId,
        profiles: { username: currentUser },
        content,
        is_ai: false
      });
    } else {
      const { error } = await supabase.from('messages').insert([{
        clan_id: clanId,
        user_id: userId,
        content,
        is_ai: false
      }]);

      if (error) {
        setNewMessage(content);
        setActionError(error.message);
        return;
      }
    }

    if (content.toLowerCase().includes('@alphameow')) {
      try {
        const data = await apiJson('/api/ai/chat', {
          method: 'POST',
          body: JSON.stringify({ message: content, context: messages.slice(-5) })
        });
        const reply = data.reply || 'Alpha Meow says: size the trade, vote together, then commit.';

        if (isDemo) {
          appendDemoMessage({ content: reply, is_ai: true });
        } else {
          await supabase.from('messages').insert([{ clan_id: clanId, user_id: userId, content: reply, is_ai: true }]);
        }
      } catch {
        if (isDemo) {
          appendDemoMessage({ content: 'Alpha Meow is offline, but the strategy still stands: vote before sending it.', is_ai: true });
        } else {
          setActionError('Alpha Meow is offline right now.');
        }
      }
    }
  };

  const handleJargonTap = async (term) => {
    setSelectedJargon({ term, explanation: localJargon[term.toLowerCase()] || 'Loading the quick strat...' });

    try {
      const data = await apiJson('/api/ai/jargon', {
        method: 'POST',
        body: JSON.stringify({ term })
      });
      const explanation = [data.definition, data.analogy].filter(Boolean).join(' ');
      setSelectedJargon({ term: data.term || term, explanation: explanation || localJargon[term.toLowerCase()] });
    } catch {
      setSelectedJargon({ term, explanation: localJargon[term.toLowerCase()] || 'Finance term unlocked: ask Alpha Meow for a deeper breakdown.' });
    }
  };

  const parseContent = (content) => {
    if (!content) return '';
    let parsedContent = [content];

    financialKeywords.forEach((keyword) => {
      const regex = new RegExp(`\\b(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\b`, 'gi');
      parsedContent = parsedContent.flatMap((part) => {
        if (typeof part !== 'string') return [part];
        return part.split(regex).map((piece, index) => {
          if (piece.toLowerCase() === keyword.toLowerCase()) {
            return (
              <button key={`${keyword}-${index}-${piece}`} className="jargon-highlight" type="button" onClick={() => handleJargonTap(keyword)}>
                {piece}
              </button>
            );
          }
          return piece;
        });
      });
    });

    return parsedContent;
  };

  const proposeTrade = (event) => {
    event.preventDefault();
    const symbol = tradeDraft.symbol.trim().toUpperCase();
    if (!symbol) return;

    const proposal = {
      id: nextLocalId(`proposal-${symbol}`),
      proposer: currentUser,
      symbol,
      action: tradeDraft.action,
      orderPct: Number(tradeDraft.orderPct),
      approvals: [userId],
      denials: [],
      status: 'open'
    };

    setTradeProposals((current) => [proposal, ...current]);
    appendDemoMessage({
      content: `${currentUser} initiated a vote to ${proposal.action.toUpperCase()} ${proposal.orderPct}% ${proposal.symbol}`,
      is_ai: true,
      message_type: 'trade_alert'
    });
    setShowTradeWizard(false);
  };

  const executeTrade = (proposal) => {
    const quote = watchlist.find((item) => item.symbol === proposal.symbol) || { price: 100 };
    const tradeSize = Math.min(portfolio.cash, totalValue * (proposal.orderPct / 100));
    const quantity = proposal.action === 'Buy' ? tradeSize / quote.price : 0;

    setPortfolio((current) => {
      if (proposal.action === 'Buy') {
        const existing = current.positions.find((position) => position.symbol === proposal.symbol);
        const nextPositions = existing
          ? current.positions.map((position) => position.symbol === proposal.symbol
            ? {
                ...position,
                quantity: position.quantity + quantity,
                avgPrice: ((position.quantity * position.avgPrice) + tradeSize) / (position.quantity + quantity)
              }
            : position)
          : [...current.positions, { symbol: proposal.symbol, quantity, avgPrice: quote.price }];

        return {
          ...current,
          cash: current.cash - tradeSize,
          positions: nextPositions,
          trades: [{ ...proposal, quantity, price: quote.price, timestamp: new Date().toISOString() }, ...current.trades]
        };
      }

      return {
        ...current,
        trades: [{ ...proposal, quantity: 0, price: quote.price, timestamp: new Date().toISOString() }, ...current.trades]
      };
    });

    appendDemoMessage({
      content: `Trade executed: ${proposal.action.toUpperCase()} ${proposal.symbol} at ${formatMoney(quote.price)}. Alpha Meow says the loot moved.`,
      is_ai: true,
      message_type: 'vote_result'
    });

    apiAudio('/api/sfx/trade', { method: 'POST' })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.addEventListener('ended', () => URL.revokeObjectURL(url), { once: true });
        return audio.play();
      })
      .catch(() => {});
  };

  const castVote = (proposalId, approve) => {
    let proposalToExecute = null;

    setTradeProposals((current) => current.map((proposal) => {
      if (proposal.id !== proposalId || proposal.status !== 'open') return proposal;

      const approvals = new Set(proposal.approvals);
      const denials = new Set(proposal.denials);
      approvals.delete(userId);
      denials.delete(userId);
      approve ? approvals.add(userId) : denials.add(userId);

      const updated = {
        ...proposal,
        approvals: [...approvals],
        denials: [...denials]
      };

      if (updated.approvals.length / clanSize > 0.5) {
        const passed = { ...updated, status: 'passed' };
        proposalToExecute = passed;
        return passed;
      }

      if (updated.denials.length / clanSize >= 0.5) {
        return { ...updated, status: 'failed' };
      }

      return updated;
    }));

    if (proposalToExecute) {
      executeTrade(proposalToExecute);
    }
  };

  if (!clanId) {
    return <div className="empty-state">Join a clan to see the chat.</div>;
  }

  return (
    <div className="chat-page animate-slide-up">
      <header className="clan-header">
        <div>
          <p className="eyebrow">{clanName}</p>
          <h2>{formatMoney(totalValue)} Clan Capital</h2>
          <span>Cash {formatMoney(portfolio.cash)} · Daily {dailyReturn > 0 ? '+' : ''}{dailyReturn}%</span>
        </div>
        <button className="btn btn-primary" type="button" onClick={() => setShowTradeWizard(true)}>
          <Plus size={18} />
          <span>Trade</span>
        </button>
      </header>

      <section className="buster-briefing">
        <strong>Buster&apos;s Briefing</strong>
        <p>{selectedJargon ? `${selectedJargon.term.toUpperCase()}: ${selectedJargon.explanation}` : 'Tap highlighted words to bust jargon without leaving the chat.'}</p>
      </section>
      {actionError && <div className="form-error" role="alert">{actionError}</div>}

      {showTradeWizard && (
        <form className="trade-wizard glass-panel" onSubmit={proposeTrade}>
          <div className="wizard-grid">
            <label>
              <span>Ticker</span>
              <input value={tradeDraft.symbol} onChange={(event) => setTradeDraft((draft) => ({ ...draft, symbol: event.target.value }))} />
            </label>
            <label>
              <span>Action</span>
              <select value={tradeDraft.action} onChange={(event) => setTradeDraft((draft) => ({ ...draft, action: event.target.value }))}>
                <option>Buy</option>
                <option>Sell</option>
              </select>
            </label>
            <label>
              <span>Cash %</span>
              <input type="number" min="1" max="40" value={tradeDraft.orderPct} onChange={(event) => setTradeDraft((draft) => ({ ...draft, orderPct: event.target.value }))} />
            </label>
          </div>
          <div className="wizard-actions">
            <button className="btn btn-secondary" type="button" onClick={() => setShowTradeWizard(false)}>
              <X size={18} />
              <span>Cancel</span>
            </button>
            <button className="btn btn-primary" type="submit">
              <Play size={18} />
              <span>Propose</span>
            </button>
          </div>
        </form>
      )}

      <div className="chat-container">
        {tradeProposals.map((proposal) => (
          <article key={proposal.id} className={`vote-card ${proposal.status}`}>
            <div>
              <strong>{proposal.proposer} proposed {proposal.action.toUpperCase()} {proposal.symbol}</strong>
              <span>{proposal.orderPct}% of clan capital · majority needs 2 of 3</span>
            </div>
            <div className="vote-meter">
              <span style={{ width: `${(proposal.approvals.length / clanSize) * 100}%` }} />
            </div>
            <div className="vote-buttons">
              <button className="btn btn-approve" type="button" onClick={() => castVote(proposal.id, true)} disabled={proposal.status !== 'open'}>
                <Check size={16} />
                <span>Approve ({proposal.approvals.length})</span>
              </button>
              <button className="btn btn-deny" type="button" onClick={() => castVote(proposal.id, false)} disabled={proposal.status !== 'open'}>
                <X size={16} />
                <span>Deny ({proposal.denials.length})</span>
              </button>
            </div>
          </article>
        ))}

        {messages.map((msg) => (
          <div key={msg.id} className={`chat-message ${msg.is_ai ? 'ai' : (msg.user_id === userId ? 'self' : 'other')}`}>
            {!msg.is_ai && msg.user_id !== userId && (
              <div className="message-author">{msg.profiles?.username || 'Unknown Trader'}</div>
            )}
            {msg.is_ai && <div className="message-author ai-name">Alpha Meow</div>}
            <div>{parseContent(msg.content)}</div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-form" onSubmit={sendMessage}>
        <input value={newMessage} onChange={(event) => setNewMessage(event.target.value)} placeholder="Debate a trade or @alphameow..." maxLength={1200} />
        <button type="submit" className="btn btn-primary icon-only" aria-label="Send message" disabled={!newMessage.trim()}>
          <Send size={20} />
        </button>
      </form>
    </div>
  );
};

export default ClanChatPage;
