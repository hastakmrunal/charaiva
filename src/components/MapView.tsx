import React, { useEffect, useRef, useState } from 'react';
import { LocationCoords, RecognitionResult } from '../types';
import { DeviceExactLocation } from '../utils/geolocation';
import { PlaceCardImage } from './PlaceCardImage';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Compass, Volume2, ArrowLeft, ArrowRight, MapPin, RefreshCw } from 'lucide-react';

interface MapViewProps {
  locationCoords: LocationCoords | null;
  deviceExactLocation?: DeviceExactLocation | null;
  isManualLocationMode?: boolean;
  onSelectLandmarkToScan: (landmark: RecognitionResult) => void;
  onBackToHome?: () => void;
}

interface MapSpot {
  id: string;
  name: string;
  category: string;
  oneLineImportance: string;
  description: string;
  estimatedDistanceKm: number;
  walkOrDriveTime: string;
  imageUrl: string;
  latitude: number;
  longitude: number;
  placeId?: string;
  hasRealPhoto?: boolean;
  photoUnavailable?: boolean;
  authorAttributions?: Array<{
    displayName: string;
    uri?: string;
    photoUri?: string;
  }>;
  photos?: Array<{
    name: string;
    url: string;
    authorAttributions?: Array<{
      displayName: string;
      uri?: string;
      photoUri?: string;
    }>;
  }>;
}

