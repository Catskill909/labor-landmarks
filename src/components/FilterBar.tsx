import React from 'react';
import { X } from 'lucide-react';

interface FilterBarProps {
    selectedCategory: string;
    setSelectedCategory: (category: string) => void;
    categories: string[];
}

const FilterBar: React.FC<FilterBarProps> = ({
    selectedCategory,
    setSelectedCategory,
    categories
}) => {
    return (
        <div className="w-full">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2">
                <button
                    onClick={() => setSelectedCategory('')}
                    className={`whitespace-nowrap px-5 py-2.5 rounded-xl text-xs font-bold transition-all border ${selectedCategory === ''
                        ? 'bg-white text-black border-white'
                        : 'bg-zinc-800 text-gray-300 border-white/5 hover:border-white/20 hover:text-white'
                        }`}
                >
                    All Types
                </button>
                {categories.map((cat) => (
                    <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`whitespace-nowrap px-5 py-2.5 rounded-xl text-xs font-bold transition-all border ${selectedCategory === cat
                            ? 'bg-white text-black border-white'
                            : 'bg-zinc-800 text-gray-300 border-white/5 hover:border-white/20 hover:text-white'
                            }`}
                    >
                        {cat}
                    </button>
                ))}

                {selectedCategory && (
                    <button
                        onClick={() => setSelectedCategory('')}
                        className="ml-2 p-2 rounded-lg bg-zinc-800 text-gray-400 hover:text-white transition-all shadow-lg"
                        title="Clear Filters"
                    >
                        <X size={14} />
                    </button>
                )}
            </div>
        </div>
    );
};

export default FilterBar;
