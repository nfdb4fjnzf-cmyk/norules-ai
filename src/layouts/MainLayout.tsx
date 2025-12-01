import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../contexts/AuthContext';

const MainLayout: React.FC = () => {
  const { t } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, userProfile, loading } = useAuth();

  React.useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-background text-white">Loading...</div>;
  }

  // Determine title based on path
  const getTitle = () => {
    const path = location.pathname;
    if (path === '/') return t('sidebar.dashboard');
    if (path.startsWith('/analyze')) return t('sidebar.analyze');
    if (path === '/history') return t('sidebar.history');
    if (path === '/billing') return t('sidebar.subscription');
    if (path.startsWith('/subscription')) return t('sidebar.subscription');
    if (path === '/settings') return t('common.settings');
    if (path.includes('apikeys')) return t('sidebar.apiKeys');
    return t('sidebar.dashboard');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background font-sans text-white">

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 w-full z-50 bg-background border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white rounded-md flex items-center justify-center overflow-hidden">
            <img src="/norules-logo.png" alt="Norules AI" className="w-full h-full object-cover" />
          </div>
          <span className="font-bold text-lg text-white">Norules AI</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          <span className="material-symbols-outlined">{isMobileMenuOpen ? 'close' : 'menu'}</span>
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 transform transition-transform duration-300 ease-in-out lg:translate-x-0 bg-[#151927] border-r border-border ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar
          isMobile={window.innerWidth < 1024}
          toggleMobileMenu={() => setIsMobileMenuOpen(false)}
        />
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 w-full h-full bg-background flex flex-col overflow-hidden pt-16 lg:pt-0">
        {/* Top Header / Profile Bar */}
        <header className="hidden lg:flex items-center justify-between px-8 py-5 border-b border-border bg-background/80 backdrop-blur-md z-10">
          <h2 className="text-xl font-bold capitalize text-white">{getTitle()}</h2>

          <div className="flex items-center gap-4">
            {/* Credits Display */}
            <div
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 rounded-full border border-blue-500/20 cursor-pointer hover:bg-blue-500/20 transition-colors mr-2"
              onClick={() => navigate('/subscription')}
              title="Click to buy credits"
            >
              <span className="material-symbols-outlined text-blue-400 text-sm">monetization_on</span>
              <span className="text-sm font-bold text-blue-100">{userProfile?.credits || 0} Credits</span>
            </div>

            <button className="relative p-2 text-secondary hover:text-primary transition-colors">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-2 right-2 w-2 h-2 bg-danger rounded-full border-2 border-background"></span>
            </button>
            <div className="flex items-center gap-3 pl-4 border-l border-border">
              <div className="text-right hidden xl:block">
                <p className="text-sm font-bold text-white">{user?.displayName || 'User'}</p>
                <p className="text-xs text-secondary capitalize">{userProfile?.mode || 'Internal'} Mode</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-purple-500 flex items-center justify-center text-white font-bold shadow-lg overflow-hidden">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="User" className="w-full h-full object-cover" />
                ) : (
                  <span>{user?.displayName?.charAt(0) || 'U'}</span>
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-6 w-full relative animate-fade-in">
          <Outlet />
        </div>
      </main>

      {/* Overlay for mobile sidebar */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      )}

    </div>
  );
};

export default MainLayout;
