import { useState, useMemo, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Info, Shield } from 'lucide-react';
import Header from './components/Header';
import FilterBar from './components/FilterBar';
import ListView from './components/ListView';
import MapView from './components/MapView';
import DetailModal from './components/DetailModal';
import AboutModal from './components/AboutModal';
import PrivacyModal from './components/PrivacyModal';
import AdminDashboard from './components/AdminDashboard';
import type { Landmark } from './components/LandmarkCard';
import { CATEGORIES } from './constants/categories';

function App() {
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedLandmark, setSelectedLandmark] = useState<Landmark | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);

  const fetchLandmarks = async () => {
    try {
      const response = await fetch('/api/landmarks');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setLandmarks(data);
    } catch (error) {
      console.error('Error fetching landmarks:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLandmarks();
  }, []);

  const categories = CATEGORIES;

  const filteredLandmarks = useMemo(() => {
    return landmarks.filter(l => {
      const query = searchQuery.toLowerCase();
      const nameMatch = l.name.toLowerCase().includes(query);
      const cityMatch = l.city.toLowerCase().includes(query);
      const stateMatch = l.state.toLowerCase().includes(query);
      const categoryMatch = selectedCategory === '' || l.category.includes(selectedCategory);
      return (nameMatch || cityMatch || stateMatch) && categoryMatch;
    });
  }, [landmarks, searchQuery, selectedCategory]);

  const handleOpenDetail = (landmark: Landmark) => {
    setSelectedLandmark(landmark);
    setIsModalOpen(true);
  };

  const handleNext = () => {
    if (!selectedLandmark) return;
    const currentIndex = filteredLandmarks.findIndex(l => l.id === selectedLandmark.id);
    const nextIndex = (currentIndex + 1) % filteredLandmarks.length;
    setSelectedLandmark(filteredLandmarks[nextIndex]);
  };

  const handlePrevious = () => {
    if (!selectedLandmark) return;
    const currentIndex = filteredLandmarks.findIndex(l => l.id === selectedLandmark.id);
    const prevIndex = (currentIndex - 1 + filteredLandmarks.length) % filteredLandmarks.length;
    setSelectedLandmark(filteredLandmarks[prevIndex]);
  };

  if (loading) {
    return (
      <div className="h-dvh flex items-center justify-center bg-black text-white px-6">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-white/5 border-t-red-600 animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-red-600/20 blur-xl animate-pulse"></div>
            </div>
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold tracking-tight mb-1">Labor Landmarks</h2>
            <p className="text-sm text-gray-500 font-medium">Loading historical records...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={
          <div className="h-dvh flex flex-col overflow-hidden bg-black text-white">
            <Header
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
            />

            <main className="flex-1 flex flex-col min-h-0">
              <div className="px-6 pt-3 flex flex-col relative z-[1000]">
                <FilterBar
                  selectedCategory={selectedCategory}
                  setSelectedCategory={setSelectedCategory}
                  categories={categories}
                  viewMode={viewMode}
                  setViewMode={setViewMode}
                />
              </div>

              <div className="flex-1 overflow-hidden relative">
                {viewMode === 'list' ? (
                  <div className="h-full overflow-y-auto no-scrollbar pb-10">
                    <ListView landmarks={filteredLandmarks} onSelectLandmark={handleOpenDetail} />
                  </div>
                ) : (
                  <div className="h-full relative">
                    <MapView landmarks={filteredLandmarks} onSelectLandmark={handleOpenDetail} />
                  </div>
                )}
              </div>
            </main>

            <DetailModal
              landmark={selectedLandmark}
              isOpen={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              onNext={handleNext}
              onPrevious={handlePrevious}
              viewMode={viewMode}
            />

            <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
            <PrivacyModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />

            <footer className="fixed bottom-0 left-0 right-0 glass px-6 py-3 flex items-center justify-between text-[10px] text-gray-500 z-[1500] border-t border-white/5">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setIsAboutOpen(true)}
                  className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors font-medium"
                >
                  <Info size={14} />
                  <span>About Labor Landmarks</span>
                </button>
                <span>•</span>
                <a href="https://laborheritage.org" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                  &copy; 2026 The Labor Heritage Foundation
                </a>
                <span>•</span>
                <span>Showing {filteredLandmarks.length} of {landmarks.length} landmarks</span>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setIsPrivacyOpen(true)}
                  className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors font-medium"
                >
                  <Shield size={14} />
                  <span>Privacy Policy</span>
                </button>
              </div>
            </footer>
          </div>
        } />
        <Route path="/admin" element={<AdminRoute />} />
      </Routes>
    </Router>
  );
}

function AdminRoute() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    // Local dev skips auth
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return true;
    }
    // Check session storage
    return sessionStorage.getItem('isAdminAuthenticated') === 'true';
  });

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  if (!isAuthenticated) {
    return <AdminLogin onLoginSuccess={handleLoginSuccess} />;
  }

  return <AdminDashboard />;
}

import AdminLogin from './components/AdminLogin';

export default App;
