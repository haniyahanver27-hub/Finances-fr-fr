# PROJECT ALPHA Backend - Complete Setup Guide

## Environment Configuration

### Required API Keys

Create `/server/.env` with these keys:

```env
# Server Config
PORT=5001
HOST=127.0.0.1

# OpenAI (for AI jargon translation)
OPENAI_API_KEY=sk-proj-YOUR_FULL_KEY

# ElevenLabs (for text-to-speech/audio generation)
ELEVENLABS_API_KEY=sk_YOUR_FULL_KEY

# Finnhub (for stock data)
FINNHUB_API_KEY=YOUR_API_KEY

# Supabase (database & auth)
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_KEY=YOUR_SERVICE_ROLE_KEY
```

### Getting API Keys

#### 1. OpenAI API Key
- Visit: https://platform.openai.com/api-keys
- Create new secret key
- Copy full key starting with `sk-proj-`
- Model used: `gpt-4o-mini` (cost-effective)

#### 2. ElevenLabs API Key
- Visit: https://elevenlabs.io/app/api-keys
- Get API key starting with `sk_`
- Default voice: `EXAVITQu4vr4xnSDxMaL` (Rachel)
- Endpoint: `https://api.elevenlabs.io/v1/text-to-speech/{voice_id}`

#### 3. Finnhub API Key
- Visit: https://finnhub.io/
- Sign up for free tier
- Get API key from dashboard
- Note: Free tier has 15-minute delayed stock data

#### 4. Supabase Credentials
- Visit: https://supabase.com/dashboard
- Select your PROJECT ALPHA project
- Go to Settings > API
- Copy `Project URL` → SUPABASE_URL
- Copy `Service Role secret` → SUPABASE_KEY (NOT anon key)

---

## Backend Architecture

### Routes Overview

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Server health check |
| `/api/ai/chat` | POST | Chat with Alpha Meow |
| `/api/ai/jargon` | POST | Translate financial terms |
| `/api/sfx/meow` | POST | Generate meow sound (ElevenLabs TTS) |
| `/api/sfx/trade` | POST | Generate trade alert sound |
| `/api/sfx/generate` | POST | Custom sound generation |
| `/api/stocks/quote/:symbol` | GET | Live stock quote (Finnhub) |
| `/api/stocks/search?q=query` | GET | Search stocks |
| `/api/stocks/candles/:symbol` | GET | Historical candlestick data |
| `/api/trades/propose` | POST | Create trade proposal for voting |
| `/api/trades/vote` | POST | Vote YES/NO on proposal |
| `/api/trades/proposals/:clan_id` | GET | Get active proposals |
| `/api/trades/positions/:clan_id` | GET | Get clan portfolio data |

### Services

#### aiService.js
- `chat(userMessage, context)` - OpenAI gpt-4o-mini chat
- `translateJargon(term)` - Convert financial terms to gaming slang
- `generateTradeAlert(tradeData)` - Create hype alert for executed trades

#### sfxService.js
- `generateSoundEffect(text, voiceId)` - ElevenLabs TTS API
  - Uses `/text-to-speech/{voice_id}` endpoint
  - Returns MP3 audio buffer
  - Error handling for invalid keys/rate limits

#### stockService.js
- `getQuote(symbol)` - Current price, daily change, high/low
- `searchSymbol(query)` - Find stock symbols
- `getCandles(symbol, resolution, from, to)` - Historical data

#### rateLimiter.js
- `aiLimiter` - 20 requests/15min for AI (OpenAI cost control)
- `ttsLimiter` - 30 requests/hour for audio generation
- `stocksLimiter` - 60 requests/min for stock data

---

## Database Schema

### Key Tables

#### clans
- `id` (UUID) - Clan ID
- `name` (TEXT) - Clan name
- `invite_code` (TEXT UNIQUE) - Invite code (e.g., "X7F9A")
- `balance` (NUMERIC) - Virtual cash ($100k starting)
- `created_at` (TIMESTAMP)

#### trade_proposals
- `id` (UUID) - Proposal ID
- `clan_id` (UUID FK) - Clan voting
- `proposer_id` (UUID FK) - User who proposed
- `symbol` (TEXT) - Stock ticker
- `action` (TEXT) - 'Buy' or 'Sell'
- `order_pct` (NUMERIC) - % of cash to trade (0-100)
- `status` (TEXT) - 'open', 'passed', 'failed', 'expired'
- `expires_at` (TIMESTAMP) - 1 hour from creation
- `created_at` (TIMESTAMP)

#### votes
- `id` (UUID) - Vote ID
- `proposal_id` (UUID FK) - Proposal being voted on
- `user_id` (UUID FK) - Voter
- `vote` (BOOLEAN) - true=YES, false=NO
- `timestamp` (TIMESTAMP)
- UNIQUE(proposal_id, user_id) - One vote per user per proposal

