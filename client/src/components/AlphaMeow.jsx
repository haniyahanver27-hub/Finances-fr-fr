import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { fetchAlphaMeowReply, playAlphaMeowSound } from '../utils/alphaMeow';

const AlphaMeow = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [reply, setReply] = useState('Tap Alpha Meow for a quick finance power-up.');
  const [tries, setTries] = useState(0);

  const askAlphaMeow = async () => {
    const nextTry = tries + 1;
    setTries(nextTry);
    setIsOpen(true);
    setIsThinking(true);

    const prompt = `Give me one finance tip. Attempt ${nextTry}.`;
    playAlphaMeowSound();
    const nextReply = await fetchAlphaMeowReply(prompt, []);

    setReply(nextReply);
    setIsThinking(false);
  };

  return (
    <>
      {isOpen && (
        <section className="meow-chat-panel glass-panel" aria-live="polite">
          <div className="meow-panel-header">
            <strong>Alpha Meow</strong>
            <span>{tries} {tries === 1 ? 'try' : 'tries'}</span>
          </div>
          <p>{isThinking ? 'Loading the next lesson...' : reply}</p>
        </section>
      )}

      <button
        type="button"
        className={`alpha-meow-widget ${isThinking ? 'thinking' : ''}`}
        onClick={askAlphaMeow}
        aria-label="Ask Alpha Meow"
        title="Ask Alpha Meow"
      >
        <MessageCircle size={34} aria-hidden="true" />
      </button>
    </>
  );
};

export default AlphaMeow;
