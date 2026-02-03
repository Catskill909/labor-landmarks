import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import type { Landmark } from './LandmarkCard';

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
        lng: ''
    });

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
                lng: landmark.lng.toString()
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
                lng: ''
            });
        }
    }, [landmark, isOpen]);

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

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
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

                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Categories (Comma separated)</label>
                            <input
                                required
                                type="text"
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                className="w-full bg-black border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-600/50"
                                placeholder="Museum, Memorial, Statue"
                            />
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
