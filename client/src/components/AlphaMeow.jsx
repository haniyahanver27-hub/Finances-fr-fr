import { useState } from 'react';
import { MessageCircle, Send, Volume2, X } from 'lucide-react';
import alphaMeow from '../assets/alpha meow.png';
import { apiAudio, apiJson } from '../api';

const fallbackAnswer = 'Alpha Meow is in offline mode: diversify your loot, size your bets, and never full-send without a vote.';

const AlphaMeow = ({ context = [] }) => {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Tap me when finance words start looking like boss mechanics.' }
  ]);
  const [loading, setLoading] = useState(false);

  const askAlpha = async (event) => {
    event.preventDefault();
    if (!question.trim()) return;

    const userMessage = question.trim();
    setQuestion('');
    setMessages((current) => [...current, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const conversationContext = [
        ...context,
        ...messages.map((message) => ({
          content: message.content,
          is_ai: message.role === 'assistant',
          role: message.role
        }))
      ].slice(-8);
      const data = await apiJson('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ message: userMessage, context: conversationContext })
      });
      setMessages((current) => [...current, { role: 'assistant', content: data.reply || fallbackAnswer }]);
    } catch {
      setMessages((current) => [...current, { role: 'assistant', content: fallbackAnswer }]);
    } finally {
      setLoading(false);
    }
  };

  const playVoice = async (text) => {
    try {
      const blob = await apiAudio('/api/sfx/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.addEventListener('ended', () => URL.revokeObjectURL(url), { once: true });
      await audio.play();
    } catch {
      window.speechSynthesis?.speak(new SpeechSynthesisUtterance(text));
    }
  };

  return (
    <>
      {open && (
        <aside className="meow-chat-panel glass-panel" aria-label="Alpha Meow assistant">
          <div className="meow-panel-header">
            <div>
              <strong>Alpha Meow</strong>
              <span>AI coach</span>
            </div>
            <button className="icon-button" type="button" onClick={() => setOpen(false)} aria-label="Close Alpha Meow">
              <X size={18} />
            </button>
          </div>

          <div className="meow-messages" aria-live="polite">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`meow-bubble ${message.role}`}>
                <span>{message.content}</span>
                {message.role === 'assistant' && (
                  <button type="button" className="voice-button" onClick={() => playVoice(message.content)} aria-label="Play Alpha Meow voice">
                    <Volume2 size={15} />
                  </button>
                )}
              </div>
            ))}
            {loading && <div className="meow-bubble assistant">Loading the next strat...</div>}
          </div>

          <form className="meow-form" onSubmit={askAlpha}>
            <input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask a trading question" maxLength={1200} />
            <button className="btn btn-primary icon-only" type="submit" aria-label="Ask Alpha Meow" disabled={loading || !question.trim()}>
              <Send size={18} />
            </button>
          </form>
        </aside>
      )}

      <button className="alpha-meow-widget" type="button" onClick={() => setOpen((value) => !value)} aria-label={open ? 'Close Alpha Meow' : 'Open Alpha Meow'}>
        <img src={alphaMeow} alt="" />
        <MessageCircle size={18} />
      </button>
    </>
  );
};

export default AlphaMeow;
