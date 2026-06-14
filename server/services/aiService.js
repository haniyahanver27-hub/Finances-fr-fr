const { OpenAI } = require('openai');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
const OPENAI_RETRY_DELAY_MS = 5 * 60 * 1000;
let openAIUnavailableUntil = 0;

const getOpenAIClient = () => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is missing');
  }

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
};

const getGeminiKey = () => process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

const ALPHA_MEOW_PROMPT = `You are Alpha Meow, a chaotic, cat-bro financial mentor.
You speak in gaming slang, internet culture, and hype.
You refer to yourself as Alpha Meow.
Your goal is to explain finance to Gen-Z in the most hype, understandable way possible.
RULES:
1. MAX 25 WORDS PER EXPLANATION. If you go over, you fail.
2. Use gaming analogies (HP, loot drops, min-maxing, nerfed, buffed, etc.).
3. Stay in character 100% of the time. You are slightly aggressive but want them to succeed.
4. No boring financial jargon. If you must use a term, instantly relate it to gaming.`;

const localDefinitions = {
  diversification: 'Diversification spreads loot across assets, so one nerfed pick cannot wipe your whole inventory.',
  portfolio: 'A portfolio is your complete inventory: cash, stocks, funds, and every position you currently hold.',
  stock: 'A stock is a tiny ownership slice of a company. Its price changes as players reassess the company stats.',
  etf: 'An ETF is a bundle pack of assets. One purchase can unlock instant diversification.',
  bond: 'A bond is lending coins to a government or company for interest, usually with less chaos than stocks.',
  dividend: 'A dividend is a coin drop some companies pay shareholders from their profits.',
  volatility: 'Volatility measures price swings. Higher volatility means bigger critical hits and harder wipeouts.',
  liquidity: 'Liquidity means how quickly you can trade an asset without moving its price much.',
  inflation: 'Inflation is a slow debuff that makes each dollar buy less loot over time.',
  interest: 'Interest is the fee for borrowing coins or the reward earned for lending and saving them.',
  'market cap': 'Market cap is company size: share price multiplied by all shares. Bigger value means a larger guild.',
  'p/e ratio': 'P/E compares share price with company earnings. It is the gold-cost-versus-damage stat.',
  options: 'Options are timed contracts with amplified upside and risk. Learn the mechanics before entering ranked mode.',
  shorting: 'Shorting bets a stock falls. Losses can keep scaling, so use tiny positions and strict exits.',
  crypto: 'Crypto is a highly volatile digital asset class. Treat it as a risky side quest, not your entire inventory.'
};

const includesAny = (text, terms) => terms.some((term) => text.includes(term));
const mentionedTicker = (message) => {
  const ignored = new Set(['I', 'A', 'AN', 'THE', 'IS', 'IT', 'ETF', 'CEO', 'IPO']);
  return [...String(message || '').matchAll(/\b[A-Z]{1,5}\b/g)]
    .map((match) => match[0])
    .find((candidate) => !ignored.has(candidate));
};

const previousUserMessage = (context) => [...context].reverse().find((item) => (
  item && typeof item.content === 'string' && item.role !== 'assistant' && !item.is_ai
))?.content.replace(/[.!?]+$/, '');

