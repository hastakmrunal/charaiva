import React, { useState, useEffect, useMemo } from 'react';
import { LocationCoords, Language, GuideOutputMode, GuideSettings } from '../types';
import { speechManager } from '../utils/speech';
import { DeviceExactLocation, getDeviceExactLocation, openNativeMapsNavigation } from '../utils/geolocation';
import { DeepDiveModal } from './DeepDiveModal';
import { PlaceCardImage } from './PlaceCardImage';
import { WordByWordText } from './WordByWordText';
import { VERIFIED_GROUND_TRUTH_POIS } from '../data/verifiedGroundTruthIndex';
import {
  Compass,
  MapPin,
  ArrowLeft,
  Sparkles,
  Volume2,
  Pause,
  Play,
  Navigation as NavIcon,
  Search,
  ChevronRight,
  Landmark,
  ShieldCheck,
  Clock,
  Star,
  Camera,
  MessageSquare,
  Globe,
  Info,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  X,
  BookOpen,
  Utensils,
  Building,
  Trees,
  Footprints,
  ShoppingBag,
  Gem,
  Filter,
  ArrowUpDown
} from 'lucide-react';

export interface NearbyDiscoveredSpot {
  id: string;
  name: string;
  category: string;
  oneLineImportance: string;
  description: string;
  estimatedDistanceKm: number;
  walkOrDriveTime: string;
  bestTimeToVisit?: string;
  addressOrLocality?: string;
  keyHighlights: string[];
  imageUrl: string;
  rating?: number;
  reviewCount?: number;
  googleMapsUri?: string;
  latitude?: number;
  longitude?: number;
  source?: string;
  types?: string[];
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

interface NearbyAttractionsScreenProps {
  locationCoords: LocationCoords | null;
  deviceExactLocation?: DeviceExactLocation | null;
  isManualLocationMode?: boolean;
  onRefreshDeviceLocation?: () => Promise<void>;
  selectedLanguage: Language;
  onSelectAttractionForGuide: (attraction: any) => void;
  onOpenChatWithQuestion: (question: string) => void;
  onNavigateToPhotoGuide: () => void;
  onOpenCityGuide?: (cityName: string) => void;
  onBackToHome?: () => void;
  guideSettings?: GuideSettings;
  outputMode: GuideOutputMode;
}

function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function buildInitialGroundTruthSpots(lat: number, lng: number, cityName: string): NearbyDiscoveredSpot[] {
  const cityLower = (cityName || '').toLowerCase();
  const sorted = [...VERIFIED_GROUND_TRUTH_POIS]
    .map((poi) => {
      const dist = haversineDistanceKm(lat, lng, poi.lat, poi.lng);
      const isCityMatch = poi.city.toLowerCase().includes(cityLower) || cityLower.includes(poi.city.toLowerCase());
      return { poi, dist, isCityMatch };
    })
    .sort((a, b) => {
      if (a.isCityMatch && !b.isCityMatch) return -1;
      if (!a.isCityMatch && b.isCityMatch) return 1;
      return a.dist - b.dist;
    })
    .slice(0, 16);

  return sorted.map(({ poi, dist }) => {
    const roundedDist = Math.round(dist * 10) / 10;
    const walkMin = Math.max(3, Math.round(dist * 12));
    const driveMin = Math.max(2, Math.round(dist * 2.5));
    const walkOrDriveTime = dist <= 1.5 ? `${walkMin} min walk` : `${driveMin} min drive`;

    return {
      id: `gt_${poi.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      name: poi.name,
      category: poi.category,
      oneLineImportance: poi.oneLineSignificance,
      description: poi.oneLineSignificance,
      estimatedDistanceKm: roundedDist,
      walkOrDriveTime,
      bestTimeToVisit: 'Morning or Evening',
      addressOrLocality: `${poi.locality}, ${poi.city}`,
      keyHighlights: poi.highlights,
      imageUrl: poi.imageUrl,
      rating: poi.rating,
      reviewCount: poi.reviewCount,
      googleMapsUri: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(poi.name + ' ' + poi.city)}`,
      latitude: poi.lat,
      longitude: poi.lng,
      source: 'verified_spatial_radar',
      hasRealPhoto: true,
    };
  });
}

export const NearbyAttractionsScreen: React.FC<NearbyAttractionsScreenProps> = ({
  locationCoords,
  deviceExactLocation,
  isManualLocationMode = false,
  onRefreshDeviceLocation,
  selectedLanguage,
  onSelectAttractionForGuide,
  onOpenChatWithQuestion,
  onNavigateToPhotoGuide,
  onOpenCityGuide,
  onBackToHome,
  guideSettings,
  outputMode,
}) => {
  const [currentCoords, setCurrentCoords] = useState<{
    latitude: number;
    longitude: number;
    locationName: string;
    cityName: string;
    country: string;
  }>(() => {
    if (deviceExactLocation) {
      return {
        latitude: deviceExactLocation.latitude,
        longitude: deviceExactLocation.longitude,
        locationName: deviceExactLocation.locationName,
        cityName: deviceExactLocation.city,
        country: deviceExactLocation.country || 'India',
      };
    }
    if (locationCoords?.latitude && locationCoords?.longitude) {
      return {
        latitude: locationCoords.latitude,
        longitude: locationCoords.longitude,
        locationName: `${locationCoords.city || 'Nagpur'}, ${locationCoords.country || 'India'}`,
        cityName: locationCoords.city || 'Nagpur',
        country: locationCoords.country || 'India',
      };
    }
    return {
      latitude: 21.1458,
      longitude: 79.0882,
      locationName: 'Nagpur, Maharashtra, India',
      cityName: 'Nagpur',
      country: 'India',
    };
  });

  const [isLocatingGps, setIsLocatingGps] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [maxDistanceFilter, setMaxDistanceFilter] = useState<number>(0); // 0 = all, 0.5, 1, 2, 5, 10
  const [sortBy, setSortBy] = useState<'nearest' | 'relevant' | 'rating'>('nearest');

  // Real Spots fetched from Google Places / Spatial Ground Truth + Gemini narration
  // Pre-seed instantly with verified ground truth so side-by-side cards render at 0ms
  const [spots, setSpots] = useState<NearbyDiscoveredSpot[]>(() =>
    buildInitialGroundTruthSpots(currentCoords.latitude, currentCoords.longitude, currentCoords.cityName)
  );
  const [areaOverview, setAreaOverview] = useState<string>('');
  const [isLoadingSpots, setIsLoadingSpots] = useState<boolean>(false);
  const [isSyncingLive, setIsSyncingLive] = useState<boolean>(true);

  // Audio Playback state
  const [activePlayingId, setActivePlayingId] = useState<string | null>(null);

  // Modal states
  const [selectedDetailSpot, setSelectedDetailSpot] = useState<NearbyDiscoveredSpot | null>(null);
  const [deepDiveSpot, setDeepDiveSpot] = useState<NearbyDiscoveredSpot | null>(null);

  // Sync with deviceExactLocation prop
  useEffect(() => {
    if (deviceExactLocation) {
      setCurrentCoords({
        latitude: deviceExactLocation.latitude,
        longitude: deviceExactLocation.longitude,
        locationName: deviceExactLocation.locationName,
        cityName: deviceExactLocation.city,
        country: deviceExactLocation.country || 'India',
      });
    }
  }, [deviceExactLocation]);

  // Fetch Spots specifically near current GPS coordinates using Google Places + OSM + Ground Truth
  useEffect(() => {
    let isMounted = true;
    async function fetchSpots() {
      setIsSyncingLive(true);
      try {
        const res = await fetch('/api/discover-nearby-spots', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            latitude: currentCoords.latitude,
            longitude: currentCoords.longitude,
            locationName: currentCoords.locationName,
            city: currentCoords.cityName,
            country: currentCoords.country,
            language: selectedLanguage.name,
            category: selectedCategory,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.success && data.spots && data.spots.length > 0) {
            setSpots(data.spots);
            if (data.areaOverview) setAreaOverview(data.areaOverview);
          }
        }
      } catch (err) {
        console.warn('Failed to load real spots:', err);
      } finally {
        if (isMounted) {
          setIsLoadingSpots(false);
          setIsSyncingLive(false);
        }
      }
    }

    fetchSpots();

    return () => {
      isMounted = false;
      speechManager.stop();
      setActivePlayingId(null);
    };
  }, [
    currentCoords.latitude,
    currentCoords.longitude,
    currentCoords.locationName,
    selectedLanguage.name,
  ]);

