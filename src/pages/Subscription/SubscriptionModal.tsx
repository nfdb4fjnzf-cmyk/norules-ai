import React, { useState } from 'react';
import { Loader2, X, Tag } from 'lucide-react';
import api from '../../services/api';

interface SubscriptionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (couponCode?: string) => Promise<void>;
    planName: string;
    billingCycle: string;
    price: number;
    planId: string;
}

const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    planName,
    billingCycle,
    price,
    planId
}) => {
    const [couponCode, setCouponCode] = useState('');
    const [isValidating, setIsValidating] = useState(false);
    const [couponError, setCouponError] = useState('');
    const [discount, setDiscount] = useState<{ type: 'percent' | 'fixed', value: number } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleValidateCoupon = async () => {
        if (!couponCode.trim()) return;
        setIsValidating(true);
        setCouponError('');
        setDiscount(null);

        try {
            const response = await api.post('/subscription/validate-coupon', {
                code: couponCode,
                planId
            });

            if (response.data.success && response.data.data.valid) {
                setDiscount({
                    type: response.data.data.discountType,
                    value: response.data.data.discountValue
                });
            } else {
                setCouponError('Invalid coupon code');
            }
        } catch (error: any) {
            setCouponError(error.response?.data?.message || 'Failed to validate coupon');
        } finally {
            setIsValidating(false);
        }
    };

    const finalPrice = discount
        ? discount.type === 'percent'
            ? price * (1 - discount.value / 100)
            : Math.max(0, price - discount.value)
        : price;

    const handleConfirm = async () => {
        setIsSubmitting(true);
        try {
            await onConfirm(discount ? couponCode : undefined);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-[#151927] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-fade-in">
                <div className="p-6 border-b border-white/10 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-white">Confirm Subscription</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Plan Summary */}
                    <div className="bg-white/5 rounded-xl p-4 space-y-2">
                        <div className="flex justify-between text-gray-300">
                            <span>Plan</span>
                            <span className="font-bold text-white">{planName}</span>
                        </div>
                        <div className="flex justify-between text-gray-300">
                            <span>Billing Cycle</span>
                            <span className="capitalize text-white">{billingCycle}</span>
                        </div>
                        <div className="flex justify-between text-gray-300 pt-2 border-t border-white/10">
                            <span>Price</span>
                            <span className="font-bold text-white">${price.toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Coupon Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Coupon Code</label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <input
                                    type="text"
                                    value={couponCode}
                                    onChange={(e) => setCouponCode(e.target.value)}
                                    placeholder="Enter code"
                                    className="w-full bg-[#0B0E14] border border-white/10 rounded-lg pl-9 pr-3 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                />
                            </div>
                            <button
                                onClick={handleValidateCoupon}
                                disabled={isValidating || !couponCode}
                                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isValidating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
                            </button>
                        </div>
                        {couponError && <p className="text-red-400 text-xs mt-2">{couponError}</p>}
                        {discount && (
                            <p className="text-green-400 text-xs mt-2 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                Coupon applied: {discount.type === 'percent' ? `${discount.value}% off` : `$${discount.value} off`}
                            </p>
                        )}
                    </div>

                    {/* Total */}
                    <div className="pt-4 border-t border-white/10 space-y-2">
                        <div className="flex justify-between text-gray-300">
                            <span className="flex items-center gap-1">
                                Network Fee
                                <span className="text-xs text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded" title="Gas fee and processing">TRC20</span>
                            </span>
                            <span className="text-white">$4.00</span>
                        </div>
                        <div className="flex justify-between items-end pt-2">
                            <span className="text-gray-400">Total to Pay</span>
                            <div className="text-right">
                                {discount && (
                                    <span className="block text-sm text-gray-500 line-through mb-1">${(price + 4).toFixed(2)}</span>
                                )}
                                <span className="text-3xl font-bold text-blue-400">${(finalPrice + 4).toFixed(2)}</span>
                                <span className="block text-xs text-gray-500 mt-1">USDT (TRC20)</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-white/10 bg-white/5 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-3 bg-transparent hover:bg-white/5 text-gray-300 rounded-xl font-bold transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={isSubmitting}
                        className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20 transition-all flex justify-center items-center gap-2"
                    >
                        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm & Pay'}
                    </button>
                </div>
            </div>
        </div>
    );
};

function CheckCircle({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
    );
}

export default SubscriptionModal;