const localCoachReply = (message, context = []) => {
  const original = String(message || '').trim();
  const normalized = original.toLowerCase().replace(/\s+/g, ' ');
  const ticker = mentionedTicker(original);
  const previous = previousUserMessage(context);

  if (includesAny(normalized, ['hello', 'hey', 'hi ', 'hi!', 'good morning', 'good evening'])) {
    return 'Alpha Meow online. Ask about a stock, finance term, saving plan, or trade idea.';
  }

  if (includesAny(normalized, ['what can you do', 'help me', 'how do i use', 'what should i ask'])) {
    return 'I explain finance, review trade ideas, compare assets, build risk plans, and help your squad question hype.';
  }

  if (['what', 'why', 'how', 'help', '?'].includes(normalized)) {
    return previous
      ? `You asked about "${previous.slice(0, 55)}." Tell me whether you want the risk, upside, or next step.`
      : 'Name a stock, finance term, or goal. I can explain it, assess risk, or suggest your next research step.';
  }

  if (includesAny(normalized, ['what do you mean', 'explain more', 'more detail', 'why is that'])) {
    return previous
      ? `For "${previous.slice(0, 50)}," check the upside, downside, timeline, and evidence. Strong plays survive all four checks.`
      : 'Give me the exact idea or term, and I will break down its upside, downside, timeline, and evidence.';
  }

  const definition = Object.entries(localDefinitions).find(([term]) => normalized.includes(term));
  if (definition && includesAny(normalized, ['what is', 'what are', 'define', 'explain', 'mean'])) {
    return definition[1];
  }

  if (includesAny(normalized, ['compare', ' versus ', ' vs ', 'better than'])) {
    return 'Compare growth, valuation, debt, profit, and risk. The winner depends on your timeline, not whichever ticker has louder hype.';
  }

  if (includesAny(normalized, ['should i buy', 'is it good', 'good investment', 'worth buying', 'buy now'])) {
    return `${ticker || 'That asset'} needs a thesis check: growth, valuation, debt, competition, and downside. Scale in only if the stats support it.`;
  }

  if (includesAny(normalized, ['why is', 'why did', 'going up', 'going down', 'price move', 'stock move'])) {
    return 'Price moves usually come from earnings, guidance, news, rates, sentiment, or big orders. Check the newest catalyst before acting.';
  }

  if (includesAny(normalized, ['how much', 'position size', 'allocate', 'allocation'])) {
    return 'Choose the maximum loss first, then size the position around it. One trade should never threaten the whole inventory.';
  }

  if (includesAny(normalized, ['diversif', 'portfolio', 'spread'])) {
    return localDefinitions.diversification;
  }

  if (includesAny(normalized, ['risk', 'safe', 'loss', 'stop loss'])) {
    return 'Protect the HP bar: size small, define an exit, diversify, and never risk coins needed for real-life quests.';
  }

  if (includesAny(normalized, ['sell', 'exit', 'take profit'])) {
    return 'Sell when the thesis breaks, your target hits, or risk grows beyond plan. Do not let greed turn a win into a wipe.';
  }

  if (includesAny(normalized, ['save', 'saving', 'budget', 'emergency fund'])) {
    return 'Build an emergency shield first, automate savings, then invest consistently. Stable defenses let your long-term build survive surprise damage.';
  }

  if (includesAny(normalized, ['debt', 'credit card', 'loan'])) {
    return 'High-interest debt is a damage-over-time debuff. Pay the highest rate aggressively while keeping minimum payments on everything else.';
  }

  if (includesAny(normalized, ['buy', 'entry', 'invest'])) {
    return 'Check company stats, valuation, timeline, and downside first. Scale in slowly instead of panic-clicking the buy button.';
  }

  if (includesAny(normalized, ['stock', 'market', 'trade']) || ticker) {
    return `${ticker || 'That trade'} needs evidence, not vibes. Check the catalyst, valuation, downside, and position size before your squad votes.`;
  }

  if (normalized.endsWith('?')) {
    return `Good question. For "${original.slice(0, 55)}," start with the goal, timeline, downside, and evidence before choosing a move.`;
  }

  return `I heard "${original.slice(0, 55)}." Connect it to a stock, money goal, or finance term and I will break it down.`;
};

const shouldTryOpenAI = () => Boolean(process.env.OPENAI_API_KEY) && Date.now() >= openAIUnavailableUntil;
const markOpenAIUnavailable = (error) => {
  const isInvalidKey = error?.status === 401
    || error?.code === 'invalid_api_key'
    || String(error?.message || '').toLowerCase().includes('incorrect api key');
  openAIUnavailableUntil = isInvalidKey ? Number.POSITIVE_INFINITY : Date.now() + OPENAI_RETRY_DELAY_MS;
};

const chat = async (userMessage, context = []) => {
  if (!shouldTryOpenAI()) {
    return { reply: localCoachReply(userMessage, context), provider: 'local' };
  }

  try {
    const openai = getOpenAIClient();
    
    // Format context for OpenAI
    const messages = [
      { role: 'system', content: ALPHA_MEOW_PROMPT },
      ...context.filter((msg) => msg && typeof msg.content === 'string').map(msg => ({
        role: msg.is_ai ? 'assistant' : 'user',
        content: msg.content.slice(0, 1000)
      })),
      { role: 'user', content: userMessage }
    ];

    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages,
      max_tokens: 100,
      temperature: 0.9,
    });

    return {
      reply: response.choices?.[0]?.message?.content || localCoachReply(userMessage, context),
      provider: 'openai'
    };
  } catch (error) {
    console.error('OpenAI Error:', error.message);
    markOpenAIUnavailable(error);
    return { reply: localCoachReply(userMessage, context), provider: 'local' };
  }
};

