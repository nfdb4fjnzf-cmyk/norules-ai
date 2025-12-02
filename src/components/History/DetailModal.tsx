import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Loader2, Download, ExternalLink } from 'lucide-react';
import api from '../../services/api';

interface DetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    resultRef: string;
    type: string; // 'ANALYZE' | 'IMAGE_GEN' | 'VIDEO_GEN' | 'LLM_CHAT'
}

const DetailModal: React.FC<DetailModalProps> = ({ isOpen, onClose, resultRef, type }) => {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && resultRef) {
            fetchDetails();
        }
    }, [isOpen, resultRef]);

    const fetchDetails = async () => {
        setLoading(true);
        setError(null);
        try {
            const [collection, id] = resultRef.split('/');
            let endpoint = '';
            if (collection === 'analysis_reports') endpoint = `/history/analysis?id=${id}`;
            else if (collection === 'generations') endpoint = `/history/generation?id=${id}`;
            else throw new Error('Unknown result type');

            const response = await api.get(endpoint);
            if (response.data.success) {
                setData(response.data.data);
            } else {
                setError('Failed to load details');
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Failed to load details');
        } finally {
            setLoading(false);
        }
    };

    const renderContent = () => {
        if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
        if (error) return <div className="text-red-500 p-4">{error}</div>;
        if (!data) return <div className="text-gray-500 p-4">No data found</div>;

        // 1. Analysis Report
        if (resultRef.startsWith('analysis_reports')) {
            return (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="text-gray-400">Source:</span> <span className="text-white capitalize">{data.sourceType}</span>
                        </div>
                        <div>
                            <span className="text-gray-400">Language:</span> <span className="text-white">{data.language}</span>
                        </div>
                    </div>
                    <div className="bg-gray-900 p-4 rounded-lg overflow-auto max-h-96">
                        <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
                            {JSON.stringify(data.resultJson, null, 2)}
                        </pre>
                    </div>
                </div>
            );
        }

        // 2. Generation (Image/Video/Text)
        if (resultRef.startsWith('generations')) {
            if (data.type === 'image') {
                return (
                    <div className="flex flex-col items-center gap-4">
                        <img src={data.resultRef} alt={data.prompt} className="max-w-full rounded-lg shadow-lg" />
                        <p className="text-sm text-gray-400 italic">"{data.prompt}"</p>
                        <Button variant="secondary" onClick={() => window.open(data.resultRef, '_blank')}>
                            <Download className="w-4 h-4 mr-2" /> Download
                        </Button>
                    </div>
                );
            }
            if (data.type === 'video') {
                // If Luma ID, we might need to construct URL or check if we stored the URL
                // Currently we stored 'resultRef' as Luma ID.
                // We might need to fetch the actual video URL from Luma if not stored?
                // Wait, the controller didn't store the video URL, only the ID.
                // We need to fetch the video status/URL again?
                // Or maybe the frontend should just show the ID for now.
                // Ideally, we should have a background job that updates the generation doc with the final URL.
                // For now, let's just show the ID and prompt.
                return (
                    <div className="space-y-4">
                        <div className="bg-gray-800 p-4 rounded-lg text-center">
                            <p className="text-yellow-500 mb-2">Video Generation ID: {data.resultRef}</p>
                            <p className="text-sm text-gray-400">Video generation is asynchronous. Please check your email or Luma dashboard if not integrated yet.</p>
                        </div>
                        <p className="text-sm text-gray-400 italic">"{data.prompt}"</p>
                    </div>
                );
            }
            if (data.type === 'text') {
                return (
                    <div className="space-y-4">
                        <p className="text-sm text-gray-400 italic">Prompt: "{data.prompt}"</p>
                        <div className="bg-gray-900 p-4 rounded-lg overflow-auto max-h-96">
                            <p className="text-sm text-white whitespace-pre-wrap">{data.textContent}</p>
                        </div>
                    </div>
                );
            }
        }

        return <div>Unknown Data Type</div>;
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl bg-gray-950 border-gray-800 text-white">
                <DialogHeader>
                    <DialogTitle>Operation Details</DialogTitle>
                </DialogHeader>
                {renderContent()}
            </DialogContent>
        </Dialog>
    );
};

export default DetailModal;
