import React, { useState, useEffect, useMemo } from 'react';
import { Language } from '../types';
import { DeviceExactLocation, getDeviceExactLocation } from '../utils/geolocation';
import { PlaceCardImage } from './PlaceCardImage';
import { WORLD_LOCATIONS, CountryInfo, StateInfo, CityLocationInfo } from '../data/worldLocations';
import {
  Compass,
  MapPin,
  Search,
  Sparkles,
  Navigation as NavIcon,
  Globe,
  Radio,
  Building,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  Landmark,
  Utensils,
  BookOpen,
  Eye,
  Map,
  ChevronDown,
  Layers,
  SlidersHorizontal,
  Check
} from 'lucide-react';

interface CityItem {
  name: string;
  state?: string;
  country: string;
  latitude: number;
  longitude: number;
  tagline: string;
  photoUrl: string;
  topLandmarks: string[];
  famousFoods: string[];
}

interface CityExplorerScreenProps {
  currentCity: string;
  currentCountry: string;
  currentLocationName: string;
  isManualLocationMode: boolean;
  onSetLocationMode: (mode: 'gps' | 'manual') => void;
  onSelectCity: (cityData: {
    cityName: string;
    state?: string;
    country: string;
    latitude: number;
    longitude: number;
    locationName: string;
  }) => void;
  selectedLanguage: Language;
  onOpenCityGuideModal: (cityName: string, stateName?: string, countryName?: string) => void;
  onProceedToNearby: () => void;
  onProceedToMap: () => void;
  onProceedToCamera: () => void;
  deviceExactLocation?: DeviceExactLocation | null;
  onRefreshGpsLocation?: () => Promise<void>;
  onBackToHome?: () => void;
}

