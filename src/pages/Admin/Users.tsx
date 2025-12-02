import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { useToast } from '../../components/Toast';
import SkeletonLoader from '../../components/SkeletonLoader';
import { useTranslation } from 'react-i18next';

interface User {
    uid: string;
    email: string;
    displayName: string;
    credits: number;
    role?: string;
    subscription?: {
        plan: string;
        status: string;
    };
    lastLogin: string;
}

const AdminUsers: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const { showToast } = useToast();
    const { t } = useTranslation();

    // Modal State
    const [adjustModalOpen, setAdjustModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [adjustAmount, setAdjustAmount] = useState(0);
    const [adjustReason, setAdjustReason] = useState('');

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/admin/users?search=${search}`);
            if (res.data.success) {
                setUsers(res.data.data.users);
            }
        } catch (error) {
            console.error('Failed to fetch users', error);
            showToast('error', t('common.error'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => fetchUsers(), 500);
        return () => clearTimeout(timer);
    }, [search]);

    const handleAdjustCredits = async () => {
        if (!selectedUser || adjustAmount === 0) return;

        try {
            const type = adjustAmount > 0 ? 'ADD' : 'DEDUCT';
            const amount = Math.abs(adjustAmount);

            await api.post('/admin/user/credit-adjust', {
                userId: selectedUser.uid,
                amount,
                type,
                reason: adjustReason
            });

            showToast('success', t('admin.users.adjustModal.success'));
            setAdjustModalOpen(false);
            fetchUsers();
        } catch (error: any) {
            showToast('error', error.message || t('admin.users.adjustModal.failed'));
        }
    };

    return (
        <div className="p-8 animate-fade-in">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold text-white">{t('admin.users.title')}</h1>
                <div className="relative">
                    <input
                        type="text"
                        placeholder={t('admin.users.searchPlaceholder')}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="bg-[#151927] border border-white/10 rounded-lg px-4 py-2 text-white w-64 focus:border-blue-500 outline-none"
                    />
                    <span className="material-symbols-outlined absolute right-3 top-2.5 text-gray-500 text-sm">search</span>
                </div>
            </div>

            <div className="bg-[#151927] rounded-2xl border border-white/5 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-black/20 text-gray-400 text-xs uppercase font-semibold">
                        <tr>
                            <th className="px-6 py-4">{t('admin.users.table.user')}</th>
                            <th className="px-6 py-4">{t('admin.users.table.role')}</th>
                            <th className="px-6 py-4">{t('admin.users.table.status')}</th>
                            <th className="px-6 py-4">{t('admin.users.table.joined')}</th>
                            <th className="px-6 py-4">{t('admin.users.table.actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {loading ? (
                            <tr><td colSpan={5} className="p-6 text-center text-gray-500">{t('common.loading')}</td></tr>
                        ) : users.map((user) => (
                            <tr key={user.uid} className="hover:bg-white/5 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="text-white font-medium">{user.displayName || 'No Name'}</span>
                                        <span className="text-gray-500 text-xs">{user.email}</span>
                                        {user.role === 'admin' && <span className="text-red-400 text-[10px] uppercase font-bold mt-1">{t('admin.users.roles.admin')}</span>}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${user.subscription?.plan === 'ultra' ? 'bg-purple-500/20 text-purple-400' :
                                        user.subscription?.plan === 'pro' ? 'bg-blue-500/20 text-blue-400' :
                                            'bg-gray-500/20 text-gray-400'
                                        }`}>
                                        {user.subscription?.plan || t('subscription.plans.free')}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-white font-mono">{user.credits}</td>
                                <td className="px-6 py-4 text-gray-500 text-sm">
                                    {new Date(user.lastLogin).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4">
                                    <button
                                        onClick={() => {
                                            setSelectedUser(user);
                                            setAdjustAmount(0);
                                            setAdjustReason('');
                                            setAdjustModalOpen(true);
                                        }}
                                        className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                                    >
                                        {t('admin.users.actions.adjustCredits')}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Adjust Modal */}
            {adjustModalOpen && selectedUser && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-fade-in">
                    <div className="bg-[#1F2937] p-6 rounded-2xl w-96 border border-white/10">
                        <h3 className="text-xl font-bold text-white mb-4">{t('admin.users.adjustModal.title')}</h3>
                        <p className="text-gray-400 text-sm mb-4">{t('admin.users.adjustModal.user')}: {selectedUser.email}</p>

                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">{t('admin.users.adjustModal.amount')}</label>
                                <input
                                    type="number"
                                    value={adjustAmount}
                                    onChange={(e) => setAdjustAmount(parseInt(e.target.value) || 0)}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">{t('admin.users.adjustModal.reason')}</label>
                                <input
                                    type="text"
                                    value={adjustReason}
                                    onChange={(e) => setAdjustReason(e.target.value)}
                                    placeholder={t('admin.users.adjustModal.reasonPlaceholder')}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setAdjustModalOpen(false)}
                                className="px-4 py-2 text-gray-400 hover:text-white"
                            >
                                {t('admin.users.adjustModal.cancel')}
                            </button>
                            <button
                                onClick={handleAdjustCredits}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                            >
                                {t('admin.users.adjustModal.confirm')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminUsers;
