import React, { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import {
  AppTab,
  Language,
  RecognitionResult,
  LocationCoords,
  GuideOutputMode,
  GuideSettings,
  ThemePreset,
  UserProfile,
  OnboardingState,
  SavedLocationPreference,
} from './types';
import { SUPPORTED_LANGUAGES, getLanguageByCode } from './data/languages';
import { Navigation } from './components/Navigation';
import { HomeScreen } from './components/HomeScreen';
import { CameraScreen } from './components/CameraScreen';
import { ExplanationView } from './components/ExplanationView';
import { AIChatScreen } from './components/AIChatScreen';
import { MapView } from './components/MapView';
import { HistoryScreen } from './components/HistoryScreen';
import { GuideSettingsScreen } from './components/GuideSettingsScreen';
import { NearbyAttractionsScreen } from './components/NearbyAttractionsScreen';
import { CityExplorerScreen } from './components/CityExplorerScreen';
import { CityGuideModal } from './components/CityGuideModal';
import { LanguageSelectionModal } from './components/LanguageSelectionModal';
import { AppIntroductionPage } from './components/AppIntroductionPage';
import { AppTourOverlay } from './components/AppTourOverlay';
import { LoginOnboardingScreen, LoginCompletionPayload } from './components/LoginOnboardingScreen';
import { DeviceExactLocation, getDeviceExactLocation, DEFAULT_FALLBACK_LOCATION } from './utils/geolocation';
import { auth, googleProvider } from './firebase';
import {
  STORAGE_KEYS,
  DEFAULT_GUIDE_SETTINGS,
  loadLocalUserProfile,
  saveLocalUserProfile,
  loadLocalOnboardingState,
  saveLocalOnboardingState,
  loadLocalLocationPref,
  saveLocalLocationPref,
  loadLocalLanguageCode,
  saveLocalLanguageCode,
  loadUserFromFirestore,
  saveUserToFirestore,
  getPresetForTravelerType,
} from './utils/userPersistence';

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('home');
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(() =>
    getLanguageByCode(loadLocalLanguageCode())
  );
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);

  const [currentTheme, setCurrentTheme] = useState<ThemePreset>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.THEME) as ThemePreset;
      if (saved && ['celestial', 'sunset', 'emerald', 'daylight'].includes(saved)) {
        return saved;
      }
    } catch {
      // ignore storage errors
    }
    return 'celestial';
  });

  const [guideSettings, setGuideSettings] = useState<GuideSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (saved) {
        return { ...DEFAULT_GUIDE_SETTINGS, ...JSON.parse(saved) };
      }
    } catch {
      // ignore
    }
    return { ...DEFAULT_GUIDE_SETTINGS };
  });

  const [outputMode, setOutputMode] = useState<GuideOutputMode>(() => guideSettings.outputMode || 'both');

  // Account, Profile, Onboarding & Location Preference State
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => loadLocalUserProfile());
  const [onboardingState, setOnboardingState] = useState<OnboardingState>(() => loadLocalOnboardingState());
  const [locationPref, setLocationPref] = useState<SavedLocationPreference>(() => loadLocalLocationPref());
  const [replayMode, setReplayMode] = useState<'none' | 'intro' | 'tour' | 'login'>('none');
  const [statusToast, setStatusToast] = useState<string | null>(null);
  const isInteractiveSignInRef = useRef(false);

  // City Explorer & Two-Tier City Guide Modal States
  const [isManualLocationMode, setIsManualLocationMode] = useState<boolean>(
    () => locationPref.locationMode === 'manual'
  );
  const [isCityGuideModalOpen, setIsCityGuideModalOpen] = useState<boolean>(false);
  const [activeCityGuideTarget, setActiveCityGuideTarget] = useState<string>(
    locationPref.manualCityName || 'Nagpur'
  );
  const [activeStateGuideTarget, setActiveStateGuideTarget] = useState<string>(
    locationPref.manualStateName || 'Maharashtra'
  );
  const [activeCountryGuideTarget, setActiveCountryGuideTarget] = useState<string>(
    locationPref.manualCountryName || 'India'
  );

  const [currentExplanation, setCurrentExplanation] = useState<RecognitionResult | null>(null);
  const [visitedHistory, setVisitedHistory] = useState<RecognitionResult[]>([]);
  const [chatQuestion, setChatQuestion] = useState<string | undefined>(undefined);

  // Exact Device Location (Restores saved manual destination if manual mode was saved)
  const [deviceExactLocation, setDeviceExactLocation] = useState<DeviceExactLocation | null>(() => {
    if (
      locationPref.locationMode === 'manual' &&
      locationPref.manualCityName &&
      typeof locationPref.manualLatitude === 'number' &&
      typeof locationPref.manualLongitude === 'number'
    ) {
      return {
        latitude: locationPref.manualLatitude,
        longitude: locationPref.manualLongitude,
        locationName: [
          locationPref.manualCityName,
          locationPref.manualStateName,
          locationPref.manualCountryName || 'India',
        ]
          .filter(Boolean)
          .join(', '),
        city: locationPref.manualCityName,
        state: locationPref.manualStateName || '',
        country: locationPref.manualCountryName || 'India',
        isLiveGps: false,
      };
    }
    return DEFAULT_FALLBACK_LOCATION;
  });

  const [locationCoords, setLocationCoords] = useState<LocationCoords | null>(() => {
    if (
      locationPref.locationMode === 'manual' &&
      locationPref.manualCityName &&
      typeof locationPref.manualLatitude === 'number' &&
      typeof locationPref.manualLongitude === 'number'
    ) {
      return {
        latitude: locationPref.manualLatitude,
        longitude: locationPref.manualLongitude,
        city: locationPref.manualCityName,
        country: locationPref.manualCountryName || 'India',
      };
    }
    return {
      latitude: DEFAULT_FALLBACK_LOCATION.latitude,
      longitude: DEFAULT_FALLBACK_LOCATION.longitude,
      city: DEFAULT_FALLBACK_LOCATION.city,
      country: DEFAULT_FALLBACK_LOCATION.country,
    };
  });

  const showToast = (msg: string) => {
    setStatusToast(msg);
  };

  useEffect(() => {
    if (!statusToast) return;
    const t = setTimeout(() => setStatusToast(null), 3400);
    return () => clearTimeout(t);
  }, [statusToast]);

  // Helper to persist state changes into localStorage & Firestore if signed in
  const syncCloudIfAuthenticated = (overrides: {
    profile?: UserProfile | null;
    settings?: GuideSettings;
    locPref?: SavedLocationPreference;
    theme?: ThemePreset;
    onboarding?: OnboardingState;
  }) => {
    const targetProfile = overrides.profile !== undefined ? overrides.profile : userProfile;
    const targetSettings = overrides.settings || guideSettings;
    const targetLocPref = overrides.locPref || locationPref;
    const targetTheme = overrides.theme || currentTheme;
    const targetOnboarding = overrides.onboarding || onboardingState;

    const uid = auth.currentUser?.uid;
    if (uid && targetProfile && targetProfile.authMethod === 'google' && targetOnboarding.hasCompletedLoginSetup) {
      saveUserToFirestore({
        uid,
        profile: targetProfile,
        guideSettings: targetSettings,
        locationPref: targetLocPref,
        theme: targetTheme,
        onboardingState: targetOnboarding,
      }).catch((err) => {
        console.warn('Background Firestore sync failed:', err);
      });
    }
  };

  const handleSelectTheme = (theme: ThemePreset) => {
    setCurrentTheme(theme);
    try {
      localStorage.setItem(STORAGE_KEYS.THEME, theme);
    } catch {
      // ignore
    }
    syncCloudIfAuthenticated({ theme });
  };

  const handleSelectLanguage = (lang: Language) => {
    setSelectedLanguage(lang);
    saveLocalLanguageCode(lang.code);
    if (userProfile) {
      const updatedProfile: UserProfile = {
        ...userProfile,
        preferredLanguage: lang.code,
        updatedAt: new Date().toISOString(),
      };
      setUserProfile(updatedProfile);
      saveLocalUserProfile(updatedProfile);
      syncCloudIfAuthenticated({ profile: updatedProfile });
    }
  };

  // Keep outputMode in sync with guideSettings
  const handleToggleOutputMode = (mode: GuideOutputMode) => {
    setOutputMode(mode);
    setGuideSettings((prev) => {
      const updated = { ...prev, outputMode: mode };
      try {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
      } catch {
        // ignore
      }
      syncCloudIfAuthenticated({ settings: updated });
      return updated;
    });
  };

  const handleUpdateSettings = (newSettings: GuideSettings) => {
    setGuideSettings(newSettings);
    setOutputMode(newSettings.outputMode);
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(newSettings));
    } catch {
      // ignore
    }
    syncCloudIfAuthenticated({ settings: newSettings });
  };

  // Fetch device's exact location on initial load when GPS mode is active
  const refreshDeviceLocation = async () => {
    try {
      const exactLoc = await getDeviceExactLocation();
      setDeviceExactLocation(exactLoc);
      setLocationCoords({
        latitude: exactLoc.latitude,
        longitude: exactLoc.longitude,
        city: exactLoc.city,
        country: exactLoc.country,
      });
      setIsManualLocationMode(false);
      const nextLocPref: SavedLocationPreference = { locationMode: 'gps' };
      setLocationPref(nextLocPref);
      saveLocalLocationPref(nextLocPref);
    } catch (e) {
      console.warn('Location detection fallback:', e);
    }
  };

  useEffect(() => {
    if (locationPref.locationMode !== 'manual') {
      refreshDeviceLocation();
    }
  }, []);

  // Rehydrate returning Firebase Auth users automatically on startup
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser || isInteractiveSignInRef.current) return;

      try {
        const cloud = await loadUserFromFirestore(firebaseUser.uid);
        if (cloud.profile && cloud.onboardingState?.hasCompletedLoginSetup && cloud.guideSettings) {
          const restoredLang = getLanguageByCode(cloud.profile.preferredLanguage);
          const nextOnboarding: OnboardingState = {
            hasSeenIntro: true,
            hasCompletedTour: true,
            hasCompletedLoginSetup: true,
            skippedDirectly: false,
          };

          setUserProfile(cloud.profile);
          setGuideSettings(cloud.guideSettings);
          setOutputMode(cloud.guideSettings.outputMode || 'both');
          setSelectedLanguage(restoredLang);
          setOnboardingState(nextOnboarding);

          saveLocalUserProfile(cloud.profile);
          saveLocalLanguageCode(restoredLang.code);
          saveLocalOnboardingState(nextOnboarding);
          try {
            localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(cloud.guideSettings));
          } catch {
            // ignore
          }

          if (cloud.theme) {
            setCurrentTheme(cloud.theme);
            try {
              localStorage.setItem(STORAGE_KEYS.THEME, cloud.theme);
            } catch {
              // ignore
            }
          }

          if (cloud.locationPref) {
            setLocationPref(cloud.locationPref);
            saveLocalLocationPref(cloud.locationPref);
            if (
              cloud.locationPref.locationMode === 'manual' &&
              cloud.locationPref.manualCityName &&
              typeof cloud.locationPref.manualLatitude === 'number' &&
              typeof cloud.locationPref.manualLongitude === 'number'
            ) {
              setIsManualLocationMode(true);
              setDeviceExactLocation({
                latitude: cloud.locationPref.manualLatitude,
                longitude: cloud.locationPref.manualLongitude,
                locationName: [
                  cloud.locationPref.manualCityName,
                  cloud.locationPref.manualStateName,
                  cloud.locationPref.manualCountryName || 'India',
                ]
                  .filter(Boolean)
                  .join(', '),
                city: cloud.locationPref.manualCityName,
                state: cloud.locationPref.manualStateName || '',
                country: cloud.locationPref.manualCountryName || 'India',
                isLiveGps: false,
              });
              setLocationCoords({
                latitude: cloud.locationPref.manualLatitude,
                longitude: cloud.locationPref.manualLongitude,
                city: cloud.locationPref.manualCityName,
                country: cloud.locationPref.manualCountryName || 'India',
              });
            }
          }
        }
      } catch (err) {
        console.warn('Cloud session hydration error:', err);
      }
    });

    return () => unsubscribe();
  }, []);

  // Open City Guide Modal for any given city
  const handleOpenCityGuide = (cityName: string, stateName?: string, countryName: string = 'India') => {
    setActiveCityGuideTarget(cityName || deviceExactLocation?.city || 'Nagpur');
    setActiveStateGuideTarget(stateName || deviceExactLocation?.state || 'Maharashtra');
    setActiveCountryGuideTarget(countryName || deviceExactLocation?.country || 'India');
    setIsCityGuideModalOpen(true);
  };

  // Manually select a city and update the whole app context + persist
  const handleSelectCityManually = (cityData: {
    cityName: string;
    state?: string;
    country: string;
    latitude: number;
    longitude: number;
    locationName: string;
  }) => {
    setIsManualLocationMode(true);
    setDeviceExactLocation({
      latitude: cityData.latitude,
      longitude: cityData.longitude,
      locationName: cityData.locationName,
      city: cityData.cityName,
      state: cityData.state || '',
      country: cityData.country || 'India',
      isLiveGps: false,
    });
    setLocationCoords({
      latitude: cityData.latitude,
      longitude: cityData.longitude,
      city: cityData.cityName,
      country: cityData.country,
    });

    const nextLocPref: SavedLocationPreference = {
      locationMode: 'manual',
      manualCityName: cityData.cityName,
      manualStateName: cityData.state,
      manualCountryName: cityData.country,
      manualLatitude: cityData.latitude,
      manualLongitude: cityData.longitude,
    };
    setLocationPref(nextLocPref);
    saveLocalLocationPref(nextLocPref);
    syncCloudIfAuthenticated({ locPref: nextLocPref });
  };

  const handleSetLocationMode = (mode: 'gps' | 'manual') => {
    if (mode === 'gps') {
      refreshDeviceLocation().then(() => {
        syncCloudIfAuthenticated({ locPref: { locationMode: 'gps' } });
      });
    } else {
      setIsManualLocationMode(true);
      const nextLocPref: SavedLocationPreference = {
        ...locationPref,
        locationMode: 'manual',
        manualCityName: locationPref.manualCityName || deviceExactLocation?.city,
        manualStateName: locationPref.manualStateName || deviceExactLocation?.state,
        manualCountryName: locationPref.manualCountryName || deviceExactLocation?.country,
        manualLatitude: locationPref.manualLatitude ?? deviceExactLocation?.latitude,
        manualLongitude: locationPref.manualLongitude ?? deviceExactLocation?.longitude,
      };
      setLocationPref(nextLocPref);
      saveLocalLocationPref(nextLocPref);
      syncCloudIfAuthenticated({ locPref: nextLocPref });
    }
  };

  const handleScanComplete = (result: RecognitionResult) => {
    setCurrentExplanation(result);

    const isNewSight = !visitedHistory.some(
      (item) => item.id === result.id || item.title === result.title
    );
    setVisitedHistory((prev) => {
      if (!prev.some((item) => item.id === result.id || item.title === result.title)) {
        return [result, ...prev];
      }
      return prev;
    });

    if (isNewSight && userProfile) {
      const updatedProfile: UserProfile = {
        ...userProfile,
        visitedCount: (userProfile.visitedCount || 0) + 1,
        updatedAt: new Date().toISOString(),
      };
      setUserProfile(updatedProfile);
      saveLocalUserProfile(updatedProfile);
      syncCloudIfAuthenticated({ profile: updatedProfile });
    }
  };

  const handleClearMemory = () => {
    setVisitedHistory([]);
  };

  const handleOpenChatWithQuestion = (q: string) => {
    setChatQuestion(q);
    setActiveTab('chat');
  };

  // Onboarding Orchestration Callbacks
  const updateOnboardingState = (next: OnboardingState) => {
    setOnboardingState(next);
    saveLocalOnboardingState(next);
  };

  const handleIntroStartTour = () => {
    if (replayMode === 'intro') {
      setReplayMode('tour');
      return;
    }
    updateOnboardingState({ ...onboardingState, hasSeenIntro: true });
    setReplayMode('none');
  };

  const handleSkipIntroOnly = () => {
    if (replayMode === 'intro') {
      setReplayMode('none');
      return;
    }
    updateOnboardingState({ ...onboardingState, hasSeenIntro: true });
    setReplayMode('none');
  };

  const handleIntroSkipToLogin = () => {
    updateOnboardingState({
      ...onboardingState,
      hasSeenIntro: true,
      hasCompletedTour: true,
    });
    setReplayMode('none');
  };

  const handleSkipAllToExplore = () => {
    const alreadyEnteredApp =
      onboardingState.hasCompletedLoginSetup || onboardingState.skippedDirectly;

    if ((replayMode === 'intro' || replayMode === 'tour') && alreadyEnteredApp) {
      setReplayMode('none');
      return;
    }

    if (replayMode === 'login' && onboardingState.hasCompletedLoginSetup) {
      setReplayMode('none');
      setActiveTab('home');
      return;
    }

    if (!userProfile) {
      const guestProfile: UserProfile = {
        authMethod: 'guest',
        name: 'Guest Explorer',
        email: 'guest@charaiva.app',
        preferredLanguage: selectedLanguage.code,
        travelerType: 'casual_tourist',
        visitedCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        badges: [],
      };
      setUserProfile(guestProfile);
      saveLocalUserProfile(guestProfile);
    }
    updateOnboardingState({
      hasSeenIntro: true,
      hasCompletedTour: true,
      hasCompletedLoginSetup: onboardingState.hasCompletedLoginSetup,
      skippedDirectly: !onboardingState.hasCompletedLoginSetup,
    });
    setReplayMode('none');
    setActiveTab('home');
  };

  const handleCompleteTour = () => {
    if (replayMode === 'tour') {
      setReplayMode('none');
      return;
    }
    updateOnboardingState({
      ...onboardingState,
      hasSeenIntro: true,
      hasCompletedTour: true,
    });
    setReplayMode('none');
  };

  const handleCompleteLogin = async (payload: LoginCompletionPayload) => {
    const nextOnboarding: OnboardingState = {
      hasSeenIntro: true,
      hasCompletedTour: true,
      hasCompletedLoginSetup: true,
      skippedDirectly: false,
    };

    setUserProfile(payload.profile);
    setGuideSettings(payload.guideSettings);
    setOutputMode(payload.guideSettings.outputMode || 'both');
    setSelectedLanguage(payload.language);
    setLocationPref(payload.locationPref);
    setCurrentTheme(payload.theme);
    setOnboardingState(nextOnboarding);
    setReplayMode('none');
    setActiveTab('home');

    // Sync to localStorage
    saveLocalUserProfile(payload.profile);
    saveLocalLanguageCode(payload.language.code);
    saveLocalLocationPref(payload.locationPref);
    saveLocalOnboardingState(nextOnboarding);
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(payload.guideSettings));
      localStorage.setItem(STORAGE_KEYS.THEME, payload.theme);
    } catch {
      // ignore
    }

    // Apply location mode cleanly
    if (
      payload.locationPref.locationMode === 'manual' &&
      payload.locationPref.manualCityName &&
      typeof payload.locationPref.manualLatitude === 'number' &&
      typeof payload.locationPref.manualLongitude === 'number'
    ) {
      setIsManualLocationMode(true);
      setDeviceExactLocation({
        latitude: payload.locationPref.manualLatitude,
        longitude: payload.locationPref.manualLongitude,
        locationName: [
          payload.locationPref.manualCityName,
          payload.locationPref.manualStateName,
          payload.locationPref.manualCountryName || 'India',
        ]
          .filter(Boolean)
          .join(', '),
        city: payload.locationPref.manualCityName,
        state: payload.locationPref.manualStateName || '',
        country: payload.locationPref.manualCountryName || 'India',
        isLiveGps: false,
      });
      setLocationCoords({
        latitude: payload.locationPref.manualLatitude,
        longitude: payload.locationPref.manualLongitude,
        city: payload.locationPref.manualCityName,
        country: payload.locationPref.manualCountryName || 'India',
      });
    } else {
      setIsManualLocationMode(false);
      refreshDeviceLocation();
    }

    // Write to Firestore if authenticated via Google
    if (
      payload.profile.uid &&
      auth.currentUser?.uid === payload.profile.uid &&
      !payload.isExistingCloudRestore
    ) {
      await saveUserToFirestore({
        uid: payload.profile.uid,
        profile: payload.profile,
        guideSettings: payload.guideSettings,
        locationPref: payload.locationPref,
        theme: payload.theme,
        onboardingState: nextOnboarding,
      });
    }

    showToast(
      payload.isExistingCloudRestore
        ? `Welcome back, ${payload.profile.name}! Settings restored from cloud.`
        : `Preferences synced to Settings for ${payload.profile.name}.`
    );
  };

  // Profile updates directly from Settings screen
  const handleUpdateProfileInSettings = (updatedProfile: UserProfile, applyPresetTopics = false) => {
    const nextOnboarding: OnboardingState = {
      hasSeenIntro: true,
      hasCompletedTour: true,
      hasCompletedLoginSetup: true,
      skippedDirectly: false,
    };

    let nextSettings = guideSettings;
    if (applyPresetTopics) {
      const preset = getPresetForTravelerType(updatedProfile.travelerType);
      nextSettings = {
        ...guideSettings,
        persona: preset.recommendedPersona,
        topics: { ...preset.topics },
      };
      setGuideSettings(nextSettings);
      try {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(nextSettings));
      } catch {
        // ignore
      }
    }

    setUserProfile(updatedProfile);
    saveLocalUserProfile(updatedProfile);
    updateOnboardingState(nextOnboarding);
    syncCloudIfAuthenticated({
      profile: updatedProfile,
      settings: nextSettings,
      onboarding: nextOnboarding,
    });
    showToast('Profile details saved and synced to Settings.');
  };

  // Google Cloud linking or Sign-In triggered from Settings -> Profile
  const handleSignInWithGoogleFromSettings = async (): Promise<{ restored?: boolean; error?: string }> => {
    isInteractiveSignInRef.current = true;
    try {
      const res = await signInWithPopup(auth, googleProvider);
      const user = res.user;
      if (!user) return { error: 'Could not complete Google Sign-In.' };

      const cloud = await loadUserFromFirestore(user.uid);
      if (cloud.profile && cloud.onboardingState?.hasCompletedLoginSetup && cloud.guideSettings) {
        const restoredLang = getLanguageByCode(cloud.profile.preferredLanguage);
        await handleCompleteLogin({
          profile: cloud.profile,
          guideSettings: cloud.guideSettings,
          language: restoredLang,
          locationPref: cloud.locationPref || { locationMode: 'gps' },
          theme: cloud.theme || currentTheme,
          isExistingCloudRestore: true,
        });
        return { restored: true };
      }

      const upgradedProfile: UserProfile = {
        uid: user.uid,
        authMethod: 'google',
        name:
          userProfile?.name && userProfile.name !== 'Guest Explorer'
            ? userProfile.name
            : user.displayName || 'Explorer',
        email:
          userProfile?.email && userProfile.email !== 'guest@charaiva.app'
            ? userProfile.email
            : user.email || '',
        preferredLanguage: selectedLanguage.code,
        travelerType: userProfile?.travelerType || 'casual_tourist',
        visitedCount: userProfile?.visitedCount ?? visitedHistory.length,
        createdAt: userProfile?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        badges: userProfile?.badges || [],
      };
      const completedOnboarding: OnboardingState = {
        hasSeenIntro: true,
        hasCompletedTour: true,
        hasCompletedLoginSetup: true,
        skippedDirectly: false,
      };
      setUserProfile(upgradedProfile);
      saveLocalUserProfile(upgradedProfile);
      updateOnboardingState(completedOnboarding);

      await saveUserToFirestore({
        uid: user.uid,
        profile: upgradedProfile,
        guideSettings,
        locationPref,
        theme: currentTheme,
        onboardingState: completedOnboarding,
      });

      showToast('Connected with Google Cloud — Settings backed up.');
      return { restored: false };
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        return { error: 'Google sign-in popup was closed before completing.' };
      }
      return { error: 'Google Sign-In could not connect right now.' };
    } finally {
      isInteractiveSignInRef.current = false;
    }
  };

  const handleLogoutAndResetOnboarding = async () => {
    try {
      await signOut(auth);
    } catch {
      // ignore if already signed out
    }
    setUserProfile(null);
    saveLocalUserProfile(null);
    setReplayMode('none');
    setCurrentExplanation(null);
    updateOnboardingState({
      hasSeenIntro: true,
      hasCompletedTour: true,
      hasCompletedLoginSetup: false,
      skippedDirectly: false,
    });
    showToast('Signed out. Ready for a new explorer profile.');
  };

  // Determine which view fills #charaiva-app-root
  const showIntroScreen = replayMode === 'intro' || !onboardingState.hasSeenIntro;
  const showTourScreen = !showIntroScreen && (replayMode === 'tour' || !onboardingState.hasCompletedTour);
  const showLoginScreen =
    !showIntroScreen &&
    !showTourScreen &&
    (replayMode === 'login' || (!onboardingState.hasCompletedLoginSetup && !onboardingState.skippedDirectly));

  return (
    <div
      id="charaiva-app-root"
      data-theme={currentTheme}
      className="relative h-[100dvh] max-h-[100dvh] w-full overflow-hidden font-sans flex flex-col selection:bg-amber-400 selection:text-slate-950 transition-colors duration-300"
    >
      {/* Dynamic Ambient Background Glows */}
      <div
        className="theme-ambient-glow -top-24 -left-24 w-96 h-96"
        style={{ backgroundColor: 'var(--theme-ambient-glow-1)' }}
      />
      <div
        className="theme-ambient-glow top-1/3 -right-32 w-96 h-96"
        style={{ backgroundColor: 'var(--theme-ambient-glow-2)' }}
      />
      <div
        className="theme-ambient-glow -bottom-32 left-1/4 w-96 h-96"
        style={{ backgroundColor: 'var(--theme-ambient-glow-1)' }}
      />

      {showIntroScreen ? (
        <AppIntroductionPage
          selectedLanguage={selectedLanguage}
          guideSettings={guideSettings}
          isReplayMode={replayMode === 'intro'}
          onOpenLanguageModal={() => setIsLanguageModalOpen(true)}
          onStartTour={handleIntroStartTour}
          onSkipIntroOnly={handleSkipIntroOnly}
          onSkipToLogin={handleIntroSkipToLogin}
          onSkipAllToApp={handleSkipAllToExplore}
        />
      ) : showTourScreen ? (
        <AppTourOverlay
          selectedLanguage={selectedLanguage}
          guideSettings={guideSettings}
          isReplayMode={replayMode === 'tour'}
          onCompleteTour={handleCompleteTour}
          onSkipTourToExploreNow={handleSkipAllToExplore}
          onBackToIntro={() => {
            if (replayMode === 'tour') {
              setReplayMode('intro');
            } else {
              updateOnboardingState({ ...onboardingState, hasSeenIntro: false });
            }
          }}
        />
      ) : showLoginScreen ? (
        <LoginOnboardingScreen
          initialProfile={userProfile}
          initialSettings={guideSettings}
          selectedLanguage={selectedLanguage}
          onSelectLanguage={handleSelectLanguage}
          onOpenLanguageModal={() => setIsLanguageModalOpen(true)}
          currentTheme={currentTheme}
          onSelectTheme={handleSelectTheme}
          initialLocationPref={locationPref}
          onCompleteLogin={handleCompleteLogin}
          onSkipAsGuest={handleSkipAllToExplore}
          onGooglePopupStarted={(active) => {
            isInteractiveSignInRef.current = active;
          }}
          onReviewIntro={() => setReplayMode('intro')}
          onReviewTour={() => setReplayMode('tour')}
        />
      ) : (
        <>
          {/* Top Header */}
          <Navigation
            activeTab={activeTab}
            setActiveTab={(tab) => {
              setActiveTab(tab);
              if (tab !== 'home') {
                setCurrentExplanation(null);
              }
            }}
            selectedLanguage={selectedLanguage}
            onOpenLanguageModal={() => setIsLanguageModalOpen(true)}
            visitedMemoryCount={visitedHistory.length}
            outputMode={outputMode}
            onToggleOutputMode={handleToggleOutputMode}
            deviceExactLocation={deviceExactLocation}
            onOpenCityGuide={(city) => handleOpenCityGuide(city)}
            currentTheme={currentTheme}
            onSelectTheme={handleSelectTheme}
          />

          {/* Main Content Area - non-scrolling layout contained in remaining viewport */}
          <main className="relative z-10 flex-1 overflow-hidden min-h-0 flex flex-col w-full max-w-5xl mx-auto px-2">
            {/* If showing a specific camera scan result */}
            {currentExplanation && activeTab === 'home' ? (
              <ExplanationView
                landmark={currentExplanation}
                selectedLanguage={selectedLanguage}
                onBack={() => setCurrentExplanation(null)}
                onOpenChatWithQuestion={handleOpenChatWithQuestion}
                onOpenLanguageModal={() => setIsLanguageModalOpen(true)}
                outputMode={outputMode}
                onToggleOutputMode={handleToggleOutputMode}
                guideSettings={guideSettings}
                onSaveToHistory={(landmark) => {
                  if (!visitedHistory.some((h) => h.id === landmark.id)) {
                    setVisitedHistory((prev) => [landmark, ...prev]);
                  }
                }}
                isSavedInHistory={visitedHistory.some((h) => h.id === currentExplanation.id)}
              />
            ) : (
              <>
                {activeTab === 'home' && (
                  <HomeScreen
                    setActiveTab={setActiveTab}
                    selectedLanguage={selectedLanguage}
                    onSelectSampleLandmark={(landmark) => {
                      handleScanComplete(landmark);
                    }}
                    locationCoords={locationCoords}
                    deviceExactLocation={deviceExactLocation}
                    isManualLocationMode={isManualLocationMode}
                    visitedHistory={visitedHistory}
                    onClearMemory={handleClearMemory}
                    onRefreshLocation={refreshDeviceLocation}
                    onOpenCityGuide={(city) => handleOpenCityGuide(city)}
                    userProfile={userProfile}
                    onReplayIntro={() => setReplayMode('intro')}
                    onReplayTour={() => setReplayMode('tour')}
                    onOpenLoginSetup={() => setReplayMode('login')}
                  />
                )}

                {activeTab === 'camera' && (
                  <CameraScreen
                    onScanComplete={(result) => {
                      handleScanComplete(result);
                    }}
                    locationCoords={locationCoords}
                    selectedLanguage={selectedLanguage}
                    visitedHistory={visitedHistory}
                    onBackToHome={() => setActiveTab('home')}
                    outputMode={outputMode}
                    onToggleOutputMode={handleToggleOutputMode}
                    guideSettings={guideSettings}
                    onOpenChatWithQuestion={handleOpenChatWithQuestion}
                  />
                )}

                {activeTab === 'chat' && (
                  <AIChatScreen
                    initialQuestion={chatQuestion}
                    landmarkContext={currentExplanation}
                    selectedLanguage={selectedLanguage}
                    visitedHistory={visitedHistory}
                    guideSettings={guideSettings}
                    onBackToHome={() => {
                      setChatQuestion(undefined);
                      setActiveTab('home');
                    }}
                  />
                )}

                {activeTab === 'map' && (
                  <MapView
                    locationCoords={locationCoords}
                    deviceExactLocation={deviceExactLocation}
                    isManualLocationMode={isManualLocationMode}
                    onSelectLandmarkToScan={(landmark) => {
                      handleScanComplete(landmark);
                      setActiveTab('home');
                    }}
                  />
                )}

                {activeTab === 'history' && (
                  <HistoryScreen
                    visitedHistory={visitedHistory}
                    selectedLanguage={selectedLanguage}
                    onSelectLandmarkToView={(landmark) => {
                      setCurrentExplanation(landmark);
                      setActiveTab('home');
                    }}
                    onClearHistory={handleClearMemory}
                  />
                )}

                {activeTab === 'city' && (
                  <CityExplorerScreen
                    currentCity={deviceExactLocation?.city || locationCoords?.city || 'Madurai'}
                    currentCountry={deviceExactLocation?.country || locationCoords?.country || 'India'}
                    currentLocationName={
                      deviceExactLocation?.locationName || locationCoords?.city || 'Current GPS Location'
                    }
                    isManualLocationMode={isManualLocationMode}
                    onSetLocationMode={handleSetLocationMode}
                    onSelectCity={handleSelectCityManually}
                    selectedLanguage={selectedLanguage}
                    onOpenCityGuideModal={(city, state, country) => handleOpenCityGuide(city, state, country)}
                    onProceedToNearby={() => setActiveTab('nearby')}
                    onProceedToMap={() => setActiveTab('map')}
                    onProceedToCamera={() => setActiveTab('camera')}
                    deviceExactLocation={deviceExactLocation}
                    onRefreshGpsLocation={refreshDeviceLocation}
                  />
                )}

                {activeTab === 'settings' && (
                  <GuideSettingsScreen
                    settings={guideSettings}
                    onUpdateSettings={handleUpdateSettings}
                    selectedLanguage={selectedLanguage}
                    onSelectLanguage={handleSelectLanguage}
                    outputMode={outputMode}
                    onToggleOutputMode={handleToggleOutputMode}
                    isManualLocationMode={isManualLocationMode}
                    onSetLocationMode={handleSetLocationMode}
                    onSelectCityManually={handleSelectCityManually}
                    deviceExactLocation={deviceExactLocation}
                    locationCoords={locationCoords}
                    onRefreshGpsLocation={refreshDeviceLocation}
                    currentTheme={currentTheme}
                    onSelectTheme={handleSelectTheme}
                    userProfile={userProfile}
                    onUpdateProfile={handleUpdateProfileInSettings}
                    isCloudSynced={userProfile?.authMethod === 'google'}
                    onSignInWithGoogle={handleSignInWithGoogleFromSettings}
                    onSwitchAccountLogin={() => setReplayMode('login')}
                    onLogoutAndResetOnboarding={handleLogoutAndResetOnboarding}
                    onReplayIntro={() => setReplayMode('intro')}
                    onReplayTour={() => setReplayMode('tour')}
                    visitedCount={visitedHistory.length}
                  />
                )}

                {activeTab === 'nearby' && (
                  <NearbyAttractionsScreen
                    locationCoords={locationCoords}
                    deviceExactLocation={deviceExactLocation}
                    isManualLocationMode={isManualLocationMode}
                    onRefreshDeviceLocation={refreshDeviceLocation}
                    selectedLanguage={selectedLanguage}
                    onSelectAttractionForGuide={(attraction) => {
                      handleOpenChatWithQuestion(
                        `Give me a detailed tour guide speech on ${attraction.title} in ${attraction.city}. Why is it significant?`
                      );
                    }}
                    onOpenChatWithQuestion={handleOpenChatWithQuestion}
                    onNavigateToPhotoGuide={() => setActiveTab('camera')}
                    onOpenCityGuide={(city) => handleOpenCityGuide(city)}
                    guideSettings={guideSettings}
                    outputMode={outputMode}
                  />
                )}
              </>
            )}
          </main>

          {/* Two-Tier City Guide Modal (Brief Overview + In-Depth Guide) */}
          <CityGuideModal
            isOpen={isCityGuideModalOpen}
            onClose={() => setIsCityGuideModalOpen(false)}
            cityName={activeCityGuideTarget}
            stateName={activeStateGuideTarget}
            countryName={activeCountryGuideTarget}
            selectedLanguage={selectedLanguage}
            guideSettings={guideSettings}
            onProceedToNearby={() => {
              setActiveTab('nearby');
            }}
          />
        </>
      )}

      {/* Subtle Sync / Onboarding Confirmation Banner */}
      {statusToast && (
        <div
          role="status"
          style={{
            backgroundColor: 'var(--theme-header-bg)',
            borderColor: 'var(--theme-accent-secondary)',
            color: 'var(--theme-text-title)',
          }}
          className="fixed bottom-16 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl border shadow-2xl text-xs font-semibold backdrop-blur-xl pointer-events-none"
        >
          {statusToast}
        </div>
      )}

      {/* Language Selection Modal (accessible from Intro, Login, and Main App) */}
      <LanguageSelectionModal
        isOpen={isLanguageModalOpen}
        onClose={() => setIsLanguageModalOpen(false)}
        selectedLanguage={selectedLanguage}
        onSelectLanguage={handleSelectLanguage}
      />
    </div>
  );
}
