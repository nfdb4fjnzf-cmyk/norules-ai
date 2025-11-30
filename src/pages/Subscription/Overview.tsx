import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import SkeletonLoader from '../../components/SkeletonLoader';
import { useToast } from '../../components/Toast';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { Calendar, Clock, CreditCard, History, ArrowUpCircle, CheckCircle } from 'lucide-react';

interface SubscriptionData {
    plan: string;
    billingCycle: string;
    dailyLimit: number;
    startDate?: string;
    endDate?: string;
    nextBillingDate?: string;
    remainingDays?: number;
    status: string;
    upgradeHistory?: Array<{
        timestamp: string;
        oldPlan: string;
        newPlan: string;
        chargeAmount: number;
        action: string;
    }>;
}

const SubscriptionOverview: React.FC = () => {
    const { t } = useTranslation();
    const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
    const [loading, setLoading] = useState(true);
    const { showToast } = useToast();
    const { user } = useAuth();

    useEffect(() => {
        const fetchSubscription = async () => {
            if (!user) return;

            try {
                const token = await user.getIdToken();
                const res = await fetch('/api/subscription/manage', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                const data = await res.json();

                if (data.code === 0) {
                    setSubscription(data.data);
                } else {
                    showToast('error', data.message || 'Failed to load subscription details');
                }
            } catch (err: any) {
                console.error(err);
                const errorMessage = err.response?.data?.error || err.message || 'Network error';
                showToast('error', errorMessage);
            } finally {
                setLoading(false);
            }
        };

        fetchSubscription();
    }, [user]);

    const getPlanName = (plan: string) => {
        switch (plan) {
            case 'light': return 'Light Plan';
            case 'medium': return 'Medium Plan';
            case 'enterprise': return 'Enterprise Plan';
            case 'free': return 'Free Plan';
            default: return plan;
        }
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString();
    };

    return (
        <div className="max-w-5xl mx-auto animate-fade-in p-6 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-2">Subscription Overview</h1>
                    <p className="text-gray-400">Manage your plan, billing, and usage limits.</p>
                </div>
                <Link
                    to="/subscription/plans"
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-blue-500/20"
                >
                    <ArrowUpCircle className="w-4 h-4" />
                    Upgrade Plan
                </Link>
            </div>

            {/* Current Plan Card */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 backdrop-blur-sm">
                {loading ? (
                    <div className="space-y-4">
                        <SkeletonLoader type="medium" className="w-1/3 h-8" />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <SkeletonLoader type="medium" className="h-24" />
                            <SkeletonLoader type="medium" className="h-24" />
                            <SkeletonLoader type="medium" className="h-24" />
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                                <CreditCard className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h2 className="text-3xl font-bold text-white capitalize">
                                    {getPlanName(subscription?.plan || 'free')}
                                </h2>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${subscription?.status === 'active'
                                            ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                            : 'bg-gray-700 text-gray-400 border-gray-600'
                                        }`}>
                                        {subscription?.status === 'active' ? 'Active' : 'Inactive'}
                                    </span>
                                    <span className="text-gray-400 text-sm capitalize">
                                        • {subscription?.billingCycle || 'Monthly'} Billing
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                                <div className="flex items-center gap-2 text-gray-400 mb-2">
                                    <Calendar className="w-4 h-4" />
                                    <span className="text-sm">Start Date</span>
                                </div>
                                <p className="text-lg font-semibold text-white">
                                    {formatDate(subscription?.startDate)}
                                </p>
                            </div>
                            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                                <div className="flex items-center gap-2 text-gray-400 mb-2">
                                    <Clock className="w-4 h-4" />
                                    <span className="text-sm">Next Billing</span>
                                </div>
                                <p className="text-lg font-semibold text-white">
                                    {formatDate(subscription?.nextBillingDate)}
                                </p>
                            </div>
                            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                                <div className="flex items-center gap-2 text-gray-400 mb-2">
                                    <History className="w-4 h-4" />
                                    <span className="text-sm">Remaining Days</span>
                                </div>
                                <p className="text-lg font-semibold text-blue-400">
                                    {subscription?.remainingDays ?? '-'} Days
                                </p>
                            </div>
                            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                                <div className="flex items-center gap-2 text-gray-400 mb-2">
                                    <CheckCircle className="w-4 h-4" />
                                    <span className="text-sm">Daily Limit</span>
                                </div>
                                <p className="text-lg font-semibold text-white">
                                    {subscription?.dailyLimit === -1 ? 'Unlimited' : subscription?.dailyLimit}
                                </p>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Upgrade History */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 backdrop-blur-sm">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <History className="w-5 h-5 text-gray-400" />
                    Upgrade History
                </h3>

                {!loading && (!subscription?.upgradeHistory || subscription.upgradeHistory.length === 0) ? (
                    <div className="text-center py-8 text-gray-500">
                        No upgrade history found.
                    </div>
                ) : (
                    <div className="relative border-l border-gray-800 ml-3 space-y-8">
                        {subscription?.upgradeHistory?.map((event, index) => (
                            <div key={index} className="relative pl-8">
                                <div className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-blue-500 border-2 border-gray-900 shadow-[0_0_0_4px_rgba(59,130,246,0.2)]" />
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
                                    <span className="text-sm text-gray-400 font-mono">
                                        {new Date(event.timestamp).toLocaleString()}
                                    </span>
                                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase">
                                        {event.action || 'Upgrade'}
                                    </span>
                                </div>
                                <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
                                    <p className="text-white font-medium">
                                        Plan Change: <span className="text-gray-400">{event.oldPlan}</span> → <span className="text-blue-400">{event.newPlan}</span>
                                    </p>
                                    {event.chargeAmount > 0 && (
                                        <p className="text-sm text-gray-400 mt-1">
                                            Charged: <span className="text-white">${event.chargeAmount}</span>
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SubscriptionOverview;
