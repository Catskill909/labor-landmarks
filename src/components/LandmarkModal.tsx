import React, { useState, useEffect } from 'react';
import { X, Save, MapPin, Loader2 } from 'lucide-react';
import { CATEGORIES } from '../constants/categories';
import type { Landmark } from './LandmarkCard';

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

interface LandmarkModalProps {
    isOpen: boolean;
    onClose: () => void;
    landmark?: Landmark;
    onSuccess: () => void;
}


const LandmarkModal: React.FC<LandmarkModalProps> = ({ isOpen, onClose, landmark, onSuccess }) => {
    const [formData, setFormData] = useState({
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
        country: 'USA',
        sourceUrl: ''
    });

    // Autocomplete State
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);

    useEffect(() => {
        if (landmark) {
            setFormData({
                name: landmark.name,
                city: landmark.city,
                state: landmark.state,
                category: landmark.category,
                description: landmark.description,
                address: landmark.address,
                lat: landmark.lat.toString(),
                lng: landmark.lng.toString(),
                email: landmark.email || '',
                website: landmark.website || '',
                telephone: landmark.telephone || '',
                country: landmark.country || 'USA',
                sourceUrl: landmark.sourceUrl || ''
            });
        } else {
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
                country: 'USA',
                sourceUrl: ''
            });
            setQuery('');
        }
    }, [landmark, isOpen]);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (query.length > 2 && showSuggestions) {
                setIsSearching(true);
                try {
                    const countryCode = formData.country.toLowerCase() === 'canada' ? 'ca' : 'us';
                    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5&countrycodes=${countryCode}`, {
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
        const method = landmark ? 'PUT' : 'POST';
        const url = landmark ? `/api/landmarks/${landmark.id}` : '/api/landmarks';

        try {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    lat: parseFloat(formData.lat),
                    lng: parseFloat(formData.lng)
                })
            });

            if (response.ok) {
                onSuccess();
            } else {
                alert('Failed to save landmark');
            }
        } catch (error) {
            console.error('Error saving landmark:', error);
            alert('Error saving landmark');
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-zinc-900 border border-white/10 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl">
                <div className="flex items-center justify-between p-6 border-b border-white/5">
                    <h2 className="text-xl font-bold">{landmark ? 'Edit Landmark' : 'Add New Landmark'}</h2>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-zinc-800 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
                    {/* Address Search */}
                    <div className="relative z-10 w-full mb-6">
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
                            <div className="absolute left-0 right-0 mt-2 bg-black border border-white/10 rounded-xl shadow-2xl overflow-hidden z-20">
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
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full bg-black border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-600/50"
                                placeholder="e.g. Haymarket Memorial"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">City</label>
                            <input
                                required
                                type="text"
                                value={formData.city}
                                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                className="w-full bg-black border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-600/50"
                                placeholder="Chicago"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">State (Abbr)</label>
                            <input
                                required
                                type="text"
                                maxLength={2}
                                value={formData.state}
                                onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                                className="w-full bg-black border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-600/50"
                                placeholder="IL"
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
                                                ? 'bg-red-600 text-white border-red-600 shadow-lg shadow-red-900/20'
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
                                rows={3}
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full bg-black border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-600/50"
                                placeholder="Detailed history of the landmark..."
                            />
                        </div>

                        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Telephone (Optional)</label>
                                <input
                                    type="tel"
                                    value={formData.telephone}
                                    onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                                    className="w-full bg-black border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-600/50"
                                    placeholder="(555) 000-0000"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Email (Optional)</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full bg-black border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-600/50"
                                    placeholder="contact@example.com"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Website (Optional)</label>
                                <input
                                    type="url"
                                    value={formData.website}
                                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                                    className="w-full bg-black border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-600/50"
                                    placeholder="https://..."
                                />
                            </div>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Full Address</label>
                            <input
                                required
                                type="text"
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                className="w-full bg-black border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-600/50"
                                placeholder="123 History St, Chicago, IL"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Latitude</label>
                            <input
                                required
                                type="number"
                                step="any"
                                value={formData.lat}
                                onChange={(e) => setFormData({ ...formData, lat: e.target.value })}
                                className="w-full bg-black border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-600/50"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Longitude</label>
                            <input
                                required
                                type="number"
                                step="any"
                                value={formData.lng}
                                onChange={(e) => setFormData({ ...formData, lng: e.target.value })}
                                className="w-full bg-black border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-600/50"
                            />
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
                            {landmark ? 'Update' : 'Save'} Landmark
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LandmarkModal;
