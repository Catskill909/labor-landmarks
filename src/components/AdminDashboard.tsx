import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, ArrowLeft, Landmark as LandmarkIcon, Check, Loader2, Download, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Landmark } from './LandmarkCard';
import LandmarkModal from './LandmarkModal.tsx';

// Admin Dashboard for managing landmarks
const AdminDashboard: React.FC = () => {
    const [landmarks, setLandmarks] = useState<Landmark[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [importing, setImporting] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [selectedLandmark, setSelectedLandmark] = useState<Landmark | undefined>(undefined);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [filterStatus, setFilterStatus] = useState<'published' | 'draft'>('published');

    // Fetch Admin Data (All records)
    const fetchAdminLandmarks = async () => {
        try {
            const response = await fetch('/api/admin/landmarks');
            if (response.ok) {
                const data = await response.json();
                setLandmarks(data);
            }
        } catch (error) {
            console.error('Error fetching admin landmarks:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAdminLandmarks();
    }, []);

    const filteredLandmarks = landmarks.filter(l => {
        const matchesSearch = l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            l.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
            l.state.toLowerCase().includes(searchQuery.toLowerCase());

        const isPublished = l.isPublished ?? true;
        const matchesStatus = filterStatus === 'published' ? isPublished : !isPublished;

        return matchesSearch && matchesStatus;
    });

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
                fetchAdminLandmarks();
            } catch (error) {
                console.error('Error deleting landmark:', error);
            }
        }
    };

    const handleApprove = async (landmark: Landmark) => {
        try {
            await fetch(`/api/landmarks/${landmark.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...landmark, isPublished: true })
            });
            fetchAdminLandmarks();
        } catch (error) {
            console.error('Error approving landmark:', error);
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
            alert('Please select a valid JSON file.');
            return;
        }

        if (!confirm('Are you sure you want to import this file? This will merge new data into the database.')) {
            return;
        }

        setImporting(true);
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const json = JSON.parse(e.target?.result as string);
                const response = await fetch('/api/admin/import', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(json)
                });

                if (!response.ok) throw new Error('Import failed');

                const result = await response.json();
                alert(`Import Successful!\nAdded: ${result.stats.added}\nUpdated: ${result.stats.updated}\nSkipped: ${result.stats.skipped}`);
                fetchAdminLandmarks();
            } catch (error) {
                console.error('Import error:', error);
                alert('Failed to import data. Check console for details.');
            } finally {
                setImporting(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        reader.readAsText(file);
    };

    // Calculate Counts
    const publishedCount = landmarks.filter(l => l.isPublished ?? true).length;
    const draftCount = landmarks.filter(l => !(l.isPublished ?? true)).length;

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center text-white">
                <Loader2 className="animate-spin text-red-600" size={48} />
            </div>
        );
    }

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
                    <div className="flex items-center gap-4">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleImportFile}
                            className="hidden"
                            accept=".json"
                        />
                        <button
                            onClick={handleImportClick}
                            disabled={importing}
                            className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-gray-300 px-6 py-2.5 rounded-xl font-bold transition-all border border-white/5 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Import JSON Backup"
                        >
                            {importing ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                            Import JSON
                        </button>
                        <a
                            href="/api/admin/backup"
                            className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-gray-300 px-6 py-2.5 rounded-xl font-bold transition-all border border-white/5 hover:scale-105 active:scale-95 no-underline"
                            title="Download JSON Backup"
                            download
                        >
                            <Download size={18} />
                            Backup JSON
                        </a>
                        <button
                            onClick={handleAdd}
                            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg hover:scale-105 active:scale-95"
                        >
                            <Plus size={18} />
                            Add Landmark
                        </button>
                    </div>
                </div>

                {/* Stats & Search */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    {/* Updated Stats Cards as requested */}
                    <div className="bg-zinc-900 border border-white/5 p-6 rounded-2xl">
                        <p className="text-sm text-gray-500 mb-1">Total Published</p>
                        <p className="text-3xl font-bold text-white">{publishedCount}</p>
                    </div>
                    <div className="bg-zinc-900 border border-white/5 p-6 rounded-2xl relative overflow-hidden">
                        <p className="text-sm text-gray-500 mb-1">Review Queue</p>
                        <p className={`text-3xl font-bold ${draftCount > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                            {draftCount}
                        </p>
                        {draftCount > 0 && (
                            <div className="absolute top-4 right-4 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                        )}
                    </div>

                    <div className="md:col-span-2 bg-zinc-900 border border-white/5 p-6 rounded-2xl flex items-center gap-4">
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

                {/* Tabs */}
                <div className="flex gap-4 mb-6 border-b border-white/10">
                    <button
                        onClick={() => setFilterStatus('published')}
                        className={`pb-3 px-2 font-medium transition-colors border-b-2 ${filterStatus === 'published' ? 'border-red-500 text-white' : 'border-transparent text-gray-400 hover:text-white'}`}
                    >
                        Published ({publishedCount})
                    </button>
                    <button
                        onClick={() => setFilterStatus('draft')}
                        className={`pb-3 px-2 font-medium transition-colors border-b-2 ${filterStatus === 'draft' ? 'border-red-500 text-white' : 'border-transparent text-gray-400 hover:text-white'}`}
                    >
                        Review Queue ({draftCount})
                    </button>
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
                                        <div className="text-sm font-medium">{landmark.city}, {landmark.state}, {landmark.country}</div>
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
                                            {(!landmark.isPublished && landmark.isPublished !== undefined) && (
                                                <button
                                                    onClick={() => handleApprove(landmark)}
                                                    className="p-2 rounded-lg bg-green-900/30 text-green-500 hover:bg-green-900/50 hover:text-green-400 transition-all border border-green-500/20"
                                                    title="Approve / Publish"
                                                >
                                                    <Check size={16} />
                                                </button>
                                            )}
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
                    fetchAdminLandmarks();
                }}
            />
        </div>
    );
};

export default AdminDashboard;
