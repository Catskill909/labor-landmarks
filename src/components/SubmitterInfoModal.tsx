import { X, User, Mail, MessageSquare } from 'lucide-react';
import { createPortal } from 'react-dom';

interface SubmitterInfoModalProps {
    isOpen: boolean;
    onClose: () => void;
    submitterName?: string;
    submitterEmail?: string;
    submitterComment?: string;
    landmarkName: string;
}

export default function SubmitterInfoModal({ isOpen, onClose, submitterName, submitterEmail, submitterComment, landmarkName }: SubmitterInfoModalProps) {
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
                <div className="flex items-center justify-between p-5 border-b border-white/5">
                    <h2 className="text-lg font-bold text-white">Submitter Info</h2>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-zinc-800 transition-colors text-white">
                        <X size={18} />
                    </button>
                </div>
                <div className="p-5 space-y-4">
                    <p className="text-xs text-gray-500 uppercase font-bold">
                        Submitted for: <span className="text-gray-300">{landmarkName}</span>
                    </p>

                    <div className="space-y-3">
                        <div className="flex items-start gap-3">
                            <User size={16} className="text-gray-500 mt-0.5 shrink-0" />
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-bold mb-0.5">Name</p>
                                <p className="text-white text-sm">{submitterName || <span className="text-gray-600 italic">Not provided</span>}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <Mail size={16} className="text-gray-500 mt-0.5 shrink-0" />
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-bold mb-0.5">Email</p>
                                {submitterEmail ? (
                                    <a href={`mailto:${submitterEmail}`} className="text-red-400 hover:text-red-300 text-sm underline">
                                        {submitterEmail}
                                    </a>
                                ) : (
                                    <p className="text-gray-600 italic text-sm">Not provided</p>
                                )}
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <MessageSquare size={16} className="text-gray-500 mt-0.5 shrink-0" />
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-bold mb-0.5">Comment</p>
                                <p className="text-white text-sm whitespace-pre-wrap">{submitterComment || <span className="text-gray-600 italic">No comment</span>}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
