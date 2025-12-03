import React, { useState, useEffect } from 'react';
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

const PLANS: Plan[] = [
    {
        id: 'lite',
        name: 'Lite',
        description: 'Perfect for starters',
        monthlyPrice: 5,
        quarterlyPrice: 13.5,
        yearlyPrice: 51,
        discount: '20%',
        features: ['500 Monthly Credits', 'Basic Support', 'Standard Speed', '20% Point Discount']
    },
    {
        id: 'pro',
        name: 'Pro',
        description: 'For growing needs',
        monthlyPrice: 10,
        quarterlyPrice: 27,
        yearlyPrice: 102,
        discount: '40%',
        features: ['2000 Monthly Credits', 'Priority Support', 'Fast Speed', '40% Point Discount']
    },
    {
        id: 'ultra',
        name: 'Ultra',
        description: 'For power users',
        monthlyPrice: 30,
        quarterlyPrice: 81,
        yearlyPrice: 306,
        discount: '60%',
        features: ['10,000 Monthly Credits', '24/7 Support', 'Max Speed', '60% Point Discount']
    }
];

type BillingCycle = 'monthly' | 'quarterly' | 'yearly';

const Plans: React.FC = () => {
    const [currentPlanId, setCurrentPlanId] = useState<string>('free');
    const [loading, setLoading] = useState(true);
    const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
    const { showToast } = useToast();
    const navigate = useNavigate();

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

    useEffect(() => {
        fetchStatus();
    }, []);

    const fetchStatus = async () => {
        try {
            const response = await api.get('/subscription/status');
            if (response.data.success) {
                const sub = response.data.data.subscription;
                if (sub && sub.status === 'active') {
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

    const handleSubscribeClick = (plan: Plan) => {
        if (plan.id === currentPlanId) return;
        setSelectedPlan(plan);
        setIsModalOpen(true);
    };

    const handleConfirmSubscription = async (couponCode?: string) => {
        if (!selectedPlan) return;

        try {
            const response = await api.post('/subscription/create', {
                planId: selectedPlan.id,
                billingCycle,
                couponCode
            });

            if (response.data.success) {
                showToast('success', 'Subscription updated successfully!');
                await fetchStatus();
                setIsModalOpen(false);
                navigate('/subscription');
            } else {
                showToast('error', 'Failed to update subscription');
            }
        } catch (error: any) {
            console.error('Subscribe error:', error);
            showToast('error', error.response?.data?.message || error.message || 'Failed to subscribe');
        }
    };

    const getPrice = (plan: Plan) => {
        if (billingCycle === 'quarterly') return plan.quarterlyPrice;
        if (billingCycle === 'yearly') return plan.yearlyPrice;
        return plan.monthlyPrice;
    };

    const getPeriodLabel = () => {
        if (billingCycle === 'quarterly') return '/季';
        if (billingCycle === 'yearly') return '/年';
        return '/月';
    };

    return (
        <div className="max-w-7xl mx-auto px-4 animate-fade-in">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-100 mb-4">選擇你的方案</h1>
                <p className="text-gray-400 mb-8">透過我們彈性的方案階層，解鎖更多功能。</p>

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
                            {cycle === 'monthly' ? '月付' : cycle === 'quarterly' ? '季付' : '年付'}
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
                        const displayPrice = getPrice(plan);

                        // Lite plan cannot be monthly? Removed that restriction based on new plans.ts
                        // But if we want to keep it, we can.
                        // Let's assume all plans support all cycles for now as per plans.ts
                        const isLiteMonthly = false;
                        const isDisabled = isCurrent;

                        return (
                            <div
                                key={plan.id}
                                className={`relative rounded-2xl bg-[#151927] p-6 border flex flex-col transition-all duration-200 ease-out ${isCurrent
                                    ? 'border-blue-500 transform scale-105 z-10 shadow-xl'
                                    : 'border-white/10 hover:scale-105 hover:bg-[#1a1f2e]'
                                    }`}
                            >
                                {isCurrent && (
                                    <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">
                                        目前方案
                                    </div>
                                )}
                                <h3 className="text-lg font-bold text-gray-100 mb-2">{plan.name}</h3>
                                <p className="text-sm text-gray-400 mb-4">{plan.description}</p>
                                <div className="flex items-baseline mb-2">
                                    <span className="text-3xl font-extrabold text-gray-100">${displayPrice}</span>
                                    <span className="text-gray-500 ml-1">{getPeriodLabel()}</span>
                                </div>
                                <p className="text-sm text-green-400 mb-6 font-medium">{plan.discount} Discount on Credits</p>

                                <ul className="space-y-4 mb-8 flex-1">
                                    {plan.features.map((feature, idx) => (
                                        <li key={idx} className="flex items-start text-sm text-gray-300">
                                            <Check className="mr-2 text-green-500 w-4 h-4 mt-0.5" />
                                            <span className="leading-tight">{feature}</span>
                                        </li>
                                    ))}
                                </ul>

                                <button
                                    onClick={() => handleSubscribeClick(plan)}
                                    disabled={isDisabled}
                                    className={`w-full rounded-xl px-4 py-2 font-semibold transition-all duration-150 ease-out active:scale-95 flex justify-center items-center ${isCurrent
                                        ? 'bg-white/10 text-gray-400 cursor-default'
                                        : 'bg-blue-500 hover:bg-blue-600 text-white hover:opacity-80'
                                        }`}
                                >
                                    {isCurrent ? '目前方案' : '訂閱'}
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
                    billingCycle={billingCycle}
                    price={getPrice(selectedPlan)}
                    planId={selectedPlan.id}
                />
            )}
        </div>
    );
};

export default Plans;
