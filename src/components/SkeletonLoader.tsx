import React from 'react';

type SkeletonType = 'small' | 'medium' | 'large';

interface SkeletonLoaderProps {
    type?: SkeletonType;
    className?: string;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ type = 'medium', className = '' }) => {
    const baseStyles = "bg-[#1a1d2b] animate-pulse rounded-xl";

    const sizeStyles = {
        small: "h-4 w-24",
        medium: "h-6 w-40",
        large: "h-8 w-full"
    };

    return (
        <div className={`${baseStyles} ${sizeStyles[type]} ${className}`} />
    );
};

export default SkeletonLoader;
