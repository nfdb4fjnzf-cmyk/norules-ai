import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../components/Toast';

interface LandingPageConfig {
    industry: string;
    targetAudience: string;
    marketingGoal: string;
    productName: string;
    tone: string;
    language: string;
}

const LandingPageEditor: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { showToast } = useToast();
    const isEdit = !!id;

    const [name, setName] = useState('');
    const [config, setConfig] = useState<LandingPageConfig>({
        industry: '',
        targetAudience: '',
        marketingGoal: '',
        productName: '',
        tone: 'Professional',
        language: 'zh-TW'
    });
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [deploying, setDeploying] = useState(false);
    const [liveUrl, setLiveUrl] = useState('');

    const [html, setHtml] = useState('');
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        if (isEdit) {
            fetchPage();
        }
    }, [id]);

    const fetchPage = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/landing-page/get?id=${id}`);
            if (res.data.success) {
                const page = res.data.data;
                setName(page.name);
                setConfig(page.config);
                if (page.content?.html) {
                    setHtml(page.content.html);
                }
                if (page.deployment?.url) {
                    setLiveUrl(page.deployment.url);
                }
            }
        } catch (error) {
            showToast('error', t('common.error'));
            navigate('/landing-pages');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            if (isEdit) {
                await api.put('/landing-page/update', {
                    id,
                    updates: { name, config }
                });
                showToast('success', t('common.saved'));
            } else {
                await api.post('/landing-page/create', {
                    name,
                    config
                });
                showToast('success', t('common.created'));
                navigate('/landing-pages');
            }
        } catch (error) {
            showToast('error', t('common.error'));
        } finally {
            setSaving(false);
        }
    };

    const handleGenerate = async () => {
        if (!isEdit) {
            showToast('error', t('landingPage.editor.saveFirst'));
            return;
        }

        setGenerating(true);
        try {
            const res = await api.post('/landing-page/generate', { id });
            if (res.data.success) {
                setHtml(res.data.data.html);
                showToast('success', t('landingPage.editor.generatedSuccess'));
            }
        } catch (error) {
            showToast('error', t('common.error'));
        } finally {
            setGenerating(false);
        }
    };

    const handleDeploy = async () => {
        if (!html) return;
        setDeploying(true);
        try {
            const res = await api.post('/landing-page/deploy', { id });
            if (res.data.success) {
                setLiveUrl(res.data.data.url);
                showToast('success', t('landingPage.editor.deploySuccess'));
            }
        } catch (error) {
            showToast('error', t('common.error'));
        } finally {
            setDeploying(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">{t('common.loading')}</div>;

    return (
        <div className="p-8 animate-fade-in max-w-6xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={() => navigate('/landing-pages')}
                    className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                    <span className="material-symbols-outlined text-gray-400">arrow_back</span>
                </button>
                <h1 className="text-2xl font-bold text-white">
                    {isEdit ? t('landingPage.editor.editTitle') : t('landingPage.editor.createTitle')}
                </h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column: Settings */}
                <div className="space-y-8">
                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Project Name */}
                        <div className="bg-[#151927] p-6 rounded-2xl border border-white/5">
                            <h3 className="text-lg font-bold text-white mb-4">{t('landingPage.editor.projectSettings')}</h3>
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">{t('landingPage.editor.projectName')}</label>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-blue-500 outline-none transition-colors"
                                    placeholder={t('landingPage.editor.projectNamePlaceholder')}
                                />
                            </div>
                        </div>

                        {/* Content Configuration */}
                        <div className="bg-[#151927] p-6 rounded-2xl border border-white/5">
                            <h3 className="text-lg font-bold text-white mb-4">{t('landingPage.editor.contentConfig')}</h3>

                            <div className="grid grid-cols-1 gap-6">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">{t('landingPage.editor.productName')}</label>
                                    <input
                                        type="text"
                                        required
                                        value={config.productName}
                                        onChange={(e) => setConfig({ ...config, productName: e.target.value })}
                                        className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-blue-500 outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">{t('landingPage.editor.industry')}</label>
                                    <select
                                        value={config.industry}
                                        onChange={(e) => setConfig({ ...config, industry: e.target.value })}
                                        className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-blue-500 outline-none appearance-none"
                                    >
                                        <option value="">Select Industry</option>
                                        <option value="gaming">Gaming / Casino</option>
                                        <option value="ecommerce">E-commerce</option>
                                        <option value="finance">Finance / Crypto</option>
                                        <option value="app">Mobile App</option>
                                        <option value="service">Local Service</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">{t('landingPage.editor.marketingGoal')}</label>
                                    <input
                                        type="text"
                                        required
                                        value={config.marketingGoal}
                                        onChange={(e) => setConfig({ ...config, marketingGoal: e.target.value })}
                                        className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-blue-500 outline-none"
                                        placeholder={t('landingPage.editor.marketingGoalPlaceholder')}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">{t('landingPage.editor.targetAudience')}</label>
                                    <textarea
                                        rows={3}
                                        value={config.targetAudience}
                                        onChange={(e) => setConfig({ ...config, targetAudience: e.target.value })}
                                        className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-blue-500 outline-none resize-none"
                                        placeholder={t('landingPage.editor.targetAudiencePlaceholder')}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-2">{t('landingPage.editor.tone')}</label>
                                        <select
                                            value={config.tone}
                                            onChange={(e) => setConfig({ ...config, tone: e.target.value })}
                                            className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-blue-500 outline-none appearance-none"
                                        >
                                            <option value="Professional">Professional</option>
                                            <option value="Exciting">Exciting / Hype</option>
                                            <option value="Friendly">Friendly</option>
                                            <option value="Urgent">Urgent / FOMO</option>
                                            <option value="Luxury">Luxury</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm text-gray-400 mb-2">{t('landingPage.editor.language')}</label>
                                        <select
                                            value={config.language}
                                            onChange={(e) => setConfig({ ...config, language: e.target.value })}
                                            className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-blue-500 outline-none appearance-none"
                                        >
                                            <option value="zh-TW">Traditional Chinese</option>
                                            <option value="zh-CN">Simplified Chinese</option>
                                            <option value="en">English</option>
                                            <option value="ja">Japanese</option>
                                            <option value="ko">Korean</option>
                                            <option value="vi">Vietnamese</option>
                                            <option value="th">Thai</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-4">
                            <button
                                type="button"
                                onClick={() => navigate('/landing-pages')}
                                className="px-6 py-3 text-gray-400 hover:text-white transition-colors"
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-all disabled:opacity-50"
                            >
                                {saving ? t('common.saving') : (isEdit ? t('common.save') : t('landingPage.editor.createBtn'))}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Right Column: Preview & Actions */}
                <div className="space-y-6">
                    <div className="bg-[#151927] p-6 rounded-2xl border border-white/5 h-full flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-white">{t('landingPage.editor.preview')}</h3>
                            <div className="flex gap-2">
                                {liveUrl && (
                                    <a
                                        href={liveUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-4 py-2 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-lg font-bold transition-all flex items-center gap-2"
                                    >
                                        <span className="material-symbols-outlined text-sm">rocket_launch</span>
                                        {t('landingPage.editor.visitLive')}
                                    </a>
                                )}
                                {isEdit && (
                                    <>
                                        {html && (
                                            <button
                                                onClick={handleDeploy}
                                                disabled={deploying}
                                                className="px-4 py-2 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded-lg font-bold transition-all disabled:opacity-50 flex items-center gap-2"
                                            >
                                                {deploying ? (
                                                    <>
                                                        <span className="material-symbols-outlined animate-spin text-sm">refresh</span>
                                                        {t('landingPage.editor.deploying')}
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="material-symbols-outlined text-sm">cloud_upload</span>
                                                        {t('landingPage.editor.deploy')}
                                                    </>
                                                )}
                                            </button>
                                        )}
                                        <button
                                            onClick={handleGenerate}
                                            disabled={generating}
                                            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-lg font-bold shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 flex items-center gap-2"
                                        >
                                            {generating ? (
                                                <>
                                                    <span className="material-symbols-outlined animate-spin text-sm">refresh</span>
                                                    {t('landingPage.editor.generating')}
                                                </>
                                            ) : (
                                                <>
                                                    <span className="material-symbols-outlined text-sm">auto_awesome</span>
                                                    {t('landingPage.editor.generate')}
                                                </>
                                            )}
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 bg-white rounded-xl overflow-hidden relative">
                            {html ? (
                                <iframe
                                    srcDoc={html}
                                    title="Preview"
                                    className="w-full h-full border-0"
                                />
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                                    <span className="material-symbols-outlined text-6xl mb-4 opacity-20">web</span>
                                    <p>{t('landingPage.editor.noPreview')}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LandingPageEditor;
