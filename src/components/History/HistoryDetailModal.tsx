import React from 'react';
import { HistoryLog } from '../../services/firestore/history';
import { useTranslation } from 'react-i18next';

interface HistoryDetailModalProps {
    log: HistoryLog | null;
    onClose: () => void;
}

const HistoryDetailModal: React.FC<HistoryDetailModalProps> = ({ log, onClose }) => {
    const { t } = useTranslation();
    if (!log) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="w-full max-w-2xl bg-[#151927] border border-white/10 rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="p-6 border-b border-white/10 flex justify-between items-start">
                    <div>
                        <h2 className="text-xl font-bold text-gray-100 mb-1">{t('history.details.title')}</h2>
                        <p className="text-gray-400 text-xs font-mono">{log.id}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                            <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">{t('history.details.timestamp')}</div>
                            <div className="text-gray-200 text-sm">{new Date(log.timestamp).toLocaleString()}</div>
                        </div>
                        <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                            <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">{t('history.details.mode')}</div>
                            <div className={`text-sm font-bold ${log.mode === 'INTERNAL' ? 'text-blue-400' : 'text-green-400'}`}>
                                {log.mode}
                            </div>
                        </div>
                        <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                            <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">{t('history.details.apiPath')}</div>
                            <div className="text-gray-200 text-sm font-mono">{log.apiPath}</div>
                        </div>
                        <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                            <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">{t('history.details.status')}</div>
                            <div className={`text-sm font-bold ${log.status === 'SUCCESS' ? 'text-green-400' : 'text-red-400'}`}>
                                {log.status}
                            </div>
                        </div>
                    </div>

                    {/* Prompt */}
                    <div>
                        <h3 className="text-gray-400 text-sm font-bold mb-2">{t('history.details.prompt')}</h3>
                        <div className="bg-black/40 p-4 rounded-xl border border-white/5 text-gray-300 text-sm font-mono whitespace-pre-wrap">
                            {log.prompt}
                        </div>
                    </div>

                    {/* Result Summary */}
                    <div>
                        <h3 className="text-gray-400 text-sm font-bold mb-2">{t('history.details.resultSummary')}</h3>
                        <div className="bg-black/40 p-4 rounded-xl border border-white/5 text-gray-300 text-sm font-mono whitespace-pre-wrap">
                            {log.resultSummary}
                        </div>
                    </div>

                    {/* Usage Stats */}
                    <div className="flex gap-4 text-xs text-gray-500 border-t border-white/10 pt-4">
                        {log.tokensUsed && <div>{t('history.details.tokens')}: <span className="text-gray-300">{log.tokensUsed}</span></div>}
                        {log.pointsDeducted && <div>{t('history.details.points')}: <span className="text-red-400">-{log.pointsDeducted}</span></div>}
                        {log.quotaRemaining && <div>{t('history.details.quotaRemaining')}: <span className="text-gray-300">{log.quotaRemaining}</span></div>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HistoryDetailModal;
