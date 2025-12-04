import React from 'react';

interface DialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: React.ReactNode;
}

export const Dialog: React.FC<DialogProps> = ({ open, onOpenChange, children }) => {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => onOpenChange(false)}>
            <div onClick={(e) => e.stopPropagation()}>
                {children}
            </div>
        </div>
    );
};

export const DialogContent: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
    <div className={`bg-gray-900 border border-white/10 rounded-xl p-6 shadow-xl max-w-lg w-full ${className || ''}`}>
        {children}
    </div>
);

export const DialogHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="mb-4 space-y-1.5 text-center sm:text-left">
        {children}
    </div>
);

export const DialogTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <h2 className="text-lg font-semibold leading-none tracking-tight text-white">
        {children}
    </h2>
);
