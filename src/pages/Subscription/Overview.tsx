import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import SkeletonLoader from '../../components/SkeletonLoader';
import { useToast } from '../../components/Toast';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';

const SubscriptionOverview: React.FC = () => {
    const { t } = useTranslation();
    const [subscription, setSubscription] = useState<any>(null);
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

                if (data.success) {
                    setSubscription(data.data);
                } else {
                    showToast('error', data.error || 'Failed to load subscription details');
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

    const isFree = subscription?.plan === 'free';
    const canUseExternal = subscription?.plan !== 'free';
    const pointsDeducted = subscription?.plan !== 'apikey'; // Assuming API Key mode doesn't deduct points based on previous plan defs

    const getPlanName = (plan: string) => {
        if (plan === 'apikey') return t('subscription.plans.apikey');
        if (plan === 'free') return t('subscription.plans.free');
        if (plan === 'pro') return t('subscription.plans.pro');
        if (plan === 'enterprise') return t('subscription.plans.enterprise');
        return plan;
    };

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-100 mb-6">{t('subscription.title')}</h1>

            {/* Plan Details Card */}
            <div className="rounded-2xl bg-[#151927] border border-white/10 p-6 mb-6 shadow-none backdrop-blur-sm">
                {loading ? (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <div>
                                <SkeletonLoader type="small" className="mb-2" />
                                <SkeletonLoader type="large" className="w-32" />
                            </div>
                            <SkeletonLoader type="medium" className="w-32 h-10 rounded-xl" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 border-t border-white/10 pt-6">
                            <SkeletonLoader type="medium" />
                            <SkeletonLoader type="medium" />
                            <SkeletonLoader type="medium" />
                            <SkeletonLoader type="medium" />
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <p className="text-sm text-gray-400 uppercase tracking-wide">{t('subscription.currentPlan')}</p>
                                <h2 className="text-3xl font-bold text-blue-400 capitalize">
                                    {getPlanName(subscription?.plan)}
                                </h2>
                            </div>
                            <Link
                                to="/subscription/plans"
                                className="rounded-xl px-4 py-2 font-semibold bg-blue-500 hover:bg-blue-600 text-white transition-all duration-150 ease-out hover:opacity-80 active:scale-95"
                            >
                                {t('subscription.changePlan')}
                            </Link>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 border-t border-white/10 pt-6">
                            <div>
                                <p className="text-sm text-gray-400 mb-1">{t('subscription.dailyLimit')}</p>
                                <p className="text-xl font-semibold text-gray-300">
                                    {subscription?.dailyLimit >= 9999 ? t('subscription.unlimited') : subscription?.dailyLimit}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-400 mb-1">{t('subscription.pointsDeduction')}</p>
                                <p className={`text-xl font-semibold ${pointsDeducted ? 'text-orange-400' : 'text-green-500'}`}>
                                    {pointsDeducted ? t('subscription.yes') : t('subscription.no')}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-400 mb-1">{t('subscription.internalLLM')}</p>
                                <p className={`text-xl font-semibold ${subscription?.plan === 'apikey' ? 'text-gray-500' : 'text-green-500'}`}>
                                    {subscription?.plan === 'apikey' ? t('subscription.disabled') : t('subscription.available')}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-400 mb-1">{t('subscription.externalAPIKey')}</p>
                                <p className={`text-xl font-semibold ${canUseExternal ? 'text-green-500' : 'text-red-400'}`}>
                                    {canUseExternal ? t('subscription.supported') : t('subscription.notSupported')}
                                </p>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* API Access / Warning Card */}
            <div className="rounded-2xl bg-[#151927] border border-white/10 p-6 mb-6">
                <h3 className="text-lg font-semibold text-blue-300 mb-2">{t('subscription.needAccess.title')}</h3>
                <p className="text-gray-300 mb-4">
                    {t('subscription.needAccess.description')}
                    {isFree && <span className="font-bold text-red-500 ml-2">{t('subscription.needAccess.freeWarning')}</span>}
                </p>
                <Link
                    to="/settings/apikeys"
                    className="text-blue-400 font-medium hover:underline flex items-center gap-1"
                >
                    {t('subscription.needAccess.manageKeys')} <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </Link>
            </div>
        </div>
    );
};

export default SubscriptionOverview;
