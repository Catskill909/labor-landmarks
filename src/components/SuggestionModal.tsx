import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, MapPin, Loader2, Check } from 'lucide-react';
import { CATEGORIES } from '../constants/categories';
import ImageUploader from './ImageUploader';

interface SuggestionModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface NominatimResult {
    display_name: string;
    lat: string;
    lon: string;
    address: {
        city?: string;
        town?: string;
        village?: string;
        state?: string;
        ISO3166_2_lvl4?: string; // State Code like US-IL
    };
}


export default function SuggestionModal({ isOpen, onClose }: SuggestionModalProps) {
    const [formData, setFormData] = useState({
        name: '',
        city: '',
        state: '',
        category: '',
        description: '',
        address: '',
        lat: '',
        lng: '',
        country: 'USA',
        email: '',
        website: '',
        telephone: ''
    });

    const [isSuccess, setIsSuccess] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

    // Autocomplete State
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsSuccess(false);
            setFormData({
                name: '',
                city: '',
                state: '',
                category: '',
                description: '',
                address: '',
                lat: '',
                lng: '',
                email: '',
                website: '',
                telephone: '',
                country: 'USA'
            });
            setQuery('');
            setSelectedFiles([]);
        }
    }, [isOpen]);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (query.length > 2 && showSuggestions) {
                setIsSearching(true);
                try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5&countrycodes=us`, {
                        headers: {
                            'User-Agent': 'LaborLandmarksApp/1.0'
                        }
                    });
                    const data = await res.json();
                    setSuggestions(data);
                } catch (error) {
                    console.error("Geocoding failed", error);
                } finally {
                    setIsSearching(false);
                }
            } else if (query.length <= 2) {
                setSuggestions([]);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [query, showSuggestions]);

    const handleSelectAddress = (item: NominatimResult) => {
        // Parse State code if possible, Nominatim usually gives "ISO3166_2_lvl4" like "US-NY"
        let stateCode = item.address.state || '';
        if (item.address.ISO3166_2_lvl4) {
            stateCode = item.address.ISO3166_2_lvl4.replace('US-', '');
        }

        setFormData(prev => ({
            ...prev,
            address: item.display_name,
            lat: item.lat,
            lng: item.lon,
            city: item.address.city || item.address.town || item.address.village || '',
            state: stateCode
        }));
        setQuery(item.display_name);
        setShowSuggestions(false);
    };

    const toggleCategory = (cat: string) => {
        const currentCats = formData.category ? formData.category.split(',').map(c => c.trim()).filter(c => c !== '') : [];
        let newCats: string[];
        if (currentCats.includes(cat)) {
            newCats = currentCats.filter(c => c !== cat);
        } else {
            newCats = [...currentCats, cat];
        }
        setFormData(prev => ({ ...prev, category: newCats.join(', ') }));
    };

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const payload = {
                ...formData,
                lat: formData.lat ? parseFloat(formData.lat) : 0,
                lng: formData.lng ? parseFloat(formData.lng) : 0,
                isPublished: false
            };

            const response = await fetch('/api/landmarks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const created = await response.json();

                // Upload images if any were selected
                if (selectedFiles.length > 0) {
                    const imageData = new FormData();
                    selectedFiles.forEach(file => imageData.append('images', file));
                    await fetch(`/api/landmarks/${created.id}/images`, {
                        method: 'POST',
                        body: imageData
                    });
                }

                setIsSuccess(true);
            } else {
                alert('Failed to send suggestion. Please try again.');
            }
        } catch (error) {
            console.error('Error sending suggestion:', error);
            alert('Error sending suggestion.');
        }
    };

    // Use a Portal to escape the Header's sticky/stacking context
    // and rely on fixed positioning relative to the viewport.
    return createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-zinc-900 border border-white/10 rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-white/5 bg-zinc-900 shrink-0">
                    <h2 className="text-xl font-bold text-white">
                        {isSuccess ? 'Suggestion Received' : 'Suggest a Landmark'}
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-zinc-800 transition-colors text-white">
                        <X size={20} />
                    </button>
                </div>

                {isSuccess ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center space-y-6">
                        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-4 animate-in zoom-in duration-300">
                            <Check className="text-green-500 w-10 h-10" />
                        </div>
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
                            <h3 className="text-2xl font-bold text-white mb-2">Thank you!</h3>
                            <p className="text-gray-400 max-w-sm mx-auto">
                                Your suggestion for <span className="text-white font-bold">{formData.name}</span> has been submitted for review.
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="bg-white text-black hover:bg-gray-200 px-8 py-3 rounded-xl font-bold transition-all transform hover:scale-105 active:scale-95 shadow-lg animate-in fade-in duration-500 delay-300"
                        >
                            Return to Map
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
                        {/* Auto-Complete Address Field */}
                        <div className="relative z-10">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Address Search (Auto-fills location)</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={query}
                                    onChange={e => {
                                        setQuery(e.target.value);
                                        setShowSuggestions(true);
                                    }}
                                    className="w-full bg-black border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-600/50 pl-10"
                                    placeholder="Start typing address..."
                                />
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                {isSearching && (
                                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500 animate-spin" size={18} />
                                )}
                            </div>

                            {/* Suggestions Dropdown */}
                            {showSuggestions && suggestions.length > 0 && (
                                <div className="absolute left-0 right-0 mt-2 bg-black border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                                    {suggestions.map((item, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => handleSelectAddress(item)}
                                            className="w-full text-left px-4 py-3 hover:bg-zinc-800 text-sm text-gray-300 border-b border-white/5 last:border-0 transition-colors"
                                        >
                                            {item.display_name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Landmark Name</label>
                                <input
                                    required
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-black border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-600/50"
                                    placeholder="e.g. Battle of Blair Mountain"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">City (Auto)</label>
                                <input
                                    required
                                    type="text"
                                    value={formData.city}
                                    onChange={e => setFormData({ ...formData, city: e.target.value })}
                                    className="w-full bg-black border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-600/50"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">State (Auto)</label>
                                <input
                                    required
                                    type="text"
                                    value={formData.state}
                                    onChange={e => setFormData({ ...formData, state: e.target.value })}
                                    className="w-full bg-black border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-600/50"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-3">Categories (Select one or more)</label>
                                <div className="flex flex-wrap gap-2">
                                    {CATEGORIES.map(cat => {
                                        const isSelected = formData.category.split(',').map(c => c.trim()).includes(cat);
                                        return (
                                            <button
                                                key={cat}
                                                type="button"
                                                onClick={() => toggleCategory(cat)}
                                                className={`px-4 py-2 rounded-full text-xs font-bold border transition-all duration-200 ${isSelected
                                                    ? 'bg-red-600 text-white border-red-600 shadow-lg shadow-red-900/20 active-pill'
                                                    : 'bg-zinc-900 text-gray-400 border-white/10 hover:border-red-500/50 hover:text-white'
                                                    }`}
                                            >
                                                {cat}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Description</label>
                                <textarea
                                    required
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full bg-black border border-white/5 rounded-xl px-4 py-3 text-white min-h-[100px] focus:outline-none focus:ring-2 focus:ring-red-600/50"
                                    placeholder="Why is this place significant?"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <ImageUploader
                                    selectedFiles={selectedFiles}
                                    onFilesSelected={(files) => setSelectedFiles(prev => [...prev, ...files])}
                                    onRemoveFile={(idx) => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))}
                                    maxFiles={5}
                                />
                            </div>

                            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Telephone (Optional)</label>
                                    <input
                                        type="tel"
                                        value={formData.telephone}
                                        onChange={e => setFormData({ ...formData, telephone: e.target.value })}
                                        className="w-full bg-black border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-600/50"
                                        placeholder="(555) 000-0000"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Email (Optional)</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full bg-black border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-600/50"
                                        placeholder="contact@example.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Website (Optional)</label>
                                    <input
                                        type="url"
                                        value={formData.website}
                                        onChange={e => setFormData({ ...formData, website: e.target.value })}
                                        className="w-full bg-black border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-600/50"
                                        placeholder="https://..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Country</label>
                                    <select
                                        required
                                        value={formData.country}
                                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                        className="w-full bg-black border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-600/50 appearance-none"
                                    >
                                        <option value="USA">USA</option>
                                        <option value="Canada">Canada</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-4 mt-8">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-6 py-2.5 rounded-xl font-bold text-gray-400 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-8 py-2.5 rounded-xl font-bold transition-all shadow-lg hover:scale-105 active:scale-95"
                            >
                                <Save size={18} />
                                Submit Suggestion
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>,
        document.body
    );
}
