const ALPHA_REPLIES = [
  "Alpha Meow loaded in. Diversify your loot so one bad boss fight does not wipe the run.",
  "Stop face-checking risk. Tiny positions first, then scale when the chart earns trust.",
  "Cash is ammo. Spending it all at spawn is how portfolios get one-shot.",
  "ETF mode is party queue: lots of teammates, less single-stock drama.",
  "Volatility is screen shake. Do not panic-sell just because the camera moved.",
  "Dividends are passive loot drops. Small, boring, weirdly powerful over time.",
];

const fetchWithTimeout = async (url, options = {}, timeoutMs = 900) => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeoutId);
  }
};

export const getAlphaMeowFallback = (prompt = '') => {
  const cleanPrompt = prompt.toLowerCase();

  if (cleanPrompt.includes('dividend')) return ALPHA_REPLIES[5];
  if (cleanPrompt.includes('etf') || cleanPrompt.includes('fund')) return ALPHA_REPLIES[3];
  if (cleanPrompt.includes('risk') || cleanPrompt.includes('short')) return ALPHA_REPLIES[1];
  if (cleanPrompt.includes('cash') || cleanPrompt.includes('budget')) return ALPHA_REPLIES[2];
  if (cleanPrompt.includes('volatility') || cleanPrompt.includes('market')) return ALPHA_REPLIES[4];

  return ALPHA_REPLIES[Math.floor(Math.random() * ALPHA_REPLIES.length)];
};

export const fetchAlphaMeowReply = async (message, context = []) => {
  try {
    const response = await fetchWithTimeout('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, context }),
    }, 900);

    if (!response.ok) throw new Error(`Alpha Meow API returned ${response.status}`);

    const data = await response.json();
    return data.reply || getAlphaMeowFallback(message);
  } catch (error) {
    console.warn('Using local Alpha Meow reply:', error);
    return getAlphaMeowFallback(message);
  }
};

const playSynthMeow = async () => {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return false;

  const audioContext = new AudioContext();
  await audioContext.resume();

  const now = audioContext.currentTime;
  const gain = audioContext.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.14, now + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
  gain.connect(audioContext.destination);

  const tones = [
    { start: 0, from: 720, to: 420 },
    { start: 0.14, from: 540, to: 760 },
  ];

  tones.forEach(({ start, from, to }) => {
    const oscillator = audioContext.createOscillator();
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(from, now + start);
    oscillator.frequency.exponentialRampToValueAtTime(to, now + start + 0.2);
    oscillator.connect(gain);
    oscillator.start(now + start);
    oscillator.stop(now + start + 0.24);
  });

  window.setTimeout(() => audioContext.close(), 700);
  return true;
};

export const playAlphaMeowSound = async () => {
  try {
    const response = await fetchWithTimeout('/api/sfx/meow', { method: 'POST' }, 700);
    if (!response.ok) throw new Error(`Meow SFX returned ${response.status}`);

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.startsWith('audio/')) throw new Error('Meow SFX was not audio');

    const blob = await response.blob();
    const audioUrl = URL.createObjectURL(blob);
    const audio = new Audio(audioUrl);
    audio.addEventListener('ended', () => URL.revokeObjectURL(audioUrl), { once: true });
    await audio.play();
    return true;
  } catch (error) {
    console.warn('Using local Alpha Meow sound:', error);
    return playSynthMeow();
  }
};
