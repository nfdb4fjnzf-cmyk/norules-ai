import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../components/Toast';
import SkeletonLoader from '../../components/SkeletonLoader';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { Check, Loader2 } from 'lucide-react';
import SubscriptionModal from './SubscriptionModal';

interface Plan {
    id: string;
    name: string;
    description: string;
    monthlyPrice: number;
    quarterlyPrice: number;
    yearlyPrice: number;
    discount: string;
    features: string[];
}



type BillingCycle = 'monthly' | 'quarterly' | 'yearly';

const Plans: React.FC = () => {
    const [currentPlanId, setCurrentPlanId] = useState<string>('free');
    const [loading, setLoading] = useState(true);
    const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
    const { showToast } = useToast();
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();

    const PLANS: Plan[] = [
        {
            id: 'lite',
            name: t('subscription.plans.lite'),
            description: t('subscription.plans.liteDesc'),
            monthlyPrice: 5,
            quarterlyPrice: 13.5,
            yearlyPrice: 51,
            discount: '20%',
            features: [
                t('subscription.features.monthlyCredits', { count: 500 }),
                t('subscription.features.basicSupport'),
                t('subscription.features.standardSpeed'),
                t('subscription.features.pointDiscount', { percent: 20 })
            ]
        },
        {
            id: 'pro',
            name: t('subscription.plans.pro'),
            description: t('subscription.plans.proDesc'),
            monthlyPrice: 10,
            quarterlyPrice: 27,
            yearlyPrice: 102,
            discount: '40%',
            features: [
                t('subscription.features.monthlyCredits', { count: 2000 }),
                t('subscription.features.prioritySupport'),
                t('subscription.features.fastSpeed'),
                t('subscription.features.pointDiscount', { percent: 40 })
            ]
        },
        {
            id: 'ultra',
            name: t('subscription.plans.ultra'),
            description: t('subscription.plans.ultraDesc'),
            monthlyPrice: 30,
            quarterlyPrice: 81,
            yearlyPrice: 306,
            discount: '60%',
            features: [
                t('subscription.features.monthlyCredits', { count: 10000 }),
                t('subscription.features.247Support'),
                t('subscription.features.maxSpeed'),
                t('subscription.features.pointDiscount', { percent: 60 })
            ]
        }
    ];

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
    const [modalBillingCycle, setModalBillingCycle] = useState<BillingCycle>('monthly');

    useEffect(() => {
        fetchStatus();
    }, []);

    const fetchStatus = async () => {
        try {
            const response = await api.get('/subscription/status');
            if (response.data.success) {
                const sub = response.data.data.subscription;
                // Consider 'canceled' subscriptions as active if they haven't expired yet
                // Backend returns canceled subs that are still within their period
                if (sub && (sub.status === 'active' || sub.status === 'canceled')) {
                    setCurrentPlanId(sub.planId);
                    setBillingCycle(sub.billingCycle as BillingCycle);
                }
            }
        } catch (error) {
            console.error('Failed to fetch status', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubscribeClick = (plan: Plan, cycle: BillingCycle) => {
        if (plan.id === currentPlanId) return;
        setSelectedPlan(plan);
        setModalBillingCycle(cycle);
        setIsModalOpen(true);
    };

    const handleConfirmSubscription = async (couponCode?: string) => {
        if (!selectedPlan) return;

        try {
            const response = await api.post('/subscription/create', {
                planId: selectedPlan.id,
                billingCycle: modalBillingCycle,
                couponCode
            });

            if (response.data.success) {
                // Check if payment redirection is required
                if (response.data.data?.paymentUrl) {
                    showToast('success', 'Redirecting to payment...');
                    window.location.href = response.data.data.paymentUrl;
                    return;
                }

                showToast('success', 'Subscription updated successfully!');
                await fetchStatus();
                setIsModalOpen(false);
                navigate('/subscription');
            } else {
                showToast('error', 'Failed to update subscription');
            }
        } catch (error: any) {
            console.error('Subscribe error:', error);

            // Extract error message from API response
            let errorMsg = 'Failed to subscribe';
            if (error.response?.data?.message) {
                errorMsg = error.response.data.message;
            } else if (error.message) {
                errorMsg = error.message;
            }

            // If there is debug info, show it
            if (error.response?.data?.debug) {
                console.error('Debug Info:', error.response.data.debug);
                alert(`Error: ${errorMsg}\n\nDebug: ${JSON.stringify(error.response.data.debug, null, 2)}`);
            } else {
                // Show specific error message from backend (e.g., "Cannot downgrade...")
                showToast('error', errorMsg);
            }
        }
    };

    const getPrice = (plan: Plan) => {
        if (billingCycle === 'quarterly') return plan.quarterlyPrice;
        if (billingCycle === 'yearly') return plan.yearlyPrice;
        return plan.monthlyPrice;
    };

    const getPeriodLabel = () => {
        if (billingCycle === 'quarterly') return i18n.language === 'zh' || i18n.language === 'zh-TW' ? '/季' : '/qtr';
        if (billingCycle === 'yearly') return i18n.language === 'zh' || i18n.language === 'zh-TW' ? '/年' : '/yr';
        return i18n.language === 'zh' || i18n.language === 'zh-TW' ? '/月' : '/mo';
    };

    return (
        <div className="max-w-7xl mx-auto px-4 animate-fade-in">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-100 mb-4">{t('subscription.title')} (v3.1)</h1>
                <p className="text-gray-400 mb-8">{t('subscription.subtitle')}</p>

                {/* Billing Cycle Toggle */}
                <div className="inline-flex bg-[#151927] p-1 rounded-xl border border-white/10">
                    {(['monthly', 'quarterly', 'yearly'] as BillingCycle[]).map((cycle) => (
                        <button
                            key={cycle}
                            onClick={() => setBillingCycle(cycle)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${billingCycle === cycle
                                ? 'bg-blue-600 text-white shadow-lg'
                                : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            {cycle === 'monthly' ? t('subscription.monthly') : cycle === 'quarterly' ? t('subscription.quarterly') : t('subscription.yearly')}
                            {cycle === 'quarterly' && <span className="ml-1 text-xs text-green-400">-10%</span>}
                            {cycle === 'yearly' && <span className="ml-1 text-xs text-green-400">-15%</span>}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="rounded-2xl bg-[#151927] p-6 border border-white/10">
                            <SkeletonLoader type="medium" className="mb-4" />
                            <SkeletonLoader type="large" className="mb-6 w-24" />
                            <div className="space-y-3 mb-8">
                                <SkeletonLoader type="small" className="w-full" />
                                <SkeletonLoader type="small" className="w-full" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {PLANS.map((plan) => {
                        const isCurrent = plan.id === currentPlanId;
                        const isLite = plan.id === 'lite';

                        let displayPrice = getPrice(plan);
                        let periodLabel = getPeriodLabel();
                        let isDisabled = isCurrent;
                        let buttonText = isCurrent ? t('subscription.currentPlan') : t('subscription.subscribe');

                        // Special handling for Lite plan in Monthly view
                        if (isLite && billingCycle === 'monthly') {
                            // Show monthly price
                            displayPrice = plan.monthlyPrice;
                            periodLabel = i18n.language === 'zh' || i18n.language === 'zh-TW' ? '/月' : '/mo';

                            // Disable button and change text
                            isDisabled = true;
                            buttonText = i18n.language === 'zh' || i18n.language === 'zh-TW' ? '僅限季付' : 'Quarterly Only';
                        } else if (isLite && billingCycle === 'quarterly') {
                            // Ensure quarterly price is shown correctly (already handled by getPrice but explicit here for safety)
                            displayPrice = plan.quarterlyPrice;
                            periodLabel = i18n.language === 'zh' || i18n.language === 'zh-TW' ? '/季' : '/qtr';
                        }

                        // Determine effective billing cycle for the click handler
                        // If it's Lite, we technically only allow Quarterly, but if we are in Monthly view, the button is disabled anyway.
                        // If we are in Quarterly view, it's 'quarterly'.
                        const effectiveBillingCycle = isLite ? 'quarterly' : billingCycle;

                        return (
                            <div
                                key={plan.id}
                                className={`relative rounded-2xl bg-[#151927] p-6 border flex flex-col transition-all duration-200 ease-out ${isCurrent
                                    ? 'border-blue-500 transform scale-105 z-10 shadow-xl'
                                    : 'border-white/10 hover:scale-105 hover:bg-[#1a1f2e]'
                                    } ${isDisabled && !isCurrent ? 'opacity-75' : ''}`}
                            >
                                {isCurrent && (
                                    <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">
                                        {t('subscription.currentPlan')}
                                    </div>
                                )}
                                <h3 className="text-lg font-bold text-gray-100 mb-2">{plan.name}</h3>
                                <p className="text-sm text-gray-400 mb-4">{plan.description}</p>
                                <div className="flex items-baseline mb-2">
                                    <span className="text-3xl font-extrabold text-gray-100">${displayPrice}</span>
                                    <span className="text-gray-500 ml-1">{periodLabel}</span>
                                </div>
                                <p className="text-sm text-green-400 mb-6 font-medium">
                                    {t('subscription.features.discountOnCredits', { percent: plan.discount.replace('%', '') })}
                                </p>

                                <ul className="space-y-4 mb-8 flex-1">
                                    {plan.features.map((feature, idx) => (
                                        <li key={idx} className="flex items-start text-sm text-gray-300">
                                            <Check className="mr-2 text-green-500 w-4 h-4 mt-0.5" />
                                            <span className="leading-tight">{feature}</span>
                                        </li>
                                    ))}
                                </ul>

                                <button
                                    onClick={() => handleSubscribeClick(plan, effectiveBillingCycle)}
                                    disabled={isDisabled}
                                    className={`w-full rounded-xl px-4 py-2 font-semibold transition-all duration-150 ease-out active:scale-95 flex justify-center items-center ${isCurrent
                                        ? 'bg-white/10 text-gray-400 cursor-default'
                                        : isDisabled
                                            ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                            : 'bg-blue-500 hover:bg-blue-600 text-white hover:opacity-80'
                                        }`}
                                >
                                    {buttonText}
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {selectedPlan && (
                <SubscriptionModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onConfirm={handleConfirmSubscription}
                    planName={selectedPlan.name}
                    billingCycle={modalBillingCycle}
                    price={modalBillingCycle === 'quarterly' ? selectedPlan.quarterlyPrice : modalBillingCycle === 'yearly' ? selectedPlan.yearlyPrice : selectedPlan.monthlyPrice}
                    planId={selectedPlan.id}
                />
            )}
        </div>
    );
};

export default Plans;
