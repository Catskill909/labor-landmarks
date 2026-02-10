import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { Landmark } from './LandmarkCard';
import L from 'leaflet';

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

const ResetViewControl: React.FC<{ landmarks: Landmark[] }> = ({ landmarks }) => {
    const map = useMap();

    React.useEffect(() => {
        const control = new L.Control({ position: 'topleft' });

        control.onAdd = () => {
            const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
            const button = L.DomUtil.create('a', '', div);
            button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/><path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/></svg>';
            button.href = '#';
            button.title = 'Reset View';
            button.style.width = '30px';
            button.style.height = '30px';
            button.style.display = 'flex';
            button.style.alignItems = 'center';
            button.style.justifyContent = 'center';
            button.style.backgroundColor = 'white';
            button.style.color = '#333';
            button.style.cursor = 'pointer';

            L.DomEvent.disableClickPropagation(div);

            button.onclick = (e) => {
                e.preventDefault();
                if (landmarks.length > 0) {
                    const bounds = L.latLngBounds(landmarks.map(l => [l.lat, l.lng]));
                    map.flyToBounds(bounds, {
                        paddingTopLeft: [20, 50],
                        paddingBottomRight: [20, 20],
                        maxZoom: 14
                    });
                }
            };

            return div;
        };

        control.addTo(map);

        return () => {
            control.remove();
        };
    }, [map, landmarks]);

    return null;
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
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapMarkers landmarks={landmarks} onSelectLandmark={onSelectLandmark} />
                <ResetViewControl landmarks={landmarks} />
            </MapContainer>
        </div>
    );
};

export default MapView;
