import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { Card } from '../components/ui/Card';
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
import { Loader2, Search, Filter, Download, AlertCircle } from 'lucide-react';

interface UsageLog {
    id: string;
    actionType: string;
    inputText?: string;
    estimatedCost: number;
    actualCost: number;
    modelUsed?: string;
    timestamp: string;
    status: string;
    errorMessage?: string;
    tokensIn?: number;
    tokensOut?: number;
}

const History: React.FC = () => {
    const { t } = useTranslation();
    const [logs, setLogs] = useState<UsageLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchHistory = async () => {
        try {
            setLoading(true);
            const response = await api.get('/history/list?limit=50');
            if (response.data.success) {
                setLogs(response.data.data.logs);
            } else {
                setError('Failed to load history');
            }
        } catch (err: any) {
            console.error('History fetch error:', err);
            setError(err.message || 'Failed to load history');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    const getStatusBadge = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'success': return <Badge variant="success">Success</Badge>;
            case 'failed': return <Badge variant="danger">Failed</Badge>;
            default: return <Badge variant="secondary">{status}</Badge>;
        }
    };

    const filteredLogs = logs.filter(log =>
        log.actionType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.modelUsed?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.inputText?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="max-w-7xl mx-auto animate-fade-in space-y-6 p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-2">Usage History</h1>
                    <p className="text-gray-400 text-sm">Track your AI usage, costs, and generation history.</p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search history..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <Button variant="secondary" className="gap-2">
                        <Filter className="w-4 h-4" />
                        Filter
                    </Button>
                    <Button variant="secondary" className="gap-2" onClick={fetchHistory}>
                        <Download className="w-4 h-4" />
                        Export
                    </Button>
                </div>
            </div>

            <Card className="overflow-hidden border-gray-800 bg-gray-900/50">
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                    </div>
                ) : error ? (
                    <div className="flex flex-col justify-center items-center h-64 text-red-400 gap-2">
                        <AlertCircle className="w-8 h-8" />
                        <p>{error}</p>
                        <Button variant="secondary" size="sm" onClick={fetchHistory}>Retry</Button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-gray-800 hover:bg-transparent">
                                    <TableHead className="text-gray-400">Time</TableHead>
                                    <TableHead className="text-gray-400">Action</TableHead>
                                    <TableHead className="text-gray-400">Model</TableHead>
                                    <TableHead className="text-gray-400">Input Preview</TableHead>
                                    <TableHead className="text-gray-400 text-right">Est. Cost</TableHead>
                                    <TableHead className="text-gray-400 text-right">Actual Cost</TableHead>
                                    <TableHead className="text-gray-400 text-center">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredLogs.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-32 text-center text-gray-500">
                                            No usage history found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredLogs.map((log) => (
                                        <TableRow key={log.id} className="border-gray-800 hover:bg-gray-800/50">
                                            <TableCell className="text-gray-300 whitespace-nowrap">
                                                {new Date(log.timestamp).toLocaleString()}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <span className="capitalize text-white font-medium">{log.actionType}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-gray-400 text-sm">
                                                {log.modelUsed || '-'}
                                            </TableCell>
                                            <TableCell className="text-gray-400 text-sm max-w-xs truncate" title={log.inputText}>
                                                {log.inputText || '-'}
                                            </TableCell>
                                            <TableCell className="text-right text-gray-400">
                                                {log.estimatedCost}
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-yellow-500">
                                                {log.actualCost}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {getStatusBadge(log.status)}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default History;
