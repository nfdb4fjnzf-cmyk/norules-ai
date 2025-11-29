import React, { useEffect, useState } from 'react';
import SkeletonLoader from '../SkeletonLoader';
import { useToast } from '../Toast';

interface UpgradeModalProps {
    open: boolean;
    onClose: () => void;
    currentPlan: string;
    targetPlan: string;
    onConfirm: (planId: string) => Promise<void>;
}

const PLAN_WEIGHTS: Record<string, number> = {
    'free': 0,
    '5u': 1,
    '10u': 2,
    '30u': 3,
    'apikey': 4
};

const PLAN_NAMES: Record<string, string> = {
    'free': 'Free',
    '5u': '5U Plan',
    '10u': '10U Plan',
    '30u': '30U Plan',
    'apikey': 'API Key Mode'
};

const PLAN_DETAILS: Record<string, any> = {
    'free': { limit: 5, points: true, internal: true, external: false },
    '5u': { limit: 5, points: false, internal: true, external: true },
    '10u': { limit: 10, points: false, internal: true, external: true },
    '30u': { limit: 30, points: false, internal: true, external: true },
    'apikey': { limit: 'Unlimited', points: false, internal: false, external: true }
};

const UpgradeModal: React.FC<UpgradeModalProps> = ({
    open,
    onClose,
    currentPlan,
    targetPlan,
    onConfirm
}) => {
    const [loading, setLoading] = useState(false);
    const [visible, setVisible] = useState(false);
    const { showToast } = useToast();

    useEffect(() => {
        if (open) {
            setVisible(true);
            document.body.style.overflow = 'hidden';
        } else {
            const timer = setTimeout(() => setVisible(false), 200);
            document.body.style.overflow = 'unset';
            return () => clearTimeout(timer);
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [open]);

    if (!open && !visible) return null;

    const targetPlanName = PLAN_NAMES[targetPlan] || targetPlan;
    const currentPlanName = PLAN_NAMES[currentPlan] || currentPlan;

    const currentDetails = PLAN_DETAILS[currentPlan] || PLAN_DETAILS['free'];
    const targetDetails = PLAN_DETAILS[targetPlan] || PLAN_DETAILS['free'];

    const handleConfirm = async () => {
        setLoading(true);
        try {
            await onConfirm(targetPlan);
            showToast('success', '方案已成功切換');
            onClose();
        } catch (error: any) {
            console.error(error);
            showToast('error', error.message || '無法切換到此方案');
        } finally {
            setLoading(false);
        }
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget && !loading) {
            onClose();
        }
    };

    return (
        <div
            className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0'}`}
            onClick={handleBackdropClick}
        >
            <div className={`w-[90%] max-w-md bg-[#151927] rounded-2xl border border-white/10 p-6 shadow-xl transform transition-all duration-200 ${open ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
                <h3 className="text-xl font-semibold text-gray-200 mb-6">
                    {loading ? <SkeletonLoader type="medium" className="w-1/2" /> : `Switch to ${targetPlanName}`}
                </h3>

                <div className="mb-8 text-gray-300">
                    {loading ? (
                        <div className="space-y-4">
                            <SkeletonLoader type="small" />
                            <SkeletonLoader type="small" />
                            <SkeletonLoader type="medium" className="h-24 rounded-xl" />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                                    <p className="text-gray-400 mb-1">Current Plan</p>
                                    <p className="font-bold text-gray-200">{currentPlanName}</p>
                                </div>
                                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                                    <p className="text-blue-300 mb-1">New Plan</p>
                                    <p className="font-bold text-blue-400">{targetPlanName}</p>
                                </div>
                            </div>

                            <div className="space-y-3 text-sm border-t border-white/10 pt-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-400">Daily Limit</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-500 line-through">{currentDetails.limit}</span>
                                        <span className="text-gray-200 material-symbols-outlined text-xs">arrow_forward</span>
                                        <span className="text-white font-medium">{targetDetails.limit}</span>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-400">Points Deduction</span>
                                    <span className={targetDetails.points ? 'text-orange-400' : 'text-green-400'}>
                                        {targetDetails.points ? 'Yes' : 'No'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-400">Internal LLM</span>
                                    <span className={targetDetails.internal ? 'text-green-400' : 'text-gray-500'}>
                                        {targetDetails.internal ? 'Available' : 'Disabled'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-400">External API Key</span>
                                    <span className={targetDetails.external ? 'text-green-400' : 'text-gray-500'}>
                                        {targetDetails.external ? 'Supported' : 'Not Supported'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="rounded-xl px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 font-medium transition-all duration-150 ease-out hover:opacity-80 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={loading}
                        className="rounded-xl px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium transition-all duration-150 ease-out hover:opacity-80 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {loading && <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>}
                        {loading ? 'Processing...' : 'Confirm'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UpgradeModal;
