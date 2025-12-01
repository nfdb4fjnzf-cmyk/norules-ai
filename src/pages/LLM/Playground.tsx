import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '../../components/Toast';
import { getSubscriptionOverview, SubscriptionInfo } from '../../services/subscription';
import SkeletonLoader from '../../components/SkeletonLoader';
import { useTranslation } from 'react-i18next';
import { ScoreGauge } from '../../components/ui/ScoreGauge';
import { Card } from '../../components/ui/Card';
import { llmService } from '../../services/llmService';
import { useAuth } from '../../contexts/AuthContext';
import { useModal } from '../../contexts/ModalContext';
import CostEstimateModal from '../../components/CostEstimateModal';
import api from '../../services/api';

const GuidedModeForm = React.lazy(() => import('../../components/GuidedMode/GuidedModeForm'));

type Mode = 'INTERNAL' | 'EXTERNAL';

interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

const MODELS = [
    { id: 'gemini-2.5-pro', nameKey: 'playground.model.text.a', cost: 1 }, // Standard
    { id: 'gemini-2.5-flash', nameKey: 'playground.model.text.b', cost: 0.5 }, // Mini
    { id: 'gemini-2.0-flash-exp', nameKey: 'Gemini 2.0 Flash (Preview)', cost: 1 }, // New
    { id: 'gemini-exp-1121', nameKey: 'Gemini Exp 1121', cost: 1 }, // Experimental
    { id: 'gpt-4o', nameKey: 'playground.model.text.c', cost: 2 }, // Advanced
    { id: 'o1-preview', nameKey: 'OpenAI o1-preview', cost: 5 }, // High Reasoning
    { id: 'o1-mini', nameKey: 'OpenAI o1-mini', cost: 2 }, // Fast Reasoning
    { id: 'gpt-3.5-turbo', nameKey: 'playground.model.text.d', cost: 0.5 }, // Mini
    { id: 'imagen-3', nameKey: 'playground.model.image.a', cost: 3 }, // Image (Ch.121.4)
    { id: 'dall-e-3', nameKey: 'playground.model.image.b', cost: 3 }, // Image
    { id: 'banana-nano', nameKey: 'playground.model.image.c', cost: 3 }, // Image
    { id: 'sora', nameKey: 'playground.model.video.a', cost: 10 }, // Video (Ch.121.4)
];

const ASPECT_RATIOS = [
    { id: '9:16', label: '9:16 (Portrait)', resolution: { image: '1080x1920', video: '720x1280' } },
    { id: '16:9', label: '16:9 (Landscape)', resolution: { image: '1920x1080', video: '1280x720' } },
    { id: '1:1', label: '1:1 (Square)', resolution: { image: '1080x1080', video: '720x720' } },
];

const getModelType = (modelId: string) => {
    if (['imagen-3', 'dall-e-3', 'banana-nano'].includes(modelId)) return 'image';
    if (['sora'].includes(modelId)) return 'video';
    return 'text';
};

