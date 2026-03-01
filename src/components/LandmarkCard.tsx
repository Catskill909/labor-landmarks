import React from 'react';
import { MapPin, Info, ArrowRight } from 'lucide-react';

export interface LandmarkImage {
    id: number;
    filename: string;
    caption?: string;
    sortOrder: number;
}

export interface Landmark {
    id: number;
    name: string;
    city: string;
    state: string;
    category: string;
    description: string;
    address: string;
    lat: number;
    lng: number;
    email?: string;
    website?: string;
    telephone?: string;
    country?: string;
    sourceUrl?: string;
    submitterName?: string;
    submitterEmail?: string;
    submitterComment?: string;
    isPublished?: boolean;
    images?: LandmarkImage[];
}

interface LandmarkCardProps {
    landmark: Landmark;
    onClick: () => void;
}

const LandmarkCard: React.FC<LandmarkCardProps> = ({ landmark, onClick }) => {
    return (
        <div
            onClick={onClick}
            className="bg-zinc-900/40 border border-white/10 rounded-2xl p-5 hover:bg-zinc-800/60 hover:border-white/20 hover:-translate-y-1 transition-all duration-300 group cursor-pointer"
        >
            <div className="flex justify-between items-start mb-4">
                <div className="bg-zinc-800 p-2 rounded-xl group-hover:bg-red-600/20 transition-colors">
                    <MapPin className="text-gray-400 group-hover:text-red-500 transition-colors" size={20} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 bg-zinc-800/50 px-2 py-1 rounded-md border border-white/5">
                    {landmark.city}, {landmark.state}{landmark.country && landmark.country !== 'USA' ? `, ${landmark.country}` : ''}
                </span>
            </div>

            <h3 className="text-lg font-bold text-white mb-2 leading-tight group-hover:text-red-400 transition-colors">
                {landmark.name}
            </h3>

            {landmark.images && landmark.images.length > 0 && (
                <div className="mb-3 rounded-xl overflow-hidden border border-white/5">
                    <img
                        src={`/uploads/landmarks/thumb_${landmark.images[0].filename}`}
                        alt={landmark.name}
                        className="w-full h-36 object-cover"
                        loading="lazy"
                    />
                </div>
            )}

            <div className="flex flex-wrap gap-2 mb-4">
                {landmark.category.split(',').map((cat) => (
                    <span key={cat.trim()} className="text-[10px] font-medium text-gray-400 bg-white/5 px-2 py-0.5 rounded-full">
                        {cat.trim()}
                    </span>
                ))}
            </div>

            <p className="text-sm text-gray-400 line-clamp-3 mb-6 leading-relaxed">
                {landmark.description}
            </p>

            <div className="flex items-center justify-between border-t border-white/5 pt-4">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onClick();
                    }}
                    className="flex items-center gap-2 text-xs font-bold text-white group-hover:gap-3 transition-all"
                >
                    READ MORE
                    <ArrowRight size={14} className="text-red-500" />
                </button>
                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Info size={14} className="text-zinc-600" />
                </div>
            </div>
        </div>
    );
};

export default LandmarkCard;
