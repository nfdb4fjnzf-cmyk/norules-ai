import React, { useState } from 'react';
import { Loader2, X, ShieldCheck } from 'lucide-react';

interface TopUpConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    points: number;
    price: number;
    packageName: string;
}

const TopUpConfirmModal: React.FC<TopUpConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    points,
    price,
    packageName
}) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const NETWORK_FEE = 1.00;
    const finalPrice = price + NETWORK_FEE;

    if (!isOpen) return null;

    const handleConfirm = async () => {
        setIsSubmitting(true);
        try {
            await onConfirm();
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-[#151927] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-fade-in">
                <div className="p-6 border-b border-white/10 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-white">Confirm Purchase</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Package Summary */}
                    <div className="bg-white/5 rounded-xl p-4 space-y-2">
                        <div className="flex justify-between text-gray-300">
                            <span>Package</span>
                            <span className="font-bold text-white">{packageName}</span>
                        </div>
                        <div className="flex justify-between text-gray-300">
                            <span>Points</span>
                            <span className="font-bold text-blue-400">{points.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-gray-300 pt-2 border-t border-white/10">
                            <span>Price</span>
                            <span className="font-bold text-white">${price.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-gray-300">
                            <span className="flex items-center gap-1">
                                Network Fee
                                <ShieldCheck className="w-3 h-3 text-gray-500" />
                            </span>
                            <span className="font-bold text-gray-400">${NETWORK_FEE.toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Total */}
                    <div className="flex justify-between items-end pt-4 border-t border-white/10">
                        <span className="text-gray-400">Total to Pay</span>
                        <div className="text-right">
                            <span className="text-3xl font-bold text-blue-400">${finalPrice.toFixed(2)}</span>
                            <span className="block text-xs text-gray-500 mt-1">USDT (TRC20)</span>
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

export default TopUpConfirmModal;
