import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { cn } from '../../lib/utils';

interface ScoreGaugeProps {
    score: number;
    size?: number;
    className?: string;
}

const ScoreGauge: React.FC<ScoreGaugeProps> = ({ score, size = 200, className }) => {
    const getScoreColor = (score: number) => {
        if (score >= 90) return '#10b981'; // Green
        if (score >= 70) return '#3b82f6'; // Blue
        if (score >= 50) return '#f59e0b'; // Orange
        return '#ef4444'; // Red
    };

    const scoreColor = getScoreColor(score);
    const chartData = [
        { name: 'Score', value: score },
        { name: 'Risk', value: 100 - score }
    ];

    return (
        <div className={cn("relative flex flex-col items-center justify-center", className)} style={{ width: size, height: size }}>
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={size * 0.35}
                        outerRadius={size * 0.45}
                        startAngle={90}
                        endAngle={-270}
                        dataKey="value"
                        stroke="none"
                        cornerRadius={10}
                        paddingAngle={5}
                    >
                        <Cell key="score" fill={scoreColor} />
                        <Cell key="remaining" fill="rgba(255,255,255,0.05)" />
                    </Pie>
                </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold text-white tracking-tighter" style={{ fontSize: size * 0.2 }}>{score}</span>
                <span className="text-xs font-medium text-secondary uppercase tracking-wide mt-1">Score</span>
            </div>
        </div>
    );
};

export { ScoreGauge };
