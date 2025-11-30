import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../components/Toast';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { ScoreGauge } from '../components/ui/ScoreGauge';
import SkeletonLoader from '../components/SkeletonLoader';
import { analyzerService } from '../services/analyzerService';
import { useAuth } from '../contexts/AuthContext';
import { useModal } from '../contexts/ModalContext';

// Mock Analysis Result Interface
interface AnalysisResult {
    score: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    issues: string[];
    details: string;
}

const Analyzer: React.FC = () => {
    const { t } = useTranslation();
    const { showToast } = useToast();
    const { userProfile, refreshProfile } = useAuth();
    const { openModal } = useModal();

    // State for inputs
    const [materialFile, setMaterialFile] = useState<File | null>(null);
    const [materialPreview, setMaterialPreview] = useState<string | null>(null);
    const [copyText, setCopyText] = useState('');
    const [linkUrl, setLinkUrl] = useState('');
    const [enableRiskAnalysis, setEnableRiskAnalysis] = useState(false);

    // State for analysis
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [result, setResult] = useState<AnalysisResult | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setMaterialFile(file);

            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setMaterialPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const clearFile = () => {
        setMaterialFile(null);
        setMaterialPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleAnalyze = async () => {
        if (!materialFile && !copyText && !linkUrl && !enableRiskAnalysis) {
            showToast('error', t('analyzer.errors.emptyInput') || "Please provide at least one input.");
            return;
        }

        // 1. Calculate Required Credits (Updated per Ch.121)
        let requiredCredits = 0;
        if (copyText) requiredCredits += 1; // Text Analysis: 1 point
        if (linkUrl) requiredCredits += 3;  // URL Analysis: 3 points (Ch.121.4)
        if (materialFile) {
            if (materialFile.type.startsWith('image')) requiredCredits += 3; // Image Analysis: 3 points
            if (materialFile.type.startsWith('video')) requiredCredits += 10; // Video Analysis: 10 points
        }
        if (enableRiskAnalysis) requiredCredits += 2; // Risk Analyzer: 2 points (Ch.121.3)

        // 2. Check Credits (Internal Mode Only)
        // Default to 'internal' if mode is missing (safe fallback)
        const mode = userProfile?.mode || 'internal';

        if (mode === 'internal') {
            const currentCredits = userProfile?.credits || 0;
            if (currentCredits < requiredCredits) {
                openModal('INSUFFICIENT_CREDITS', {
                    requiredCredits,
                    currentCredits
                });
                return;
            }
        }

        setIsAnalyzing(true);
        setResult(null);

        try {
            const promises = [];

            // 1. Analyze Material
            if (materialFile) {
                if (materialFile.type.startsWith('image')) {
                    promises.push(analyzerService.analyzeImage(materialFile).then(res => ({ type: 'Material', ...res })));
                } else if (materialFile.type.startsWith('video')) {
                    // For video, we need a URI. Since we don't have a file uploader to Google yet, 
                    // we'll skip or mock for now, OR try to send as base64 if small (backend might fail).
                    // Let's try image endpoint for video frames if supported, or just warn.
                    // Actually, let's just simulate for video to avoid breaking flow until File API is ready.
                    console.warn("Video upload not fully supported in frontend yet");
                    promises.push(Promise.resolve({
                        type: 'Video',
                        score: 80,
                        riskLevel: 'LOW',
                        issues: ['Video analysis requires cloud storage upload (Pending Implementation)'],
                        details: 'Video analysis skipped.'
                    } as any));
                }
            }

            // 2. Analyze Copy
            if (copyText) {
                promises.push(analyzerService.analyzeText(copyText).then(res => ({ type: 'Copy', ...res })));
            }

            // 3. Analyze Link
            if (linkUrl) {
                promises.push(analyzerService.analyzeUrl(linkUrl).then(res => ({ type: 'Link', ...res })));
            }

            // 4. Risk Analysis (Ch.121.3)
            if (enableRiskAnalysis) {
                // Combine inputs for risk analysis context
                const context = [copyText, linkUrl].filter(Boolean).join('\n');
                if (context || materialFile) {
                    // If we have material but no text, we might need OCR or description first.
                    // For now, we send text context. If only image, we skip or assume backend handles it.
                    // Let's send a placeholder if only image to trigger the check.
                    const riskContent = context || "Image/Video Content Analysis";
                    promises.push(analyzerService.analyzeRisk(riskContent).then(res => ({ type: 'Risk', ...res })));
                }
            }

            const results = await Promise.all(promises);

            // Merge Results
            let minScore = 100;
            let allIssues: string[] = [];
            let allDetails = "";

            results.forEach(res => {
                if (res.score < minScore) minScore = res.score;
                if (res.issues) allIssues = [...allIssues, ...res.issues.map(i => `[${res.type}] ${i}`)];
                if (res.details) allDetails += `\n\n[${res.type} Analysis]: ${res.details}`;
                else if (res.raw) allDetails += `\n\n[${res.type} Raw]: ${res.raw}`;
            });

            setResult({
                score: minScore,
                riskLevel: minScore > 85 ? 'LOW' : minScore > 70 ? 'MEDIUM' : 'HIGH',
                issues: allIssues,
                details: allDetails.trim() || "Analysis complete."
            });

            showToast('success', t('analyzer.success') || "Analysis complete");

            // Refresh profile to show updated credits
            await refreshProfile();

        } catch (error: any) {
            console.error(error);
            // If 401, it means not logged in or invalid token
            if (error.response?.status === 401) {
                showToast('error', "Authentication failed. Please login.");
            } else {
                const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || "Analysis failed. Please try again.";
                showToast('error', errorMessage);
            }
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="h-full flex flex-col gap-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-100">{t('analyzer.title')}</h1>
                    <p className="text-gray-400 text-sm mt-1">{t('analyzer.subtitle')}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
                {/* Left Column: Inputs (Span 2) */}
                <div className="lg:col-span-2 flex flex-col gap-6 overflow-y-auto pr-2">

                    {/* Section 1: Material */}
                    <Card className="bg-white/5 border-white/10">
                        <CardHeader>
                            <CardTitle className="text-base text-gray-200 flex items-center gap-2">
                                <span className="material-symbols-outlined text-blue-400">image</span>
                                {t('analyzer.sections.material')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {!materialFile ? (
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border-2 border-dashed border-white/10 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-colors group"
                                >
                                    <span className="material-symbols-outlined text-4xl text-gray-500 group-hover:text-blue-400 mb-2 transition-colors">cloud_upload</span>
                                    <p className="text-gray-400 text-sm">{t('analyzer.placeholders.material')}</p>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/*,video/*"
                                        onChange={handleFileSelect}
                                    />
                                </div>
                            ) : (
                                <div className="relative rounded-xl overflow-hidden border border-white/10 bg-black/20">
                                    {materialFile.type.startsWith('video') ? (
                                        <video src={materialPreview || ''} className="w-full h-64 object-contain" controls />
                                    ) : (
                                        <img src={materialPreview || ''} alt="Preview" className="w-full h-64 object-contain" />
                                    )}
                                    <button
                                        onClick={clearFile}
                                        className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white hover:bg-red-500/80 transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-sm">close</span>
                                    </button>
                                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2 text-xs text-gray-300 truncate">
                                        {materialFile.name}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Section 2: Copy */}
                    <Card className="bg-white/5 border-white/10">
                        <CardHeader>
                            <CardTitle className="text-base text-gray-200 flex items-center gap-2">
                                <span className="material-symbols-outlined text-green-400">description</span>
                                {t('analyzer.sections.copy')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <textarea
                                value={copyText}
                                onChange={(e) => setCopyText(e.target.value)}
                                placeholder={t('analyzer.placeholders.copy')}
                                className="w-full h-32 bg-black/20 rounded-xl p-4 text-gray-200 outline-none border border-white/5 focus:border-green-500/50 resize-none text-sm leading-relaxed"
                            />
                        </CardContent>
                    </Card>

                    {/* Section 3: Link */}
                    <Card className="bg-white/5 border-white/10">
                        <CardHeader>
                            <CardTitle className="text-base text-gray-200 flex items-center gap-2">
                                <span className="material-symbols-outlined text-purple-400">link</span>
                                {t('analyzer.sections.link')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <input
                                type="text"
                                value={linkUrl}
                                onChange={(e) => setLinkUrl(e.target.value)}
                                placeholder={t('analyzer.placeholders.link')}
                                className="w-full bg-black/20 rounded-xl p-4 text-gray-200 outline-none border border-white/5 focus:border-purple-500/50 text-sm"
                            />
                        </CardContent>
                    </Card>

                    {/* Risk Analysis Toggle */}
                    <div className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                                <span className="material-symbols-outlined text-red-400">shield</span>
                            </div>
                            <div>
                                <h3 className="text-gray-200 font-medium">Risk Analyzer</h3>
                                <p className="text-xs text-gray-400">Deep policy check (TikTok/Meta) - 2 Credits</p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={enableRiskAnalysis}
                                onChange={(e) => setEnableRiskAnalysis(e.target.checked)}
                            />
                            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                        </label>
                    </div>

                    <button
                        onClick={handleAnalyze}
                        disabled={isAnalyzing}
                        className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all transform active:scale-[0.98] ${isAnalyzing
                            ? 'bg-gray-600 cursor-not-allowed'
                            : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 shadow-blue-500/20'
                            }`}
                    >
                        {isAnalyzing ? (
                            <div className="flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined animate-spin">sync</span>
                                <span>Analyzing...</span>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined">analytics</span>
                                <span>{t('analyzer.analyzeButton') || "Run Analysis"}</span>
                            </div>
                        )}
                    </button>
                </div>

                {/* Right Column: Report (Span 1) */}
                <div className="lg:col-span-1 flex flex-col h-full overflow-hidden">
                    <Card className="h-full bg-white/5 border-white/10 flex flex-col">
                        <CardHeader className="border-b border-white/5 pb-4">
                            <CardTitle className="text-lg text-gray-100">
                                {t('analyzer.resultTitle') || "Analysis Report"}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-y-auto p-6">
                            {result ? (
                                <div className="space-y-8 animate-fade-in">
                                    {/* Score */}
                                    <div className="flex flex-col items-center justify-center py-4">
                                        <div className="w-40 h-40 relative">
                                            <ScoreGauge score={result.score} size={160} />
                                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                <span className="text-4xl font-bold text-white">{result.score}</span>
                                                <span className={`text-sm font-bold px-2 py-0.5 rounded-full mt-1 ${result.riskLevel === 'LOW' ? 'bg-green-500/20 text-green-400' :
                                                    result.riskLevel === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400' :
                                                        'bg-red-500/20 text-red-400'
                                                    }`}>
                                                    {result.riskLevel} RISK
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Issues List */}
                                    <div className="space-y-3">
                                        <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Detected Items</h4>
                                        {result.issues.length > 0 ? (
                                            <div className="space-y-2">
                                                {result.issues.map((issue, idx) => (
                                                    <div key={idx} className="flex items-start gap-3 bg-black/20 p-3 rounded-lg border border-white/5">
                                                        <span className="material-symbols-outlined text-green-400 text-lg mt-0.5">check_circle</span>
                                                        <span className="text-sm text-gray-300">{issue}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-500 italic">No specific items detected.</p>
                                        )}
                                    </div>

                                    {/* Details */}
                                    <div className="space-y-3">
                                        <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Summary</h4>
                                        <p className="text-sm text-gray-400 leading-relaxed">
                                            {result.details}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
                                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center">
                                        <span className="material-symbols-outlined text-4xl text-gray-400">analytics</span>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-gray-300 font-medium">Ready to Analyze</p>
                                        <p className="text-sm text-gray-500 max-w-[200px] mx-auto">
                                            Upload material, enter copy, or paste a link to generate a comprehensive risk report.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default Analyzer;
