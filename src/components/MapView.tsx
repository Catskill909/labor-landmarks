import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { Landmark } from './LandmarkCard';
import L from 'leaflet';
import { Globe, Minus, Plus } from 'lucide-react';

// Fix for default marker icon in React-Leaflet
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
});

interface MapViewProps {
    landmarks: Landmark[];
    onSelectLandmark: (landmark: Landmark) => void;
}

const MapMarkers: React.FC<MapViewProps> = ({ landmarks, onSelectLandmark }) => {
    const map = useMap();

    React.useEffect(() => {
        if (landmarks.length > 0) {
            const bounds = L.latLngBounds(landmarks.map(l => [l.lat, l.lng]));
            // Small timeout to ensure map container is ready for animation on initial load
            setTimeout(() => {
                map.flyToBounds(bounds, {
                    paddingTopLeft: [20, 50],
                    paddingBottomRight: [20, 20],
                    maxZoom: 14
                });
            }, 100);
        }
    }, [landmarks, map]);

    return (
        <>
            {landmarks.map((landmark) => (
                <Marker
                    key={landmark.id}
                    position={[landmark.lat, landmark.lng]}
                    eventHandlers={{
                        click: () => {
                            map.flyTo([landmark.lat, landmark.lng], Math.max(map.getZoom(), 9));
                        },
                    }}
                >
                    <Popup className="custom-popup">
                        <div
                            className="cursor-pointer group"
                            onClick={() => {
                                onSelectLandmark(landmark);
                                map.closePopup();
                            }}
                        >
                            {landmark.images && landmark.images.length > 0 && (
                                <div className="-mx-[20px] -mt-[20px] mb-1.5 overflow-hidden">
                                    <img
                                        src={`/uploads/landmarks/thumb_${landmark.images[0].filename}`}
                                        alt={landmark.name}
                                        className="w-full h-36 object-cover"
                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                    />
                                </div>
                            )}
                            <div className="px-1">
                                <h3 className="font-bold text-sm leading-tight group-hover:text-red-500 transition-colors uppercase tracking-tight pr-8">{landmark.name}</h3>
                                <p className="text-xs text-gray-400 leading-tight">{landmark.city}, {landmark.state}</p>
                                <span className="text-[10px] text-red-500 font-bold group-hover:underline">
                                    VIEW DETAILS
                                </span>
                            </div>
                        </div>
                    </Popup>
                </Marker>
            ))}
        </>
    );
};

/* Map controls: zoom in, zoom out, and "show all landmarks".
   Replaces Leaflet's default +/- and the old circular-arrow reset button, which
   members read as "refresh page". The globe lights up once the view no longer
   shows every landmark, so it draws the eye exactly when someone is lost. */
const fitAll = (map: L.Map, landmarks: Landmark[]) => {
    if (landmarks.length === 0) return;
    map.flyToBounds(L.latLngBounds(landmarks.map(l => [l.lat, l.lng])), {
        paddingTopLeft: [20, 50],
        paddingBottomRight: [20, 20],
        maxZoom: 14
    });
};

const MapControls: React.FC<{ landmarks: Landmark[] }> = ({ landmarks }) => {
    const map = useMap();
    const ref = React.useRef<HTMLDivElement>(null);
    const [isAway, setIsAway] = React.useState(false);
    const [flashLabel, setFlashLabel] = React.useState<string | null>(null);
    const flashTimer = React.useRef<number | undefined>(undefined);

    // Clicks, double-clicks and scrolls on the controls must not reach the map.
    React.useEffect(() => {
        if (!ref.current) return;
        L.DomEvent.disableClickPropagation(ref.current);
        L.DomEvent.disableScrollPropagation(ref.current);
    }, []);

    React.useEffect(() => {
        const check = () => {
            if (landmarks.length === 0) return setIsAway(false);
            const all = L.latLngBounds(landmarks.map(l => [l.lat, l.lng]));
            setIsAway(!map.getBounds().pad(0.05).contains(all));
        };
        // moveend fires once a pan, zoom or fly animation finishes, so this doesn't flicker mid-flight.
        map.on('moveend zoomend', check);
        check();
        return () => { map.off('moveend zoomend', check); };
    }, [map, landmarks]);

    React.useEffect(() => () => window.clearTimeout(flashTimer.current), []);

    // Touch screens have no hover, so show the label briefly after a tap instead.
    const flash = (e: React.PointerEvent, label: string) => {
        if (e.pointerType !== 'touch') return;
        window.clearTimeout(flashTimer.current);
        setFlashLabel(label);
        flashTimer.current = window.setTimeout(() => setFlashLabel(null), 1500);
    };

    const buttons = [
        { label: 'Zoom in', icon: <Plus size={18} />, onClick: () => map.zoomIn(), highlight: false },
        { label: 'Zoom out', icon: <Minus size={18} />, onClick: () => map.zoomOut(), highlight: false },
        { label: 'Show all landmarks', icon: <Globe size={18} />, onClick: () => fitAll(map, landmarks), highlight: isAway },
    ];

    return (
        <div ref={ref} className="absolute top-3 left-3 z-[1000] flex flex-col rounded-xl overflow-visible border border-white/10 bg-zinc-900/90 backdrop-blur shadow-lg">
            {buttons.map((b, i) => (
                <div key={b.label} className="relative group">
                    <button
                        type="button"
                        aria-label={b.label}
                        onClick={b.onClick}
                        onPointerDown={e => flash(e, b.label)}
                        className={`peer w-10 h-10 flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60
                            ${i > 0 ? 'border-t border-white/10' : ''}
                            ${i === 0 ? 'rounded-t-xl' : ''} ${i === buttons.length - 1 ? 'rounded-b-xl' : ''}
                            ${b.highlight
                                ? 'bg-red-600 text-white hover:bg-red-700'
                                : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}
                    >
                        {b.icon}
                    </button>
                    <span
                        role="tooltip"
                        className={`pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 whitespace-nowrap rounded-md bg-zinc-900 border border-white/10 px-2 py-1 text-xs text-white shadow-lg transition-opacity
                            ${flashLabel === b.label ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 peer-focus-visible:opacity-100'}`}
                    >
                        {b.label}
                    </span>
                </div>
            ))}
        </div>
    );
};

const MapView: React.FC<MapViewProps> = ({ landmarks, onSelectLandmark }) => {
    const center: [number, number] = [39.8283, -98.5795]; // Geographical center of USA

    return (
        <div className="h-full w-full overflow-hidden rounded-2xl border border-white/5 shadow-2xl relative">
            <MapContainer
                center={center}
                zoom={4}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={true}
                attributionControl={false}
                zoomSnap={0.25}
                zoomControl={false}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapMarkers landmarks={landmarks} onSelectLandmark={onSelectLandmark} />
                <MapControls landmarks={landmarks} />
            </MapContainer>
        </div>
    );
};

export default MapView;
