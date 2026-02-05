import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Copy, Check, Rss } from 'lucide-react';

interface FeedModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function FeedModal({ isOpen, onClose }: FeedModalProps) {
    const [copied, setCopied] = useState(false);

    // Get the base URL dynamically
    const feedUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/landmarks` : '';

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(feedUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy feed URL:', err);
        }
    };

    if (!isOpen) return null;

    // Portal pattern to match SuggestionModal
    return createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-zinc-900 border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden animate-in zoom-in duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/5 bg-zinc-900 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-500/10 rounded-lg">
                            <Rss className="text-orange-500" size={20} />
                        </div>
                        <h2 className="text-xl font-bold text-white">
                            JSON Data Feed
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-zinc-800 transition-colors text-white"
                        aria-label="Close modal"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    <div>
                        <p className="text-gray-400 text-sm leading-relaxed mb-4">
                            Use this permanent URL to access the latest public landmark data in your applications. This feed returns a live JSON array of all published landmarks.
                        </p>

                        <div className="relative">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Feed URL</label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <input
                                        type="text"
                                        readOnly
                                        value={feedUrl}
                                        className="w-full bg-black border border-white/5 rounded-xl px-4 py-3 text-gray-300 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 select-all"
                                    />
                                </div>
                                <button
                                    onClick={handleCopy}
                                    className={`px-4 py-2 rounded-xl font-bold border transition-all duration-200 flex items-center gap-2 min-w-[100px] justify-center ${copied
                                            ? 'bg-green-500/20 text-green-500 border-green-500/30'
                                            : 'bg-zinc-800 text-white hover:bg-zinc-700 border-white/5'
                                        }`}
                                >
                                    {copied ? (
                                        <>
                                            <Check size={18} />
                                            <span>Copied</span>
                                        </>
                                    ) : (
                                        <>
                                            <Copy size={18} />
                                            <span>Copy</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-white/5">
                        <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">Example Usage</h3>
                        <div className="bg-black/50 rounded-xl p-4 border border-white/5 overflow-x-auto">
                            <code className="text-xs font-mono text-blue-300">
                                {`fetch('${feedUrl}')\n  .then(response => response.json())\n  .then(data => console.log(data));`}
                            </code>
                        </div>
                    </div>

                    <div className="flex items-center justify-end pt-2">
                        <button
                            onClick={onClose}
                            className="bg-white text-black hover:bg-gray-200 px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg hover:scale-105 active:scale-95"
                        >
                            Done
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
