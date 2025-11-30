import React from 'react';
import { X, AlertCircle, Coins } from 'lucide-react';

interface CostEstimateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    actionType: string;
    estimatedCost: number;
    currentBalance: number;
    isProcessing?: boolean;
}

const CostEstimateModal: React.FC<CostEstimateModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    actionType,
    estimatedCost,
    currentBalance,
    isProcessing = false
}) => {
    if (!isOpen) return null;

    const hasInsufficientFunds = currentBalance < estimatedCost;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-900/50">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Coins className="w-5 h-5 text-yellow-500" />
                        Confirm Deduction
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                        disabled={isProcessing}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm text-gray-400">
                            <span>Action Type</span>
                            <span className="text-white font-medium capitalize">{actionType}</span>
                        </div>
                        <div className="flex justify-between text-sm text-gray-400">
                            <span>Estimated Cost</span>
                            <span className="text-yellow-500 font-bold">{estimatedCost} Credits</span>
                        </div>
                        <div className="h-px bg-gray-800 my-2" />
                        <div className="flex justify-between text-sm text-gray-400">
                            <span>Your Balance</span>
                            <span className={`${hasInsufficientFunds ? 'text-red-500' : 'text-green-500'} font-bold`}>
                                {currentBalance} Credits
                            </span>
                        </div>
                    </div>

                    {hasInsufficientFunds && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                            <p className="text-sm text-red-200">
                                You do not have enough credits to perform this action. Please upgrade your plan or top up.
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-900/50 border-t border-gray-800 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
                        disabled={isProcessing}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={hasInsufficientFunds || isProcessing}
                        className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-all
                            ${hasInsufficientFunds
                                ? 'bg-gray-700 cursor-not-allowed opacity-50'
                                : 'bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/20'
                            }
                            ${isProcessing ? 'opacity-70 cursor-wait' : ''}
                        `}
                    >
                        {isProcessing ? 'Processing...' : 'Confirm & Deduct'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CostEstimateModal;
