import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../components/Toast';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { analyzerService } from '../services/analyzerService';
import { useAuth } from '../contexts/AuthContext';
import { useModal } from '../contexts/ModalContext';
import CostEstimateModal from '../components/CostEstimateModal';
// @ts-ignore
import html2pdf from 'html2pdf.js';

interface PlatformReport {
    platform: string;
    risk_level: 'low' | 'medium' | 'high';
    violation_items: string[];
    details: string;
    recommendation: string;
}

interface MaterialAnalysisResult {
    image_summary?: string;
    video_summary?: string;
    copywriting_summary?: string;
    landing_page_summary?: string;
    reports: {
        meta: PlatformReport;
        tiktok: PlatformReport;
        google: PlatformReport;
    };
}

const Analyzer: React.FC = () => {
    const { t } = useTranslation();
    const { showToast } = useToast();
    const { userProfile, refreshProfile } = useAuth();
    const { openModal } = useModal();

    // Inputs
    const [materialFile, setMaterialFile] = useState<File | null>(null);
    const [materialPreview, setMaterialPreview] = useState<string | null>(null);
    const [copyText, setCopyText] = useState('');
    const [linkUrl, setLinkUrl] = useState('');

    // Analysis State
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [result, setResult] = useState<MaterialAnalysisResult | null>(null);

    // Cost Modal
    const [showCostModal, setShowCostModal] = useState(false);
    const [estimatedCostValue, setEstimatedCostValue] = useState(0);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const reportRef = useRef<HTMLDivElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setMaterialFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setMaterialPreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const clearFile = () => {
        setMaterialFile(null);
        setMaterialPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleAnalyzeClick = () => {
        if (!materialFile && !copyText && !linkUrl) {
            showToast('error', "Please provide at least one input (Image/Video, Copy, or URL).");
            return;
        }

        // Fixed Cost: 5 Credits
        const COST = 5;
        const currentCredits = userProfile?.credits || 0;

        if (userProfile?.mode === 'internal' && currentCredits < COST) {
            openModal('INSUFFICIENT_CREDITS', { requiredCredits: COST, currentCredits });
            return;
        }

        setEstimatedCostValue(COST);
        setShowCostModal(true);
    };

    const executeAnalysis = async () => {
        setShowCostModal(false);
        setIsAnalyzing(true);
        setResult(null);

        try {
            let image_base64 = undefined;
            let video_base64 = undefined;

            if (materialFile) {
                if (materialFile.type.startsWith('image')) {
                    // Compress Image
                    const reader = new FileReader();
                    const base64Promise = new Promise<string>((resolve) => {
                        reader.onload = () => resolve(reader.result as string);
                        reader.readAsDataURL(materialFile);
                    });
                    const originalBase64 = await base64Promise;

                    // Client-side resizing/compression
                    const img = new Image();
                    img.src = originalBase64;
                    await new Promise((resolve) => { img.onload = resolve; });

                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 1024;
                    const MAX_HEIGHT = 1024;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);

                    // Compress to JPEG 0.7 quality
                    image_base64 = canvas.toDataURL('image/jpeg', 0.7);

                } else if (materialFile.type.startsWith('video')) {
                    // Video Size Check
                    if (materialFile.size > 4.5 * 1024 * 1024) {
                        throw new Error("Video file too large (Max 4.5MB). Please upload a smaller clip.");
                    }

                    const reader = new FileReader();
                    const base64Promise = new Promise<string>((resolve) => {
                        reader.onload = () => resolve(reader.result as string);
                        reader.readAsDataURL(materialFile);
                    });
                    video_base64 = await base64Promise;
                }
            }

            const data = await analyzerService.analyzeMaterial({
                image_base64,
                video_base64,
                copywriting: copyText,
                landing_page_url: linkUrl
            });

            setResult(data);
            showToast('success', "Analysis Complete!");
            await refreshProfile();

        } catch (error: any) {
            console.error(error);
            const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || "Analysis failed";
            showToast('error', errorMessage);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const downloadPDF = () => {
        if (!reportRef.current) return;
        const element = reportRef.current;
        const opt = {
            margin: 10,
            filename: 'ad-analysis-report.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        html2pdf().set(opt).from(element).save();
    };

    const getRiskColor = (level: string) => {
        switch (level?.toLowerCase()) {
            case 'low': return 'text-green-400 bg-green-500/10 border-green-500/20';
            case 'medium': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
            case 'high': return 'text-red-400 bg-red-500/10 border-red-500/20';
            default: return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
        }
    };

    return (
        <div className="h-full flex flex-col gap-6 animate-fade-in">
            <CostEstimateModal
                isOpen={showCostModal}
                onClose={() => setShowCostModal(false)}
                onConfirm={executeAnalysis}
                actionType="Analysis"
                estimatedCost={estimatedCostValue}
                currentBalance={userProfile?.credits || 0}
                isProcessing={isAnalyzing}
            />

            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-100">{t('analyzer.title')}</h1>
                    <p className="text-gray-400 text-sm mt-1">{t('analyzer.subtitle')}</p>
                </div>
                {result && (
                    <button
                        onClick={downloadPDF}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                    >
                        <span className="material-symbols-outlined">download</span>
                        Download PDF
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
                {/* Left Column: Inputs */}
                <div className="lg:col-span-1 flex flex-col gap-6 overflow-y-auto pr-2">
                    {/* Material */}
                    <Card className="bg-white/5 border-white/10">
                        <CardHeader>
                            <CardTitle className="text-base text-gray-200 flex items-center gap-2">
                                <span className="material-symbols-outlined text-blue-400">image</span>
                                Material
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {!materialFile ? (
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border-2 border-dashed border-white/10 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-colors group"
                                >
                                    <span className="material-symbols-outlined text-4xl text-gray-500 group-hover:text-blue-400 mb-2 transition-colors">cloud_upload</span>
                                    <p className="text-gray-400 text-sm">Upload Image or Video</p>
                                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={handleFileSelect} />
                                </div>
                            ) : (
                                <div className="relative rounded-xl overflow-hidden border border-white/10 bg-black/20">
                                    {materialFile.type.startsWith('video') ? (
                                        <video src={materialPreview || ''} className="w-full h-48 object-contain" controls />
                                    ) : (
                                        <img src={materialPreview || ''} alt="Preview" className="w-full h-48 object-contain" />
                                    )}
                                    <button onClick={clearFile} className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white hover:bg-red-500/80">
                                        <span className="material-symbols-outlined text-sm">close</span>
                                    </button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Copy */}
                    <Card className="bg-white/5 border-white/10">
                        <CardHeader>
                            <CardTitle className="text-base text-gray-200 flex items-center gap-2">
                                <span className="material-symbols-outlined text-green-400">description</span>
                                Copywriting
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <textarea
                                value={copyText}
                                onChange={(e) => setCopyText(e.target.value)}
                                placeholder="Enter ad copy..."
                                className="w-full h-32 bg-black/20 rounded-xl p-4 text-gray-200 outline-none border border-white/5 focus:border-green-500/50 resize-none text-sm"
                            />
                        </CardContent>
                    </Card>

                    {/* Link */}
                    <Card className="bg-white/5 border-white/10">
                        <CardHeader>
                            <CardTitle className="text-base text-gray-200 flex items-center gap-2">
                                <span className="material-symbols-outlined text-purple-400">link</span>
                                Landing Page
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <input
                                type="text"
                                value={linkUrl}
                                onChange={(e) => setLinkUrl(e.target.value)}
                                placeholder="https://example.com"
                                className="w-full bg-black/20 rounded-xl p-4 text-gray-200 outline-none border border-white/5 focus:border-purple-500/50 text-sm"
                            />
                        </CardContent>
                    </Card>

                    <button
                        onClick={handleAnalyzeClick}
                        disabled={isAnalyzing}
                        className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all ${isAnalyzing ? 'bg-gray-600 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500'}`}
                    >
                        {isAnalyzing ? (
                            <div className="flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined animate-spin">sync</span>
                                <span>Analyzing...</span>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined">analytics</span>
                                <span>Start Analysis</span>
                            </div>
                        )}
                    </button>
                </div>

                {/* Right Column: Reports */}
                <div className="lg:col-span-2 flex flex-col h-full overflow-hidden">
                    <Card className="h-full bg-white/5 border-white/10 flex flex-col">
                        <CardHeader className="border-b border-white/5 pb-4">
                            <CardTitle className="text-lg text-gray-100">Analysis Report</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-y-auto p-6" ref={reportRef}>
                            {result ? (
                                <div className="space-y-8">
                                    {/* Summaries */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                        {result.image_summary && (
                                            <div className="bg-black/20 p-4 rounded-lg border border-white/5">
                                                <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Image Summary</h4>
                                                <p className="text-sm text-gray-300">{result.image_summary}</p>
                                            </div>
                                        )}
                                        {result.video_summary && (
                                            <div className="bg-black/20 p-4 rounded-lg border border-white/5">
                                                <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Video Summary</h4>
                                                <p className="text-sm text-gray-300">{result.video_summary}</p>
                                            </div>
                                        )}
                                        {result.copywriting_summary && (
                                            <div className="bg-black/20 p-4 rounded-lg border border-white/5">
                                                <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Copy Summary</h4>
                                                <p className="text-sm text-gray-300">{result.copywriting_summary}</p>
                                            </div>
                                        )}
                                        {result.landing_page_summary && (
                                            <div className="bg-black/20 p-4 rounded-lg border border-white/5">
                                                <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Landing Page Summary</h4>
                                                <p className="text-sm text-gray-300">{result.landing_page_summary}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Platform Reports */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {['meta', 'tiktok', 'google'].map((platform) => {
                                            const report = result.reports[platform as keyof typeof result.reports];
                                            if (!report) return null;
                                            return (
                                                <div key={platform} className="bg-gray-800/50 rounded-xl border border-white/10 overflow-hidden flex flex-col">
                                                    <div className="p-4 border-b border-white/5 bg-white/5 flex justify-between items-center">
                                                        <h3 className="font-bold text-white capitalize">{platform}</h3>
                                                        <span className={`text-xs font-bold px-2 py-1 rounded border ${getRiskColor(report.risk_level)}`}>
                                                            {report.risk_level.toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <div className="p-4 flex-1 space-y-4">
                                                        <div>
                                                            <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Violations</h4>
                                                            {report.violation_items.length > 0 ? (
                                                                <ul className="space-y-1">
                                                                    {report.violation_items.map((item, i) => (
                                                                        <li key={i} className="text-xs text-red-300 flex items-start gap-1">
                                                                            <span className="material-symbols-outlined text-sm">error</span>
                                                                            {item}
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            ) : (
                                                                <p className="text-xs text-green-400 flex items-center gap-1">
                                                                    <span className="material-symbols-outlined text-sm">check_circle</span>
                                                                    No violations detected
                                                                </p>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Details</h4>
                                                            <p className="text-xs text-gray-300 leading-relaxed">{report.details}</p>
                                                        </div>
                                                        <div>
                                                            <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Recommendation</h4>
                                                            <p className="text-xs text-blue-300 leading-relaxed bg-blue-500/10 p-2 rounded border border-blue-500/20">
                                                                {report.recommendation}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
                                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center">
                                        <span className="material-symbols-outlined text-4xl text-gray-400">analytics</span>
                                    </div>
                                    <p className="text-gray-300 font-medium">Ready to Analyze</p>
                                    <p className="text-sm text-gray-500 max-w-[200px] mx-auto">
                                        Upload material to generate a comprehensive 3-platform risk report.
                                    </p>
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
