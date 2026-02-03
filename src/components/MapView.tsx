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
                            className="p-1 cursor-pointer group"
                            onClick={() => {
                                onSelectLandmark(landmark);
                                map.closePopup();
                            }}
                        >
                            <h3 className="font-bold text-sm mb-1 group-hover:text-red-500 transition-colors uppercase tracking-tight pr-8">{landmark.name}</h3>
                            <p className="text-xs text-gray-400 mb-2">{landmark.city}, {landmark.state}</p>
                            <span className="text-[10px] text-red-500 font-bold group-hover:underline">
                                VIEW DETAILS
                            </span>
                        </div>
                    </Popup>
                </Marker>
            ))}
        </>
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
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapMarkers landmarks={landmarks} onSelectLandmark={onSelectLandmark} />
            </MapContainer>
        </div>
    );
};

export default MapView;
