import React, { useState, useEffect } from 'react';
import UpgradeModal from '../../components/Subscription/UpgradeModal';
import { useToast } from '../../components/Toast';
import SkeletonLoader from '../../components/SkeletonLoader';
import { useAuth } from '../../contexts/AuthContext';

interface Plan {
    id: string;
    name: string;
    description: string;
    monthlyPrice: number;
    quarterlyPrice: number;
    yearlyPrice: number;
    dailyLimit: number;
    features: string[];
}

type BillingCycle = 'monthly' | 'quarterly' | 'yearly';

const Plans: React.FC = () => {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [currentPlanId, setCurrentPlanId] = useState<string>('lite');
    const [loading, setLoading] = useState(true);
    const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
    const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
    const { showToast } = useToast();

    const { user } = useAuth();

    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [user]);

    const fetchData = async () => {
        if (!user) return;
        try {
            const token = await user.getIdToken();
            const headers = { 'Authorization': `Bearer ${token}` };

            const [plansRes, subRes] = await Promise.all([
                fetch('/api/subscription/plans', { headers }),
                fetch('/api/subscription/manage', { headers })
            ]);

            const plansData = await plansRes.json();
            const subData = await subRes.json();

            if (plansData.code === 0) setPlans(plansData.data);
            if (subData.code === 0) setCurrentPlanId(subData.data.plan);
        } catch (error: any) {
            console.error('Failed to fetch data', error);
            const errorMessage = error.response?.data?.error || error.message || 'Failed to load plans';
            showToast('error', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleSubscribeClick = (planId: string) => {
        if (planId === currentPlanId) return;
        setSelectedPlanId(planId);
        setIsUpgradeModalOpen(true);
    };

    const handleConfirmUpgrade = async (planId: string) => {
        try {
            if (!user) {
                showToast('error', 'Please log in first');
                return;
            }

            const token = await user.getIdToken();

            // 2. Create Invoice
            const res = await fetch('/api/payment/create-invoice', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    userId: user.uid,
                    planId: planId,
                    billingCycle: billingCycle
                })
            });

            const data = await res.json();

            if (data.code === 0 && data.data.invoice_url) {
                // 3. Redirect to Payment
                window.open(data.data.invoice_url, '_blank');
                showToast('success', 'Redirecting to payment...');
                setIsUpgradeModalOpen(false);
            } else {
                throw new Error(data.message || 'Failed to create invoice');
            }

        } catch (error: any) {
            console.error('Payment Error:', error);
            showToast('error', error.message || 'Payment initialization failed');
        }
    };

    const getPrice = (plan: Plan) => {
        if (billingCycle === 'quarterly') return plan.quarterlyPrice;
        if (billingCycle === 'yearly') return plan.yearlyPrice;
        return plan.monthlyPrice;
    };

    const getPeriodLabel = () => {
        if (billingCycle === 'quarterly') return '/quarter';
        if (billingCycle === 'yearly') return '/year';
        return '/mo';
    };

    return (
        <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-100 mb-4">Choose Your Plan</h1>
                <p className="text-gray-400 mb-8">Unlock more power with our flexible pricing tiers.</p>

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
                            {cycle.charAt(0).toUpperCase() + cycle.slice(1)}
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
                                <SkeletonLoader type="small" className="w-full" />
                            </div>
                            <SkeletonLoader type="large" className="w-full rounded-xl" />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {plans.map((plan) => {
                        const isCurrent = plan.id === currentPlanId;
                        const displayPrice = getPrice(plan);

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
                                        CURRENT
                                    </div>
                                )}
                                <h3 className="text-lg font-bold text-gray-100 mb-2">{plan.name}</h3>
                                <p className="text-sm text-gray-400 mb-4">{plan.description}</p>
                                <div className="flex items-baseline mb-6">
                                    <span className="text-3xl font-extrabold text-gray-100">${displayPrice}</span>
                                    <span className="text-gray-500 ml-1">{getPeriodLabel()}</span>
                                </div>

                                <ul className="space-y-4 mb-8 flex-1">
                                    <li className="flex items-start text-sm text-gray-300">
                                        <span className="mr-2 text-blue-400 mt-0.5 material-symbols-outlined text-base">schedule</span>
                                        <span className="leading-tight">{plan.dailyLimit === -1 ? 'Unlimited' : `${plan.dailyLimit} Daily`} Requests</span>
                                    </li>
                                    {plan.features.map((feature, idx) => (
                                        <li key={idx} className="flex items-start text-sm text-gray-300">
                                            <span className="mr-2 text-green-500 mt-0.5 material-symbols-outlined text-base">check</span>
                                            <span className="leading-tight">{feature}</span>
                                        </li>
                                    ))}
                                </ul>

                                <button
                                    onClick={() => handleSubscribeClick(plan.id)}
                                    disabled={isCurrent}
                                    className={`w-full rounded-xl px-4 py-2 font-semibold transition-all duration-150 ease-out active:scale-95 ${isCurrent
                                        ? 'bg-white/10 text-gray-400 cursor-default'
                                        : 'bg-blue-500 hover:bg-blue-600 text-white hover:opacity-80'
                                        }`}
                                >
                                    {isCurrent ? 'Current Plan' : 'Subscribe'}
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            <UpgradeModal
                open={isUpgradeModalOpen}
                onClose={() => setIsUpgradeModalOpen(false)}
                currentPlan={currentPlanId}
                targetPlan={selectedPlanId || ''}
                onConfirm={handleConfirmUpgrade}
            />
        </div>
    );
};

export default Plans;
