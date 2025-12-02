import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import SkeletonLoader from '../../components/SkeletonLoader';

interface AdminStats {
    totalUsers: number;
    dau: number;
    activeSubscriptions: number;
    estimatedMonthlyRevenue: number;
    usage: {
        totalOperations: number;
        failedOperations: number;
        errorRate: number;
        totalCreditsConsumed: number;
    };
}

const StatCard: React.FC<{ title: string; value: string | number; subValue?: string; icon: string; color: string }> = ({ title, value, subValue, icon, color }) => (
    <div className="bg-[#151927] p-6 rounded-2xl border border-white/5 hover:border-white/10 transition-all">
        <div className="flex justify-between items-start mb-4">
            <div>
                <p className="text-gray-400 text-sm font-medium mb-1">{title}</p>
                <h3 className="text-3xl font-bold text-white">{value}</h3>
            </div>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-${color}-500/10`}>
                <span className={`material-symbols-outlined text-${color}-400`}>{icon}</span>
            </div>
        </div>
        {subValue && <p className="text-sm text-gray-500">{subValue}</p>}
    </div>
);

const AdminDashboard: React.FC = () => {
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await api.get('/admin/stats');
                if (res.data.success) {
                    setStats(res.data.data);
                }
            } catch (error) {
                console.error('Failed to fetch admin stats', error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="p-8 space-y-8">
                <SkeletonLoader type="large" className="w-48 mb-8" />
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => <SkeletonLoader key={i} type="card" className="h-32" />)}
                </div>
            </div>
        );
    }

    if (!stats) return <div className="p-8 text-red-400">Failed to load stats</div>;

    return (
        <div className="p-8 animate-fade-in">
            <h1 className="text-2xl font-bold text-white mb-8">Platform Overview</h1>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <StatCard
                    title="Total Users"
                    value={stats.totalUsers}
                    icon="group"
                    color="blue"
                />
                <StatCard
                    title="Daily Active Users"
                    value={stats.dau}
                    subValue={`${((stats.dau / stats.totalUsers) * 100).toFixed(1)}% Engagement`}
                    icon="trending_up"
                    color="green"
                />
                <StatCard
                    title="Active Subscriptions"
                    value={stats.activeSubscriptions}
                    subValue={`Est. Rev: $${stats.estimatedMonthlyRevenue}`}
                    icon="card_membership"
                    color="purple"
                />
                <StatCard
                    title="Credits Consumed (24h)"
                    value={stats.usage.totalCreditsConsumed}
                    subValue={`${stats.usage.totalOperations} Ops`}
                    icon="bolt"
                    color="yellow"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[#151927] p-6 rounded-2xl border border-white/5">
                    <h3 className="text-lg font-bold text-white mb-4">System Health</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-4 bg-black/20 rounded-xl">
                            <span className="text-gray-400">Error Rate (24h)</span>
                            <span className={`font-bold ${stats.usage.errorRate > 0.05 ? 'text-red-400' : 'text-green-400'}`}>
                                {(stats.usage.errorRate * 100).toFixed(2)}%
                            </span>
                        </div>
                        <div className="flex justify-between items-center p-4 bg-black/20 rounded-xl">
                            <span className="text-gray-400">Failed Operations</span>
                            <span className="text-white font-bold">{stats.usage.failedOperations}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
