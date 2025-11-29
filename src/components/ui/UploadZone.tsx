import React, { useRef, useState } from 'react';
import { cn } from '../../lib/utils';
import { Button } from './Button';

interface UploadZoneProps {
    accept?: string;
    onFileSelect: (file: File) => void;
    previewUrl?: string | null;
    onClear?: () => void;
    title?: string;
    description?: string;
    className?: string;
}

const UploadZone: React.FC<UploadZoneProps> = ({
    accept,
    onFileSelect,
    previewUrl,
    onClear,
    title = "Upload File",
    description = "Drag & drop or click to upload",
    className
}) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            onFileSelect(e.dataTransfer.files[0]);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onFileSelect(e.target.files[0]);
        }
    };

    return (
        <div
            className={cn(
                "relative flex flex-col items-center justify-center w-full min-h-[300px] rounded-xl border-2 border-dashed transition-all duration-200 overflow-hidden",
                isDragging ? "border-primary bg-primary/5" : "border-border bg-background-card/50 hover:bg-background-card",
                className
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {previewUrl ? (
                <div className="relative w-full h-full flex items-center justify-center p-4">
                    {accept?.includes('image') ? (
                        <img src={previewUrl} alt="Preview" className="max-h-[280px] object-contain rounded-lg shadow-sm" />
                    ) : (
                        <div className="text-center p-8">
                            <span className="material-symbols-outlined text-6xl text-primary mb-4">movie</span>
                            <p className="text-white font-medium">Video File Selected</p>
                        </div>
                    )}
                    {onClear && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onClear(); }}
                            className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 p-2 rounded-full backdrop-blur-sm transition-colors hover:scale-105 active:scale-95"
                        >
                            <span className="material-symbols-outlined text-white">close</span>
                        </button>
                    )}
                </div>
            ) : (
                <div className="text-center p-8">
                    <div className={cn(
                        "w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors",
                        isDragging ? "bg-primary/20 text-primary" : "bg-white/5 text-secondary"
                    )}>
                        <span className="material-symbols-outlined text-3xl">cloud_upload</span>
                    </div>
                    <h3 className="text-white font-medium mb-1">{title}</h3>
                    <p className="text-secondary text-sm mb-6 max-w-xs mx-auto">{description}</p>
                    <input
                        type="file"
                        ref={inputRef}
                        className="hidden"
                        accept={accept}
                        onChange={handleChange}
                    />
                    <Button
                        variant="secondary"
                        onClick={() => inputRef.current?.click()}
                    >
                        Select File
                    </Button>
                </div>
            )}
        </div>
    );
};

export { UploadZone };
