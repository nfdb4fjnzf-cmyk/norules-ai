import React from 'react';
import Modal from '../Modal';
import { useNavigate } from 'react-router-dom';

interface InsufficientCreditsModalProps {
    isOpen: boolean;
    onClose: () => void;
    requiredCredits?: number;
    currentCredits?: number;
}

const InsufficientCreditsModal: React.FC<InsufficientCreditsModalProps> = ({
    isOpen,
    onClose,
    requiredCredits,
    currentCredits
}) => {
    const navigate = useNavigate();

    const handleBuyCredits = () => {
        onClose();
        navigate('/subscription'); // Redirect to subscription/credits page
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Insufficient Credits"
            primaryLabel="Buy Credits"
            onPrimaryClick={handleBuyCredits}
            secondaryLabel="Cancel"
            onSecondaryClick={onClose}
        >
            <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-3xl text-red-500">monetization_on</span>
                </div>
                <p className="text-gray-300 mb-2">
                    You don't have enough credits to perform this action.
                </p>
                {requiredCredits !== undefined && currentCredits !== undefined && (
                    <p className="text-sm text-gray-400 mb-4">
                        Required: <span className="text-white font-bold">{requiredCredits}</span> |
                        Current: <span className="text-red-400 font-bold">{currentCredits}</span>
                    </p>
                )}
                <p className="text-sm text-gray-500">
                    Upgrade your plan or purchase a credit pack to continue.
                </p>
            </div>
        </Modal>
    );
};

export default InsufficientCreditsModal;