const LLMPlayground: React.FC = () => {
    const { t } = useTranslation();
    const [input, setInput] = useState('');
    const [selectedModel, setSelectedModel] = useState(MODELS[0].id);
    const [aspectRatio, setAspectRatio] = useState('16:9');
    const [complianceScore, setComplianceScore] = useState(100);
    const [file, setFile] = useState<File | null>(null);
    const [response, setResponse] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState<Mode>('INTERNAL');
    const [quota, setQuota] = useState<any>(null);
    const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
    const [initLoading, setInitLoading] = useState(true);
    const { showToast } = useToast();
    const [privateMode, setPrivateMode] = useState(false);

    const { userProfile, refreshProfile } = useAuth();
    const { openModal } = useModal();

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [fileType, setFileType] = useState<'image' | 'video' | null>(null);

    // V3 Cost Estimation State
    const [showCostModal, setShowCostModal] = useState(false);
    const [estimatedCostValue, setEstimatedCostValue] = useState(0);
    const [isEstimating, setIsEstimating] = useState(false);

    useEffect(() => {
        const init = async () => {
            const hasKey = localStorage.getItem('encrypted_api_key');
            setMode(hasKey ? 'EXTERNAL' : 'INTERNAL');

            try {
                const sub = await getSubscriptionOverview();
                setSubscription(sub);
                if (sub) {
                    setQuota({
                        used: sub.usage.used,
                        limit: sub.dailyLimit,
                        remaining: sub.usage.remaining
                    });
                }
            } catch (e) {
                console.error("Failed to fetch subscription", e);
            }

            setInitLoading(false);
        };
        init();
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setFileType(type);
        }
    };

    const triggerFileSelect = (type: 'image' | 'video') => {
        setFileType(type);
        if (fileInputRef.current) {
            fileInputRef.current.accept = type === 'image' ? 'image/*' : 'video/*';
            fileInputRef.current.click();
        }
    };

    const clearFile = () => {
        setFile(null);
        setFileType(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // Calculate Cost based on Model (Ch.121.5)
    const selectedModelData = MODELS.find(m => m.id === selectedModel) || MODELS[0];
    const modelType = getModelType(selectedModel);

    // Access Control Check
    const isRestricted = (modelType === 'image' || modelType === 'video') && (mode === 'EXTERNAL' || (subscription?.plan === 'free' && mode === 'INTERNAL'));

    // Guided Mode State
    const [isGuidedMode, setIsGuidedMode] = useState(true);

    const handleGuidedGenerate = (prompt: string, modelId: string, actionType: 'text' | 'image' | 'video') => {
        setInput(prompt);
        setSelectedModel(modelId);
        // We need to trigger generation immediately
        // But handleCall uses state 'input' and 'selectedModel' which might not be updated yet due to closure.
        // So we refactor handleCall to accept optional args.
        handleCall(prompt, modelId, actionType);
    };

    const handleCall = async (overrideInput?: string, overrideModel?: string, overrideActionType?: 'text' | 'image' | 'video') => {
        const currentInput = overrideInput || input;
        const currentModel = overrideModel || selectedModel;
        const currentModelType = overrideActionType || getModelType(currentModel);

        // If file is present, use it (Standard Mode only usually, but Guided Mode might support it later)
        // For now Guided Mode doesn't support file upload in the form, but we can keep it compatible.

        if (!currentInput && !file) {
            showToast('error', t('analyzer.errors.enterText'));
            return;
        }

        // Access Control Check (Re-evaluate with current model)
        const isRestricted = (currentModelType === 'image' || currentModelType === 'video') && (mode === 'EXTERNAL' || (subscription?.plan === 'free' && mode === 'INTERNAL'));

        if (isRestricted) {
            showToast('error', 'This feature is not available in your current plan or mode.');
            return;
        }

        // V3: Estimate Cost First
        if (mode === 'INTERNAL') {
            try {
                setIsEstimating(true);
                const res = await api.post('/cost/estimate', {
                    actionType: currentModelType === 'text' ? 'chat' : currentModelType,
                    inputLength: currentInput.length,
                    model: currentModel
                });

                if (res.data.code === 0) {
                    setEstimatedCostValue(res.data.data.estimatedCost);
                    // If Guided Mode, we might want to skip confirmation or show it differently?
                    // For now, show the modal.
                    // We need to store the "pending execution" parameters
                    // But executeGeneration reads from state.
                    // We should update state before showing modal.
                    setInput(currentInput);
                    setSelectedModel(currentModel);
                    setShowCostModal(true);
                } else {
                    showToast('error', 'Failed to estimate cost. Please try again.');
                }
            } catch (e) {
                console.error('Estimation error', e);
                showToast('error', 'Failed to estimate cost.');
            } finally {
                setIsEstimating(false);
            }
        } else {
            // External mode
            setInput(currentInput);
            setSelectedModel(currentModel);
            // We need to wait for state update? No, executeGeneration reads state.
            // React state updates are batched.
            // Better to pass args to executeGeneration too.
            executeGeneration(currentInput, currentModel, currentModelType);
        }
    };

    const executeGeneration = async (overrideInput?: string, overrideModel?: string, overrideType?: string) => {
        const textToUse = overrideInput || input;
        const modelToUse = overrideModel || selectedModel;
        const typeToUse = overrideType || getModelType(modelToUse);

        setShowCostModal(false);
        setLoading(true);
        setResponse(null);
        try {
            let res;
            if (typeToUse === 'image') {
                res = await llmService.generateImage(textToUse, modelToUse, complianceScore, aspectRatio, privateMode);
            } else if (typeToUse === 'video') {
                res = await llmService.generateVideo(textToUse, modelToUse, complianceScore, aspectRatio, privateMode);
            } else {
                res = await llmService.generateText(textToUse, modelToUse, complianceScore, privateMode);
            }

            setResponse(res);

            // Refresh profile after success
            await refreshProfile();

        } catch (e: any) {
            console.error(e);
            const errorMessage = e.response?.data?.message || e.response?.data?.error || e.message || 'Generation failed';
            showToast('error', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    if (initLoading) {
        return (
            <div className="p-6 space-y-6">
                <SkeletonLoader type="large" className="h-12 w-1/3" />
                <SkeletonLoader type="large" className="h-64 w-full" />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col gap-6 animate-fade-in">
            <CostEstimateModal
                isOpen={showCostModal}
                onClose={() => setShowCostModal(false)}
                onConfirm={() => executeGeneration()}
                actionType={getModelType(selectedModel)}
                estimatedCost={estimatedCostValue}
                currentBalance={userProfile?.credits || 0}
                isProcessing={loading}
            />

            <div className="flex justify-between items-center mb-2">
                <div>
                    <h1 className="text-2xl font-bold text-gray-100">{t('playground.title')}</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${mode === 'INTERNAL'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : 'bg-green-500/10 text-green-400 border border-green-500/20'
                            }`}>
                            {mode === 'INTERNAL' ? t('playground.internal') : t('playground.external')}
                        </span>
                        {quota && mode === 'INTERNAL' && (
                            <span className="text-xs text-gray-400">
                                {t('playground.quotaUsed')}: {quota.remaining} / {quota.limit}
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setPrivateMode(!privateMode)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${privateMode
                            ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                            : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                            }`}
                    >
                        <span className="material-symbols-outlined text-sm">
                            {privateMode ? 'visibility_off' : 'visibility'}
                        </span>
                        <span className="text-xs font-medium">
                            {privateMode ? t('playground.privateModeOn') : t('playground.privateModeOff')}
                        </span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
                {/* Input Area */}
                <div className="rounded-2xl bg-white/5 border border-white/10 p-6 flex flex-col gap-4 overflow-y-auto">

                    {/* Mode Toggle */}
                    <div className="flex bg-black/20 p-1 rounded-xl border border-white/5 mb-2">
                        <button
                            onClick={() => setIsGuidedMode(false)}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${!isGuidedMode ? 'bg-blue-500 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                        >
                            Free Input
                        </button>
                        <button
                            onClick={() => setIsGuidedMode(true)}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${isGuidedMode ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                        >
                            ✨ Guided Mode
                        </button>
                    </div>

                    {isGuidedMode ? (
                        <React.Suspense fallback={<SkeletonLoader type="large" className="h-96 w-full" />}>
                            <GuidedModeForm
                                onGenerate={handleGuidedGenerate}
                                isEnterprise={subscription?.plan === 'enterprise'}
                                hasCustomKey={mode === 'EXTERNAL'}
                                availableModels={MODELS}
                            />
                        </React.Suspense>
                    ) : (
                        <>
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-gray-200">{t('playground.input')}</h3>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-400">{t('playground.model')}:</span>
                                    <select
                                        value={selectedModel}
                                        onChange={(e) => setSelectedModel(e.target.value)}
                                        className="bg-black/20 border border-white/10 rounded-lg px-2 py-1 text-sm text-gray-200 outline-none focus:border-blue-500/50"
                                    >
                                        {MODELS.map((model) => {
                                            const type = getModelType(model.id);
                                            const disabled = (type === 'image' || type === 'video') && (mode === 'EXTERNAL' || (subscription?.plan === 'free' && mode === 'INTERNAL'));
                                            return (
                                                <option key={model.id} value={model.id} disabled={disabled}>
                                                    {t(model.nameKey)} {disabled ? '(Upgrade Required)' : ''}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>
                            </div>

                            <textarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder={t('playground.placeholder.prompt')}
                                className="flex-1 bg-black/20 rounded-xl p-4 text-gray-200 outline-none border border-white/5 focus:border-blue-500/50 resize-none font-mono text-sm min-h-[150px]"
                            />

                            {/* Aspect Ratio Selector (Only for Image/Video) */}
                            {(modelType === 'image' || modelType === 'video') && (
                                <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs text-gray-400 font-bold">Aspect Ratio</span>
                                        <span className="text-xs text-blue-400">
                                            Output: {modelType === 'image' ? '1080p' : '720p'}
                                        </span>
                                    </div>
                                    <div className="flex gap-2">
                                        {ASPECT_RATIOS.map((ratio) => (
                                            <button
                                                key={ratio.id}
                                                onClick={() => setAspectRatio(ratio.id)}
                                                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${aspectRatio === ratio.id
                                                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                                                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                                    }`}
                                            >
                                                {ratio.label}
                                                <div className="text-[10px] opacity-60 mt-0.5">
                                                    {modelType === 'image' ? ratio.resolution.image : ratio.resolution.video}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* File Upload & Cost */}
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex gap-2">
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            className="hidden"
                                            onChange={(e) => handleFileSelect(e, fileType || 'image')}
                                        />
                                        <button
                                            onClick={() => triggerFileSelect('image')}
                                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${fileType === 'image' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50' : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/5'}`}
                                        >
                                            <span className="material-symbols-outlined text-lg">image</span>
                                            {t('playground.uploadImage')}
                                        </button>
                                        <button
                                            onClick={() => triggerFileSelect('video')}
                                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${fileType === 'video' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50' : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/5'}`}
                                        >
                                            <span className="material-symbols-outlined text-lg">movie</span>
                                            {t('playground.uploadVideo')}
                                        </button>
                                    </div>

                                    {file && (
                                        <div className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-lg border border-white/10">
                                            <span className="text-xs text-gray-300 truncate max-w-[100px]">{file.name}</span>
                                            <button onClick={clearFile} className="text-gray-500 hover:text-red-400">
                                                <span className="material-symbols-outlined text-sm">close</span>
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Target Compliance Score Slider */}
                                <div className="flex flex-col gap-2 py-2">
                                    <div className="flex justify-between items-center text-xs text-gray-400">
                                        <span>{t('playground.targetRiskScore')}</span>
                                        <span className="text-gray-200 font-bold">{complianceScore}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={complianceScore}
                                        onChange={(e) => setComplianceScore(Number(e.target.value))}
                                        className="w-full h-1.5 bg-black/40 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                    />
                                </div>

                                <div className="flex justify-between items-center text-xs text-gray-400 px-1">
                                    <span>{t('playground.cost')}: <span className="text-warning font-bold">{estimatedCostValue || '...'}</span> {t('playground.points')}</span>
                                    <span>{input.length} chars</span>
                                </div>
                            </div>

                            <button
                                onClick={() => handleCall()}
                                disabled={loading || isRestricted || isEstimating}
                                className={`w-full py-3 rounded-xl font-bold text-white transition-all ${loading || isRestricted || isEstimating ? 'bg-gray-600 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'}`}
                            >
                                {loading ? t('playground.processing') : isEstimating ? 'Estimating...' : isRestricted ? 'Feature Restricted' : t('playground.send')}
                            </button>
                        </>
                    )}
                </div>

                {/* Output Area */}
                <div className="rounded-2xl bg-white/5 border border-white/10 p-6 flex flex-col gap-4 overflow-hidden">
                    <h3 className="font-bold text-gray-200">{t('playground.output')}</h3>

                    {response ? (
                        <div className="flex-1 overflow-auto space-y-6">
                            {/* Compliance Score Section */}
                            <div className="flex items-center justify-between bg-black/20 p-4 rounded-xl border border-white/5">
                                <div className="flex flex-col">
                                    <span className="text-sm text-gray-400 mb-1">{t('playground.riskScore')}</span>
                                    <div className="flex items-center gap-2">
                                        {/* Display 100 - RiskScore to show Compliance Score */}
                                        <span className={`text-2xl font-bold ${(100 - response.riskScore) >= 90 ? 'text-green-500' : (100 - response.riskScore) >= 70 ? 'text-blue-500' : 'text-red-500'}`}>
                                            {100 - response.riskScore}
                                        </span>
                                        <span className="text-xs text-gray-500">/ 100</span>
                                    </div>
                                </div>
                                <div className="w-24 h-24">
                                    {/* ScoreGauge expects a "Good" score (High = Green). So we pass Compliance Score (100 - Risk) */}
                                    <ScoreGauge score={100 - response.riskScore} size={96} />
                                </div>
                            </div>

                            {/* Response Data */}
                            <div className="space-y-2">
                                <span className="text-sm text-gray-400">{t('playground.generatedContent')}</span>
                                <div className="bg-black/20 p-4 rounded-xl border border-white/5 font-mono text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                                    {response.data?.text || JSON.stringify(response.data, null, 2)}
                                </div>

                                {/* Generated Media Display */}
                                {response.data?.mediaUrl && (
                                    <div className="mt-4 rounded-xl overflow-hidden border border-white/10">
                                        {response.data.mediaType === 'video' ? (
                                            <video src={response.data.mediaUrl} controls className="w-full h-auto" />
                                        ) : (
                                            <img src={response.data.mediaUrl} alt="Generated Content" className="w-full h-auto" />
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Response Metadata */}
                            <div className="bg-black/20 p-4 rounded-xl border border-white/5 text-xs space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">{t('playground.mode')}</span>
                                    <span className={response.meta?.mode === 'INTERNAL' ? 'text-blue-400' : 'text-green-400 font-bold'}>{response.meta?.mode || 'UNKNOWN'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">{t('playground.quotaUsed')}</span>
                                    <span className="text-gray-200">{response.meta?.quotaUsage?.used} / {response.meta?.quotaUsage?.limit}</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
                            {t('playground.responsePlaceholder')}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LLMPlayground;
