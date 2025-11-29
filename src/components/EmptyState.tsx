import React, { ReactNode } from 'react';

interface EmptyStateProps {
    title: string;
    description: string;
    icon?: ReactNode;
    actionLabel?: string;
    onActionClick?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({
    title,
    description,
    icon,
    actionLabel,
    onActionClick,
}) => {
    return (
        <div className="flex flex-col items-center justify-center text-center p-8">
            <div className="bg-[#1a1d2b] rounded-2xl p-6 border border-white/10 mb-6">
                {icon || <span className="material-symbols-outlined text-4xl text-gray-400">inbox</span>}
            </div>

            <h3 className="text-xl font-bold text-gray-300 mb-2">{title}</h3>
            <p className="text-gray-400 max-w-sm mb-6">{description}</p>

            {actionLabel && onActionClick && (
                <button
                    onClick={onActionClick}
                    className="rounded-xl px-6 py-2 font-semibold bg-blue-500 hover:bg-blue-600 text-white transition-all duration-150 ease-out hover:opacity-80 active:scale-95"
                >
                    {actionLabel}
                </button>
            )}
        </div>
    );
};

export default EmptyState;
