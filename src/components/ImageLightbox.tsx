import React, { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { LandmarkImage } from './LandmarkCard';

interface ImageLightboxProps {
    images: LandmarkImage[];
    currentIndex: number;
    isOpen: boolean;
    onClose: () => void;
    onNavigate: (index: number) => void;
}

const ImageLightbox: React.FC<ImageLightboxProps> = ({ images, currentIndex, isOpen, onClose, onNavigate }) => {
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
        if (e.key === 'ArrowLeft' && currentIndex > 0) onNavigate(currentIndex - 1);
        if (e.key === 'ArrowRight' && currentIndex < images.length - 1) onNavigate(currentIndex + 1);
    }, [currentIndex, images.length, onClose, onNavigate]);

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            return () => document.removeEventListener('keydown', handleKeyDown);
        }
    }, [isOpen, handleKeyDown]);

    if (!isOpen || images.length === 0) return null;

    const image = images[currentIndex];

    return createPortal(
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[20000] flex items-center justify-center"
                onClick={onClose}
            >
                <div className="absolute inset-0 bg-black/95 backdrop-blur-md" />

                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-[20001] p-3 rounded-full bg-zinc-900/50 text-white hover:bg-zinc-800 transition-colors border border-white/10"
                >
                    <X size={20} />
                </button>

                {/* Navigation arrows */}
                {images.length > 1 && (
                    <>
                        {currentIndex > 0 && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onNavigate(currentIndex - 1); }}
                                className="absolute left-4 z-[20001] p-3 rounded-full bg-zinc-900/50 text-white hover:bg-red-600 transition-all border border-white/10 hover:scale-110"
                            >
                                <ChevronLeft size={24} />
                            </button>
                        )}
                        {currentIndex < images.length - 1 && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onNavigate(currentIndex + 1); }}
                                className="absolute right-4 z-[20001] p-3 rounded-full bg-zinc-900/50 text-white hover:bg-red-600 transition-all border border-white/10 hover:scale-110"
                            >
                                <ChevronRight size={24} />
                            </button>
                        )}
                    </>
                )}

                {/* Image */}
                <motion.img
                    key={image.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                    src={`/uploads/landmarks/${image.filename}`}
                    alt={image.caption || 'Landmark photo'}
                    className="relative z-[20000] max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                />

                {/* Counter + caption */}
                <div className="absolute bottom-6 z-[20001] text-center">
                    {images.length > 1 && (
                        <p className="text-sm text-gray-400 mb-1">{currentIndex + 1} / {images.length}</p>
                    )}
                    {image.caption && (
                        <p className="text-sm text-gray-300">{image.caption}</p>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>,
        document.body
    );
};

export default ImageLightbox;
