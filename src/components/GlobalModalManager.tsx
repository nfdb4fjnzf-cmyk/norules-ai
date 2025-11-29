import React from 'react';
import { useModal } from '../contexts/ModalContext';
import InsufficientCreditsModal from './Subscription/InsufficientCreditsModal';

const GlobalModalManager: React.FC = () => {
    const { activeModal, closeModal, modalProps } = useModal();

    return (
        <>
            <InsufficientCreditsModal
                isOpen={activeModal === 'INSUFFICIENT_CREDITS'}
                onClose={closeModal}
                {...modalProps}
            />
            {/* Add other global modals here */}
        </>
    );
};

export default GlobalModalManager;