export const CityExplorerScreen: React.FC<CityExplorerScreenProps> = ({
  currentCity,
  currentCountry,
  currentLocationName,
  isManualLocationMode,
  onSetLocationMode,
  onSelectCity,
  selectedLanguage,
  onOpenCityGuideModal,
  onProceedToNearby,
  onProceedToMap,
  deviceExactLocation,
  onRefreshGpsLocation,
  onBackToHome,
}) => {
  // Cascading Dropdown States: Country -> State -> City
  const [selectedCountryName, setSelectedCountryName] = useState<string>('India');
  const [selectedStateName, setSelectedStateName] = useState<string>('Maharashtra');
  const [selectedCityName, setSelectedCityName] = useState<string>('Nagpur');
  
  // Custom manual city typing if not in preset list
  const [isCustomCityMode, setIsCustomCityMode] = useState<boolean>(false);
  const [customCityInput, setCustomCityInput] = useState<string>('');
  const [isGeocodingCustomCity, setIsGeocodingCustomCity] = useState<boolean>(false);
  
  // Quick search filter for browsing
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CityItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isRefreshingGps, setIsRefreshingGps] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Active City brief preview data
  const [activeCityPreview, setActiveCityPreview] = useState<any>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Derive current country object
  const currentCountryObj = useMemo(() => {
    return WORLD_LOCATIONS.find((c) => c.name.toLowerCase() === selectedCountryName.toLowerCase()) || WORLD_LOCATIONS[0];
  }, [selectedCountryName]);

  // Derive states for selected country
  const availableStates = useMemo(() => {
    return currentCountryObj.states || [];
  }, [currentCountryObj]);

  // Derive current state object
  const currentStateObj = useMemo(() => {
    return availableStates.find((s) => s.name.toLowerCase() === selectedStateName.toLowerCase()) || availableStates[0] || null;
  }, [availableStates, selectedStateName]);

  // Derive cities for selected state
  const availableCities = useMemo(() => {
    return currentStateObj?.cities || [];
  }, [currentStateObj]);

  // Derive currently selected city info object from dropdown selection
  const selectedCityObj = useMemo(() => {
    if (isCustomCityMode) return null;
    return availableCities.find((c) => c.name.toLowerCase() === selectedCityName.toLowerCase()) || availableCities[0] || null;
  }, [availableCities, selectedCityName, isCustomCityMode]);

  // Initialize dropdown defaults based on currentCity if available
  useEffect(() => {
    if (!currentCity) return;
    for (const c of WORLD_LOCATIONS) {
      for (const s of c.states) {
        const found = s.cities.find((city) => city.name.toLowerCase() === currentCity.toLowerCase());
        if (found) {
          setSelectedCountryName(c.name);
          setSelectedStateName(s.name);
          setSelectedCityName(found.name);
          return;
        }
      }
    }
  }, [currentCity]);

  // When Country dropdown changes, reset State and City
  const handleCountryChange = (newCountryName: string) => {
    setSelectedCountryName(newCountryName);
    setIsCustomCityMode(false);
    const country = WORLD_LOCATIONS.find((c) => c.name === newCountryName);
    if (country && country.states.length > 0) {
      const firstState = country.states[0];
      setSelectedStateName(firstState.name);
      if (firstState.cities.length > 0) {
        setSelectedCityName(firstState.cities[0].name);
      }
    }
  };

  // When State dropdown changes, reset City
  const handleStateChange = (newStateName: string) => {
    setSelectedStateName(newStateName);
    setIsCustomCityMode(false);
    const state = availableStates.find((s) => s.name === newStateName);
    if (state && state.cities.length > 0) {
      setSelectedCityName(state.cities[0].name);
    }
  };

  // Search cities API for the query bar
  useEffect(() => {
    let isMounted = true;
    const delayDebounce = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch('/api/city/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: searchQuery }),
        });
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.success && data.cities) {
            setSearchResults(data.cities);
          }
        }
      } catch (err) {
        console.warn('City search failed:', err);
      } finally {
        if (isMounted) setIsSearching(false);
      }
    }, searchQuery ? 300 : 0);

    return () => {
      isMounted = false;
      clearTimeout(delayDebounce);
    };
  }, [searchQuery]);

  // Load current active city brief overview
  useEffect(() => {
    let isMounted = true;
    async function loadCityPreview() {
      setIsLoadingPreview(true);
      try {
        const res = await fetch('/api/city/info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            city: currentCity,
            country: currentCountry,
            language: selectedLanguage.name,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.success) {
            setActiveCityPreview(data);
          }
        }
      } catch (err) {
        console.warn('Failed to load active city preview:', err);
      } finally {
        if (isMounted) setIsLoadingPreview(false);
      }
    }

    loadCityPreview();
    return () => {
      isMounted = false;
    };
  }, [currentCity, currentCountry, selectedLanguage.name]);

  const handleToggleToGps = async () => {
    setIsRefreshingGps(true);
    try {
      if (onRefreshGpsLocation) {
        await onRefreshGpsLocation();
      } else {
        const exactLoc = await getDeviceExactLocation();
        onSelectCity({
          cityName: exactLoc.city,
          state: exactLoc.country,
          country: exactLoc.country || 'India',
          latitude: exactLoc.latitude,
          longitude: exactLoc.longitude,
          locationName: exactLoc.locationName,
        });
      }
      onSetLocationMode('gps');
      setStatusMessage(`Switched to Live GPS Mode: ${currentLocationName}`);
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (e) {
      console.warn('GPS toggle failed:', e);
    } finally {
      setIsRefreshingGps(false);
    }
  };

  // Set city from Dropdown selection
  const handleApplyDropdownCity = async () => {
    if (isCustomCityMode) {
      if (!customCityInput.trim()) return;
      setIsGeocodingCustomCity(true);
      try {
        const res = await fetch('/api/city/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: `${customCityInput}, ${selectedStateName}, ${selectedCountryName}` }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.cities && data.cities.length > 0) {
            const first = data.cities[0];
            onSelectCity({
              cityName: first.name,
              state: first.state || selectedStateName,
              country: first.country || selectedCountryName,
              latitude: first.latitude,
              longitude: first.longitude,
              locationName: `${first.name}, ${first.state || selectedStateName}, ${first.country || selectedCountryName}`,
            });
            onSetLocationMode('manual');
            setStatusMessage(`Active location set to ${first.name}. App has re-indexed attractions and maps.`);
            setTimeout(() => setStatusMessage(null), 4000);
            return;
          }
        }
      } catch (err) {
        console.warn('Geocoding custom city failed:', err);
      } finally {
        setIsGeocodingCustomCity(false);
      }
    }

    if (selectedCityObj) {
      onSelectCity({
        cityName: selectedCityObj.name,
        state: selectedStateName,
        country: selectedCountryName,
        latitude: selectedCityObj.latitude,
        longitude: selectedCityObj.longitude,
        locationName: `${selectedCityObj.name}, ${selectedStateName}, ${selectedCountryName}`,
      });
      onSetLocationMode('manual');
      setStatusMessage(`Active location set to ${selectedCityObj.name}. App has processed everything for ${selectedCityObj.name}!`);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  // Set city from quick-pick card
  const handlePickCityCard = (city: CityItem) => {
    onSelectCity({
      cityName: city.name,
      state: city.state,
      country: city.country,
      latitude: city.latitude,
      longitude: city.longitude,
      locationName: `${city.name}, ${city.state ? city.state + ', ' : ''}${city.country}`,
    });
    onSetLocationMode('manual');
    setStatusMessage(`Active location set to ${city.name}. App has processed everything for this destination!`);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  return (
    <div id="city-explorer-screen" className="h-full flex flex-col overflow-hidden py-1 space-y-2 select-none">
      {/* Mode Switch Bar: Automatic GPS vs Manual City Exploration */}
      <div
        style={{
          backgroundColor: 'var(--theme-card-bg)',
          borderColor: 'var(--theme-card-border)',
        }}
        className="shrink-0 p-2.5 sm:p-3 rounded-2xl border shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 backdrop-blur-md"
      >
        <div className="flex items-center gap-2">
          {onBackToHome && (
            <button
              id="btn-city-back-home"
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
            <div className="flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-[var(--theme-accent-primary)]" />
              <h2 className="text-xs sm:text-sm font-serif font-bold text-[var(--theme-text-title)]">
                Exploration Location Mode
              </h2>
            </div>
            <p className="text-[11px] text-[var(--theme-text-muted)]">
              {isManualLocationMode
                ? `Currently exploring manually: ${currentCity} (App updated for this city)`
                : `Automatic Live GPS Mode: ${currentLocationName}`}
            </p>
          </div>
        </div>

        {/* Switch Control with 2 Options */}
        <div
          style={{
            backgroundColor: 'var(--theme-card-bg-subtle)',
            borderColor: 'var(--theme-card-border)',
          }}
          className="shrink-0 p-1 rounded-xl border flex items-center gap-1"
        >
          <button
            id="btn-switch-gps-mode"
            onClick={handleToggleToGps}
            disabled={isRefreshingGps}
            style={{
              background: !isManualLocationMode ? 'var(--theme-accent-primary-gradient)' : 'transparent',
              color: !isManualLocationMode ? 'var(--theme-accent-primary-text)' : 'var(--theme-text-muted)',
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              !isManualLocationMode
                ? 'shadow-md font-extrabold'
                : 'hover:text-[var(--theme-text-title)]'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingGps ? 'animate-spin' : ''}`} />
            <span>Automatic GPS</span>
          </button>

          <button
            id="btn-switch-manual-mode"
            onClick={() => onSetLocationMode('manual')}
            style={{
              background: isManualLocationMode ? 'var(--theme-accent-primary-gradient)' : 'transparent',
              color: isManualLocationMode ? 'var(--theme-accent-primary-text)' : 'var(--theme-text-muted)',
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              isManualLocationMode
                ? 'shadow-md font-extrabold'
                : 'hover:text-[var(--theme-text-title)]'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Manual City Dropdown</span>
          </button>
        </div>
      </div>

      {/* Status Toast / Notification Banner */}
      {statusMessage && (
        <div className="shrink-0 px-3 py-2 rounded-xl bg-emerald-950/90 border border-emerald-500/60 text-emerald-200 text-xs font-medium flex items-center gap-2 animate-fadeIn">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* CASCADING DROPDOWN SELECTOR: Country -> State -> City */}
      <div
        style={{
          backgroundColor: 'var(--theme-card-bg)',
          borderColor: 'var(--theme-card-border)',
        }}
        className="shrink-0 p-3 sm:p-3.5 rounded-2xl border shadow-xl space-y-2.5 backdrop-blur-md"
      >
        <div
          style={{ borderColor: 'var(--theme-card-border)' }}
          className="flex items-center justify-between gap-2 border-b pb-2"
        >
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-[var(--theme-accent-primary)]" />
            <h3 className="text-xs sm:text-sm font-serif font-bold text-[var(--theme-text-title)]">
              Manual Destination Selector
            </h3>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full theme-badge-gold">
            Country • State • City
          </span>
        </div>

        {/* The 3 Cascading Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* 1. Country Dropdown */}
          <div className="space-y-1">
            <label className="text-[10.5px] font-bold text-[var(--theme-accent-primary)] uppercase tracking-wider flex items-center gap-1">
              <Globe className="w-3 h-3 text-[var(--theme-accent-primary)]" />
              <span>1. Choose Country</span>
            </label>
            <div className="relative">
              <select
                id="select-country-dropdown"
                value={selectedCountryName}
                onChange={(e) => handleCountryChange(e.target.value)}
                style={{
                  backgroundColor: 'var(--theme-card-bg-subtle)',
                  borderColor: 'var(--theme-card-border)',
                  color: 'var(--theme-text-title)',
                }}
                className="w-full pl-3 pr-8 py-2 rounded-xl border font-medium text-xs sm:text-sm focus:outline-none focus:border-[var(--theme-card-border-glow)] appearance-none cursor-pointer"
              >
                {WORLD_LOCATIONS.map((c) => (
                  <option key={c.name} value={c.name} style={{ backgroundColor: 'var(--theme-card-bg)', color: 'var(--theme-text-title)' }}>
                    {c.flag} {c.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-[var(--theme-accent-primary)] absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* 2. State / Province Dropdown */}
          <div className="space-y-1">
            <label className="text-[10.5px] font-bold text-[var(--theme-accent-primary)] uppercase tracking-wider flex items-center gap-1">
              <Building className="w-3 h-3 text-[var(--theme-accent-primary)]" />
              <span>2. Choose State / Region</span>
            </label>
            <div className="relative">
              <select
                id="select-state-dropdown"
                value={selectedStateName}
                onChange={(e) => handleStateChange(e.target.value)}
                style={{
                  backgroundColor: 'var(--theme-card-bg-subtle)',
                  borderColor: 'var(--theme-card-border)',
                  color: 'var(--theme-text-title)',
                }}
                className="w-full pl-3 pr-8 py-2 rounded-xl border font-medium text-xs sm:text-sm focus:outline-none focus:border-[var(--theme-card-border-glow)] appearance-none cursor-pointer"
              >
                {availableStates.map((s) => (
                  <option key={s.name} value={s.name} style={{ backgroundColor: 'var(--theme-card-bg)', color: 'var(--theme-text-title)' }}>
                    {s.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-[var(--theme-accent-primary)] absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* 3. City Dropdown / Custom City Entry */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[10.5px] font-bold text-[var(--theme-accent-primary)] uppercase tracking-wider flex items-center gap-1">
                <MapPin className="w-3 h-3 text-[var(--theme-accent-primary)]" />
                <span>3. Choose City</span>
              </label>
              <button
                type="button"
                onClick={() => setIsCustomCityMode(!isCustomCityMode)}
                className="text-[10px] text-[var(--theme-accent-primary)] hover:underline cursor-pointer"
              >
                {isCustomCityMode ? '← Back to Presets' : '+ Other City'}
              </button>
            </div>

            {isCustomCityMode ? (
              <input
                type="text"
                value={customCityInput}
                onChange={(e) => setCustomCityInput(e.target.value)}
                placeholder="Type city name in this state..."
                style={{
                  backgroundColor: 'var(--theme-card-bg-subtle)',
                  borderColor: 'var(--theme-accent-primary)',
                  color: 'var(--theme-text-title)',
                }}
                className="w-full px-3 py-2 rounded-xl border font-medium text-xs sm:text-sm focus:outline-none focus:border-[var(--theme-card-border-glow)]"
              />
            ) : (
              <div className="relative">
                <select
                  id="select-city-dropdown"
                  value={selectedCityName}
                  onChange={(e) => setSelectedCityName(e.target.value)}
                  style={{
                    backgroundColor: 'var(--theme-card-bg-subtle)',
                    borderColor: 'var(--theme-card-border)',
                    color: 'var(--theme-text-title)',
                  }}
                  className="w-full pl-3 pr-8 py-2 rounded-xl border font-medium text-xs sm:text-sm focus:outline-none focus:border-[var(--theme-card-border-glow)] appearance-none cursor-pointer"
                >
                  {availableCities.map((c) => (
                    <option key={c.name} value={c.name} style={{ backgroundColor: 'var(--theme-card-bg)', color: 'var(--theme-text-title)' }}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-[var(--theme-accent-primary)] absolute right-2.5 top-2.5 pointer-events-none" />
              </div>
            )}
          </div>
        </div>

        {/* Selected City Quick Preview & "Apply & Set Active City" Button */}
        <div
          style={{ borderColor: 'var(--theme-card-border)' }}
          className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 border-t"
        >
          <div className="text-xs text-[var(--theme-text-muted)] truncate flex items-center gap-1.5">
            <span className="font-bold text-[var(--theme-accent-primary)]">Target Destination:</span>
            <span className="font-semibold text-[var(--theme-text-title)]">
              {isCustomCityMode
                ? (customCityInput || 'Custom City')
                : (selectedCityObj?.name || selectedCityName)}, {selectedStateName}, {selectedCountryName}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              id="btn-apply-manual-city"
              onClick={handleApplyDropdownCity}
              disabled={isGeocodingCustomCity || (isCustomCityMode && !customCityInput.trim())}
              className="w-full sm:w-auto px-4 py-2 rounded-xl theme-btn-primary font-extrabold text-xs sm:text-sm shadow-lg active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {isGeocodingCustomCity ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              <span>Set & Process App For This City</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Active City Overview Card with "Explore City" & "Proceed Full App" */}
      <div
        style={{
          backgroundColor: 'var(--theme-card-bg)',
          borderColor: 'var(--theme-card-border)',
        }}
        className="shrink-0 rounded-2xl border shadow-lg overflow-hidden flex flex-col sm:flex-row items-stretch backdrop-blur-md"
      >
        <div
          style={{ backgroundColor: 'var(--theme-card-bg-subtle)' }}
          className="relative w-full sm:w-44 h-28 sm:h-auto shrink-0 overflow-hidden"
        >
          <PlaceCardImage
            placeName={currentCity}
            cityName={currentCity}
            initialImageUrl={activeCityPreview?.photoUrl}
            size="full"
            className="w-full h-full object-cover !rounded-none"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent sm:hidden pointer-events-none" />
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/75 backdrop-blur-md text-[9px] font-bold text-[var(--theme-accent-primary)] border border-[var(--theme-card-border)] z-10 pointer-events-none">
            {isManualLocationMode ? '📍 Active Selected City' : '⚡ GPS Detected City'}
          </div>
        </div>

        <div className="p-3 sm:p-3.5 flex-1 flex flex-col justify-between space-y-1.5 min-w-0">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full theme-badge-gold truncate">
                {activeCityPreview?.moniker || 'Heritage City'}
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-serif font-bold text-[var(--theme-text-title)] truncate mt-0.5">
              {currentCity}
            </h3>
            <p className="text-xs text-[var(--theme-text-body)] line-clamp-2 leading-relaxed">
              {activeCityPreview?.briefOverview ||
                `Set ${currentCity} as active location to discover verified temples, monuments, food specialties, and audio guide stories.`}
            </p>
          </div>

          {/* Quick Action Row */}
          <div className="flex items-center gap-2 pt-1 flex-wrap">
            {/* Button beside city location to explore more about that city */}
            <button
              id="btn-city-tab-explore-city"
              onClick={() => onOpenCityGuideModal(currentCity, selectedStateName, currentCountry)}
              style={{
                backgroundColor: 'var(--theme-card-bg-subtle)',
                borderColor: 'var(--theme-card-border)',
                color: 'var(--theme-text-title)',
              }}
              className="py-1.5 px-3 rounded-xl border font-bold text-xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all hover:border-[var(--theme-card-border-glow)]"
              title="Open Brief Overview and In-Depth City Guide"
            >
              <Sparkles className="w-3.5 h-3.5 text-[var(--theme-accent-primary)]" />
              <span>Explore City Info</span>
            </button>

            {/* Proceed Full App for this City */}
            <button
              id="btn-proceed-full-app-nearby"
              onClick={onProceedToNearby}
              className="py-1.5 px-3 rounded-xl theme-btn-primary font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer active:scale-95 transition-all"
            >
              <NavIcon className="w-3.5 h-3.5" />
              <span>Proceed to Attractions</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              id="btn-proceed-full-app-map"
              onClick={onProceedToMap}
              style={{
                backgroundColor: 'var(--theme-card-bg-subtle)',
                borderColor: 'var(--theme-card-border)',
                color: 'var(--theme-text-title)',
              }}
              className="py-1.5 px-2.5 rounded-xl border text-xs font-medium flex items-center gap-1 cursor-pointer hover:border-[var(--theme-card-border-glow)]"
            >
              <Map className="w-3.5 h-3.5 text-[var(--theme-accent-primary)]" />
              <span>Map View</span>
            </button>
          </div>
        </div>
      </div>

      {/* Search and Quick Preset Grid */}
      <div className="flex-1 min-h-0 flex flex-col space-y-2 overflow-hidden">
        {/* Search Bar */}
        <div className="shrink-0 relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-[var(--theme-accent-primary)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Quick search any city in the world (e.g. Nagpur, Madurai, Varanasi, Jaipur, Kyoto, Paris)..."
            style={{
              backgroundColor: 'var(--theme-card-bg-subtle)',
              borderColor: 'var(--theme-card-border)',
              color: 'var(--theme-text-title)',
            }}
            className="w-full pl-9 pr-8 py-2 rounded-xl border placeholder-[var(--theme-text-muted)] text-xs sm:text-sm focus:outline-none focus:border-[var(--theme-card-border-glow)]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-xs text-[var(--theme-accent-primary)] hover:text-[var(--theme-text-title)]"
            >
              Clear
            </button>
          )}
        </div>

        {/* City Cards Grid */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-2">
          <div className="flex items-center justify-between text-xs text-[var(--theme-accent-primary)] font-bold px-1">
            <span>
              {searchQuery ? `Search Results (${searchResults.length})` : 'Popular Heritage & Cultural Cities'}
            </span>
            <span className="text-[11px] text-[var(--theme-text-muted)] font-normal">
              Tap any city to set and process
            </span>
          </div>

          {isSearching ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-2 text-center text-[var(--theme-accent-secondary)]">
              <div className="w-6 h-6 border-2 border-[var(--theme-accent-primary)] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs">Searching destinations worldwide...</span>
            </div>
          ) : searchResults.length === 0 ? (
            <div
              style={{
                backgroundColor: 'var(--theme-card-bg)',
                borderColor: 'var(--theme-card-border)',
                color: 'var(--theme-text-muted)',
              }}
              className="py-12 text-center text-xs rounded-2xl border p-4"
            >
              No matching cities found for &quot;{searchQuery}&quot;. Try searching for Nagpur, Varanasi, Madurai, or Jaipur.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {searchResults.map((city) => {
                const isSelected = city.name.toLowerCase() === currentCity.toLowerCase();
                return (
                  <div
                    key={city.name}
                    style={{
                      backgroundColor: 'var(--theme-card-bg)',
                      borderColor: isSelected ? 'var(--theme-card-border-glow)' : 'var(--theme-card-border)',
                      boxShadow: isSelected ? '0 0 15px var(--theme-ambient-glow)' : undefined,
                    }}
                    className="p-3 rounded-2xl border transition-all flex flex-col justify-between space-y-2 backdrop-blur-md"
                  >
                    <div className="flex items-start gap-3">
                      {/* Photo Thumbnail */}
                      <div
                        style={{
                          backgroundColor: 'var(--theme-card-bg-subtle)',
                          borderColor: 'var(--theme-card-border)',
                        }}
                        className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border"
                      >
                        <PlaceCardImage
                          placeName={city.name}
                          cityName={city.name}
                          initialImageUrl={city.photoUrl}
                          size="sm"
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* City Name & Tagline */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="text-sm font-serif font-bold text-[var(--theme-text-title)] truncate">
                            {city.name}
                          </h4>
                          {isSelected && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full theme-badge-teal flex items-center gap-1 shrink-0">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              <span>Active</span>
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-[var(--theme-accent-secondary)] line-clamp-1 mt-0.5">
                          {city.state ? `${city.state}, ${city.country}` : city.country}
                        </p>

                        <p className="text-[10px] text-[var(--theme-text-muted)] line-clamp-1 mt-0.5 italic">
                          {city.tagline}
                        </p>
                      </div>
                    </div>

                    {/* Landmarks & Food Highlights Tags */}
                    {city.topLandmarks && city.topLandmarks.length > 0 && (
                      <div className="flex flex-wrap gap-1 text-[9.5px]">
                        {city.topLandmarks.slice(0, 3).map((lm, i) => (
                          <span
                            key={i}
                            style={{
                              backgroundColor: 'var(--theme-card-bg-subtle)',
                              borderColor: 'var(--theme-card-border)',
                              color: 'var(--theme-accent-primary)',
                            }}
                            className="px-1.5 py-0.5 rounded-md border truncate max-w-[130px]"
                          >
                            {lm}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div
                      style={{ borderColor: 'var(--theme-card-border)' }}
                      className="flex items-center gap-2 pt-1 border-t"
                    >
                      <button
                        onClick={() => handlePickCityCard(city)}
                        style={{
                          background: isSelected ? 'var(--theme-accent-primary-gradient)' : 'var(--theme-card-bg-subtle)',
                          color: isSelected ? 'var(--theme-accent-primary-text)' : 'var(--theme-text-title)',
                          borderColor: isSelected ? 'transparent' : 'var(--theme-card-border)',
                        }}
                        className="flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95 border"
                      >
                        <MapPin className="w-3 h-3" />
                        <span>{isSelected ? 'Active City' : 'Set as Active City'}</span>
                      </button>

                      <button
                        onClick={() => onOpenCityGuideModal(city.name, city.state, city.country)}
                        style={{
                          backgroundColor: 'var(--theme-card-bg-subtle)',
                          borderColor: 'var(--theme-card-border)',
                          color: 'var(--theme-text-title)',
                        }}
                        className="py-1.5 px-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1 cursor-pointer hover:border-[var(--theme-card-border-glow)]"
                        title="Explore Brief & In-Depth Guide"
                      >
                        <Sparkles className="w-3 h-3 text-[var(--theme-accent-primary)]" />
                        <span>About</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
