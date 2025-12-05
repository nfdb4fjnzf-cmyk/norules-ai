import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import SkeletonLoader from '../../components/SkeletonLoader';
import { useToast } from '../../components/Toast';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { Calendar, Clock, CreditCard, History, ArrowUpCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import api from '../../services/api';
import { Button } from '../../components/ui/Button';

interface SubscriptionData {
    userId: string;
    planId: 'free' | 'lite' | 'pro' | 'ultra';
    billingCycle: 'monthly' | 'quarterly' | 'yearly';
    status: 'active' | 'canceled' | 'expired';
    startDate: { _seconds: number, _nanoseconds: number } | string;
    currentPeriodEnd: { _seconds: number, _nanoseconds: number } | string;
    cancelAtPeriodEnd: boolean;
}

const SubscriptionOverview: React.FC = () => {
    const { t } = useTranslation();
    const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const { showToast } = useToast();
    const { user } = useAuth();

    useEffect(() => {
        fetchSubscription();
    }, [user]);

    const fetchSubscription = async () => {
        if (!user) return;

        try {
            const res = await api.get('/subscription/status');
            if (res.data.success) {
                setSubscription(res.data.data.subscription);
            } else {
                showToast('error', 'Failed to load subscription details');
            }
        } catch (err: any) {
            console.error(err);
            // Don't show error if just no subscription (404 or null)
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async () => {
        if (!confirm('Are you sure you want to cancel your subscription? You will lose your benefits at the end of the current period.')) return;

        try {
            setProcessing(true);
            const response = await api.post('/subscription/cancel');
            if (response.data.success) {
                const cancelDate = new Date(response.data.data.cancelAt).toLocaleDateString();
                showToast('success', `Subscription canceled. Access continues until ${cancelDate}.`);
                await fetchSubscription();
            } else {
                showToast('error', 'Failed to cancel subscription');
            }
        } catch (err: any) {
            console.error('Cancel error:', err);
            showToast('error', err.message || 'Failed to cancel');
        } finally {
            setProcessing(false);
        }
    };

    const getPlanName = (plan: string) => {
        switch (plan) {
            case 'lite': return 'Lite Plan';
            case 'pro': return 'Pro Plan';
            case 'ultra': return 'Ultra Plan';
            case 'free': return 'Free Plan';
            default: return plan;
        }
    };

    const formatDate = (dateVal: any) => {
        if (!dateVal) return '-';
        if (typeof dateVal === 'string') return new Date(dateVal).toLocaleDateString();
        if (dateVal._seconds) return new Date(dateVal._seconds * 1000).toLocaleDateString();
        return '-';
    };

    const calculateRemainingDays = (endDateVal: any) => {
        if (!endDateVal) return 0;
        let end = new Date();
        if (typeof endDateVal === 'string') end = new Date(endDateVal);
        else if (endDateVal._seconds) end = new Date(endDateVal._seconds * 1000);

        const now = new Date();
        const diff = end.getTime() - now.getTime();
        return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    };

    return (
        <div className="max-w-5xl mx-auto animate-fade-in p-6 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-2">訂閱方案</h1>
                    <p className="text-gray-400">管理您的方案、帳單與使用額度。</p>
                </div>
                <div className="flex gap-3">
                    <Link
                        to="/subscription/buy-points"
                        className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors border border-white/10"
                    >
                        <span className="material-symbols-outlined text-lg">bolt</span>
                        購買點數
                    </Link>
                    <Link
                        to="/subscription/plans"
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-blue-500/20"
                    >
                        <ArrowUpCircle className="w-4 h-4" />
                        升級方案
                    </Link>
                </div>
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
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                                    <CreditCard className="w-8 h-8 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-3xl font-bold text-white capitalize">
                                        {getPlanName(subscription?.planId || 'free')}
                                    </h2>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${subscription?.status === 'active'
                                            ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                            : 'bg-gray-700 text-gray-400 border-gray-600'
                                            }`}>
                                            {subscription?.status === 'active' ? (subscription?.cancelAtPeriodEnd ? '已取消 (目前有效)' : '使用中') : '已停用'}
                                        </span>
                                        {subscription?.planId !== 'free' && (
                                            <span className="text-gray-400 text-sm capitalize">
                                                • {subscription?.billingCycle === 'monthly' ? '月付' : subscription?.billingCycle === 'quarterly' ? '季付' : '年付'} 方案
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {subscription?.status === 'active' && !subscription?.cancelAtPeriodEnd && subscription?.planId !== 'free' && (
                                <Button variant="danger" onClick={handleCancel} disabled={processing}>
                                    取消訂閱
                                </Button>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                                <div className="flex items-center gap-2 text-gray-400 mb-2">
                                    <Calendar className="w-4 h-4" />
                                    <span className="text-sm">開始日期</span>
                                </div>
                                <p className="text-lg font-semibold text-white">
                                    {formatDate(subscription?.startDate)}
                                </p>
                            </div>
                            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                                <div className="flex items-center gap-2 text-gray-400 mb-2">
                                    <Clock className="w-4 h-4" />
                                    <span className="text-sm">到期/續約日</span>
                                </div>
                                <p className="text-lg font-semibold text-white">
                                    {formatDate(subscription?.currentPeriodEnd)}
                                </p>
                            </div>
                            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                                <div className="flex items-center gap-2 text-gray-400 mb-2">
                                    <History className="w-4 h-4" />
                                    <span className="text-sm">剩餘天數</span>
                                </div>
                                <p className="text-lg font-semibold text-blue-400">
                                    {calculateRemainingDays(subscription?.currentPeriodEnd)} 天
                                </p>
                            </div>
                            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                                <div className="flex items-center gap-2 text-gray-400 mb-2">
                                    <CheckCircle className="w-4 h-4" />
                                    <span className="text-sm">方案狀態</span>
                                </div>
                                <p className="text-lg font-semibold text-white capitalize">
                                    {subscription?.status === 'canceled' ? 'Canceled (Active)' : (subscription?.status || 'Active')}
                                </p>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Note about upgrades */}
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-2xl p-6 flex items-start gap-4">
                <AlertTriangle className="w-6 h-6 text-blue-400 flex-shrink-0" />
                <div>
                    <h3 className="text-lg font-semibold text-white mb-1">關於升級與降級</h3>
                    <p className="text-gray-400 text-sm">
                        升級方案會立即生效，並重新計算週期。降級或取消訂閱將在當前週期結束後生效。
                        如果您有任何疑問，請聯繫客服。
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SubscriptionOverview;
