import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import TabNav from './components/TabNav';
import AboutPage from './pages/AboutPage';
import ClanChatPage from './pages/ClanChatPage';
import MarketFloorPage from './pages/MarketFloorPage';
import CampusStandings from './pages/CampusStandings';
import InfoCenterPage from './pages/InfoCenterPage';
import AuthModal from './components/AuthModal';
import ClanSetup from './components/ClanSetup';
// import AlphaMeow from './components/AlphaMeow'; // To be added later

function App() {
  const [activeTab, setActiveTab] = useState('about');
  const [session, setSession] = useState(null);
  const [demoUser, setDemoUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setUserProfile(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, clans(*)')
        .eq('id', userId)
        .single();
        
      if (!error && data) {
        setUserProfile(data);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderTab = () => {
    switch (activeTab) {
      case 'about': return <AboutPage />;
      case 'chat': return <ClanChatPage session={session || {user: demoUser}} profile={userProfile} />;
      case 'market': return <MarketFloorPage />;
      case 'ranks': return <CampusStandings />;
      case 'info': return <InfoCenterPage />;
      default: return <AboutPage />;
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
      clans: { name: 'Demo Alpha Clan', invite_code: 'DEMO99' }
    });
  };

  return (
    <div className="app-container">
      {!isAuth && <AuthModal onAuthSuccess={() => {}} onDemoLogin={handleDemoLogin} />}
      
      {isAuth && !userProfile?.clan_id && (
        <ClanSetup user={(session || {user: demoUser}).user} onClanJoined={(clan) => fetchProfile((session || {user: demoUser}).user.id)} />
      )}
      
      <main className="content-area">
        {renderTab()}
      </main>
      
      {/* <AlphaMeow /> */}
      
      <TabNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}

export default App;
