import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Search, ArrowLeft, Landmark as LandmarkIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Landmark } from './LandmarkCard';
import LandmarkModal from './LandmarkModal';

interface AdminDashboardProps {
    landmarks: Landmark[];
    onUpdate: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ landmarks, onUpdate }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedLandmark, setSelectedLandmark] = useState<Landmark | undefined>(undefined);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const filteredLandmarks = landmarks.filter(l =>
        l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.state.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleAdd = () => {
        setSelectedLandmark(undefined);
        setIsModalOpen(true);
    };

    const handleEdit = (landmark: Landmark) => {
        setSelectedLandmark(landmark);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (confirm('Are you sure you want to delete this landmark? This action cannot be undone.')) {
            try {
                await fetch(`/api/landmarks/${id}`, { method: 'DELETE' });
                onUpdate();
            } catch (error) {
                console.error('Error deleting landmark:', error);
            }
        }
    };

    return (
        <div className="min-h-screen bg-black text-white p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-6">
                        <Link to="/" className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 transition-colors">
                            <ArrowLeft size={20} />
                        </Link>
                        <div className="flex items-center gap-3">
                            <div className="bg-red-600 p-2 rounded-lg shadow-lg">
                                <LandmarkIcon size={24} />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
                                <p className="text-sm text-gray-500">Manage Labor Landmarks Inventory</p>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={handleAdd}
                        className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg hover:scale-105 active:scale-95"
                    >
                        <Plus size={18} />
                        Add Landmark
                    </button>
                </div>

                {/* Stats & Search */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-zinc-900 border border-white/5 p-6 rounded-2xl">
                        <p className="text-sm text-gray-500 mb-1">Total Landmarks</p>
                        <p className="text-3xl font-bold">{landmarks.length}</p>
                    </div>
                    <div className="md:col-span-3 bg-zinc-900 border border-white/5 p-6 rounded-2xl flex items-center gap-4">
                        <Search className="text-gray-500" size={20} />
                        <input
                            type="text"
                            placeholder="Search by name, city, or state..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-transparent border-none text-white focus:outline-none w-full text-lg placeholder:text-gray-600"
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="bg-zinc-900 border border-white/5 rounded-2xl overflow-hidden">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-white/5 bg-zinc-800/50">
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Landmark</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Location</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Categories</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredLandmarks.map((landmark) => (
                                <tr key={landmark.id} className="hover:bg-white/5 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-white group-hover:text-red-400 transition-colors uppercase text-sm tracking-wide">{landmark.name}</div>
                                        <div className="text-xs text-gray-500 truncate max-w-xs">{landmark.description}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium">{landmark.city}, {landmark.state}</div>
                                        <div className="text-[10px] text-gray-500">{landmark.address}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-1">
                                            {landmark.category.split(',').map((cat, i) => (
                                                <span key={i} className="px-2 py-0.5 rounded-full bg-zinc-800 text-[10px] font-medium text-gray-400">
                                                    {cat.trim()}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => handleEdit(landmark)}
                                                className="p-2 rounded-lg bg-zinc-800 text-gray-400 hover:text-white hover:bg-zinc-700 transition-all"
                                                title="Edit"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(landmark.id)}
                                                className="p-2 rounded-lg bg-zinc-800 text-gray-400 hover:text-red-500 hover:bg-zinc-700 transition-all"
                                                title="Delete"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredLandmarks.length === 0 && (
                        <div className="p-12 text-center">
                            <p className="text-gray-500">No landmarks found matching your search.</p>
                        </div>
                    )}
                </div>
            </div>

            <LandmarkModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                landmark={selectedLandmark}
                onSuccess={() => {
                    setIsModalOpen(false);
                    onUpdate();
                }}
            />
        </div>
    );
};

export default AdminDashboard;
