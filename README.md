# ClanVest (Alpha Meow)

A gamified finance platform where clans collaborate on investment decisions through democratic voting. Built with React, Express, and Supabase.

## 🎯 Features

- **Clan-based Trading**: Form investment clans and vote on trades together
- **Real-time Chat**: Communicate with clan members
- **AI Financial Mentor**: Alpha Meow explains finance in gaming slang
- **Stock Data**: Real-time quotes, search, and candle charts via Finnhub
- **Gamification**: Earn badges for achievements (Diamond Hands, Meme King, etc.)
- **Leaderboard**: Track clan performance over time

## 🏗️ Architecture

- **Frontend**: React + Vite + React Router + Lucide Icons
- **Backend**: Express.js with rate limiting
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **AI**: OpenAI GPT-4o-mini for financial explanations
- **Stock Data**: Finnhub API

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- Supabase account and project
- OpenAI API key
- Finnhub API key

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd Finances-fr-fr
```

2. Install all dependencies:
```bash
npm run install:all
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your actual values:
```env
# Server
PORT=5001
OPENAI_API_KEY=your_openai_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
FINNHUB_API_KEY=your_finnhub_api_key_here

# Client
VITE_SUPABASE_URL=your_supabase_project_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

4. Set up Supabase database:
```bash
# Apply the migration file in supabase/migrations/001_initial_schema.sql
# through your Supabase dashboard SQL editor
```

### Development

Run both client and server:
```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:5001

Run individually:
```bash
npm run dev:client  # Frontend only
npm run dev:server  # Backend only
```

### Production Build

Build the frontend:
```bash
npm run build
```

Start production server:
```bash
npm start
```

## 🔑 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port (default: 5001) | No |
| `CLIENT_ORIGIN` | Allowed browser origin(s), comma-separated | No |
| `OPENAI_API_KEY` | OpenAI API key for chat and jargon features | No |
| `GEMINI_API_KEY` | Gemini API key for generated quizzes | No |
| `ELEVENLABS_API_KEY` | ElevenLabs API key for voice and sound effects | No |
| `FINNHUB_API_KEY` | Finnhub API key for stock data | Yes |
| `VITE_SUPABASE_URL` | Supabase project URL | Yes |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |

## 📦 Deployment

### Railway/Render

1. Connect your GitHub repository
2. Add environment variables in the deployment platform
3. Deploy - the Procfile will handle the rest

### Manual Deployment

1. Build the frontend: `npm run build`
2. Set environment variables on your server
3. Start the server: `npm start`

The Express server will serve the built React app from the `client/dist` folder.

## 🗄️ Database Schema

The application uses Supabase with the following main tables:
- `clans` - Investment clans with balances
- `profiles` - User profiles linked to Supabase auth
- `messages` - Real-time clan chat
- `trade_proposals` - Proposed trades for voting
- `votes` - User votes on proposals
- `trades` - Executed trades
- `positions` - Current portfolio holdings
- `badges` - Achievement badges
- `user_badges` - User earned badges
- `clan_snapshots` - Historical clan performance

All tables have Row Level Security (RLS) enabled.

## 🎮 API Endpoints

### Stock Data
- `GET /api/stocks/quote/:symbol` - Get stock quote
- `GET /api/stocks/search?q=query` - Search for stocks
- `GET /api/stocks/candles/:symbol` - Get candle chart data

### AI Features
- `POST /api/ai/chat` - Chat with Alpha Meow
- `POST /api/ai/jargon` - Translate financial jargon

### Health
- `GET /health` - Server health check

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite 8, React Router 7
- **Backend**: Express 5, CORS, rate limiting
- **Database**: Supabase (PostgreSQL)
- **AI**: OpenAI GPT-4o-mini
- **Stock Data**: Finnhub API
- **Styling**: CSS with Lucide React icons

## 📝 License

ISC
