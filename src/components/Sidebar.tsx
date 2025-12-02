import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  isMobile: boolean;
  toggleMobileMenu: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isMobile, toggleMobileMenu }) => {
  const { t } = useTranslation();
  const { userProfile } = useAuth();

  const menuItems = [
    { path: '/', label: t('sidebar.dashboard'), icon: 'dashboard' },
    { path: '/analyze', label: t('sidebar.analyze'), icon: 'gavel' },
    { path: '/history', label: t('sidebar.history'), icon: 'history' },
    { path: '/llm', label: t('sidebar.playground'), icon: 'science' },
    { path: '/subscription', label: t('sidebar.subscription'), icon: 'credit_card' },
    { path: '/settings/apikeys', label: t('sidebar.apiKeys'), icon: 'key' },
    { path: '/settings/external-key', label: t('sidebar.externalKey'), icon: 'vpn_key' },
  ];

  const planName = userProfile?.subscription?.plan || (userProfile as any)?.plan || 'free';
  const credits = userProfile?.credits || 0;

  return (
    <div className="h-full flex flex-col justify-between transition-colors">
      <div>
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-glow overflow-hidden">
            <img src="/norules-logo.png" alt="Norules AI" className="w-full h-full object-cover" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">Norules AI</span>
        </div>

        <nav className="px-3 space-y-1">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => isMobile && toggleMobileMenu()}
              className={({ isActive }) => cn(
                "w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-button transition-all duration-200",
                isActive
                  ? "bg-primary text-primary-foreground shadow-glow"
                  : "text-secondary hover:bg-background-card hover:text-white"
              )}
            >
              <span className="material-symbols-outlined">
                {item.icon}
              </span>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="p-4 space-y-4">
        <LanguageSwitcher />

        <div className="bg-background-card border border-border rounded-card p-4 text-white">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-warning text-sm">star</span>
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
              {planName === 'free' ? t('sidebar.widget.freePlan') : `${planName} Plan`}
            </span>
          </div>
          <p className="text-sm text-gray-300 mb-3">
            {credits} Credits Remaining
          </p>
          <NavLink to="/subscription/plans" className="block w-full py-2 bg-white/5 hover:bg-white/10 rounded-button text-sm font-medium transition-colors text-center border border-white/5">
            {t('sidebar.widget.upgrade')}
          </NavLink>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