  const handleRequestExactLocation = async () => {
    setIsLocatingGps(true);
    try {
      if (onRefreshDeviceLocation) {
        await onRefreshDeviceLocation();
      } else {
        const loc = await getDeviceExactLocation();
        setCurrentCoords({
          latitude: loc.latitude,
          longitude: loc.longitude,
          locationName: loc.locationName,
          cityName: loc.city,
          country: loc.country || 'India',
        });
      }
    } catch (e) {
      console.warn('Error refreshing location:', e);
    } finally {
      setIsLocatingGps(false);
    }
  };

  // Audio Playback
  const handleTogglePlayAudio = (spot: NearbyDiscoveredSpot) => {
    if (activePlayingId === spot.id) {
      speechManager.stop();
      setActivePlayingId(null);
      return;
    }

    speechManager.stop();
    const narrationText = `${spot.name}, located ${spot.estimatedDistanceKm} kilometers away in ${spot.addressOrLocality || currentCoords.cityName}. ${spot.oneLineImportance} ${spot.description}`;

    speechManager.speak({
      text: narrationText,
      language: selectedLanguage.name,
      languageCode: selectedLanguage.speechCode,
      rate: guideSettings?.speechRate || 1.0,
      pitch: guideSettings?.voicePitch || (guideSettings?.voiceGender === 'male' ? 0.95 : 1.08),
      gender: guideSettings?.voiceGender || 'female',
      onStart: () => setActivePlayingId(spot.id),
      onEnd: () => setActivePlayingId(null),
      onError: () => setActivePlayingId(null),
    });
  };

