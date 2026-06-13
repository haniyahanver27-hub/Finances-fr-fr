-- Initial Schema for ClanVest (Alpha Meow)

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Clans Table
CREATE TABLE clans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    invite_code TEXT UNIQUE NOT NULL,
    balance NUMERIC(15, 2) DEFAULT 100000.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Profiles Table (extends auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    avatar_url TEXT,
    clan_id UUID REFERENCES clans(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Messages Table (Real-time chat)
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clan_id UUID REFERENCES clans(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_ai BOOLEAN DEFAULT FALSE,
    message_type TEXT DEFAULT 'chat' -- 'chat', 'trade_alert', 'vote_result'
);

-- 4. Trade Proposals Table (Voting system)
CREATE TABLE trade_proposals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clan_id UUID REFERENCES clans(id) ON DELETE CASCADE,
    proposer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('Buy', 'Sell')),
    order_pct NUMERIC(5, 2) NOT NULL,
    quantity NUMERIC(15, 6),
    price_at_proposal NUMERIC(15, 2),
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'passed', 'failed', 'expired')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- 5. Votes Table
CREATE TABLE votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proposal_id UUID REFERENCES trade_proposals(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    vote BOOLEAN NOT NULL, -- TRUE for approve, FALSE for deny
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(proposal_id, user_id)
);

-- 6. Trades Table (Executed trades)
CREATE TABLE trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clan_id UUID REFERENCES clans(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    proposal_id UUID REFERENCES trade_proposals(id) ON DELETE SET NULL,
    symbol TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('Buy', 'Sell')),
    quantity NUMERIC(15, 6) NOT NULL,
    price NUMERIC(15, 2) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Positions Table (Portfolio holdings)
CREATE TABLE positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clan_id UUID REFERENCES clans(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    quantity NUMERIC(15, 6) NOT NULL,
    avg_price NUMERIC(15, 2) NOT NULL,
    UNIQUE(clan_id, symbol)
);

-- 8. Badges Table
CREATE TABLE badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL,
    criteria_type TEXT NOT NULL,
    criteria_value TEXT NOT NULL
);

-- 9. User Badges Table
CREATE TABLE user_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    badge_id UUID REFERENCES badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, badge_id)
);

-- 10. Clan Snapshots Table (Leaderboard history)
CREATE TABLE clan_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clan_id UUID REFERENCES clans(id) ON DELETE CASCADE,
    date DATE DEFAULT CURRENT_DATE,
    total_value NUMERIC(15, 2) NOT NULL,
    daily_return_pct NUMERIC(7, 4),
    UNIQUE(clan_id, date)
);

-----------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-----------------------------------------

-- Enable RLS on all tables
ALTER TABLE clans ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE clan_snapshots ENABLE ROW LEVEL SECURITY;

-- 1. Clans
CREATE POLICY "Users can read own clan" ON clans
    FOR SELECT USING (
        id = (SELECT clan_id FROM profiles WHERE id = auth.uid())
    );
CREATE POLICY "Authenticated users can create clans" ON clans
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
-- (Optional: add update policy for clan creator if implemented)

-- 2. Profiles
CREATE POLICY "Users can read their own profile" ON profiles
    FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users can read profiles in their clan" ON profiles
    FOR SELECT USING (
        clan_id = (SELECT clan_id FROM profiles WHERE id = auth.uid())
    );
CREATE POLICY "Users can insert their own profile" ON profiles
    FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (id = auth.uid());

-- 3. Messages
CREATE POLICY "Users read own clan messages" ON messages
    FOR SELECT USING (
        clan_id = (SELECT clan_id FROM profiles WHERE id = auth.uid())
    );
CREATE POLICY "Users insert messages for own clan" ON messages
    FOR INSERT WITH CHECK (
        clan_id = (SELECT clan_id FROM profiles WHERE id = auth.uid())
        AND user_id = auth.uid()
    );

-- 4. Trade Proposals
CREATE POLICY "Users read own clan proposals" ON trade_proposals
    FOR SELECT USING (
        clan_id = (SELECT clan_id FROM profiles WHERE id = auth.uid())
    );
CREATE POLICY "Users insert proposals for own clan" ON trade_proposals
    FOR INSERT WITH CHECK (
        clan_id = (SELECT clan_id FROM profiles WHERE id = auth.uid())
        AND proposer_id = auth.uid()
    );
-- System / trigger handles updates

-- 5. Votes
CREATE POLICY "Users read own clan votes" ON votes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM trade_proposals tp 
            WHERE tp.id = proposal_id 
            AND tp.clan_id = (SELECT clan_id FROM profiles WHERE id = auth.uid())
        )
    );
CREATE POLICY "Users cast one vote per proposal" ON votes
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
        AND NOT EXISTS (
            SELECT 1 FROM votes v WHERE v.proposal_id = proposal_id AND v.user_id = auth.uid()
        )
    );

-- 6. Trades, Positions, Badges, User Badges, Snapshots
-- Trades & Positions are read-only for clan members (inserted by system)
CREATE POLICY "Users read own clan trades" ON trades
    FOR SELECT USING (
        clan_id = (SELECT clan_id FROM profiles WHERE id = auth.uid())
    );
CREATE POLICY "Users read own clan positions" ON positions
    FOR SELECT USING (
        clan_id = (SELECT clan_id FROM profiles WHERE id = auth.uid())
    );

-- Badges catalog is readable by all authenticated users
CREATE POLICY "Anyone can read badges" ON badges
    FOR SELECT USING (auth.role() = 'authenticated');

-- User Badges read-only for the user
CREATE POLICY "Users read own earned badges" ON user_badges
    FOR SELECT USING (user_id = auth.uid());

-- Clan Snapshots (Public leaderboard)
CREATE POLICY "Anyone can read clan snapshots for leaderboard" ON clan_snapshots
    FOR SELECT USING (auth.role() = 'authenticated');

-----------------------------------------
-- SEED DATA (Badges)
-----------------------------------------
INSERT INTO badges (name, description, icon, criteria_type, criteria_value) VALUES
('Diamond Hands', 'Hold a volatile asset through a >10% dip', '💎', 'hold_dip', '10'),
('Meme King', 'Turn a profit on a stock matching a pre-defined volatility threshold', '👑', 'profit_volatile', 'true'),
('Whale', 'Allocate more than 40% of capital into a single asset', '🐳', 'allocate_pct', '40'),
('First Blood', 'Execute your clan''s first trade', '🩸', 'trade_count', '1'),
('Alpha Voter', 'Vote on 20+ trade proposals', '🗳️', 'vote_count', '20'),
('Jargon Slayer', 'Look up 50+ financial terms', '📚', 'jargon_lookups', '50'),
('Diamond Paws', '5-day active streak', '🔥', 'active_streak', '5');
