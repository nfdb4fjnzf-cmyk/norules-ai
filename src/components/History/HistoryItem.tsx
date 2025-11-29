import React from 'react';
import { HistoryLog } from '../../services/firestore/history';
import { useTranslation } from 'react-i18next';

interface HistoryItemProps {
    log: HistoryLog;
    onClick: (log: HistoryLog) => void;
}

const HistoryItem: React.FC<HistoryItemProps> = ({ log, onClick }) => {
    const { t } = useTranslation();
    const isSuccess = log.status === 'SUCCESS';
    const date = new Date(log.timestamp).toLocaleString();

    return (
        <div
            onClick={() => onClick(log)}
            className="group p-4 bg-[#151927] border border-white/5 rounded-2xl hover:bg-white/5 transition-all cursor-pointer flex items-center justify-between gap-4"
        >
            <div className="flex items-center gap-4">
                {/* Status Icon */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isSuccess ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                    <span className="material-symbols-outlined text-xl">
                        {isSuccess ? 'check_circle' : 'error'}
                    </span>
                </div>

                {/* Info */}
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-gray-200 font-semibold text-sm">{log.apiPath}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${log.mode === 'INTERNAL'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : 'bg-green-500/10 text-green-400 border border-green-500/20'
                            }`}>
                            {log.mode}
                        </span>
                    </div>
                    <div className="text-gray-500 text-xs font-mono truncate max-w-[200px] sm:max-w-md">
                        {log.prompt}
                    </div>
                </div>
            </div>

            {/* Right Side */}
            <div className="text-right hidden sm:block">
                <div className="text-gray-400 text-xs mb-1">{date}</div>
                {log.mode === 'INTERNAL' && log.pointsDeducted ? (
                    <div className="text-red-400 text-xs font-bold">-{log.pointsDeducted} pts</div>
                ) : (
                    <div className="text-gray-600 text-xs">{t('history.details.noCost')}</div>
                )}
            </div>
        </div>
    );
};

export default HistoryItem;
