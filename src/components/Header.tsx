import React from 'react';
import { Landmark, Search, Map, List, X, Plus } from 'lucide-react';
import SuggestionModal from './SuggestionModal';

interface HeaderProps {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    viewMode: 'map' | 'list';
    setViewMode: (mode: 'map' | 'list') => void;
}

const Header: React.FC<HeaderProps> = ({
    searchQuery,
    setSearchQuery,
    viewMode,
    setViewMode
}) => {
    const [isSuggestionOpen, setIsSuggestionOpen] = React.useState(false);

    return (
        <header className="sticky top-0 z-50 w-full glass px-6 py-3 flex items-center justify-between border-b border-white/5 gap-6">
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

            {/* View Switcher & Actions */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => setIsSuggestionOpen(true)}
                    className="hidden lg:flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-sm font-medium text-white rounded-lg transition-all border border-white/5"
                >
                    <Plus size={16} className="text-red-400" />
                    Suggest Site
                </button>

                <div className="flex items-center bg-zinc-900/80 p-1 rounded-xl border border-white/5 min-w-fit">
                    <button
                        onClick={() => setViewMode('map')}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-lg transition-all duration-300 ${viewMode === 'map'
                            ? 'bg-red-600 text-white shadow-lg'
                            : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        <Map size={16} />
                        <span className="text-sm font-bold hidden md:inline">Map</span>
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-lg transition-all duration-300 ${viewMode === 'list'
                            ? 'bg-red-600 text-white shadow-lg'
                            : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        <List size={16} />
                        <span className="text-sm font-bold hidden md:inline">List</span>
                    </button>
                </div>
            </div>

            <SuggestionModal isOpen={isSuggestionOpen} onClose={() => setIsSuggestionOpen(false)} />
        </header>
    );
};

export default Header;