  // Open in Google Maps / Native Maps Navigation (zero-cost open URL & mobile intent)
  const handleOpenGoogleMaps = (spot: NearbyDiscoveredSpot) => {
    openNativeMapsNavigation({
      placeName: spot.name,
      localityOrCity: spot.addressOrLocality || currentCoords.cityName,
      latitude: spot.latitude,
      longitude: spot.longitude,
      googleMapsUri: spot.googleMapsUri,
    });
  };

  // Category filter definitions requested by user
  const categories = [
    { id: 'all', label: 'All', icon: Compass },
    { id: 'history', label: 'History', icon: Building },
    { id: 'culture', label: 'Culture', icon: Landmark },
    { id: 'spiritual', label: 'Spiritual', icon: ShieldCheck },
    { id: 'food', label: 'Food', icon: Utensils },
    { id: 'nature', label: 'Nature', icon: Trees },
    { id: 'shopping', label: 'Shopping', icon: ShoppingBag },
    { id: 'hiddengems', label: 'Hidden Gems', icon: Gem },
  ];

  // Filter & Sort spots
  const filteredSpots = useMemo(() => {
    let result = spots.filter((spot) => {
      const matchesSearch =
        searchQuery === '' ||
        spot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        spot.oneLineImportance.toLowerCase().includes(searchQuery.toLowerCase()) ||
        spot.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (spot.addressOrLocality && spot.addressOrLocality.toLowerCase().includes(searchQuery.toLowerCase()));

      let matchesCat = selectedCategory === 'all';
      if (!matchesCat) {
        const spotCat = (spot.category || '').toLowerCase();
        const spotName = (spot.name || '').toLowerCase();
        const spotTypes = ((spot.types || []).join(' ')).toLowerCase();

        if (selectedCategory === 'spiritual' || selectedCategory === 'temple' || selectedCategory === 'temples') {
          matchesCat =
            spotCat === 'spiritual' ||
            spotCat === 'temple' ||
            spotCat === 'shrine' ||
            spotCat === 'place_of_worship' ||
            spotCat === 'hindu_temple' ||
            spotCat.includes('temple') ||
            spotCat.includes('spiritual') ||
            spotName.includes('temple') ||
            spotName.includes('mandir') ||
            spotName.includes('tekdi') ||
            spotName.includes('ganesh') ||
            spotName.includes('ganpati') ||
            spotName.includes('stupa') ||
            spotName.includes('deekshabhoomi') ||
            spotName.includes('church') ||
            spotName.includes('mosque') ||
            spotName.includes('dargah') ||
            spotName.includes('gurudwara') ||
            spotName.includes('kovil') ||
            spotTypes.includes('hindu_temple') ||
            spotTypes.includes('place_of_worship') ||
            spotTypes.includes('temple') ||
            spotTypes.includes('shrine');
        } else if (selectedCategory === 'history') {
          matchesCat =
            spotCat === 'history' ||
            spotCat === 'monument' ||
            spotCat === 'historical' ||
            spotCat === 'fort' ||
            spotName.includes('fort') ||
            spotName.includes('memorial') ||
            spotName.includes('zero mile') ||
            spotTypes.includes('historical_place') ||
            spotTypes.includes('fortress') ||
            spotTypes.includes('monument');
        } else if (selectedCategory === 'culture') {
          matchesCat =
            spotCat === 'culture' ||
            spotCat === 'museum' ||
            spotName.includes('museum') ||
            spotName.includes('science') ||
            spotTypes.includes('museum') ||
            spotTypes.includes('cultural_center');
        } else if (selectedCategory === 'nature') {
          matchesCat =
            spotCat === 'nature' ||
            spotCat === 'lake' ||
            spotCat === 'viewpoint' ||
            spotCat === 'park' ||
            spotName.includes('lake') ||
            spotName.includes('garden') ||
            spotName.includes('hills') ||
            spotName.includes('park') ||
            spotTypes.includes('park') ||
            spotTypes.includes('natural_feature') ||
            spotTypes.includes('lake');
        } else if (selectedCategory === 'food') {
          matchesCat =
            spotCat === 'food' ||
            spotCat === 'restaurant' ||
            spotCat === 'cafe' ||
            spotCat === 'bakery' ||
            spotName.includes('food') ||
            spotName.includes('bakery') ||
            spotName.includes('cafe') ||
            spotName.includes('poha') ||
            spotName.includes('saoji') ||
            spotName.includes('haldiram') ||
            spotName.includes('khau gali') ||
            spotName.includes('sweets') ||
            spotName.includes('dining') ||
            spotName.includes('dhaba') ||
            spotName.includes('biryani') ||
            spotName.includes('bhavan') ||
            spotName.includes('kitchen') ||
            spotTypes.includes('restaurant') ||
            spotTypes.includes('cafe') ||
            spotTypes.includes('bakery') ||
            spotTypes.includes('food') ||
            spotTypes.includes('fast_food') ||
            spotTypes.includes('meal_takeaway');
        } else if (selectedCategory === 'shopping') {
          matchesCat =
            spotCat === 'shopping' ||
            spotCat === 'bazaar' ||
            spotCat === 'market' ||
            spotCat.includes('shopping') ||
            spotCat.includes('market') ||
            spotCat.includes('bazaar') ||
            spotCat.includes('mall') ||
            spotName.includes('market') ||
            spotName.includes('bazaar') ||
            spotName.includes('mall') ||
            spotName.includes('sarafa') ||
            spotName.includes('handloom') ||
            spotName.includes('textile') ||
            spotName.includes('emporium') ||
            spotTypes.includes('market') ||
            spotTypes.includes('marketplace') ||
            spotTypes.includes('shopping_mall') ||
            spotTypes.includes('store') ||
            spotTypes.includes('shop');
        } else if (selectedCategory === 'hiddengems') {
          matchesCat =
            spotCat === 'hiddengems' ||
            spotCat.includes('gem') ||
            spotCat.includes('hidden') ||
            spotCat.includes('secret') ||
            spotName.includes('stepwell') ||
            spotName.includes('baoli') ||
            spotName.includes('pillar') ||
            spotName.includes('viewpoint') ||
            spotName.includes('mystery') ||
            spotName.includes('secret') ||
            spotName.includes('hidden') ||
            spotName.includes('cave');
        } else {
          matchesCat = spotCat.includes(selectedCategory.toLowerCase()) || spotName.includes(selectedCategory.toLowerCase());
        }
      }

      const matchesDist =
        maxDistanceFilter === 0 || spot.estimatedDistanceKm <= maxDistanceFilter;

      return matchesSearch && matchesCat && matchesDist;
    });

    // Apply Sorting
    if (sortBy === 'nearest') {
      result.sort((a, b) => a.estimatedDistanceKm - b.estimatedDistanceKm);
    } else if (sortBy === 'rating') {
      result.sort((a, b) => (b.rating || 4.5) - (a.rating || 4.5));
    } else if (sortBy === 'relevant') {
      // Relevance combines review count and proximity
      result.sort((a, b) => (b.reviewCount || 100) - (a.reviewCount || 100));
    }

    return result;
  }, [spots, searchQuery, selectedCategory, maxDistanceFilter, sortBy]);

