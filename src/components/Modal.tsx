import React, { ReactNode, useEffect } from 'react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: ReactNode;
    primaryLabel?: string;
    onPrimaryClick?: () => void;
    secondaryLabel?: string;
    onSecondaryClick?: () => void;
}

const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    title,
    children,
    primaryLabel,
    onPrimaryClick,
    secondaryLabel,
    onSecondaryClick,
}) => {
    // Prevent scrolling when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity duration-200"
            onClick={handleBackdropClick}
        >
            <div className="w-full max-w-md bg-[#1a1d2b] rounded-2xl border border-white/10 p-6 shadow-2xl transform transition-all duration-200 scale-100 opacity-100">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    {title && <h3 className="text-lg font-semibold text-gray-200">{title}</h3>}
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5"
                    >
                        <span className="material-symbols-outlined text-xl">close</span>
                    </button>
                </div>

                {/* Body */}
                <div className="mb-6 text-gray-300">
                    {children}
                </div>

                {/* Footer */}
                {(primaryLabel || secondaryLabel) && (
                    <div className="flex justify-end gap-3">
                        {secondaryLabel && (
                            <button
                                onClick={onSecondaryClick || onClose}
                                className="rounded-xl px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 font-medium transition-all duration-150 ease-out hover:opacity-80 active:scale-95"
                            >
                                {secondaryLabel}
                            </button>
                        )}
                        {primaryLabel && (
                            <button
                                onClick={onPrimaryClick}
                                className="rounded-xl px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium transition-all duration-150 ease-out hover:opacity-80 active:scale-95"
                            >
                                {primaryLabel}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Modal;
