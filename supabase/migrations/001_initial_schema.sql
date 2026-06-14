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

-- Create a profile as part of auth signup so email confirmation settings cannot
-- leave authenticated users without an application profile.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    requested_username TEXT;
BEGIN
    requested_username := NULLIF(TRIM(NEW.raw_user_meta_data ->> 'username'), '');
    IF EXISTS (SELECT 1 FROM public.profiles WHERE username = requested_username) THEN
        requested_username := NULL;
    END IF;

    BEGIN
        INSERT INTO public.profiles (id, username)
        VALUES (
            NEW.id,
            COALESCE(requested_username, 'trader-' || LEFT(NEW.id::TEXT, 8))
        )
        ON CONFLICT (id) DO NOTHING;
    EXCEPTION WHEN unique_violation THEN
        INSERT INTO public.profiles (id, username)
        VALUES (NEW.id, 'trader-' || LEFT(NEW.id::TEXT, 8))
        ON CONFLICT (id) DO NOTHING;
    END;

    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

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

-- Index foreign keys and high-traffic filters used by chat, voting, and leaderboards.
CREATE INDEX idx_profiles_clan_id ON profiles (clan_id);
CREATE INDEX idx_messages_clan_timestamp ON messages (clan_id, timestamp DESC);
CREATE INDEX idx_messages_user_id ON messages (user_id);
CREATE INDEX idx_trade_proposals_clan_status ON trade_proposals (clan_id, status, created_at DESC);
CREATE INDEX idx_trade_proposals_proposer_id ON trade_proposals (proposer_id);
CREATE INDEX idx_votes_proposal_id ON votes (proposal_id);
CREATE INDEX idx_votes_user_id ON votes (user_id);
CREATE INDEX idx_trades_clan_timestamp ON trades (clan_id, timestamp DESC);
CREATE INDEX idx_trades_user_id ON trades (user_id);
CREATE INDEX idx_trades_proposal_id ON trades (proposal_id);
CREATE INDEX idx_positions_clan_symbol ON positions (clan_id, symbol);
CREATE INDEX idx_user_badges_user_id ON user_badges (user_id);
CREATE INDEX idx_user_badges_badge_id ON user_badges (badge_id);
CREATE INDEX idx_clan_snapshots_date_return ON clan_snapshots (date DESC, daily_return_pct DESC);

CREATE OR REPLACE FUNCTION public.current_user_clan_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT clan_id FROM public.profiles WHERE id = (SELECT auth.uid())
$$;

-- Clan membership changes are atomic and intentionally bypass table RLS only
-- after checking the authenticated caller.
CREATE OR REPLACE FUNCTION public.create_clan(clan_name TEXT)
RETURNS SETOF public.clans
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    caller_id UUID := (SELECT auth.uid());
    clean_name TEXT := NULLIF(TRIM(clan_name), '');
    created_clan public.clans;
    affected_rows INTEGER;
BEGIN
    IF caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;
    IF clean_name IS NULL OR CHAR_LENGTH(clean_name) > 60 THEN
        RAISE EXCEPTION 'Clan name must be between 1 and 60 characters';
    END IF;
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = caller_id AND clan_id IS NOT NULL) THEN
        RAISE EXCEPTION 'You already belong to a clan';
    END IF;

    LOOP
        BEGIN
            INSERT INTO public.clans (name, invite_code)
            VALUES (clean_name, UPPER(LEFT(REPLACE(uuid_generate_v4()::TEXT, '-', ''), 6)))
            RETURNING * INTO created_clan;
            EXIT;
        EXCEPTION WHEN unique_violation THEN
            NULL;
        END;
    END LOOP;

    UPDATE public.profiles SET clan_id = created_clan.id WHERE id = caller_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows <> 1 THEN
        RAISE EXCEPTION 'Profile not found for authenticated user';
    END IF;
    RETURN NEXT created_clan;
END;
$$;

CREATE OR REPLACE FUNCTION public.join_clan(invite_code_input TEXT)
RETURNS SETOF public.clans
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    caller_id UUID := (SELECT auth.uid());
    clean_code TEXT := UPPER(NULLIF(TRIM(invite_code_input), ''));
    matched_clan public.clans;
    affected_rows INTEGER;
