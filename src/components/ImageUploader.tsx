import React, { useState, useRef, useCallback } from 'react';
import { ImagePlus, X } from 'lucide-react';
import type { LandmarkImage } from './LandmarkCard';

interface ImageUploaderProps {
    onFilesSelected: (files: File[]) => void;
    selectedFiles: File[];
    onRemoveFile: (index: number) => void;
    existingImages?: LandmarkImage[];
    onRemoveExisting?: (imageId: number) => void;
    maxFiles?: number;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
    onFilesSelected,
    selectedFiles,
    onRemoveFile,
    existingImages = [],
    onRemoveExisting,
    maxFiles = 10
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const totalCount = existingImages.length + selectedFiles.length;
    const canAdd = totalCount < maxFiles;

    const handleFiles = useCallback((files: FileList | null) => {
        if (!files) return;
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        const maxSize = 5 * 1024 * 1024;
        const valid: File[] = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (!allowed.includes(file.type)) continue;
            if (file.size > maxSize) continue;
            if (totalCount + valid.length >= maxFiles) break;
            valid.push(file);
        }

        if (valid.length > 0) {
            onFilesSelected(valid);
        }
    }, [onFilesSelected, totalCount, maxFiles]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        handleFiles(e.dataTransfer.files);
    }, [handleFiles]);

    return (
        <div className="space-y-3">
            <label className="text-sm font-medium text-gray-300">
                Photos {totalCount > 0 && <span className="text-gray-500">({totalCount}/{maxFiles})</span>}
            </label>

            {/* Existing images */}
            {existingImages.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {existingImages.map((img) => (
                        <div key={img.id} className="relative group/thumb">
                            <img
                                src={`/uploads/landmarks/thumb_${img.filename}`}
                                alt={img.caption || 'Uploaded'}
                                className="w-20 h-20 object-cover rounded-lg border border-white/10"
                            />
                            {onRemoveExisting && (
                                <button
                                    type="button"
                                    onClick={() => onRemoveExisting(img.id)}
                                    className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover/thumb:opacity-100 transition-opacity"
                                >
                                    <X size={12} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* New file previews */}
            {selectedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {selectedFiles.map((file, idx) => (
                        <div key={`${file.name}-${idx}`} className="relative group/thumb">
                            <img
                                src={URL.createObjectURL(file)}
                                alt={file.name}
                                className="w-20 h-20 object-cover rounded-lg border border-white/10"
                            />
                            <button
                                type="button"
                                onClick={() => onRemoveFile(idx)}
                                className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover/thumb:opacity-100 transition-opacity"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Drop zone */}
            {canAdd && (
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 ${
                        isDragging
                            ? 'border-red-500 bg-red-500/10 scale-[1.02]'
                            : 'border-white/10 hover:border-white/30 hover:bg-white/5'
                    }`}
                >
                    <ImagePlus size={28} className={`mb-2 ${isDragging ? 'text-red-400' : 'text-gray-500'}`} />
                    <p className="text-sm text-gray-400 text-center">
                        Drag photos here or <span className="text-red-400 font-medium">click to browse</span>
                    </p>
                    <p className="text-[10px] text-gray-600 mt-1">JPEG, PNG, WebP up to 5MB</p>
                </div>
            )}

            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={(e) => {
                    handleFiles(e.target.files);
                    e.target.value = '';
                }}
            />
        </div>
    );
};

export default ImageUploader;
