import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnalysisResult, RiskLevel } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ScoreGauge } from '../components/ui/ScoreGauge';
import { IssueCard } from '../components/ui/IssueCard';
import { Badge } from '../components/ui/Badge';

const ResultView: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const result = location.state?.result as AnalysisResult | undefined;

    useEffect(() => {
        if (!result) {
            navigate('/analyze');
        }
    }, [result, navigate]);

    if (!result) return null;

    const onReset = () => navigate('/analyze');

    const getScoreColor = (score: number) => {
        if (score >= 90) return '#10b981'; // Green
        if (score >= 70) return '#3b82f6'; // Blue
        if (score >= 50) return '#f59e0b'; // Orange
        return '#ef4444'; // Red
    };

    const scoreColor = getScoreColor(result.score);

    return (
        <div className="animate-slide-up pb-10 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={onReset} className="pl-0 hover:bg-transparent hover:text-white">
                    <span className="material-symbols-outlined mr-2">arrow_back</span>
                    Back to Analyzer
                </Button>
                <div className="flex items-center gap-3">
                    <Button variant="secondary" size="sm" className="h-10 w-10 p-0">
                        <span className="material-symbols-outlined">share</span>
                    </Button>
                    <Button variant="secondary" size="sm" className="h-10 w-10 p-0">
                        <span className="material-symbols-outlined">download</span>
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Score Card */}
                <Card className="flex flex-col items-center justify-center text-center relative overflow-hidden backdrop-blur-sm h-fit">
                    <div className="absolute top-0 left-0 w-full h-1.5" style={{ backgroundColor: scoreColor }}></div>

                    <div className="py-6">
                        <ScoreGauge score={result.score} size={220} />
                    </div>

                    <div className="space-y-2 mb-6">
                        <h2 className="text-3xl font-bold text-white">{result.riskLevel} Risk</h2>
                        <p className="text-secondary text-sm">Norules AI {result.score >= 80 ? 'approves' : 'flagged'} this content.</p>
                    </div>

                    {/* Quota & Mode Info */}
                    {result.quota && (
                        <div className="w-full mt-4 pt-6 border-t border-border">
                            <div className="flex justify-between items-center text-xs text-secondary mb-3">
                                <span className="uppercase tracking-wider font-semibold">Mode</span>
                                <Badge variant={result.mode === 'INTERNAL' ? 'default' : 'secondary'}>
                                    {result.mode}
                                </Badge>
                            </div>
                            <div className="flex justify-between items-center text-xs text-secondary mb-2">
                                <span>Daily Quota</span>
                                <span className="text-white font-medium">
                                    {result.quota.used} / {result.quota.limit}
                                </span>
                            </div>
                            <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                                <div
                                    className="bg-primary h-full rounded-full transition-all duration-500"
                                    style={{ width: `${Math.min(100, (result.quota.used / result.quota.limit) * 100)}%` }}
                                ></div>
                            </div>
                        </div>
                    )}
                </Card>

                {/* Detailed Breakdown */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Summary */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <span className="material-symbols-outlined text-primary">analytics</span>
                                Executive Summary
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-gray-300 leading-relaxed text-base">
                                {result.summary}
                            </p>
                        </CardContent>
                    </Card>

                    {/* Issues List */}
                    <div>
                        <h3 className="text-lg font-bold text-white mb-4 pl-1 flex items-center gap-2">
                            Detected Issues
                            <Badge variant="secondary" className="ml-2">{result.issues.length}</Badge>
                        </h3>
                        <div className="space-y-4">
                            {result.issues.length === 0 ? (
                                <Card className="bg-success/5 border-success/20">
                                    <CardContent className="flex items-center gap-4 p-6">
                                        <div className="p-3 rounded-full bg-success/10 text-success">
                                            <span className="material-symbols-outlined text-3xl">check_circle</span>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-success text-lg">All Clear!</h4>
                                            <p className="text-success/80 text-sm">No compliance issues detected in this content.</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            ) : (
                                result.issues.map((issue) => (
                                    <IssueCard key={issue.id} issue={issue} />
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResultView;
