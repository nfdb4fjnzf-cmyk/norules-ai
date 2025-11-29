import React from 'react';
import { Card } from './Card';
import { Badge } from './Badge';
import { cn } from '../../lib/utils';
import { RiskLevel } from '../../types';

interface IssueCardProps {
    issue: {
        id: string;
        category: string;
        severity: RiskLevel;
        description: string;
        suggestion: string;
    };
    className?: string;
}

const IssueCard: React.FC<IssueCardProps> = ({ issue, className }) => {
    const getSeverityColor = (severity: RiskLevel) => {
        switch (severity) {
            case RiskLevel.HIGH: return 'danger';
            case RiskLevel.MEDIUM: return 'warning';
            case RiskLevel.LOW: return 'default'; // Blue
            default: return 'secondary';
        }
    };

    const getSeverityIcon = (severity: RiskLevel) => {
        switch (severity) {
            case RiskLevel.HIGH: return 'dangerous';
            case RiskLevel.MEDIUM: return 'warning';
            case RiskLevel.LOW: return 'info';
            default: return 'help';
        }
    };

    const variant = getSeverityColor(issue.severity);

    return (
        <Card className={cn(
            "transition-all duration-200 hover:scale-[1.01] hover:bg-background-card/80 border-l-4",
            issue.severity === RiskLevel.HIGH ? "border-l-danger" :
                issue.severity === RiskLevel.MEDIUM ? "border-l-warning" : "border-l-primary",
            className
        )}>
            <div className="flex items-start gap-4">
                <div className={cn(
                    "mt-1 p-2 rounded-xl flex items-center justify-center",
                    issue.severity === RiskLevel.HIGH ? "bg-danger/10 text-danger" :
                        issue.severity === RiskLevel.MEDIUM ? "bg-warning/10 text-warning" : "bg-primary/10 text-primary"
                )}>
                    <span className="material-symbols-outlined text-xl">
                        {getSeverityIcon(issue.severity)}
                    </span>
                </div>
                <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-white text-lg">{issue.category}</h4>
                        <Badge variant={variant as any}>
                            {issue.severity}
                        </Badge>
                    </div>
                    <p className="text-secondary text-sm mb-4 leading-relaxed">{issue.description}</p>

                    <div className="bg-background/50 rounded-xl p-4 border border-border">
                        <p className="font-medium text-white text-xs uppercase tracking-wide mb-2 flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm text-primary">lightbulb</span>
                            Suggestion
                        </p>
                        <p className="text-gray-300 text-sm leading-relaxed">{issue.suggestion}</p>
                    </div>
                </div>
            </div>
        </Card>
    );
};

export { IssueCard };
