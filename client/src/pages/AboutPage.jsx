import { ArrowRight, BrainCircuit, Coins, GraduationCap, Users } from 'lucide-react';
import heroImage from '../assets/hero.png';
import { HeroScrollDemo } from '../components/HeroScrollDemo';

const AboutPage = ({ onStart }) => {
  const moneyDrops = Array.from({ length: 28 }).map((_, index) => ({
    delay: `${index * 0.28}s`,
    left: `${(index * 13) % 98}%`,
    size: `${1.75 + (index % 5) * 0.42}rem`,
    depth: 0.15 + (index % 4) * 0.08,
    blur: `${index % 3}px`,
    drift: `${((index % 7) - 3) * 12}px`
  }));

  return (
    <div className="about-page animate-fade-in">
      <section className="about-hero" style={{ backgroundImage: `linear-gradient(90deg, rgba(10, 14, 26, 0.95), rgba(10, 14, 26, 0.45)), url(${heroImage})` }}>
        <div className="money-rain" aria-hidden="true">
          {moneyDrops.map((drop, index) => (
            <span
              key={index}
              style={{
                '--delay': drop.delay,
                '--left': drop.left,
                '--money-size': drop.size,
                '--money-opacity': drop.depth,
                '--money-blur': drop.blur,
                '--money-drift': drop.drift
              }}
            >
              $
            </span>
          ))}
        </div>
        <div className="hero-copy">
          <p className="eyebrow">Student investing simulator</p>
          <h1>Project Alpha</h1>
          <p>
            A social paper-trading arena where students learn markets together, vote on trades, take quick AI quizzes, and turn finance terms into playable strategy with Alpha Meow.
          </p>
          <button className="btn btn-primary" type="button" onClick={onStart}>
            <span>Enter Clan Chat</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </section>

      <HeroScrollDemo />

      <section className="about-grid" aria-label="Project Alpha pillars">
        <article>
          <Users size={24} />
          <h2>Social First</h2>
          <p>Small clans debate stock picks in a private room before any shared capital moves.</p>
        </article>
        <article>
          <Coins size={24} />
          <h2>Paper Money</h2>
          <p>Every squad starts with $100,000 in virtual cash, so students can learn without real losses.</p>
        </article>
        <article>
          <GraduationCap size={24} />
          <h2>Jargon Buster</h2>
          <p>Highlighted terms unlock short explanations with gaming analogies right where confusion happens.</p>
        </article>
        <article>
          <BrainCircuit size={24} />
          <h2>AI Quizzes</h2>
          <p>Gemini can generate practice questions, while ElevenLabs gives Alpha Meow a voice for coaching moments.</p>
        </article>
      </section>

      <div className="delay-note">
        Market quotes may be delayed by 15 minutes on free data plans. Project Alpha treats that as a learning constraint, not a hidden surprise.
      </div>
    </div>
  );
};

export default AboutPage;
