import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface GuidedModeFormProps {
    onGenerate: (prompt: string, modelId: string, actionType: 'text' | 'image' | 'video') => void;
    isEnterprise: boolean;
    hasCustomKey: boolean;
    availableModels: { id: string; nameKey: string }[];
}

const PLATFORMS = ['Facebook', 'Instagram', 'TikTok', 'YouTube', 'LinkedIn', 'Google Ads'];
const FORMATS = ['Short Video Script', 'Social Post', 'Ad Headline & Copy', 'Product Description', 'Image Creative', 'Video Creative'];
const GOALS = ['Awareness', 'Engagement', 'Traffic', 'Conversion'];
const TONES = ['Professional', 'Friendly', 'Humorous', 'Urgent', 'Luxury', 'Trendy', 'Filipino Influencer', 'Tech'];
const CREATIVE_TYPES = ['Image', 'Video', 'Copy', 'Carousel', 'Banner'];
const ASPECT_RATIOS = ['1:1', '4:5', '9:16', '16:9'];
const VISUAL_STYLES = ['Business Minimal', 'Tech Blue', 'Chibi/Cute', 'Influencer', 'AA Style', 'GA Style', 'High Stimulus', 'Brand Color'];
const ELEMENTS = ['Human (Male)', 'Human (Female)', 'No Human', 'Logo', 'Explosive Effects', 'Game UI', 'Localized Scene (PH)', 'Localized Scene (TW)', 'Localized Scene (VN)'];
const LANGUAGES = ['Traditional Chinese', 'English', 'Tagalog', 'Vietnamese'];
const COMPLIANCE_MODES = ['Meta Safe Mode', 'TikTok Safe Mode', 'High Stimulus'];
const OUTPUT_FORMATS = ['PNG', 'JPG', 'MP4', 'ZIP'];

