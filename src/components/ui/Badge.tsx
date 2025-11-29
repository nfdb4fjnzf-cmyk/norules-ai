import React from 'react';
import { cn } from '../../lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'danger';
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
    ({ className, variant = 'default', ...props }, ref) => {
        const variants = {
            default: 'bg-primary text-primary-foreground hover:bg-primary/80',
            secondary: 'bg-secondary text-white hover:bg-secondary/80',
            outline: 'text-white border border-border',
            success: 'bg-success/10 text-success border border-success/20',
            warning: 'bg-warning/10 text-warning border border-warning/20',
            danger: 'bg-danger/10 text-danger border border-danger/20',
        };

        return (
            <div
                ref={ref}
                className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                    variants[variant],
                    className
                )}
                {...props}
            />
        );
    }
);
Badge.displayName = "Badge";

export { Badge };
