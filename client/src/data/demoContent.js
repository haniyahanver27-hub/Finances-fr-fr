export const financialKeywords = [
  'alpha',
  'ask',
  'bear market',
  'bid',
  'blue chip',
  'bond',
  'bull market',
  'diversification',
  'dividend',
  'earnings',
  'eps',
  'etf',
  'expense ratio',
  'index fund',
  'ipo',
  'liquidity',
  'margin',
  'market cap',
  'options',
  'p/e ratio',
  'portfolio',
  'rebalancing',
  'risk tolerance',
  'shorting',
  'spread',
  'stop loss',
  'volatility',
  'volume',
  'yield'
];

export const localJargon = {
  diversification: 'Do not stash all your loot in one chest. Spread gear across builds so one nerf does not wipe you.',
  portfolio: 'Your full inventory of stocks, cash, and moves your clan is carrying into the match.',
  shorting: 'You are betting the boss loses HP. If the stock drops, your squad gets paid.',
  'p/e ratio': 'Price versus earnings is like gold cost versus damage. High price needs serious stats to justify it.',
  'market cap': 'The company guild size: share price times all shares. Bigger cap means a bigger overall castle.',
  volatility: 'Wild price swings. Think ranked mode with huge crits, sudden wipes, and big comeback potential.',
  dividend: 'Passive coin drops paid to holders while they keep the item equipped.',
  etf: 'A bundle pack of stocks. One buy gives you a whole starter inventory.',
  ipo: 'A company entering public servers for the first time. Hype can be real, but launch day is chaotic.',
  liquidity: 'How fast you can sell loot without tanking the auction house price.',
  margin: 'Borrowed coins for bigger plays. More power, but the damage hits harder if wrong.',
  'bull market': 'Most stocks are buffed and climbing. The server has an XP boost.',
  'bear market': 'Most stocks are nerfed and falling. Protect HP before chasing loot.'
};

export const watchlist = [
  { symbol: 'NVDA', name: 'NVIDIA', price: 126.42, change: 2.8, theme: '#22c55e', points: [18, 24, 20, 34, 30, 42, 52] },
  { symbol: 'AAPL', name: 'Apple', price: 203.16, change: -0.7, theme: '#ef4444', points: [44, 42, 45, 39, 36, 34, 31] },
  { symbol: 'MSFT', name: 'Microsoft', price: 481.05, change: 1.2, theme: '#06b6d4', points: [24, 28, 25, 31, 37, 35, 44] },
  { symbol: 'TSLA', name: 'Tesla', price: 178.74, change: 4.4, theme: '#f59e0b', points: [14, 34, 20, 42, 31, 48, 56] },
  { symbol: 'SPY', name: 'S&P 500 ETF', price: 547.91, change: 0.4, theme: '#a855f7', points: [30, 32, 31, 34, 36, 35, 38] },
  { symbol: 'DIS', name: 'Disney', price: 94.28, change: -1.6, theme: '#f43f5e', points: [48, 44, 39, 41, 35, 32, 28] }
];

export const leaderboard = [
  { clan: 'Pixel Bulls', campus: 'North High', returnPct: 8.4, badges: ['Whale', 'Alpha Voter'] },
  { clan: 'Demo Alpha Clan', campus: 'Codex Campus', returnPct: 5.7, badges: ['Diamond Hands', 'Jargon Slayer'] },
  { clan: 'Dividend Demons', campus: 'West College', returnPct: 3.2, badges: ['First Blood'] },
  { clan: 'Index Ninjas', campus: 'East High', returnPct: 1.6, badges: ['Diamond Paws'] },
  { clan: 'Bear Trap Club', campus: 'South College', returnPct: -0.8, badges: ['Meme King'] }
];

export const badgeCatalog = [
  { name: 'Diamond Hands', icon: 'Gem', description: 'Hold through a sharp dip.' },
  { name: 'Meme King', icon: 'Crown', description: 'Profit from a high-volatility pick.' },
  { name: 'Whale', icon: 'Waves', description: 'Put 40%+ into one asset.' },
  { name: 'Alpha Voter', icon: 'Vote', description: 'Vote on 20 proposals.' },
  { name: 'Jargon Slayer', icon: 'BookOpen', description: 'Bust 50 finance terms.' }
];

export const lessonDeck = [
  {
    title: 'Diversification',
    body: 'Spread picks across sectors so one bad trade does not wipe the squad.'
  },
  {
    title: 'Position Size',
    body: 'A good idea can still be too large. Size trades so one miss stays survivable.'
  },
  {
    title: 'Market Cap',
    body: 'Large caps move like tanks. Small caps move like speed builds: faster, riskier.'
  },
  {
    title: 'Stop Loss',
    body: 'A stop loss is your escape key. It protects capital when the match flips.'
  }
];

export const blockShapes = [
  { name: 'Line', cells: [[0, 0], [1, 0], [2, 0]], color: '#06b6d4' },
  { name: 'Stack', cells: [[0, 0], [0, 1], [0, 2]], color: '#22c55e' },
  { name: 'Corner', cells: [[0, 0], [1, 0], [0, 1]], color: '#f59e0b' },
  { name: 'Square', cells: [[0, 0], [1, 0], [0, 1], [1, 1]], color: '#a855f7' }
];