export const MapView: React.FC<MapViewProps> = ({
  locationCoords,
  deviceExactLocation,
  isManualLocationMode = false,
  onSelectLandmarkToScan,
  onBackToHome,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const [spots, setSpots] = useState<MapSpot[]>([]);
  const [selectedSpot, setSelectedSpot] = useState<MapSpot | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const lat = deviceExactLocation?.latitude || locationCoords?.latitude || 21.1458;
  const lng = deviceExactLocation?.longitude || locationCoords?.longitude || 79.0882;
  const locationName = deviceExactLocation?.locationName || locationCoords?.city || (isManualLocationMode ? 'Selected City' : 'Nagpur, Maharashtra, India');
  const city = deviceExactLocation?.city || locationCoords?.city || 'Nagpur';

  // Fetch real spots around current GPS
  useEffect(() => {
    let isMounted = true;
    async function fetchSpots() {
      setIsLoading(true);
      try {
        const res = await fetch('/api/discover-nearby-spots', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            latitude: lat,
            longitude: lng,
            locationName,
            city,
            country: deviceExactLocation?.country || locationCoords?.country || 'India',
            language: 'English',
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.success && data.spots) {
            // Preserve authentic backend coordinates when available; only fall back to radial offsets if missing
            const mappedSpots: MapSpot[] = data.spots.map((s: any, idx: number) => {
              const hasRealCoords =
                typeof s.latitude === 'number' &&
                typeof s.longitude === 'number' &&
                Number.isFinite(s.latitude) &&
                Number.isFinite(s.longitude) &&
                (s.latitude !== 0 || s.longitude !== 0);
              if (hasRealCoords) {
                return { ...s };
              }
              const angle = (idx / Math.max(1, data.spots.length)) * 2 * Math.PI;
              const distDeg = (s.estimatedDistanceKm || (idx + 1) * 0.4) * 0.009;
              return {
                ...s,
                latitude: lat + Math.sin(angle) * distDeg,
                longitude: lng + Math.cos(angle) * distDeg,
              };
            });

            setSpots(mappedSpots);
            if (mappedSpots.length > 0) {
              setSelectedSpot(mappedSpots[0]);
            }
          }
        }
      } catch (err) {
        console.warn('Failed to load map spots:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchSpots();

    return () => {
      isMounted = false;
    };
  }, [lat, lng, locationName]);

  // Initialize and update Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [lat, lng],
        zoom: 14,
        zoomControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      // User Current Location Pin (Pulsing blue/emerald marker)
      const userPin = L.divIcon({
        className: 'user-gps-pin',
        html: `<div style="background:#10b981; color:#ffffff; width:22px; height:22px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold; border:3px solid #ffffff; box-shadow:0 0 12px #10b981;">📍</div>`,
        iconSize: [22, 22],
      });
      L.marker([lat, lng], { icon: userPin }).addTo(map).bindPopup(`<b>Your Device Location</b><br/>${locationName}`);

      const markersGroup = L.layerGroup().addTo(map);
      markersLayerRef.current = markersGroup;
      mapInstanceRef.current = map;
    } else {
      mapInstanceRef.current.setView([lat, lng], 14);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [lat, lng]);

  // Update spots markers
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    spots.forEach((spot) => {
      const isSelected = selectedSpot?.id === spot.id;
      const spotIcon = L.divIcon({
        className: 'custom-spot-pin',
        html: `<div style="background:${isSelected ? '#2a9d8f' : '#334155'}; color:#ffffff; width:${isSelected ? '32px' : '26px'}; height:${isSelected ? '32px' : '26px'}; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold; border:2px solid #ffffff; box-shadow:0 2px 8px rgba(0,0,0,0.45); cursor:pointer; font-size:12px; transition:all 0.2s;">🏛️</div>`,
        iconSize: isSelected ? [32, 32] : [26, 26],
      });

      const marker = L.marker([spot.latitude, spot.longitude], { icon: spotIcon });
      marker.on('click', () => {
        setSelectedSpot(spot);
      });
      markersLayerRef.current?.addLayer(marker);
    });
  }, [spots, selectedSpot]);

  const handleTriggerTour = () => {
    if (!selectedSpot) return;
    const result: RecognitionResult = {
      id: selectedSpot.id,
      title: selectedSpot.name,
      category: selectedSpot.category as any,
      confidence: 0.98,
      locationName: `${selectedSpot.name}, ${locationName}`,
      summary: selectedSpot.oneLineImportance,
      narration: `${selectedSpot.name} located in ${locationName}. ${selectedSpot.oneLineImportance} ${selectedSpot.description}`,
      keyFacts: [selectedSpot.oneLineImportance, `Distance: ~${selectedSpot.estimatedDistanceKm} km (${selectedSpot.walkOrDriveTime})`],
      tags: [selectedSpot.category, 'Nearby Spot', 'Current GPS Area'],
      imageUrl: selectedSpot.imageUrl,
      language: 'English',
    };
    onSelectLandmarkToScan(result);
  };

  return (
    <div id="map-view-screen" className="h-full flex flex-col overflow-hidden py-1 space-y-2 select-none">
      {/* Top Header */}
      <div
        style={{
          backgroundColor: 'var(--theme-card-bg)',
          borderColor: 'var(--theme-card-border)',
        }}
        className="shrink-0 flex items-center justify-between p-2.5 border rounded-2xl backdrop-blur-xl shadow-lg"
      >
        <div className="flex items-center gap-2">
          {onBackToHome && (
            <button
              id="btn-map-back-home"
              type="button"
              onClick={onBackToHome}
              style={{
                backgroundColor: 'var(--theme-card-bg-subtle)',
                borderColor: 'var(--theme-card-border)',
                color: 'var(--theme-text-title)',
              }}
              className="p-2 rounded-xl border cursor-pointer hover:border-[var(--theme-card-border-glow)] transition-all active:scale-95 shrink-0"
              title="Back to Home"
              aria-label="Back to Home"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <h3 className="text-xs sm:text-sm font-serif font-bold text-[var(--theme-text-title)] flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-[var(--theme-accent-primary)]" />
              <span>Interactive Sightseeing Map</span>
            </h3>
            <p className="text-[11px] text-[var(--theme-accent-secondary)]">
              {isManualLocationMode ? `Discovered attractions in ${locationName}` : `Real spots discovered around your GPS in ${locationName}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-[10px] theme-badge-teal font-bold shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--theme-accent-primary)] animate-ping" />
          <span>{isManualLocationMode ? 'Destination Active' : 'GPS Active'}</span>
        </div>
      </div>

      {/* Leaflet Map Canvas */}
      <div
        style={{ borderColor: 'var(--theme-card-border)' }}
        className="relative flex-1 min-h-0 rounded-2xl overflow-hidden border shadow-xl bg-black"
      >
        <div ref={mapContainerRef} className="w-full h-full z-10" />

        {/* Legend Overlay */}
        <div
          style={{
            backgroundColor: 'var(--theme-card-bg)',
            borderColor: 'var(--theme-card-border)',
          }}
          className="absolute top-2 right-2 z-20 backdrop-blur-md px-2.5 py-1.5 rounded-xl border text-[10px] text-[var(--theme-text-title)] shadow-lg space-y-1"
        >
          <div className="flex items-center gap-1.5 font-bold text-[var(--theme-accent-primary)]">
            <span className="w-2 h-2 rounded-full bg-[var(--theme-accent-primary)]" />
            <span>{isManualLocationMode ? 'Selected Destination' : 'Your GPS Location'}</span>
          </div>
          <div className="flex items-center gap-1.5 font-bold text-[var(--theme-accent-secondary)]">
            <span className="w-2 h-2 rounded-full bg-[var(--theme-accent-secondary)]" />
            <span>Local Spots ({spots.length})</span>
          </div>
        </div>
      </div>

      {/* Selected Landmark Details Card */}
      {selectedSpot && (
        <div
          style={{
            backgroundColor: 'var(--theme-card-bg)',
            borderColor: 'var(--theme-card-border)',
          }}
          className="shrink-0 p-3 rounded-2xl border backdrop-blur-xl flex items-center justify-between gap-3 shadow-lg"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <PlaceCardImage
              placeName={selectedSpot.name}
              placeId={selectedSpot.placeId}
              initialImageUrl={selectedSpot.imageUrl}
              authorAttributions={selectedSpot.authorAttributions}
              photos={selectedSpot.photos}
              category={selectedSpot.category}
              cityName={city}
              size="sm"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-bold text-[var(--theme-accent-primary)] uppercase tracking-wider">
                  {selectedSpot.category}
                </span>
                <span className="text-[10px] text-[var(--theme-accent-secondary)] font-bold">
                  • ~{selectedSpot.estimatedDistanceKm} km
                </span>
              </div>
              <h4 className="text-xs sm:text-sm font-serif font-bold text-[var(--theme-text-title)] truncate">
                {selectedSpot.name}
              </h4>
              <p className="text-[11px] text-[var(--theme-text-muted)] truncate">
                {selectedSpot.oneLineImportance}
              </p>
            </div>
          </div>

          <button
            id="btn-map-start-tour"
            onClick={handleTriggerTour}
            className="shrink-0 py-2 px-3 rounded-xl theme-btn-primary font-bold text-xs shadow-md active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
          >
            <span>Audio Tour</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
