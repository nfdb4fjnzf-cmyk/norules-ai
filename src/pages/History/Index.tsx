import React, { useState, useEffect } from 'react';
import { useToast } from '../../components/Toast';
import { HistoryLog } from '../../services/firestore/history';
import HistoryItem from '../../components/History/HistoryItem';
import HistoryDetailModal from '../../components/History/HistoryDetailModal';
import SkeletonLoader from '../../components/SkeletonLoader';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';

const HistoryIndex: React.FC = () => {
    const { t } = useTranslation();
    const [logs, setLogs] = useState<HistoryLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [selectedLog, setSelectedLog] = useState<HistoryLog | null>(null);
    const { showToast } = useToast();

    const { user } = useAuth();

    const fetchLogs = async (cursor?: string) => {
        if (!user) return;
        try {
            const token = await user.getIdToken();
            const url = cursor
                ? `/api/history/list?limit=20&cursor=${cursor}`
                : '/api/history/list?limit=20';

            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();

            if (data.code === 0) {
                if (cursor) {
                    setLogs(prev => [...prev, ...data.data.logs]);
                } else {
                    setLogs(data.data.logs);
                }
                setNextCursor(data.data.nextCursor);
            } else {
                showToast('error', data.message || t('history.messages.failedFetch') || 'Failed to fetch history');
            }
        } catch (e) {
            showToast('error', t('common.error') || 'Network error');
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        if (user) fetchLogs();
    }, [user]);

    const handleLoadMore = () => {
        if (nextCursor) {
            setLoadingMore(true);
            fetchLogs(nextCursor);
        }
    };

    return (
        <div className="h-full flex flex-col animate-fade-in">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-100 mb-2">{t('history.title')}</h1>
                <p className="text-gray-400 text-sm">{t('history.subtitle')}</p>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-2">
                {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <SkeletonLoader key={i} type="large" className="h-20 w-full rounded-2xl" />
                    ))
                ) : logs.length === 0 ? (
                    <div className="text-center py-20 text-gray-500">
                        <span className="material-symbols-outlined text-4xl mb-2 opacity-50">history</span>
                        <p>{t('history.noHistory')}</p>
                    </div>
                ) : (
                    <>
                        {logs.map(log => (
                            <HistoryItem key={log.id} log={log} onClick={setSelectedLog} />
                        ))}

                        {nextCursor && (
                            <button
                                onClick={handleLoadMore}
                                disabled={loadingMore}
                                className="w-full py-3 mt-4 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 text-sm font-medium transition-colors"
                            >
                                {loadingMore ? t('common.loading') : t('common.loadMore') || 'Load More'}
                            </button>
                        )}
                    </>
                )}
            </div>

            <HistoryDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
        </div>
    );
};

export default HistoryIndex;
