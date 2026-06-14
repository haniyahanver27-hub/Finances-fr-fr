#!/bin/bash

# PROJECT ALPHA Backend Startup & Test Guide

echo "================================"
echo "PROJECT ALPHA Backend Setup"
echo "================================"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
  echo "❌ Node.js not found. Please install Node.js first."
  exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo ""

# Navigate to server
cd "$(dirname "$0")/server" || exit 1

echo "📦 Installing dependencies..."
npm install 2>&1 | tail -20

echo ""
echo "🔍 Checking environment variables..."

# Check .env file
if [ ! -f .env ]; then
  echo "❌ .env file not found! Creating template..."
  cat > .env << 'EOF'
PORT=5001
HOST=127.0.0.1
OPENAI_API_KEY=sk-proj-YOUR_KEY_HERE
ELEVENLABS_API_KEY=sk_YOUR_KEY_HERE
FINNHUB_API_KEY=YOUR_KEY_HERE
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_KEY=YOUR_SUPABASE_SECRET_KEY
EOF
  echo "✅ Created .env template. Please fill in your API keys."
  echo "⚠️  Required keys:"
  echo "   - OPENAI_API_KEY (from https://platform.openai.com/api-keys)"
  echo "   - ELEVENLABS_API_KEY (from https://elevenlabs.io/app/api-keys)"
  echo "   - FINNHUB_API_KEY (from https://finnhub.io/)"
  echo "   - SUPABASE_URL and SUPABASE_KEY (from your Supabase project)"
  exit 1
else
  echo "✅ .env file found"
  
  # Check required keys
  if grep -q "OPENAI_API_KEY=sk-proj" .env; then
    echo "   ✅ OPENAI_API_KEY configured"
  else
    echo "   ⚠️  OPENAI_API_KEY not set or invalid"
  fi
  
  if grep -q "ELEVENLABS_API_KEY=sk_" .env; then
    echo "   ✅ ELEVENLABS_API_KEY configured"
  else
    echo "   ⚠️  ELEVENLABS_API_KEY not set or invalid"
  fi
  
  if grep -q "FINNHUB_API_KEY=" .env; then
    FINNHUB_KEY=$(grep "FINNHUB_API_KEY=" .env | cut -d= -f2)
    if [ -n "$FINNHUB_KEY" ] && [ "$FINNHUB_KEY" != "YOUR_KEY_HERE" ]; then
      echo "   ✅ FINNHUB_API_KEY configured"
    else
      echo "   ⚠️  FINNHUB_API_KEY not set"
    fi
  fi
  
  if grep -q "SUPABASE_URL=" .env; then
    SUPABASE_URL=$(grep "SUPABASE_URL=" .env | cut -d= -f2)
    if [ -n "$SUPABASE_URL" ] && [ "$SUPABASE_URL" != "https://YOUR_PROJECT.supabase.co" ]; then
      echo "   ✅ SUPABASE_URL configured"
    else
      echo "   ⚠️  SUPABASE_URL not set"
    fi
  fi
fi

echo ""
echo "✅ Running syntax check..."
npm test 2>&1 | head -30

echo ""
echo "================================"
echo "🚀 Starting Express server..."
echo "================================"
echo ""
echo "Server will run at http://127.0.0.1:5001"
echo "Health check: http://127.0.0.1:5001/health"
echo ""
echo "Available API endpoints:"
echo "  POST   /api/ai/chat              - Chat with Alpha Meow"
echo "  POST   /api/ai/jargon            - Translate financial terms"
echo "  POST   /api/sfx/meow             - Generate meow sound"
echo "  POST   /api/sfx/trade            - Generate trade sound"
echo "  GET    /api/stocks/quote/:symbol - Get stock quote"
echo "  GET    /api/stocks/search?q=...  - Search stocks"
echo "  POST   /api/trades/propose       - Create trade proposal"
echo "  POST   /api/trades/vote          - Vote on proposal"
echo "  GET    /api/trades/proposals/:clanId - Get active proposals"
echo "  GET    /api/trades/positions/:clanId - Get clan portfolio"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

npm run dev