BEGIN
    IF caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;
    IF clean_code IS NULL OR CHAR_LENGTH(clean_code) > 12 THEN
        RAISE EXCEPTION 'Invalid invite code';
    END IF;
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = caller_id AND clan_id IS NOT NULL) THEN
        RAISE EXCEPTION 'You already belong to a clan';
    END IF;

    SELECT * INTO matched_clan
    FROM public.clans
    WHERE invite_code = clean_code;

    IF matched_clan.id IS NULL THEN
        RAISE EXCEPTION 'Invalid invite code';
    END IF;

    UPDATE public.profiles SET clan_id = matched_clan.id WHERE id = caller_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows <> 1 THEN
        RAISE EXCEPTION 'Profile not found for authenticated user';
    END IF;
    RETURN NEXT matched_clan;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.current_user_clan_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_clan(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.join_clan(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_clan_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_clan(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_clan(TEXT) TO authenticated;


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
    FOR SELECT TO authenticated USING (
        id = (SELECT public.current_user_clan_id())
    );

-- 2. Profiles
CREATE POLICY "Users can read their own profile" ON profiles
    FOR SELECT TO authenticated USING (id = (SELECT auth.uid()));
CREATE POLICY "Users can read profiles in their clan" ON profiles
    FOR SELECT TO authenticated USING (
        clan_id = (SELECT public.current_user_clan_id())
    );
CREATE POLICY "Users can insert their own profile" ON profiles
    FOR INSERT TO authenticated WITH CHECK (id = (SELECT auth.uid()));

-- 3. Messages
CREATE POLICY "Users read own clan messages" ON messages
    FOR SELECT TO authenticated USING (
        clan_id = (SELECT public.current_user_clan_id())
    );
CREATE POLICY "Users insert messages for own clan" ON messages
    FOR INSERT TO authenticated WITH CHECK (
        clan_id = (SELECT public.current_user_clan_id())
        AND user_id = (SELECT auth.uid())
    );

-- 4. Trade Proposals
CREATE POLICY "Users read own clan proposals" ON trade_proposals
    FOR SELECT TO authenticated USING (
        clan_id = (SELECT public.current_user_clan_id())
    );
CREATE POLICY "Users insert proposals for own clan" ON trade_proposals
    FOR INSERT TO authenticated WITH CHECK (
        clan_id = (SELECT public.current_user_clan_id())
        AND proposer_id = (SELECT auth.uid())
    );
-- System / trigger handles updates

-- 5. Votes
CREATE POLICY "Users read own clan votes" ON votes
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM trade_proposals tp 
            WHERE tp.id = proposal_id 
            AND tp.clan_id = (SELECT public.current_user_clan_id())
        )
    );
CREATE POLICY "Users cast one vote per proposal" ON votes
    FOR INSERT TO authenticated WITH CHECK (
        user_id = (SELECT auth.uid())
        AND NOT EXISTS (
            SELECT 1 FROM votes v WHERE v.proposal_id = proposal_id AND v.user_id = (SELECT auth.uid())
        )
    );

-- 6. Trades, Positions, Badges, User Badges, Snapshots
-- Trades & Positions are read-only for clan members (inserted by system)
CREATE POLICY "Users read own clan trades" ON trades
    FOR SELECT TO authenticated USING (
        clan_id = (SELECT public.current_user_clan_id())
    );
CREATE POLICY "Users read own clan positions" ON positions
    FOR SELECT TO authenticated USING (
        clan_id = (SELECT public.current_user_clan_id())
    );

-- Badges catalog is readable by all authenticated users
CREATE POLICY "Anyone can read badges" ON badges
    FOR SELECT TO authenticated USING (TRUE);

-- User Badges read-only for the user
CREATE POLICY "Users read own earned badges" ON user_badges
    FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));

-- Clan Snapshots (Public leaderboard)
CREATE POLICY "Anyone can read clan snapshots for leaderboard" ON clan_snapshots
    FOR SELECT TO authenticated USING (TRUE);
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
