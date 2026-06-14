import { Home, MessageCircle, TrendingUp, Trophy, Gamepad2 } from 'lucide-react';

const TabNav = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'about', label: 'About', icon: <Home size={24} /> },
    { id: 'chat', label: 'Chat', icon: <MessageCircle size={24} />, notification: true },
    { id: 'market', label: 'Market', icon: <TrendingUp size={24} /> },
    { id: 'ranks', label: 'Ranks', icon: <Trophy size={24} />, notification: false },
    { id: 'info', label: 'Info Center', icon: <Gamepad2 size={24} /> },
  ];

  return (
    <nav className="tab-nav">
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={`tab-item ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => setActiveTab(tab.id)}
        >
          <div className="icon-wrapper">
            {tab.icon}
            {tab.notification && <div className="notification-dot"></div>}
          </div>
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
};

export default TabNav;
