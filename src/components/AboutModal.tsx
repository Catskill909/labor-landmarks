import React from 'react';
import { createPortal } from 'react-dom';
import { X, Mail } from 'lucide-react';

interface AboutModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-zinc-900 border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/5 shrink-0 bg-zinc-900">
                    <h2 className="text-xl font-bold text-white uppercase tracking-tight">
                        About Labor Landmarks
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-zinc-800 transition-colors text-gray-400 hover:text-white"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 space-y-6 overflow-y-auto">
                    <div className="space-y-4 text-gray-300 leading-relaxed">
                        <h3 className="font-bold text-white text-lg">
                            THE INVENTORY OF AMERICAN LABOR LANDMARKS
                        </h3>
                        <p>
                            A national guide to places that commemorate the history of working people — from monuments and murals to historic buildings, museums, and union sites.
                        </p>
                        <p>
                            A project of the <a href="https://laborheritage.org" target="_blank" rel="noopener noreferrer" className="text-red-400 hover:underline font-medium">Labor Heritage Foundation</a>, it promotes preservation, encourages visits, and helps uncover labor’s often-untold story.
                        </p>
                        <p className="text-sm border-l-2 border-red-500 pl-4 py-1 bg-white/5 rounded-r-lg">
                            To add sites, click on <span className="font-bold text-white">"Suggest Site"</span> in the top of the page.
                        </p>
                    </div>

                    {/* Footer / Contact */}
                    <div className="pt-6 border-t border-white/5">
                        <p className="text-sm text-gray-400 mb-3">Questions and comments welcome:</p>
                        <a
                            href="mailto:info@laborheritage.org"
                            className="inline-flex items-center gap-2 text-red-400 hover:text-red-300 transition-colors font-medium"
                        >
                            <Mail size={16} />
                            info@laborheritage.org
                        </a>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default AboutModal;