const GuidedModeForm: React.FC<GuidedModeFormProps> = ({ onGenerate, isEnterprise, hasCustomKey, availableModels }) => {
    const { t } = useTranslation();

    const [formData, setFormData] = useState({
        platform: 'Facebook',
        format: 'Social Post',
        productName: '',
        brandName: '',
        keySellingPoints: '',
        targetAudience: '',
        marketingGoal: 'Awareness',
        tone: 'Professional',
        creativeType: 'Copy',
        aspectRatio: '1:1',
        visualStyle: 'Business Minimal',
        brandColor: '',
        elements: [] as string[],
        language: 'Traditional Chinese',
        compliance: 'Meta Safe Mode',
        outputFormat: 'PNG',
        selectedModel: 'auto'
    });

    // Auto-update creative type based on format
    useEffect(() => {
        if (formData.format === 'Image Creative') setFormData(prev => ({ ...prev, creativeType: 'Image' }));
        if (formData.format === 'Video Creative') setFormData(prev => ({ ...prev, creativeType: 'Video' }));
        if (formData.format === 'Short Video Script') setFormData(prev => ({ ...prev, creativeType: 'Copy' }));
    }, [formData.format]);

    const handleElementChange = (element: string) => {
        setFormData(prev => {
            const newElements = prev.elements.includes(element)
                ? prev.elements.filter(e => e !== element)
                : [...prev.elements, element];
            return { ...prev, elements: newElements };
        });
    };

    const getBestModel = () => {
        // 1. Enterprise Override
        if (isEnterprise && hasCustomKey && formData.selectedModel !== 'auto') {
            return formData.selectedModel;
        }

        // 2. Creative Type Routing
        if (formData.creativeType === 'Image' || formData.creativeType === 'Banner') return 'imagen-3';
        if (formData.creativeType === 'Video') return 'sora';

        // 3. Text Complexity Routing
        if (['Short Video Script', 'Ad Headline & Copy'].includes(formData.format)) {
            return 'gpt-4o'; // High Intelligence
        }

        if (formData.format === 'Product Description') {
            return 'gemini-2.5-flash'; // Fast & Cheap
        }

        // 4. Default Fallback
        return 'gemini-2.5-pro';
    };

    const buildTextPrompt = () => {
        return `Role: ${formData.platform} Copywriter.
Task: Write ${formData.format} for ${formData.brandName} ${formData.productName}.
Goal: ${formData.marketingGoal}. Audience: ${formData.targetAudience}. Tone: ${formData.tone}.
Points: ${formData.keySellingPoints}.
Lang: ${formData.language}.
Compliance: ${formData.compliance}.`;
    };

    const buildVisualPrompt = () => {
        return `Act as a professional creative generator for ${formData.platform}.
Please generate a ${formData.format} for the brand ${formData.brandName} and product ${formData.productName}.

Key Selling Points: ${formData.keySellingPoints}.
Target Audience: ${formData.targetAudience}.
Marketing Goal: ${formData.marketingGoal}.
Tone: ${formData.tone}.

Creative Details:
- Type: ${formData.creativeType}
- Aspect Ratio: ${formData.aspectRatio}
- Visual Style: ${formData.visualStyle} ${formData.visualStyle === 'Brand Color' ? `(Hex: ${formData.brandColor})` : ''}
- Elements Required: ${formData.elements.join(', ')}
- Language: ${formData.language}

Compliance Mode: ${formData.compliance}.
Output Format Preference: ${formData.outputFormat}.

Special Instructions:
- If Image, resolution must be 1080p (unless Banner 1920x600).
- If Video, resolution must be 720p.
- Ensure content aligns with ${formData.platform} best practices.`;
    };

    const handleSubmit = () => {
        const isVisualTask = ['Image', 'Video', 'Carousel', 'Banner'].includes(formData.creativeType);
        const prompt = isVisualTask ? buildVisualPrompt() : buildTextPrompt();
        const modelId = getBestModel();

        // Determine action type for cost estimation
        let actionType: 'text' | 'image' | 'video' = 'text';
        if (formData.creativeType === 'Image' || formData.creativeType === 'Banner') actionType = 'image';
        if (formData.creativeType === 'Video') actionType = 'video';

        onGenerate(prompt, modelId, actionType);
    };

    const isVisual = ['Image', 'Video', 'Carousel', 'Banner'].includes(formData.creativeType);

    return (
        <div className="space-y-6 p-1">
            {/* Platform & Format */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs text-gray-400 mb-1">{t('playground.guidedMode.platform')}</label>
                    <select
                        value={formData.platform}
                        onChange={e => setFormData({ ...formData, platform: e.target.value })}
                        className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-blue-500/50"
                    >
                        {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs text-gray-400 mb-1">{t('playground.guidedMode.format')}</label>
                    <select
                        value={formData.format}
                        onChange={e => setFormData({ ...formData, format: e.target.value })}
                        className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-blue-500/50"
                    >
                        {FORMATS.map(f => <option key={f} value={f}>{t(`playground.guidedMode.options.format.${f}`)}</option>)}
                    </select>
                </div>
            </div>

            {/* Basic Info */}
            <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">{t('playground.guidedMode.brandName')}</label>
                        <input
                            type="text"
                            value={formData.brandName}
                            onChange={e => setFormData({ ...formData, brandName: e.target.value })}
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-blue-500/50"
                            placeholder="e.g. NoAI"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">{t('playground.guidedMode.productName')}</label>
                        <input
                            type="text"
                            value={formData.productName}
                            onChange={e => setFormData({ ...formData, productName: e.target.value })}
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-blue-500/50"
                            placeholder="e.g. AI Generator"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-xs text-gray-400 mb-1">{t('playground.guidedMode.keySellingPoints')}</label>
                    <textarea
                        value={formData.keySellingPoints}
                        onChange={e => setFormData({ ...formData, keySellingPoints: e.target.value })}
                        className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-blue-500/50 min-h-[80px]"
                        placeholder="e.g. Fast, Secure, Cheap..."
                    />
                </div>
                <div>
                    <label className="block text-xs text-gray-400 mb-1">{t('playground.guidedMode.targetAudience')}</label>
                    <input
                        type="text"
                        value={formData.targetAudience}
                        onChange={e => setFormData({ ...formData, targetAudience: e.target.value })}
                        className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-blue-500/50"
                        placeholder="e.g. 18-25 Gamers"
                    />
                </div>
            </div>

            {/* Strategy */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs text-gray-400 mb-1">{t('playground.guidedMode.marketingGoal')}</label>
                    <select
                        value={formData.marketingGoal}
                        onChange={e => setFormData({ ...formData, marketingGoal: e.target.value })}
                        className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-blue-500/50"
                    >
                        {GOALS.map(g => <option key={g} value={g}>{t(`playground.guidedMode.options.marketingGoal.${g}`)}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs text-gray-400 mb-1">{t('playground.guidedMode.tone')}</label>
                    <select
                        value={formData.tone}
                        onChange={e => setFormData({ ...formData, tone: e.target.value })}
                        className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-blue-500/50"
                    >
                        {TONES.map(tone => <option key={tone} value={tone}>{t(`playground.guidedMode.options.tone.${tone}`)}</option>)}
                    </select>
                </div>
            </div>

            {/* Creative Details */}
            <div className="border-t border-white/10 pt-4">
                <h4 className="text-xs font-bold text-gray-300 mb-3 uppercase tracking-wider">Creative Details</h4>
                <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">{t('playground.guidedMode.creativeType')}</label>
                        <select
                            value={formData.creativeType}
                            onChange={e => setFormData({ ...formData, creativeType: e.target.value })}
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-blue-500/50"
                        >
                            {CREATIVE_TYPES.map(c => <option key={c} value={c}>{t(`playground.guidedMode.options.creativeType.${c}`)}</option>)}
                        </select>
                    </div>
                    {isVisual && (
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">{t('playground.guidedMode.aspectRatio')}</label>
                            <select
                                value={formData.aspectRatio}
                                onChange={e => setFormData({ ...formData, aspectRatio: e.target.value })}
                                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-blue-500/50"
                            >
                                {ASPECT_RATIOS.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                    )}
                </div>

                {isVisual && (
                    <div className="space-y-3 mb-3">
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">{t('playground.guidedMode.visualStyle')}</label>
                            <select
                                value={formData.visualStyle}
                                onChange={e => setFormData({ ...formData, visualStyle: e.target.value })}
                                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-blue-500/50"
                            >
                                {VISUAL_STYLES.map(s => <option key={s} value={s}>{t(`playground.guidedMode.options.visualStyle.${s}`)}</option>)}
                            </select>
                        </div>
                        {formData.visualStyle === 'Brand Color' && (
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">{t('playground.guidedMode.brandColor')}</label>
                                <input
                                    type="text"
                                    value={formData.brandColor}
                                    onChange={e => setFormData({ ...formData, brandColor: e.target.value })}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-blue-500/50"
                                    placeholder="#FFFFFF"
                                />
                            </div>
                        )}
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">{t('playground.guidedMode.elements')}</label>
                            <div className="flex flex-wrap gap-2">
                                {ELEMENTS.map(el => (
                                    <button
                                        key={el}
                                        onClick={() => handleElementChange(el)}
                                        className={`px-2 py-1 rounded text-xs border transition-colors ${formData.elements.includes(el)
                                            ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                                            : 'bg-black/20 border-white/10 text-gray-400 hover:bg-white/5'
                                            }`}
                                    >
                                        {t(`playground.guidedMode.options.elements.${el}`)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Compliance & Language */}
            <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
                <div>
                    <label className="block text-xs text-gray-400 mb-1">{t('playground.guidedMode.language')}</label>
                    <select
                        value={formData.language}
                        onChange={e => setFormData({ ...formData, language: e.target.value })}
                        className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-blue-500/50"
                    >
                        {LANGUAGES.map(l => <option key={l} value={l}>{t(`playground.guidedMode.options.language.${l}`)}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs text-gray-400 mb-1">{t('playground.guidedMode.compliance')}</label>
                    <select
                        value={formData.compliance}
                        onChange={e => setFormData({ ...formData, compliance: e.target.value })}
                        className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-blue-500/50"
                    >
                        {COMPLIANCE_MODES.map(c => <option key={c} value={c}>{t(`playground.guidedMode.options.compliance.${c}`)}</option>)}
                    </select>
                </div>
            </div>

            {/* Model Selection (Smart) */}
            <div className="border-t border-white/10 pt-4">
                <label className="block text-xs text-gray-400 mb-1">Model Selection</label>
                {isEnterprise && hasCustomKey ? (
                    <select
                        value={formData.selectedModel}
                        onChange={e => setFormData({ ...formData, selectedModel: e.target.value })}
                        className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-blue-500/50"
                    >
                        <option value="auto">{t('playground.guidedMode.autoSelectModel')}</option>
                        {availableModels.map(m => (
                            <option key={m.id} value={m.id}>{t(m.nameKey)}</option>
                        ))}
                    </select>
                ) : (
                    <div className="w-full bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2 text-sm text-blue-300 flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">auto_awesome</span>
                        {t('playground.guidedMode.autoSelectModel')}
                    </div>
                )}
            </div>

            <button
                onClick={handleSubmit}
                className="w-full py-3 mt-4 rounded-xl font-bold text-white bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg shadow-blue-500/20"
            >
                {t('playground.send')}
            </button>
        </div>
    );
};

export default GuidedModeForm;