const translateJargon = async (term) => {
  if (!shouldTryOpenAI()) {
    return localCoachReply(term);
  }

  try {
    const openai = getOpenAIClient();
    const prompt = `Translate the financial term "${term}" into gaming slang. 
    MAX 25 WORDS. Use a gaming analogy. Do not use the word itself in the definition.`;
    
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: 'system', content: ALPHA_MEOW_PROMPT },
        { role: 'user', content: prompt }
      ],
      max_tokens: 50,
      temperature: 0.8,
    });

    return response.choices?.[0]?.message?.content || "That term dodged my scanner. Try another one.";
  } catch (error) {
    console.error('OpenAI Error:', error.message);
    markOpenAIUnavailable(error);
    return localCoachReply(term);
  }
};

const generateTradeAlert = async (tradeData) => {
  try {
    const openai = getOpenAIClient();
    const { action, symbol, quantity, price } = tradeData;
    
    const prompt = `React to a clan executing a trade: ${action}ing ${quantity} shares of ${symbol} at $${price}. 
    Hype them up if it's a good move, or call it risky. MAX 25 WORDS. Gaming slang only.`;
    
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: 'system', content: ALPHA_MEOW_PROMPT },
        { role: 'user', content: prompt }
      ],
      max_tokens: 50,
      temperature: 0.9,
    });

    return response.choices?.[0]?.message?.content || `TRADE LOCKED: ${action} ${symbol}. Manage risk like it is ranked mode.`;
  } catch (error) {
    console.error('OpenAI Error:', error.message);
    return `TRADE SECURED: ${tradeData.action} ${tradeData.symbol}. Let's get this loot!`;
  }
};

const fallbackQuiz = (topic = 'diversification') => ({
  provider: 'local',
  title: 'Alpha Meow Warmup',
  questions: [
    {
      question: `In Alpha Meow terms, what is ${topic}?`,
      options: [
        'Spreading your loot so one bad drop does not wipe the squad',
        'Putting every coin into one hype stock',
        'Borrowing max margin for a speedrun',
        'Ignoring risk because vibes are green'
      ],
      answerIndex: 0,
      explanation: 'Correct. Diversification keeps one nerfed pick from deleting the whole inventory.'
    },
    {
      question: 'What does position size control?',
      options: [
        'How much damage one bad trade can do',
        'The color of a stock chart',
        'How famous a company is',
        'The number of clan votes'
      ],
      answerIndex: 0,
      explanation: 'Yep. Position sizing is your HP bar management.'
    },
    {
      question: 'Why should a clan vote before a big trade?',
      options: [
        'To slow down panic clicks and catch weak logic',
        'To guarantee profit',
        'To remove market risk',
        'To make prices update faster'
      ],
      answerIndex: 0,
      explanation: 'Exactly. Votes are squad comms before the boss fight.'
    }
  ]
});

const normalizeQuiz = (raw, topic) => {
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  const questions = Array.isArray(parsed.questions) ? parsed.questions : [];

  return {
    provider: 'gemini',
    title: parsed.title || `Alpha Meow ${topic} Quiz`,
    questions: questions.slice(0, 5).map((item) => ({
      question: String(item.question || '').slice(0, 180),
      options: Array.isArray(item.options) ? item.options.slice(0, 4).map((option) => String(option).slice(0, 120)) : [],
      answerIndex: Number.isInteger(item.answerIndex) ? item.answerIndex : 0,
      explanation: String(item.explanation || '').slice(0, 220)
    })).filter((item) => item.question && item.options.length === 4)
  };
};

const generateQuiz = async ({ topic = 'diversification', difficulty = 'starter' } = {}) => {
  const geminiKey = getGeminiKey();
  if (!geminiKey) {
    return fallbackQuiz(topic);
  }

  const prompt = `Create a 3-question finance quiz for Project Alpha.
Topic: ${topic}
Difficulty: ${difficulty}
Mascot: Alpha Meow, a hype game-style finance coach.
Return only valid JSON with this shape:
{"title":"string","questions":[{"question":"string","options":["A","B","C","D"],"answerIndex":0,"explanation":"string"}]}
Explanations must be under 24 words and use a game analogy.`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.75,
          responseMimeType: 'application/json'
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API Error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const quiz = normalizeQuiz(text, topic);
    return quiz.questions.length ? quiz : fallbackQuiz(topic);
  } catch (error) {
    console.error('Gemini Error:', error.message);
    return fallbackQuiz(topic);
  }
};

module.exports = {
  chat,
  translateJargon,
  generateTradeAlert,
  generateQuiz,
  localCoachReply,
  getStatus: () => ({
    openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
    openaiAvailable: shouldTryOpenAI(),
    geminiConfigured: Boolean(getGeminiKey())
  })
};
