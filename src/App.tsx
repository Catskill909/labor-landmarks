import { useState, useMemo, useEffect, useCallback } from 'react';
import { Routes, Route, useNavigate, useLocation, useMatch } from 'react-router-dom';
import { X } from 'lucide-react';
import Header from './components/Header';
import FilterBar from './components/FilterBar';
import ListView from './components/ListView';
import MapView from './components/MapView';
import DetailModal from './components/DetailModal';
import AboutModal from './components/AboutModal';

import AdminDashboard from './components/AdminDashboard';
import AdminLogin from './components/AdminLogin';
import type { Landmark } from './components/LandmarkCard';
import { CATEGORIES } from './constants/categories';
import { ADMIN_LOGOUT_EVENT } from './utils/adminFetch';
import { landmarkPath, parseLandmarkRef } from './landmark-url';

const SITE_TITLE = 'LHF Labor Landmarks';
const NOT_AVAILABLE = "That landmark isn't available. It may have been removed or the link may be incomplete.";

const STATE_FULL_NAMES: Record<string, string> = {
  AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',
  CO:'Colorado',CT:'Connecticut',DE:'Delaware',FL:'Florida',GA:'Georgia',
  HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',
  KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',MA:'Massachusetts',
  MI:'Michigan',MN:'Minnesota',MS:'Mississippi',MO:'Missouri',MT:'Montana',
  NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',NM:'New Mexico',
  NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',OK:'Oklahoma',
  OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',
  SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',
  VA:'Virginia',WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming',
  DC:'District of Columbia',
};

