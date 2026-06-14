import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import TabNav from './components/TabNav';
import AboutPage from './pages/AboutPage';
import ClanChatPage from './pages/ClanChatPage';
import MarketFloorPage from './pages/MarketFloorPage';
import CampusStandings from './pages/CampusStandings';
import InfoCenterPage from './pages/InfoCenterPage';
import AuthModal from './components/AuthModal';
import ClanSetup from './components/ClanSetup';
import AlphaMeow from './components/AlphaMeow';
import { watchlist } from './data/demoContent';

const startingPortfolio = {
  cash: 100000,
  positions: [
    { symbol: 'NVDA', quantity: 18, avgPrice: 112.4 },
    { symbol: 'SPY', quantity: 34, avgPrice: 512.9 }
  ],
  trades: []
};

const startingMessages = [
  {
    id: 'briefing',
    content: 'DIVERSIFICATION means not putting all your gaming loot into just one inventory chest. Spread it out!',
    is_ai: true
  },
  {
    id: 'm1',
    user_id: 'alex',
    profiles: { username: 'Alex' },
    content: 'We should buy Nvidia or short Apple. NVDA has momentum.'
  },
  {
    id: 'm2',
    user_id: 'sam',
    profiles: { username: 'Sam' },
    content: 'Our portfolio needs diversification before we whale into one ticker.'
  }
];

function App() {
  const [activeTab, setActiveTab] = useState('about');
  const [session, setSession] = useState(null);
  const [demoUser, setDemoUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [portfolio, setPortfolio] = useState(startingPortfolio);
  const [demoMessages, setDemoMessages] = useState(startingMessages);
  const [tradeProposals, setTradeProposals] = useState([
    {
      id: 'proposal-1',
      proposer: 'Alex',
      symbol: 'NVDA',
      action: 'Buy',
      orderPct: 5,
      approvals: ['alex'],
      denials: [],
      status: 'open'
    }
  ]);

  const fetchProfile = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, clans(*)')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setUserProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setUserProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setLoading(false);
    }).catch((error) => {
      console.error('Error restoring session:', error);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const renderTab = () => {
    const sharedProps = {
      portfolio,
      setPortfolio,
      tradeProposals,
      setTradeProposals,
      watchlist,
      demoMessages,
      setDemoMessages,
      isDemo: Boolean(demoUser)
    };

    switch (activeTab) {
      case 'about': return <AboutPage onStart={() => setActiveTab('chat')} />;
      case 'chat': return <ClanChatPage session={session || {user: demoUser}} profile={userProfile} {...sharedProps} />;
      case 'market': return <MarketFloorPage portfolio={portfolio} watchlist={watchlist} />;
      case 'ranks': return <CampusStandings portfolio={portfolio} profile={userProfile} />;
      case 'info': return <InfoCenterPage />;
      default: return <AboutPage onStart={() => setActiveTab('chat')} />;
    }
  };

  if (loading) {
    return <div className="app-container" style={{justifyContent: 'center', alignItems: 'center'}}>
      <div className="glow-green" style={{width: 50, height: 50, borderRadius: '50%', background: 'var(--accent-cyan)'}}></div>
    </div>;
  }

  const isAuth = session || demoUser;

  const handleDemoLogin = () => {
    setDemoUser({ id: 'demo-123', email: 'demo@futurefortune.com' });
    setUserProfile({
      id: 'demo-123',
      username: 'DemoTrader',
      clan_id: 'demo-clan-456',
      clans: { name: 'Demo Alpha Clan', invite_code: 'DEMO99', balance: 100000 }
    });
  };

  return (
    <div className={`app-container tab-${activeTab}`}>
      {!isAuth && <AuthModal onAuthSuccess={() => {}} onDemoLogin={handleDemoLogin} />}

      {isAuth && !userProfile?.clan_id && (
        <ClanSetup user={(session || {user: demoUser}).user} onClanJoined={() => fetchProfile((session || {user: demoUser}).user.id)} />
      )}

      <main className="content-area">
        {renderTab()}
      </main>

      {isAuth && <AlphaMeow context={demoMessages.slice(-6)} />}

      <TabNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}

export default App;