  return (
    <div id="nearby-attractions-screen" className="h-full flex flex-col overflow-hidden py-1 space-y-2 select-none">
      {/* Location Banner */}
      <div
        style={{
          backgroundColor: 'var(--theme-card-bg)',
          borderColor: 'var(--theme-card-border)',
        }}
        className="shrink-0 p-3 rounded-2xl border shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 backdrop-blur-xl"
      >
        <div className="min-w-0 flex-1 flex items-start gap-2.5">
          {onBackToHome && (
            <button
              id="btn-nearby-back-home"
              type="button"
              onClick={onBackToHome}
              style={{
                backgroundColor: 'var(--theme-card-bg-subtle)',
                borderColor: 'var(--theme-card-border)',
                color: 'var(--theme-text-title)',
              }}
              className="p-2 rounded-xl border cursor-pointer hover:border-[var(--theme-card-border-glow)] transition-all active:scale-95 shrink-0 mt-0.5"
              title="Back to Home"
              aria-label="Back to Home"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xs sm:text-sm font-serif font-bold text-[var(--theme-text-title)] truncate">
                {currentCoords.locationName}
              </h2>

              {onOpenCityGuide && (
                <button
                  id="btn-nearby-explore-city"
                  onClick={() => onOpenCityGuide(currentCoords.cityName)}
                  className="px-2.5 py-0.5 rounded-full theme-badge-gold text-[10.5px] font-bold flex items-center gap-1 cursor-pointer active:scale-95 transition-all shadow-sm"
                  title={`Explore brief and in-depth guide for ${currentCoords.cityName}`}
                >
                  <Sparkles className="w-3 h-3 text-[var(--theme-accent-primary)]" />
                  <span>Explore City</span>
                </button>
              )}
            </div>
            <p className="text-[11px] text-[var(--theme-text-muted)] line-clamp-1 mt-0.5">
              {areaOverview || `Discovered ${spots.length} verified attractions, temples, and local spots in ${currentCoords.cityName}.`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!isManualLocationMode && (
            <button
              onClick={handleRequestExactLocation}
              disabled={isLocatingGps}
              style={{
                backgroundColor: 'var(--theme-card-bg-subtle)',
                color: 'var(--theme-accent-primary)',
                borderColor: 'var(--theme-card-border)',
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border cursor-pointer active:scale-95 transition-all shadow-sm hover:border-[var(--theme-card-border-glow)]"
              title="Refresh device live GPS location"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[var(--theme-accent-primary)] ${isLocatingGps ? 'animate-spin' : ''}`} />
              <span>{isLocatingGps ? 'Locating...' : 'Refresh GPS'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Explore Nearby Filter Controls */}
      <div className="shrink-0 space-y-2">
        {/* Search Input and Sort Selector */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-[var(--theme-accent-primary)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search real places in ${currentCoords.cityName}...`}
              style={{
                backgroundColor: 'var(--theme-input-bg)',
                borderColor: 'var(--theme-input-border)',
                color: 'var(--theme-text-title)',
              }}
              className="w-full pl-9 pr-3 py-2 rounded-xl border placeholder-[var(--theme-text-muted)] text-xs sm:text-sm focus:outline-none focus:border-[var(--theme-card-border-glow)] backdrop-blur-md transition-colors"
            />
          </div>

          {/* Sort Menu */}
          <div
            style={{
              backgroundColor: 'var(--theme-card-bg)',
              borderColor: 'var(--theme-card-border)',
            }}
            className="shrink-0 flex items-center gap-1 px-2 py-1.5 rounded-xl border text-xs backdrop-blur-md"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-[var(--theme-accent-primary)]" />
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              aria-label="Sort places by"
              style={{ color: 'var(--theme-accent-primary)' }}
              className="bg-transparent text-xs font-bold focus:outline-none cursor-pointer"
            >
              <option value="nearest" style={{ backgroundColor: 'var(--theme-card-bg)', color: 'var(--theme-text-title)' }}>Nearest</option>
              <option value="relevant" style={{ backgroundColor: 'var(--theme-card-bg)', color: 'var(--theme-text-title)' }}>Relevant</option>
              <option value="rating" style={{ backgroundColor: 'var(--theme-card-bg)', color: 'var(--theme-text-title)' }}>Highly Rated</option>
            </select>
          </div>
        </div>

        {/* Distance Filters Bar: 500m, 1km, 2km, 5km, 10km, All */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none text-[11px]">
          <span className="text-[var(--theme-accent-primary)] font-bold px-1 flex items-center gap-1 shrink-0">
            <Footprints className="w-3.5 h-3.5 text-[var(--theme-accent-primary)]" />
            Distance:
          </span>
          {[
            { val: 0, label: 'All' },
            { val: 0.5, label: '500m' },
            { val: 1.0, label: '1 km' },
            { val: 2.0, label: '2 km' },
            { val: 5.0, label: '5 km' },
            { val: 10.0, label: '10 km' },
          ].map((r) => (
            <button
              key={r.label}
              onClick={() => setMaxDistanceFilter(r.val)}
              style={
                maxDistanceFilter === r.val
                  ? {
                      background: 'var(--theme-accent-primary-gradient)',
                      color: 'var(--theme-accent-primary-text)',
                      borderColor: 'var(--theme-accent-primary)',
                    }
                  : {
                      backgroundColor: 'var(--theme-card-bg)',
                      color: 'var(--theme-text-body)',
                      borderColor: 'var(--theme-card-border)',
                    }
              }
              className="px-2.5 py-1 rounded-lg font-bold shrink-0 cursor-pointer transition-all border shadow-sm"
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Explore Nearby Category Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                style={
                  isSelected
                    ? {
                        background: 'var(--theme-accent-primary-gradient)',
                        color: 'var(--theme-accent-primary-text)',
                        borderColor: 'var(--theme-accent-primary)',
                      }
                    : {
                        backgroundColor: 'var(--theme-card-bg)',
                        color: 'var(--theme-text-body)',
                        borderColor: 'var(--theme-card-border)',
                      }
                }
                className="px-3 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer border shrink-0 shadow-sm"
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Discovered Spots List */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-2.5">
        {isSyncingLive && (
          <div
            style={{
              backgroundColor: 'var(--theme-card-bg-subtle)',
              borderColor: 'var(--theme-card-border)',
              color: 'var(--theme-text-body)',
            }}
            className="flex items-center justify-between p-2 rounded-xl border text-xs shadow-sm"
          >
            <div className="flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[var(--theme-accent-secondary)] shrink-0" />
              <span className="font-medium">
                Syncing live radar data side-by-side...
              </span>
            </div>
            <span className="text-[10px] text-[var(--theme-accent-secondary)] font-mono">
              {filteredSpots.length} attractions ready
            </span>
          </div>
        )}

        {filteredSpots.length === 0 && isLoadingSpots ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                style={{
                  backgroundColor: 'var(--theme-card-bg)',
                  borderColor: 'var(--theme-card-border)',
                }}
                className="rounded-2xl border p-3.5 space-y-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    style={{ backgroundColor: 'var(--theme-card-bg-subtle)' }}
                    className="w-16 h-16 rounded-xl"
                  />
                  <div className="flex-1 space-y-2">
                    <div style={{ backgroundColor: 'var(--theme-card-bg-subtle)' }} className="h-4 rounded w-3/4" />
                    <div style={{ backgroundColor: 'var(--theme-card-bg-subtle)' }} className="h-3 rounded w-1/2" />
                  </div>
                </div>
                <div style={{ backgroundColor: 'var(--theme-card-bg-subtle)' }} className="h-3 rounded w-full" />
              </div>
            ))}
          </div>
        ) : filteredSpots.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
            <Compass className="w-10 h-10 text-[var(--theme-text-muted)]" />
            <h4 className="text-sm font-bold text-[var(--theme-text-title)]">No places found in this filter range</h4>
            <p className="text-xs text-[var(--theme-text-muted)] max-w-sm">
              Try switching category or selecting a wider distance filter (5 km / 10 km / All) to explore attractions around {currentCoords.cityName}.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredSpots.map((spot) => {
              const isPlayingThis = activePlayingId === spot.id;

              return (
                <div
                  key={spot.id}
                  id={`spot-card-${spot.id}`}
                  style={{
                    backgroundColor: 'var(--theme-card-bg)',
                    borderColor: 'var(--theme-card-border)',
                  }}
                  className="rounded-2xl border hover:border-[var(--theme-card-border-glow)] overflow-hidden shadow-lg transition-all flex flex-col justify-between p-3 space-y-2.5 backdrop-blur-md"
                >
                  <div className="flex items-start gap-3">
                    <PlaceCardImage
                      placeName={spot.name}
                      placeId={spot.placeId}
                      initialImageUrl={spot.imageUrl}
                      authorAttributions={spot.authorAttributions}
                      photos={spot.photos}
                      category={spot.category}
                      locality={spot.addressOrLocality}
                      cityName={currentCoords.cityName}
                      size="md"
                    />

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-1 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider theme-badge-gold">
                            {spot.category === 'spiritual' || spot.category === 'temple'
                              ? 'Temple & Spiritual'
                              : spot.category === 'history'
                              ? 'History & Forts'
                              : spot.category === 'nature'
                              ? 'Nature & Parks'
                              : spot.category}
                          </span>
                          {spot.rating && (
                            <span className="text-[10px] font-bold text-[var(--theme-accent-primary)] flex items-center gap-0.5">
                              <Star className="w-3 h-3 text-[var(--theme-accent-primary)] fill-current" />
                              <span>{spot.rating.toFixed(1)}</span>
                            </span>
                          )}
                        </div>
                        <span
                          style={{
                            backgroundColor: 'var(--theme-card-bg-subtle)',
                            color: 'var(--theme-accent-secondary)',
                            borderColor: 'var(--theme-card-border)',
                          }}
                          className="text-[10px] font-bold flex items-center gap-1 px-1.5 py-0.5 rounded border"
                        >
                          <Footprints className="w-3 h-3 text-[var(--theme-accent-primary)]" />
                          <span>{spot.estimatedDistanceKm} km ({spot.walkOrDriveTime})</span>
                        </span>
                      </div>

                      <h3 className="text-sm sm:text-base font-serif font-bold text-[var(--theme-text-title)] truncate hover:text-[var(--theme-accent-primary)] transition-colors">
                        {spot.name}
                      </h3>

                      <p className="text-xs text-[var(--theme-text-body)] line-clamp-2 leading-relaxed">
                        <strong className="text-[var(--theme-accent-primary)]">Why visit: </strong>
                        {spot.oneLineImportance}
                      </p>
                    </div>
                  </div>

                  {/* Audio Script & Highlights preview */}
                  <div
                    style={{
                      backgroundColor: 'var(--theme-card-bg-subtle)',
                      borderColor: 'var(--theme-card-border)',
                    }}
                    className="p-2.5 rounded-xl border text-xs text-[var(--theme-text-body)] leading-relaxed font-sans space-y-1"
                  >
                    <div className="flex items-center justify-between text-[10px] font-bold text-[var(--theme-accent-primary)] uppercase tracking-wider">
                      <span className="flex items-center gap-1">
                        <Volume2 className="w-3 h-3 text-[var(--theme-accent-primary)]" />
                        Guide Narration ({selectedLanguage.nativeName})
                      </span>
                      {isPlayingThis && (
                        <span className="text-emerald-400 animate-pulse">Playing voice...</span>
                      )}
                    </div>
                    <p className="line-clamp-2 text-[var(--theme-text-muted)] text-xs">
                      {spot.description}
                    </p>
                  </div>

                  {/* Spot Action Buttons */}
                  <div className="pt-1 flex items-center gap-1.5 flex-wrap">
                    {/* Audio Play/Pause Button */}
                    <button
                      onClick={() => handleTogglePlayAudio(spot)}
                      style={
                        isPlayingThis
                          ? {
                              backgroundColor: '#e11d48',
                              color: '#ffffff',
                              borderColor: '#fda4af',
                            }
                          : undefined
                      }
                      className={`flex-1 py-1.5 px-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border shadow-sm ${
                        isPlayingThis ? 'animate-pulse' : 'theme-btn-primary'
                      }`}
                    >
                      {isPlayingThis ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                      <span>{isPlayingThis ? 'Stop Audio' : 'Listen Narration'}</span>
                    </button>

                    {/* Open in Maps / Navigate */}
                    <button
                      onClick={() => handleOpenGoogleMaps(spot)}
                      style={{
                        backgroundColor: 'var(--theme-card-bg-subtle)',
                        color: 'var(--theme-accent-secondary)',
                        borderColor: 'var(--theme-card-border)',
                      }}
                      className="py-1.5 px-2.5 rounded-xl border font-bold text-xs flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-sm hover:border-[var(--theme-card-border-glow)]"
                      title="Open in Google Maps / Turn-by-Turn Navigation"
                    >
                      <NavIcon className="w-3.5 h-3.5 text-[var(--theme-accent-primary)]" />
                      <span>Navigate</span>
                    </button>

                    {/* Deep Dive Dossier */}
                    <button
                      onClick={() => {
                        speechManager.stop();
                        setActivePlayingId(null);
                        setDeepDiveSpot(spot);
                      }}
                      style={{
                        backgroundColor: 'var(--theme-card-bg)',
                        color: 'var(--theme-text-title)',
                        borderColor: 'var(--theme-card-border)',
                      }}
                      className="py-1.5 px-2.5 rounded-xl border font-bold text-xs flex items-center gap-1 cursor-pointer shadow-sm hover:border-[var(--theme-card-border-glow)]"
                      title="Discover in-depth secrets and architectural facts"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-[var(--theme-accent-primary)]" />
                      <span>Deep Dive</span>
                    </button>

                    {/* Details Modal */}
                    <button
                      onClick={() => setSelectedDetailSpot(spot)}
                      style={{
                        backgroundColor: 'var(--theme-card-bg)',
                        color: 'var(--theme-text-muted)',
                        borderColor: 'var(--theme-card-border)',
                      }}
                      className="py-1.5 px-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1 cursor-pointer hover:text-[var(--theme-text-title)]"
                    >
                      <Info className="w-3.5 h-3.5" />
                      <span>Details</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Spot Detail Modal with Maps Navigation */}
      {selectedDetailSpot && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
          onClick={() => setSelectedDetailSpot(null)}
        >
          <div
            style={{
              backgroundColor: 'var(--theme-card-bg)',
              borderColor: 'var(--theme-card-border-glow)',
              color: 'var(--theme-text-title)',
            }}
            className="w-full max-w-lg rounded-3xl border p-4 shadow-2xl space-y-3.5 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{ borderColor: 'var(--theme-card-border)' }}
              className="flex items-center justify-between border-b pb-2"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-[var(--theme-accent-primary)] uppercase tracking-wider">
                    {selectedDetailSpot.category} • ~{selectedDetailSpot.estimatedDistanceKm} km from you
                  </span>
                  {selectedDetailSpot.rating && (
                    <span className="text-[10px] font-bold text-[var(--theme-accent-primary)] flex items-center gap-0.5">
                      <Star className="w-3 h-3 text-[var(--theme-accent-primary)] fill-current" />
                      <span>{selectedDetailSpot.rating.toFixed(1)}</span>
                    </span>
                  )}
                </div>
                <h3 className="text-base sm:text-lg font-serif font-bold text-[var(--theme-text-title)] truncate">
                  {selectedDetailSpot.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedDetailSpot(null)}
                style={{
                  backgroundColor: 'var(--theme-card-bg-subtle)',
                  color: 'var(--theme-text-muted)',
                  borderColor: 'var(--theme-card-border)',
                }}
                className="p-1.5 rounded-xl border cursor-pointer hover:text-[var(--theme-text-title)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div
              style={{
                backgroundColor: 'var(--theme-card-bg-subtle)',
                borderColor: 'var(--theme-card-border)',
              }}
              className="w-full h-52 rounded-2xl overflow-hidden border"
            >
              <PlaceCardImage
                placeName={selectedDetailSpot.name}
                placeId={selectedDetailSpot.placeId}
                initialImageUrl={selectedDetailSpot.imageUrl}
                authorAttributions={selectedDetailSpot.authorAttributions}
                photos={selectedDetailSpot.photos}
                category={selectedDetailSpot.category}
                locality={selectedDetailSpot.addressOrLocality}
                cityName={currentCoords.cityName}
                size="full"
              />
            </div>

            <div
              style={{
                backgroundColor: 'var(--theme-card-bg-subtle)',
                borderColor: 'var(--theme-card-border)',
              }}
              className="p-3 rounded-2xl border space-y-1.5"
            >
              <strong className="text-xs font-bold text-[var(--theme-accent-primary)] uppercase tracking-wider block">
                Why You Must Visit:
              </strong>
              <p className="text-xs sm:text-sm text-[var(--theme-text-body)] leading-relaxed">
                {selectedDetailSpot.oneLineImportance}
              </p>
            </div>

            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-[var(--theme-accent-primary)] uppercase tracking-wider">
                Overview & History:
              </h4>
              <WordByWordText
                text={selectedDetailSpot.description}
                wordsPerTick={2}
                intervalMs={26}
                as="p"
                className="text-xs text-[var(--theme-text-body)] leading-relaxed whitespace-pre-line"
              />
            </div>

            {selectedDetailSpot.keyHighlights && selectedDetailSpot.keyHighlights.length > 0 && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-[var(--theme-accent-primary)] uppercase tracking-wider">
                  Key Things to Spot:
                </h4>
                <div className="space-y-1">
                  {selectedDetailSpot.keyHighlights.map((hl, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-[var(--theme-text-body)]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{hl}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="pt-2 flex items-center gap-2 flex-wrap">
              <button
                onClick={() => handleOpenGoogleMaps(selectedDetailSpot)}
                className="flex-1 py-2.5 px-3 rounded-xl theme-btn-teal font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-98 transition-all cursor-pointer"
              >
                <NavIcon className="w-4 h-4" />
                <span>Open in Google Maps</span>
              </button>

              <button
                onClick={() => {
                  speechManager.stop();
                  const spot = selectedDetailSpot;
                  setSelectedDetailSpot(null);
                  setDeepDiveSpot(spot);
                }}
                className="py-2.5 px-3 rounded-xl theme-btn-primary font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-98 transition-all cursor-pointer"
              >
                <BookOpen className="w-4 h-4" />
                <span>Deep Dive</span>
              </button>

              <button
                onClick={() => {
                  const q = `How do I reach ${selectedDetailSpot.name} and what are the top secrets there?`;
                  setSelectedDetailSpot(null);
                  onOpenChatWithQuestion(q);
                }}
                style={{
                  backgroundColor: 'var(--theme-card-bg-subtle)',
                  color: 'var(--theme-text-title)',
                  borderColor: 'var(--theme-card-border)',
                }}
                className="py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:border-[var(--theme-card-border-glow)]"
              >
                <MessageSquare className="w-4 h-4 text-[var(--theme-accent-primary)]" />
                <span>Ask AI Guide</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deep Dive Dossier Modal */}
      {deepDiveSpot && (
        <DeepDiveModal
          title={deepDiveSpot.name}
          category={deepDiveSpot.category}
          locationName={`${deepDiveSpot.name}, ${currentCoords.cityName}`}
          currentNarration={deepDiveSpot.description}
          selectedLanguage={selectedLanguage}
          guideSettings={guideSettings}
          outputMode={outputMode}
          onClose={() => setDeepDiveSpot(null)}
          onOpenChatWithQuestion={(q) => {
            setDeepDiveSpot(null);
            onOpenChatWithQuestion(q);
          }}
        />
      )}
    </div>
  );
};