#### positions
- `id` (UUID) - Position ID
- `clan_id` (UUID FK) - Portfolio owner
- `symbol` (TEXT) - Stock ticker
- `quantity` (NUMERIC) - Shares held
- `avg_price` (NUMERIC) - Average cost basis
- UNIQUE(clan_id, symbol) - One position per stock per clan

#### trades
- `id` (UUID) - Trade ID
- `clan_id` (UUID FK) - Executing clan
- `user_id` (UUID FK) - Who triggered (via proposal)
- `proposal_id` (UUID FK) - Linked to vote
- `symbol` (TEXT) - Stock ticker
- `action` (TEXT) - 'Buy' or 'Sell'
- `quantity` (NUMERIC) - Shares transacted
- `price` (NUMERIC) - Price per share (mock: $100)
- `timestamp` (TIMESTAMP)

---

## Trade Execution Flow

1. **Propose** → POST `/api/trades/propose`
   - Create trade_proposal in 'open' status
   - Insert system message in chat
   - Expires in 1 hour

2. **Vote** → POST `/api/trades/vote`
   - Insert vote (YES/NO)
   - Check if vote is complete:
     - All members voted OR
     - Majority threshold reached
   - If complete:
     - Update proposal status ('passed' or 'failed')
     - If passed: Execute trade
     - Insert vote result message

3. **Execute** (internal function `executeTrade`)
   - Calculate trade amount (% of clan balance)
   - Create trade record
   - Update positions (Buy/Sell logic)
   - Update clan cash balance
   - Log execution

---

## Error Handling

### ElevenLabs Errors
- 401 Unauthorized → Invalid API key
- 503 Unavailable → Service down or quota exceeded
- Empty response → Fallback to synth sound on client

### Finnhub Errors
- 401 Unauthorized → Invalid API key
- 403 Forbidden → Subscription limitation
- 429 Rate Limited → Too many requests

### Supabase Errors
- `.single()` when no row → Use `.maybeSingle()` instead
- RLS violations → Check auth token & policies
- Missing foreign key → Clan/user must exist first

---

## Performance & Cost Optimization

### API Costs
- **OpenAI**: $0.001 per 1K input tokens (gpt-4o-mini cheap!)
  - Limit: 20 calls/15min per user
  - Strategy: Client-side keyword caching before API calls

- **ElevenLabs**: ~$0.30 per 1M characters
  - Limit: 30 calls/hour
  - Note: Free tier has monthly character limit

- **Finnhub**: Free tier = 60 API calls/min
  - 15-minute delayed data on free tier
  - Limit: 60 calls/min enforced by rate limiter

### Caching
- Financial keywords (150+ terms) cached locally
- Stock quotes cached in-browser (5-minute TTL optional)
- Avoid redundant TTS calls

---

## Testing Endpoints

### Health Check
```bash
curl http://localhost:5001/health
```

### Stock Quote
```bash
curl "http://localhost:5001/api/stocks/quote/AAPL"
```

### Stock Search
```bash
curl "http://localhost:5001/api/stocks/search?q=apple"
```

### AI Jargon
```bash
curl -X POST http://localhost:5001/api/ai/jargon \
  -H "Content-Type: application/json" \
  -d '{"term":"diversification"}'
```

### Create Trade Proposal
```bash
curl -X POST http://localhost:5001/api/trades/propose \
  -H "Content-Type: application/json" \
  -d '{
    "clan_id": "UUID_HERE",
    "proposer_id": "USER_UUID",
    "symbol": "AAPL",
    "action": "Buy",
    "order_pct": 25
  }'
```

### Vote on Proposal
```bash
curl -X POST http://localhost:5001/api/trades/vote \
  -H "Content-Type: application/json" \
  -d '{
    "proposal_id": "PROPOSAL_UUID",
    "user_id": "USER_UUID",
    "vote": true
  }'
```

---

## Troubleshooting

### "ELEVENLABS_API_KEY is missing"
- Check `.env` has correct key starting with `sk_`
- Restart server after changing `.env`
- Test on ElevenLabs website first

### "Finnhub rejected FINNHUB_API_KEY"
- Verify key is correct on https://finnhub.io/app/api-keys
- Check free tier hasn't exceeded limits

### Audio not playing in browser
- Check browser console for CORS errors
- Verify `Content-Type: audio/mpeg` in response headers
- Try fallback synth sound (should generate on client)

### Database errors
- Verify Supabase URL and key (SERVICE ROLE, not ANON)
- Check RLS policies allow your auth token
- Ensure foreign key references exist (clan_id, user_id)

---

## Deployment Checklist

- [ ] All `.env` keys filled with real values
- [ ] `npm install` completed
- [ ] `npm test` passes syntax check
- [ ] Health endpoint responds 200
- [ ] Can fetch stock quotes
- [ ] Can generate audio (test /api/sfx/meow)
- [ ] Can create proposals
- [ ] Vote execution updates portfolio
- [ ] Supabase realtime messages work