const normalize = (s: string) => s.toLowerCase().replace(/['-]/g, '');

function App() {
  // The router itself is in main.tsx, so the page below can read and change
  // the address (shareable links, 8 Nov 2026).
  return (
    <Routes>
      <Route path="/" element={<MapPage />}>
        {/* MapPage reads this itself (useMatch) and opens the popup, so the
            map or list stays mounted underneath. */}
        <Route path="landmark/:ref" element={null} />
      </Route>
      <Route path="/admin" element={<AdminRoute />} />
    </Routes>
  );
}

function MapPage() {
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  // The map flies here when the popup of a shared link is closed.
  const [mapFocus, setMapFocus] = useState<Landmark | null>(null);
  const clearMapFocus = useCallback(() => setMapFocus(null), []);
  // Keeps the popup's content during its closing animation, after the
  // address has already moved on.
  const [closingLandmark, setClosingLandmark] = useState<Landmark | null>(null);

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
    const words = normalize(searchQuery.trim()).split(/\s+/).filter(Boolean);
    return landmarks.filter(l => {
      const categoryMatch = selectedCategory === '' || l.category.includes(selectedCategory);
      if (words.length === 0) return categoryMatch;
      const fullStateName = STATE_FULL_NAMES[l.state.toUpperCase()] ?? '';
      const searchFields = [
        normalize(l.name),
        normalize(l.city),
        normalize(l.state),
        normalize(fullStateName),
        normalize(l.description ?? ''),
        normalize(l.address ?? ''),
      ].join(' ');
      return words.every(w => searchFields.includes(w)) && categoryMatch;
    });
  }, [landmarks, searchQuery, selectedCategory]);

  // ---- Shareable links: /landmark/540-name opens that landmark's popup ----
  // Every published landmark is already loaded, so a link needs no extra fetch.
  const navigate = useNavigate();
  const location = useLocation();
  const landmarkMatch = useMatch('/landmark/:ref');
  const isLandmarkRoute = landmarkMatch !== null;
  const linkedId = parseLandmarkRef(landmarkMatch?.params.ref);
  const navState = location.state as { openedInApp?: boolean; linkNotice?: string } | null;
  const openedInApp = navState?.openedInApp === true;
  // A failed link sends the reader to the map with the reason in the history
  // entry, so the notice needs no state of its own.
  const linkNotice = navState?.linkNotice ?? null;
  const shownLandmark = useMemo(
    () => (linkedId === null ? null : landmarks.find(l => l.id === linkedId) ?? null),
    [landmarks, linkedId],
  );

  // Unknown, unpublished or malformed link: once the landmarks have loaded,
  // go to the map with a notice.
  useEffect(() => {
    if (loading || !isLandmarkRoute || shownLandmark) return;
    navigate('/', { replace: true, state: { linkNotice: NOT_AVAILABLE } });
  }, [loading, isLandmarkRoute, shownLandmark, navigate]);

  // Show the current form of the address (the server redirects too; this
  // covers local development, where Vite serves the page).
  useEffect(() => {
    if (!shownLandmark) return;
    const canonical = landmarkPath(shownLandmark);
    if (location.pathname !== canonical) {
      navigate(canonical + location.search, { replace: true, state: location.state });
    }
  }, [shownLandmark, location.pathname, location.search, location.state, navigate]);

  // Tab title names the open landmark, so bookmarks and history are readable.
  useEffect(() => {
    if (!shownLandmark) return;
    document.title = `${shownLandmark.name} | ${SITE_TITLE}`;
    return () => { document.title = SITE_TITLE; };
  }, [shownLandmark]);

  const dismissNotice = useCallback(() => {
    navigate(location.pathname + location.search, { replace: true, state: null });
  }, [navigate, location.pathname, location.search]);

  useEffect(() => {
    if (!linkNotice) return;
    const timer = setTimeout(dismissNotice, 8000);
    return () => clearTimeout(timer);
  }, [linkNotice, dismissNotice]);

  const handleOpenDetail = useCallback((landmark: Landmark) => {
    navigate(landmarkPath(landmark), { state: { openedInApp: true } });
  }, [navigate]);

  const handleClose = useCallback(() => {
    if (shownLandmark) setClosingLandmark(shownLandmark);
    if (openedInApp) {
      // Opened from the map or list: step back to it.
      navigate(-1);
    } else {
      // Arrived by a shared link: there is no map behind it in history. Show
      // the map centred on this landmark rather than the whole country.
      if (shownLandmark) setMapFocus(shownLandmark);
      navigate('/', { replace: true });
    }
  }, [shownLandmark, openedInApp, navigate]);

  // Previous/Next replace the address, so Back returns to the map or list
  // rather than stepping through every landmark viewed.
  const step = useCallback((delta: 1 | -1) => {
    if (!shownLandmark || filteredLandmarks.length === 0) return;
    const index = filteredLandmarks.findIndex(l => l.id === shownLandmark.id);
    const next = filteredLandmarks[(index + delta + filteredLandmarks.length) % filteredLandmarks.length];
    navigate(landmarkPath(next), { replace: true, state: location.state });
  }, [shownLandmark, filteredLandmarks, navigate, location.state]);

  const handleNext = useCallback(() => step(1), [step]);
  const handlePrevious = useCallback(() => step(-1), [step]);

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
            <h2 className="text-xl font-bold tracking-tight mb-1">LHF Labor Landmarks</h2>
            <p className="text-sm text-gray-500 font-medium">Loading historical records...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
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
              <MapView
                landmarks={filteredLandmarks}
                onSelectLandmark={handleOpenDetail}
                focus={mapFocus}
                onFocusDone={clearMapFocus}
              />
            </div>
          )}
        </div>
      </main>

      <DetailModal
        landmark={shownLandmark ?? closingLandmark}
        isOpen={shownLandmark !== null}
        onClose={handleClose}
        onNext={handleNext}
        onPrevious={handlePrevious}
        viewMode={viewMode}
      />

      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />

      {linkNotice && (
        <div
          role="status"
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[10050] w-[calc(100%-2rem)] max-w-md flex items-start gap-3 px-4 py-3 rounded-2xl glass border border-white/10 shadow-2xl text-sm text-white"
        >
          <span className="flex-1">{linkNotice}</span>
          <button onClick={dismissNotice} aria-label="Dismiss" className="text-gray-400 hover:text-white shrink-0">
            <X size={16} />
          </button>
        </div>
      )}

      <footer className="fixed bottom-0 left-0 right-0 glass px-6 py-3 flex items-center justify-center text-[10px] text-gray-500 z-[1500] border-t border-white/5">
        <div className="flex items-center gap-4">
          <a href="https://laborheritage.org" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
            &copy; 2026 The Labor Heritage Foundation
          </a>
          <span>•</span>
          <span>Showing {filteredLandmarks.length} of {landmarks.length} landmarks</span>
        </div>
      </footer>
    </div>
  );
}

function AdminRoute() {
  // Login is always required. (A localhost bypass used to live here; with the
  // API now enforcing auth it rendered the dashboard with no token. Local dev
  // still works: with ADMIN_PASSWORD unset the server accepts any login.)
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => sessionStorage.getItem('isAdminAuthenticated') === 'true' && !!sessionStorage.getItem('adminToken')
  );

  // adminFetch announces a rejected session; drop back to the login screen.
  useEffect(() => {
    const onLogout = () => setIsAuthenticated(false);
    window.addEventListener(ADMIN_LOGOUT_EVENT, onLogout);
    return () => window.removeEventListener(ADMIN_LOGOUT_EVENT, onLogout);
  }, []);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  if (!isAuthenticated) {
    return <AdminLogin onLoginSuccess={handleLoginSuccess} />;
  }

  return <AdminDashboard />;
}

export default App;
