import React, { useState, useRef, useEffect } from 'react';
import { Landmark, Search, X, Plus, Menu, Mic, Info, ExternalLink } from 'lucide-react';
import SuggestionModal from './SuggestionModal';
import AboutModal from './AboutModal';
import { AnimatePresence, motion } from 'framer-motion';

interface HeaderProps {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
}

const Header: React.FC<HeaderProps> = ({
    searchQuery,
    setSearchQuery,
}) => {
    const [isSuggestionOpen, setIsSuggestionOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isAboutOpen, setIsAboutOpen] = useState(false);

    // Close menu when clicking outside
    const menuRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [menuRef]);

    return (
        <>
            <header className="sticky top-0 z-[2000] w-full glass px-6 py-3 flex items-center justify-between border-b border-white/5 gap-6">
                <div className="flex items-center gap-3 min-w-fit">
                    <div className="bg-red-600 p-2 rounded-lg shadow-lg shadow-red-900/20">
                        <Landmark className="text-white w-5 h-5" />
                    </div>
                    <div className="hidden sm:block">
                        <h1 className="text-lg font-bold tracking-tight text-white leading-none">Labor Landmarks</h1>
                        <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-widest font-medium">American History</p>
                    </div>
                </div>

                {/* Consolidated Search - Moved to Header */}
                <div className="flex-1 max-w-2xl relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-red-500 transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Search by City or State..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-zinc-900/50 border border-white/10 rounded-xl py-2 pl-12 pr-10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500/30 transition-all placeholder:text-gray-500"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setIsSuggestionOpen(true)}
                        className="hidden lg:flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-sm font-medium text-white rounded-lg transition-all border border-white/5"
                    >
                        <Plus size={16} className="text-red-400" />
                        Suggest Site
                    </button>

                    {/* Hamburger Menu */}
                    <div className="relative" ref={menuRef}>
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className={`p-2 rounded-lg transition-all border ${isMenuOpen ? 'bg-zinc-700 text-white border-white/20' : 'bg-zinc-800 text-gray-400 hover:text-white border-white/5 hover:bg-zinc-700'}`}
                        >
                            <Menu size={20} />
                        </button>

                        <AnimatePresence>
                            {isMenuOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    transition={{ duration: 0.15, ease: "easeOut" }}
                                    className="absolute right-0 top-full mt-2 w-64 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden py-2"
                                >
                                    <div className="px-4 py-2 mb-2 border-b border-white/5">
                                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Menu</p>
                                    </div>

                                    <a
                                        href="https://www.laborradionetwork.org/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-full text-left px-4 py-3 hover:bg-zinc-800 flex items-center gap-3 text-sm text-gray-200 transition-colors group"
                                        onClick={() => setIsMenuOpen(false)}
                                    >
                                        <div className="p-1.5 bg-blue-500/10 rounded-md text-blue-400 group-hover:bg-blue-500/20 transition-colors">
                                            <Mic size={16} />
                                        </div>
                                        <span>Podcast Network</span>
                                        <ExternalLink size={12} className="ml-auto text-gray-600 group-hover:text-gray-400" />
                                    </a>

                                    <button
                                        onClick={() => {
                                            setIsMenuOpen(false);
                                            setIsAboutOpen(true);
                                        }}
                                        className="w-full text-left px-4 py-3 hover:bg-zinc-800 flex items-center gap-3 text-sm text-gray-200 transition-colors group"
                                    >
                                        <div className="p-1.5 bg-green-500/10 rounded-md text-green-400 group-hover:bg-green-500/20 transition-colors">
                                            <Info size={16} />
                                        </div>
                                        <span>About Labor Landmarks</span>
                                    </button>

                                    {/* Mobile Only: Suggest Site */}
                                    <div className="lg:hidden pt-2 mt-2 border-t border-white/5">
                                        <button
                                            onClick={() => {
                                                setIsMenuOpen(false);
                                                setIsSuggestionOpen(true);
                                            }}
                                            className="w-full text-left px-4 py-3 hover:bg-zinc-800 flex items-center gap-3 text-sm text-gray-200 transition-colors"
                                        >
                                            <div className="p-1.5 bg-red-500/10 rounded-md text-red-400">
                                                <Plus size={16} />
                                            </div>
                                            <span>Suggest Site</span>
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                <SuggestionModal isOpen={isSuggestionOpen} onClose={() => setIsSuggestionOpen(false)} />
                <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
            </header>
        </>
    );
};

export default Header;
