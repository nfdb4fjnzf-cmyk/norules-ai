import React from 'react';
import { AnalysisResult, ContentType, RiskLevel } from '../types';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../components/ui/Table';

const mockHistory: AnalysisResult[] = [
    {
        id: '1',
        timestamp: new Date('2023-10-26'),
        contentType: ContentType.TEXT,
        score: 95,
        riskLevel: RiskLevel.SAFE,
        summary: 'Email marketing copy compliant.',
        issues: []
    },
    {
        id: '2',
        timestamp: new Date('2023-10-25'),
        contentType: ContentType.IMAGE,
        score: 65,
        riskLevel: RiskLevel.MEDIUM,
        summary: 'Image contains unverified claims.',
        issues: []
    },
    {
        id: '3',
        timestamp: new Date('2023-10-24'),
        contentType: ContentType.VIDEO,
        score: 45,
        riskLevel: RiskLevel.HIGH,
        summary: 'Video contains sensitive content.',
        issues: []
    }
];

const History: React.FC = () => {
    const { t } = useTranslation();

    const getRiskVariant = (level: RiskLevel) => {
        switch (level) {
            case RiskLevel.SAFE: return 'success';
            case RiskLevel.MEDIUM: return 'warning';
            case RiskLevel.HIGH: return 'danger';
            default: return 'secondary';
        }
    };

    return (
        <div className="max-w-6xl mx-auto animate-fade-in space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-2">{t('history.title')}</h1>
                    <p className="text-secondary text-sm">View and manage your past content analyses.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="secondary" className="gap-2">
                        <span className="material-symbols-outlined">filter_list</span>
                        Filter
                    </Button>
                    <Button variant="secondary" className="gap-2">
                        <span className="material-symbols-outlined">download</span>
                        Export
                    </Button>
                </div>
            </div>

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('common.status')}</TableHead>
                                <TableHead>{t('common.type')}</TableHead>
                                <TableHead>{t('common.date')}</TableHead>
                                <TableHead>{t('common.score')}</TableHead>
                                <TableHead className="text-right">{t('common.actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {mockHistory.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center text-secondary">
                                        {t('history.noHistory')}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                mockHistory.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell>
                                            <Badge variant={getRiskVariant(item.riskLevel)}>
                                                {item.riskLevel === RiskLevel.SAFE ? t('history.status.passed') : t('history.status.flagged')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2 text-white">
                                                <span className="material-symbols-outlined text-secondary text-xl">
                                                    {item.contentType === ContentType.TEXT ? 'text_fields' :
                                                        item.contentType === ContentType.IMAGE ? 'image' : 'movie'}
                                                </span>
                                                <span className="text-sm font-medium capitalize">
                                                    {t(`analyzer.tabs.${item.contentType.toLowerCase()}`)}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-secondary">
                                            {item.timestamp.toLocaleDateString()}
                                        </TableCell>
                                        <TableCell>
                                            <span className={`font-bold ${item.score >= 80 ? 'text-success' : item.score >= 60 ? 'text-warning' : 'text-danger'}`}>
                                                {item.score}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 hover:bg-primary/10">
                                                {t('history.viewReport')}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>
        </div>
    );
};

export default History;
