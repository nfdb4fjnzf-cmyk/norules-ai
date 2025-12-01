import React from 'react';
import { HistoryLog } from '../../services/firestore/history';
import { useTranslation } from 'react-i18next';

interface HistoryItemProps {
    log: HistoryLog;
    onClick: (log: HistoryLog) => void;
}

const HistoryItem: React.FC<HistoryItemProps> = ({ log, onClick }) => {
    const { t } = useTranslation();
    const isSuccess = log.status?.toLowerCase() === 'success';
    const date = new Date(log.timestamp).toLocaleString();

    // V3 vs V2 Field Mapping
    const title = log.actionType ? log.actionType.toUpperCase() : log.apiPath?.replace('/api/', '');
    const content = log.inputText || log.prompt || '-';
    const cost = log.actualCost !== undefined ? log.actualCost : log.pointsDeducted;
    const mode = log.modelUsed || log.mode || 'UNKNOWN';

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
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-gray-200 font-semibold text-sm">{title}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${isSuccess
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}>
                            {mode}
                        </span>
                    </div>
                    <div className="text-gray-500 text-xs font-mono truncate max-w-[200px] sm:max-w-md">
                        {content}
                    </div>
                </div>
            </div>

            {/* Right Side */}
            <div className="text-right hidden sm:block shrink-0">
                <div className="text-gray-400 text-xs mb-1">{date}</div>
                {cost ? (
                    <div className="text-yellow-400 text-xs font-bold">-{cost} pts</div>
                ) : (
                    <div className="text-gray-600 text-xs">{t('history.details.noCost')}</div>
                )}
            </div>
        </div>
    );
};

export default HistoryItem;
