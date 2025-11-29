import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ModalContextType {
    openModal: (modalName: string, props?: any) => void;
    closeModal: () => void;
    activeModal: string | null;
    modalProps: any;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [activeModal, setActiveModal] = useState<string | null>(null);
    const [modalProps, setModalProps] = useState<any>({});

    const openModal = (modalName: string, props: any = {}) => {
        setActiveModal(modalName);
        setModalProps(props);
    };

    const closeModal = () => {
        setActiveModal(null);
        setModalProps({});
    };

    return (
        <ModalContext.Provider value={{ openModal, closeModal, activeModal, modalProps }}>
            {children}
        </ModalContext.Provider>
    );
};

export const useModal = () => {
    const context = useContext(ModalContext);
    if (context === undefined) {
        throw new Error('useModal must be used within a ModalProvider');
    }
    return context;
};
