import React from 'react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { cn } from '../lib/utils';

interface MetricCardProps {
  label: string;
  value: string | number;
  trend?: number;
  icon: string;
  color: string; // Expecting tailwind color class like "text-purple-500" or "bg-purple-500"
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, trend, icon, color }) => {
  // Extract base color name if possible, or just use as is. 
  // For simplicity, we assume 'color' prop might be 'bg-purple-500' or similar.
  // We'll try to derive text/bg classes.

  return (
    <Card className="flex flex-col justify-between h-full transition-all duration-200 hover:border-white/20 hover:bg-background-card/80 backdrop-blur-sm group">
      <div className="flex justify-between items-start mb-4">
        <div className={cn(
          "p-3 rounded-xl bg-opacity-10 dark:bg-opacity-20 group-hover:bg-opacity-20 transition-all",
          color
        )}>
          <span className={cn("material-symbols-outlined", color.replace('bg-', 'text-'))}>{icon}</span>
        </div>
        {trend !== undefined && (
          <Badge
            variant={trend >= 0 ? 'success' : 'danger'}
            className="flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[14px]">
              {trend >= 0 ? 'trending_up' : 'trending_down'}
            </span>
            {Math.abs(trend)}%
          </Badge>
        )}
      </div>
      <div>
        <h3 className="text-secondary text-sm font-medium mb-1">{label}</h3>
        <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
      </div>
    </Card>
  );
};

export default MetricCard;
