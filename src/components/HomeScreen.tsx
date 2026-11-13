import React, { useState, useEffect } from 'react';
import { AppTab, Language, RecognitionResult, LocationCoords, UserProfile } from '../types';
import { PlaceCardImage } from './PlaceCardImage';
import { WordByWordText } from './WordByWordText';
import {
  Camera,
  Sparkles,
  MapPin,
  Navigation as NavIcon,
  Sliders,
  BookOpen,
  Compass,
  UserCheck
} from 'lucide-react';
import { DeviceExactLocation } from '../utils/geolocation';

interface HomeScreenProps {
  setActiveTab: (tab: AppTab) => void;
  selectedLanguage: Language;
  onSelectSampleLandmark: (landmark: RecognitionResult) => void;
  locationCoords: LocationCoords | null;
  deviceExactLocation?: DeviceExactLocation | null;
  isManualLocationMode?: boolean;
  visitedHistory: RecognitionResult[];
  onClearMemory: () => void;
  onRefreshLocation?: () => void;
  onOpenCityGuide?: (cityName: string) => void;
  userProfile?: UserProfile | null;
  onReplayIntro?: () => void;
  onReplayTour?: () => void;
  onOpenLoginSetup?: () => void;
}

interface LocationOverviewData {
  headline: string;
  description: string;
  photoUrl: string;
  localMustDos: string[];
  currentAtmosphere: string;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  setActiveTab,
  selectedLanguage,
  onSelectSampleLandmark,
  locationCoords,
  deviceExactLocation,
  isManualLocationMode = false,
  visitedHistory,
  onClearMemory,
  onRefreshLocation,
  onOpenCityGuide,
  userProfile,
  onReplayIntro,
  onReplayTour,
  onOpenLoginSetup,
}) => {
  // Location Overview Data
  const [locationOverview, setLocationOverview] = useState<LocationOverviewData | null>(null);
  const [isLoadingOverview, setIsLoadingOverview] = useState(false);

  const effectiveLocationName = deviceExactLocation?.locationName || locationCoords?.city || (isManualLocationMode ? 'Selected City' : 'Nagpur, Maharashtra, India');
  const effectiveCity = deviceExactLocation?.city || locationCoords?.city || 'Nagpur';
  const effectiveCountry = deviceExactLocation?.country || locationCoords?.country || 'India';
  const lat = deviceExactLocation?.latitude || locationCoords?.latitude || 21.1458;
  const lng = deviceExactLocation?.longitude || locationCoords?.longitude || 79.0882;

  // Fetch Live Location Overview & Current Photo
  useEffect(() => {
    let isMounted = true;
    async function fetchOverview() {
      setIsLoadingOverview(true);
      try {
        const res = await fetch('/api/location-overview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            latitude: lat,
            longitude: lng,
            locationName: effectiveLocationName,
            city: effectiveCity,
            country: effectiveCountry,
            language: selectedLanguage.name,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.success) {
            setLocationOverview(data);
          }
        }
      } catch (err) {
        console.warn('Failed to load location overview:', err);
      } finally {
        if (isMounted) setIsLoadingOverview(false);
      }
    }

    fetchOverview();
    return () => {
      isMounted = false;
    };
  }, [lat, lng, effectiveLocationName, selectedLanguage.name]);

  return (
    <div id="home-screen" className="h-full flex flex-col overflow-y-auto py-1 space-y-2 select-none">
      {/* Location Hero Banner with Live Authentic Photo & Atmosphere */}
      <div
        style={{
          backgroundColor: 'var(--theme-card-bg)',
          borderColor: 'var(--theme-card-border)',
        }}
        className="shrink-0 rounded-2xl border shadow-xl overflow-hidden flex flex-col sm:flex-row items-stretch backdrop-blur-xl transition-colors"
      >
        {/* Location Authentic Photo */}
        <div
          style={{ backgroundColor: 'var(--theme-card-bg-subtle)' }}
          className="relative w-full sm:w-48 h-32 sm:h-auto shrink-0 overflow-hidden flex items-center justify-center"
        >
          <PlaceCardImage
            placeName={effectiveCity && effectiveCity !== 'Local Area' ? effectiveCity : effectiveLocationName}
            cityName={effectiveCity}
            initialImageUrl={locationOverview?.photoUrl}
            size="full"
            className="w-full h-full object-cover !rounded-none"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent sm:hidden pointer-events-none" />
          {isManualLocationMode ? (
            <div className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full theme-badge-gold text-[9.5px] font-bold flex items-center gap-1 z-10 pointer-events-none shadow-md">
              <MapPin className="w-3 h-3 text-[var(--theme-accent-primary)]" />
              <span>Selected City</span>
            </div>
          ) : (
            <div className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full theme-badge-teal text-[9.5px] font-bold flex items-center gap-1 z-10 pointer-events-none shadow-md">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--theme-accent-secondary)] animate-ping" />
              <span>Live Location</span>
            </div>
          )}
        </div>

        {/* Location Text Details & Primary Actions */}
        <div className="p-3 sm:p-3.5 flex-1 flex flex-col justify-between space-y-1.5 min-w-0">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--theme-accent-primary)] flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[var(--theme-accent-primary)] shrink-0" />
                  <span>{isManualLocationMode ? 'Destination' : 'Location'}</span>
                </span>
                <span className="px-2 py-0.5 rounded-full theme-badge-teal text-[10px] font-medium truncate">
                  {locationOverview?.currentAtmosphere || 'Heritage Precinct'}
                </span>
              </div>

              {onOpenCityGuide && (
                <button
                  id="btn-home-explore-city"
                  onClick={() => onOpenCityGuide(effectiveCity)}
                  style={{
                    backgroundColor: 'var(--theme-card-bg-subtle)',
                    borderColor: 'var(--theme-card-border-glow)',
                    color: 'var(--theme-accent-secondary)',
                  }}
                  className="px-2.5 py-1 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all shadow-sm hover:brightness-110"
                  title={`Explore overview and detailed guide for ${effectiveCity}`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-[var(--theme-accent-primary)]" />
                  <span>Explore City</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-serif font-bold text-[var(--theme-text-title)] truncate">
                {effectiveLocationName}
              </h2>
            </div>

            <p className="text-xs text-[var(--theme-text-body)] line-clamp-2 leading-relaxed">
              {locationOverview?.description ? (
                <WordByWordText text={locationOverview.description} />
              ) : isManualLocationMode ? (
                `Welcome to ${effectiveLocationName}. Discover real local spots, heritage monuments, and culinary delights in ${effectiveCity} in ${selectedLanguage.nativeName}.`
              ) : (
                `Welcome to ${effectiveLocationName}. Discover real local spots around your GPS and snap any sight for instant voice narration in ${selectedLanguage.nativeName}.`
              )}
            </p>
          </div>

          {/* Action Buttons Horizontally in One Line */}
          <div className="flex items-center gap-2 pt-1 w-full flex-nowrap">
            <button
              id="btn-home-camera-scanner"
              onClick={() => setActiveTab('camera')}
              className="flex-1 min-w-0 py-2 px-2.5 rounded-xl theme-btn-primary font-extrabold text-[11px] sm:text-xs shadow-lg active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
              title="Click or upload sight photo for instant AI audio guide"
            >
              <Camera className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Click / Upload Sight</span>
            </button>

            <button
              id="btn-home-view-nearby-spots"
              onClick={() => setActiveTab('nearby')}
              style={{
                backgroundColor: 'var(--theme-card-bg-subtle)',
                borderColor: 'var(--theme-card-border)',
                color: 'var(--theme-accent-secondary)',
              }}
              className="flex-1 min-w-0 py-2 px-2.5 rounded-xl border font-bold text-[11px] sm:text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap active:scale-95 shadow-sm hover:border-[var(--theme-card-border-glow)]"
              title="Open attractions radar"
            >
              <NavIcon className="w-3.5 h-3.5 text-[var(--theme-accent-secondary)] shrink-0" />
              <span className="truncate">Attractions</span>
            </button>

            <button
              id="btn-home-view-settings-tab"
              onClick={() => setActiveTab('settings')}
              style={{
                backgroundColor: 'var(--theme-card-bg-subtle)',
                borderColor: 'var(--theme-card-border)',
                color: 'var(--theme-text-muted)',
              }}
              className="py-2 px-2.5 rounded-xl border font-bold text-[11px] sm:text-xs transition-all flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap active:scale-95 hover:text-[var(--theme-text-title)]"
              title="Change destination, language, or GPS mode in Settings"
            >
              <Sliders className="w-3.5 h-3.5 text-[var(--theme-accent-primary)] shrink-0" />
              <span className="hidden xs:inline">Settings</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Explorer Onboarding & Personalization Strip */}
      <div
        style={{
          backgroundColor: 'var(--theme-card-bg)',
          borderColor: 'var(--theme-card-border)',
        }}
        className="shrink-0 rounded-2xl border p-2.5 sm:p-3 flex flex-wrap items-center justify-between gap-2 backdrop-blur-xl shadow-md"
      >
        <div className="flex items-center gap-2 min-w-0 text-xs">
          <UserCheck className="w-4 h-4 text-[var(--theme-accent-secondary)] shrink-0" />
          <span className="font-semibold text-[var(--theme-text-title)] truncate">
            {userProfile && userProfile.authMethod !== 'guest'
              ? `Explorer: ${userProfile.name}`
              : 'Exploring as Guest'}
          </span>
          <span className="text-[var(--theme-text-muted)] hidden sm:inline">·</span>
          <span className="text-[11px] text-[var(--theme-text-muted)] hidden sm:inline truncate">
            {userProfile && userProfile.authMethod !== 'guest'
              ? 'Preferences synced in Settings'
              : 'Sign in once to save preferences'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {onReplayIntro && (
            <button
              id="btn-home-app-intro"
              type="button"
              onClick={onReplayIntro}
              style={{
                backgroundColor: 'var(--theme-card-bg-subtle)',
                borderColor: 'var(--theme-card-border)',
                color: 'var(--theme-text-body)',
              }}
              className="px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 cursor-pointer hover:border-[var(--theme-card-border-glow)] transition-all"
            >
              <BookOpen className="w-3.5 h-3.5 text-[var(--theme-accent-primary)]" />
              <span>App Intro &amp; Speech</span>
            </button>
          )}

          {onReplayTour && (
            <button
              id="btn-home-app-tour"
              type="button"
              onClick={onReplayTour}
              style={{
                backgroundColor: 'var(--theme-card-bg-subtle)',
                borderColor: 'var(--theme-card-border)',
                color: 'var(--theme-text-body)',
              }}
              className="px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 cursor-pointer hover:border-[var(--theme-card-border-glow)] transition-all"
            >
              <Compass className="w-3.5 h-3.5 text-[var(--theme-accent-secondary)]" />
              <span>Screen Tour</span>
            </button>
          )}

          {onOpenLoginSetup && (!userProfile || userProfile.authMethod === 'guest') && (
            <button
              id="btn-home-complete-signin"
              type="button"
              onClick={onOpenLoginSetup}
              className="px-3 py-1.5 rounded-xl theme-btn-primary text-[11px] font-bold cursor-pointer whitespace-nowrap"
            >
              Sign In &amp; Setup
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
