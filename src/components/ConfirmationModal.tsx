import React, { useEffect, useRef } from 'react';
import { X, AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm?: () => void;
    title: string;
    message: string | React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
    type?: 'confirm' | 'alert' | 'success' | 'error';
    isLoading?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    isDestructive = false,
    type = 'confirm',
    isLoading = false
}) => {
    const modalRef = useRef<HTMLDivElement>(null);

    // Close on escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            window.addEventListener('keydown', handleEscape);
        }
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const getIcon = () => {
        switch (type) {
            case 'error':
            case 'confirm': // Use alert triangle for confirm if destructive, generally
                return isDestructive ? <AlertTriangle className="text-red-500" size={24} /> : <Info className="text-blue-500" size={24} />;
            case 'success':
                return <CheckCircle className="text-green-500" size={24} />;
            case 'alert':
                return <Info className="text-gray-400" size={24} />;
            default:
                return null;
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
                onClick={isLoading ? undefined : onClose}
            />

            <div
                ref={modalRef}
                className="relative bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl transform transition-all scale-100"
            >
                <div className="p-6">
                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 mt-1">
                            {getIcon()}
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-white mb-2 leading-6">
                                {title}
                            </h3>
                            <div className="text-sm text-gray-400 leading-relaxed">
                                {message}
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            disabled={isLoading}
                            className="text-gray-500 hover:text-white transition-colors disabled:opacity-50"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="mt-8 flex justify-end gap-3">
                        {type === 'confirm' && (
                            <button
                                onClick={onClose}
                                disabled={isLoading}
                                className="px-4 py-2 rounded-lg font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
                            >
                                {cancelText}
                            </button>
                        )}

                        <button
                            onClick={type === 'confirm' ? onConfirm : onClose}
                            disabled={isLoading}
                            className={`px-6 py-2 rounded-lg font-bold text-white transition-all shadow-lg hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${isDestructive
                                    ? 'bg-red-600 hover:bg-red-700'
                                    : type === 'success' ? 'bg-green-600 hover:bg-green-700' : 'bg-zinc-700 hover:bg-zinc-600'
                                }`}
                        >
                            {isLoading ? 'Processing...' : (type === 'confirm' ? confirmText : 'Close')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
