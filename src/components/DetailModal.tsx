import React, { useEffect } from 'react';
import { X, MapPin, Info, Navigation, ExternalLink, Phone, Mail, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import type { Landmark } from './LandmarkCard';

// Fix for default marker icon in React-Leaflet
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
});

interface DetailModalProps {
    landmark: Landmark | null;
    isOpen: boolean;
    onClose: () => void;
}

const DetailModal: React.FC<DetailModalProps> = ({ landmark, isOpen, onClose }) => {
    // Prevent scrolling when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!landmark) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 md:p-10">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-md"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto no-scrollbar glass rounded-3xl border border-white/10 shadow-2xl flex flex-col md:flex-row"
                    >
                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 z-[10000] p-2 rounded-full bg-zinc-900/50 text-white hover:bg-zinc-800 transition-colors border border-white/5"
                        >
                            <X size={20} />
                        </button>

                        {/* Left Side: Visual/Quick Info */}
                        <div className="w-full md:w-5/12 p-8 bg-zinc-900/30 flex flex-col justify-between border-b md:border-b-0 md:border-r border-white/5">
                            <div>
                                <div className="bg-red-600 w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shadow-red-900/20 mb-6 font-bold text-white">
                                    <MapPin size={24} />
                                </div>
                                <h2 className="text-3xl font-black text-white leading-tight mb-4">
                                    {landmark.name}
                                </h2>
                                <div className="flex flex-wrap gap-2 mb-6">
                                    {landmark.category.split(',').map((cat) => (
                                        <span key={cat.trim()} className="text-[10px] font-bold text-red-500 bg-red-500/5 border border-red-500/30 px-3 py-1 rounded-lg uppercase tracking-wider backdrop-blur-sm">
                                            {cat.trim()}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center gap-3 text-gray-300">
                                    <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center">
                                        <Navigation size={16} className="text-red-500" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-tighter">Location</p>
                                        <p className="text-sm font-medium">
                                            {[landmark.city, landmark.state, landmark.country].filter(Boolean).join(', ')}
                                        </p>
                                    </div>
                                </div>

                                {landmark.telephone && (
                                    <div className="flex items-center gap-3 text-gray-300">
                                        <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center">
                                            <Phone size={16} className="text-red-500" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-tighter">Telephone</p>
                                            <p className="text-sm font-medium">{landmark.telephone}</p>
                                        </div>
                                    </div>
                                )}

                                {landmark.email && (
                                    <div className="flex items-center gap-3 text-gray-300">
                                        <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center">
                                            <Mail size={16} className="text-red-500" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-tighter">Email</p>
                                            <a href={`mailto:${landmark.email}`} className="text-sm font-medium hover:text-red-400 transition-colors">{landmark.email}</a>
                                        </div>
                                    </div>
                                )}

                                {landmark.website && (
                                    <div className="flex items-center gap-3 text-gray-300">
                                        <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center">
                                            <Globe size={16} className="text-red-500" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-tighter">Website</p>
                                            <a href={landmark.website.startsWith('http') ? landmark.website : `https://${landmark.website}`} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:text-red-400 transition-colors break-all">
                                                {landmark.website.replace(/^https?:\/\//, '')}
                                            </a>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right Side: Details & Map */}
                        <div className="w-full md:w-7/12 flex flex-col">
                            <div className="p-8 flex-1">
                                <div className="flex items-center gap-2 text-red-500 mb-6 font-bold text-sm tracking-widest uppercase">
                                    <Info size={18} />
                                    Historical Significance
                                </div>
                                <p className="text-gray-300 text-lg leading-relaxed mb-8">
                                    {landmark.description}
                                </p>

                                {/* Mini Map */}
                                <div className="bg-white/5 rounded-2xl overflow-hidden border border-white/5 mb-8">
                                    <div className="h-48 w-full z-10 relative">
                                        <MapContainer
                                            center={[landmark.lat, landmark.lng]}
                                            zoom={13}
                                            style={{ height: '100%', width: '100%' }}
                                            zoomControl={false}
                                            scrollWheelZoom={false}
                                            dragging={false}
                                            doubleClickZoom={false}
                                            attributionControl={false}
                                        >
                                            <TileLayer
                                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                            />
                                            <Marker position={[landmark.lat, landmark.lng]} />
                                        </MapContainer>
                                    </div>
                                    <div className="p-4 bg-zinc-900/50">
                                        <h4 className="text-white font-bold text-xs uppercase tracking-widest mb-1 opacity-50">Street Address</h4>
                                        <p className="text-gray-300 text-sm font-medium">{landmark.address}</p>
                                    </div>
                                </div>
                            </div>

                            {landmark.website && (
                                <div className="flex flex-wrap gap-4 p-8 pt-0 mt-auto">
                                    <a
                                        href={landmark.website.startsWith('http') ? landmark.website : `https://${landmark.website}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-5 text-sm rounded-xl transition-all shadow-lg shadow-red-900/20 active:scale-95"
                                    >
                                        <ExternalLink size={14} />
                                        Official Site
                                    </a>
                                </div>
                            )}


                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default DetailModal;
