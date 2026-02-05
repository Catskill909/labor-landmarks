import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Map, List } from 'lucide-react';

interface FilterBarProps {
    selectedCategory: string;
    setSelectedCategory: (category: string) => void;
    categories: string[];
    viewMode: 'map' | 'list';
    setViewMode: (mode: 'map' | 'list') => void;
}

const FilterBar: React.FC<FilterBarProps> = ({
    selectedCategory,
    setSelectedCategory,
    categories,
    viewMode,
    setViewMode
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleCategorySelect = (category: string) => {
        setSelectedCategory(category);
        setIsOpen(false);
    };

    return (
        <div className="w-full flex items-center justify-between pb-4 pt-1 relative z-[1000]">
            {/* View Switcher - Moved to left of Filter Bar */}
            <div className="flex items-center bg-zinc-900/90 p-1.5 rounded-xl border border-white/20 shadow-xl backdrop-blur-md">
                <button
                    onClick={() => setViewMode('map')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ${viewMode === 'map'
                        ? 'bg-red-600 text-white shadow-lg shadow-red-900/20'
                        : 'text-white bg-white/5 hover:bg-white/10 ring-1 ring-white/10 hover:ring-white/20'
                        }`}
                >
                    <Map size={16} />
                    <span className="text-sm font-bold">Map</span>
                </button>
                <button
                    onClick={() => setViewMode('list')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ${viewMode === 'list'
                        ? 'bg-red-600 text-white shadow-lg shadow-red-900/20'
                        : 'text-white bg-white/5 hover:bg-white/10 ring-1 ring-white/10 hover:ring-white/20'
                        }`}
                >
                    <List size={16} />
                    <span className="text-sm font-bold">List</span>
                </button>
            </div>

            {/* Category Dropdown */}
            <div className="relative" ref={dropdownRef}>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-3 px-5 py-2.5 rounded-xl text-sm font-bold bg-zinc-900/90 border border-white/20 hover:border-white/40 hover:bg-zinc-800 transition-all text-white min-w-[180px] justify-between shadow-lg backdrop-blur-md"
                >
                    <span className="truncate">
                        {selectedCategory || 'All Types'}
                    </span>
                    <ChevronDown size={18} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''} text-gray-400`} />
                </button>

                {isOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl z-[1000] overflow-hidden backdrop-blur-xl">
                        <div className="p-2 max-h-[400px] overflow-y-auto no-scrollbar">
                            <button
                                onClick={() => handleCategorySelect('')}
                                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all ${selectedCategory === ''
                                    ? 'bg-red-600/10 text-red-400'
                                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                                    }`}
                            >
                                <span>All Types</span>
                                {selectedCategory === '' && <Check size={16} />}
                            </button>

                            <div className="my-1 border-t border-white/5" />

                            {categories.map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => handleCategorySelect(cat)}
                                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all ${selectedCategory === cat
                                        ? 'bg-red-600/10 text-red-400'
                                        : 'text-gray-300 hover:bg-white/5 hover:text-white'
                                        }`}
                                >
                                    <span className="truncate">{cat}</span>
                                    {selectedCategory === cat && <Check size={16} />}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FilterBar;
