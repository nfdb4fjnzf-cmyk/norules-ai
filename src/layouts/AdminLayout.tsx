import React, { useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { useTranslation } from 'react-i18next';

const AdminLayout: React.FC = () => {
    const { userProfile, loading } = useAuth();
    const navigate = useNavigate();
    const { t } = useTranslation();

    useEffect(() => {
        if (!loading) {
            if (!userProfile || userProfile.role !== 'admin') {
                navigate('/dashboard');
            }
        }
    }, [userProfile, loading, navigate]);

    if (loading) return <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center text-white">{t('common.loading')}</div>;

    const menuItems = [
        { path: '/admin', label: t('admin.menu.overview'), icon: 'dashboard' },
        { path: '/admin/users', label: t('admin.menu.users'), icon: 'group' },
        { path: '/admin/credits', label: t('admin.menu.credits'), icon: 'payments' },
        { path: '/admin/subscriptions', label: t('admin.menu.subscriptions'), icon: 'card_membership' },
        { path: '/admin/moderation', label: t('admin.menu.moderation'), icon: 'gavel' },
    ];

    return (
        <div className="flex h-screen bg-[#0B0E14] text-white overflow-hidden font-sans">
            {/* Admin Sidebar */}
            <aside className="w-64 bg-[#151927] border-r border-white/5 flex flex-col">
                <div className="p-6 flex items-center gap-3">
                    <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
                        <span className="material-symbols-outlined text-white text-sm">admin_panel_settings</span>
                    </div>
                    <span className="text-lg font-bold tracking-tight">{t('admin.menu.console')}</span>
                </div>

                <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
                    {menuItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.path === '/admin'}
                            className={({ isActive }) => cn(
                                "w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200",
                                isActive
                                    ? "bg-red-500/10 text-red-400 border border-red-500/20"
                                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                            )}
                        >
                            <span className="material-symbols-outlined">{item.icon}</span>
                            {item.label}
                        </NavLink>
                    ))}
                </nav>

                <div className="p-4 border-t border-white/5">
                    <NavLink to="/dashboard" className="flex items-center gap-3 px-4 py-3 text-sm text-gray-400 hover:text-white transition-colors">
                        <span className="material-symbols-outlined">logout</span>
                        {t('admin.menu.exit')}
                    </NavLink>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto bg-[#0B0E14]">
                <Outlet />
            </main>
        </div>
    );
};

export default AdminLayout;
