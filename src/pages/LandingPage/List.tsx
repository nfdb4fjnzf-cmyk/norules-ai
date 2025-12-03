import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useTranslation } from 'react-i18next';
import SkeletonLoader from '../../components/SkeletonLoader';
import { useToast } from '../../components/Toast';

interface LandingPage {
    id: string;
    name: string;
    config: any;
    deployment: {
        status: string;
        url?: string;
    };
    stats: {
        views: number;
        clicks: number;
    };
    createdAt: string;
}

const LandingPageList: React.FC = () => {
    const [pages, setPages] = useState<LandingPage[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { showToast } = useToast();

    useEffect(() => {
        fetchPages();
    }, []);

    const fetchPages = async () => {
        try {
            const res = await api.get('/landing-page/list');
            if (res.data.success) {
                setPages(res.data.data.pages);
            }
        } catch (error) {
            console.error('Failed to fetch landing pages', error);
            showToast('error', t('common.error'));
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm(t('landingPage.list.deleteConfirm'))) return;

        try {
            await api.delete(`/landing-page/delete?id=${id}`);
            showToast('success', t('common.success'));
            fetchPages();
        } catch (error) {
            showToast('error', t('common.error'));
        }
    };

    if (loading) {
        return (
            <div className="p-8 space-y-6">
                <div className="flex justify-between items-center">
                    <SkeletonLoader type="text" className="w-48 h-8" />
                    <SkeletonLoader type="button" className="w-32" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => <SkeletonLoader key={i} type="card" className="h-64" />)}
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 animate-fade-in">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-2">{t('landingPage.list.title')}</h1>
                    <p className="text-gray-400">{t('landingPage.list.subtitle')}</p>
                </div>
                <button
                    onClick={() => navigate('/landing-pages/new')}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                    <span className="material-symbols-outlined">add</span>
                    {t('landingPage.list.create')}
                </button>
            </div>

            {pages.length === 0 ? (
                <div className="text-center py-20 bg-[#151927] rounded-2xl border border-white/5 border-dashed">
                    <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="material-symbols-outlined text-blue-400 text-2xl">web</span>
                    </div>
                    <h3 className="text-lg font-medium text-white mb-2">{t('landingPage.list.emptyTitle')}</h3>
                    <p className="text-gray-400 mb-6">{t('landingPage.list.emptyDesc')}</p>
                    <button
                        onClick={() => navigate('/landing-pages/new')}
                        className="text-blue-400 hover:text-blue-300 font-medium"
                    >
                        {t('landingPage.list.createFirst')}
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pages.map((page) => (
                        <div
                            key={page.id}
                            onClick={() => navigate(`/landing-pages/${page.id}`)}
                            className="bg-[#151927] rounded-xl border border-white/5 overflow-hidden hover:border-blue-500/50 transition-all cursor-pointer group"
                        >
                            {/* Preview Placeholder */}
                            <div className="h-40 bg-black/40 flex items-center justify-center relative">
                                <span className="material-symbols-outlined text-gray-600 text-4xl">web_asset</span>
                                <div className="absolute top-3 right-3">
                                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${page.deployment.status === 'live' ? 'bg-green-500/20 text-green-400' :
                                            page.deployment.status === 'generating' ? 'bg-yellow-500/20 text-yellow-400' :
                                                'bg-gray-500/20 text-gray-400'
                                        }`}>
                                        {page.deployment.status}
                                    </span>
                                </div>
                            </div>

                            <div className="p-5">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors truncate pr-4">
                                        {page.name}
                                    </h3>
                                    <button
                                        onClick={(e) => handleDelete(page.id, e)}
                                        className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <span className="material-symbols-outlined text-sm">delete</span>
                                    </button>
                                </div>

                                <p className="text-sm text-gray-500 mb-4 truncate">
                                    {page.config.productName} • {page.config.marketingGoal}
                                </p>

                                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                    <div className="flex gap-4">
                                        <div className="flex items-center gap-1 text-xs text-gray-400">
                                            <span className="material-symbols-outlined text-[14px]">visibility</span>
                                            {page.stats.views}
                                        </div>
                                        <div className="flex items-center gap-1 text-xs text-gray-400">
                                            <span className="material-symbols-outlined text-[14px]">ads_click</span>
                                            {page.stats.clicks}
                                        </div>
                                    </div>
                                    <span className="text-xs text-gray-600">
                                        {new Date(page.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default LandingPageList;
