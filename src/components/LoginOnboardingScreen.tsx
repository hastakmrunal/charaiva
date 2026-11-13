import React, { useState } from 'react';
import {
  User,
  Mail,
  Compass,
  Volume2,
  MapPin,
  HardDrive,
  ShieldCheck,
  Languages,
  Palette,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Headphones,
  FileText,
  Navigation,
  Cloud,
  AlertCircle,
  Loader2,
  Check,
} from 'lucide-react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import {
  GuideOutputMode,
  GuideSettings,
  Language,
  OnboardingState,
  SavedLocationPreference,
  ThemePreset,
  THEME_PRESETS,
  TravelerType,
  UserProfile,
} from '../types';
import { SUPPORTED_LANGUAGES } from '../data/languages';
import {
  getPresetForTravelerType,
  loadUserFromFirestore,
  TRAVELER_TYPE_PRESETS,
} from '../utils/userPersistence';

const POPULAR_DESTINATIONS = [
  { country: 'India', state: 'Tamil Nadu', city: 'Madurai', lat: 9.9195, lng: 78.1193, flag: '🇮🇳' },
  { country: 'India', state: 'Maharashtra', city: 'Nagpur', lat: 21.1458, lng: 79.0882, flag: '🇮🇳' },
  { country: 'India', state: 'Maharashtra', city: 'Mumbai', lat: 18.9220, lng: 72.8347, flag: '🇮🇳' },
  { country: 'India', state: 'Rajasthan', city: 'Jaipur', lat: 26.9124, lng: 75.7873, flag: '🇮🇳' },
  { country: 'India', state: 'Uttar Pradesh', city: 'Varanasi', lat: 25.3176, lng: 82.9739, flag: '🇮🇳' },
  { country: 'India', state: 'Uttar Pradesh', city: 'Agra', lat: 27.1767, lng: 78.0081, flag: '🇮🇳' },
  { country: 'India', state: 'Delhi NCR', city: 'New Delhi', lat: 28.6139, lng: 77.2090, flag: '🇮🇳' },
  { country: 'France', state: 'Île-de-France', city: 'Paris', lat: 48.8566, lng: 2.3522, flag: '🇫🇷' },
  { country: 'Japan', state: 'Kansai', city: 'Kyoto', lat: 35.0116, lng: 135.7681, flag: '🇯🇵' },
  { country: 'Japan', state: 'Kantō', city: 'Tokyo', lat: 35.6762, lng: 139.6503, flag: '🇯🇵' },
  { country: 'United Kingdom', state: 'England', city: 'London', lat: 51.5074, lng: -0.1278, flag: '🇬🇧' },
  { country: 'Italy', state: 'Lazio', city: 'Rome', lat: 41.9028, lng: 12.4964, flag: '🇮🇹' },
];

const QUICK_LANGUAGE_CODES = ['en', 'hi', 'ta', 'mr', 'bn', 'es', 'fr', 'ja'];

export interface LoginCompletionPayload {
  profile: UserProfile;
  guideSettings: GuideSettings;
  language: Language;
  locationPref: SavedLocationPreference;
  theme: ThemePreset;
  cloudOnboardingState?: OnboardingState;
  isExistingCloudRestore?: boolean;
}

interface LoginOnboardingScreenProps {
  initialProfile?: UserProfile | null;
  initialSettings: GuideSettings;
  selectedLanguage: Language;
  onSelectLanguage: (lang: Language) => void;
  onOpenLanguageModal: () => void;
  currentTheme: ThemePreset;
  onSelectTheme: (theme: ThemePreset) => void;
  initialLocationPref?: SavedLocationPreference;
  onCompleteLogin: (payload: LoginCompletionPayload) => Promise<void> | void;
  onSkipAsGuest: () => void;
  onReviewIntro?: () => void;
  onReviewTour?: () => void;
  onGooglePopupStarted?: (active: boolean) => void;
}

export const LoginOnboardingScreen: React.FC<LoginOnboardingScreenProps> = ({
  initialProfile,
  initialSettings,
  selectedLanguage,
  onSelectLanguage,
  onOpenLanguageModal,
  currentTheme,
  onSelectTheme,
  initialLocationPref,
  onCompleteLogin,
  onSkipAsGuest,
  onReviewIntro,
  onReviewTour,
  onGooglePopupStarted,
}) => {
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1: Explorer Details
  const [name, setName] = useState<string>(initialProfile?.name && initialProfile.name !== 'Guest Explorer' ? initialProfile.name : '');
  const [email, setEmail] = useState<string>(initialProfile?.email && initialProfile.email !== 'guest@charaiva.app' ? initialProfile.email : '');
  const [travelerType, setTravelerType] = useState<TravelerType>(
    initialProfile?.travelerType || 'heritage_enthusiast'
  );
  const [authUid, setAuthUid] = useState<string | undefined>(initialProfile?.uid);
  const [authMethod, setAuthMethod] = useState<'google' | 'local'>(
    initialProfile?.authMethod === 'google' ? 'google' : 'local'
  );

  // Step 2: Essential App Preferences Only
  const [outputMode, setOutputMode] = useState<GuideOutputMode>(
    initialSettings.outputMode || 'both'
  );
  const [voiceGender, setVoiceGender] = useState<'female' | 'male'>(
    initialSettings.voiceGender || 'female'
  );
  const [locationMode, setLocationMode] = useState<'gps' | 'manual'>(
    initialLocationPref?.locationMode || 'gps'
  );
  const [selectedDestCity, setSelectedDestCity] = useState<string>(
    initialLocationPref?.manualCityName || 'Madurai'
  );
  const [savePhotosToMemory, setSavePhotosToMemory] = useState<boolean>(
    Boolean(initialSettings.savePhotosToDeviceMemory)
  );

  // UI & Validation States
  const [formError, setFormError] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const validateStep1 = (): boolean => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName || trimmedName.length < 2) {
      setFormError('Please enter your name so Charaiva can personalize your guide profile.');
      return false;
    }
    if (trimmedName.length > 80) {
      setFormError('Name must be 80 characters or fewer.');
      return false;
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !emailPattern.test(trimmedEmail)) {
      setFormError('Please enter a valid email address for saving your Settings profile.');
      return false;
    }
    setFormError(null);
    return true;
  };

  const handleContinueStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateStep1()) {
      setStep(2);
    }
  };

  const handleGoogleSignIn = async () => {
    setFormError(null);
    setIsGoogleLoading(true);
    onGooglePopupStarted?.(true);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      if (!user) {
        setFormError('Google sign-in returned no explorer session. Please try again.');
        return;
      }

      // Check Firestore for previously saved Settings & Preferences
      try {
        const cloud = await loadUserFromFirestore(user.uid);
        if (cloud.profile && cloud.onboardingState?.hasCompletedLoginSetup && cloud.guideSettings) {
          const restoredLang =
            SUPPORTED_LANGUAGES.find((l) => l.code === cloud.profile?.preferredLanguage) ||
            selectedLanguage;

          await onCompleteLogin({
            profile: cloud.profile,
            guideSettings: cloud.guideSettings,
            language: restoredLang,
            locationPref: cloud.locationPref || { locationMode: 'gps' },
            theme: cloud.theme || currentTheme,
            cloudOnboardingState: cloud.onboardingState,
            isExistingCloudRestore: true,
          });
          return;
        }
      } catch (cloudErr) {
        console.warn('Cloud profile restore check skipped:', cloudErr);
      }

      // New Google user: pre-fill verified Google Name & Email and proceed to quick one-time preferences
      setAuthUid(user.uid);
      setAuthMethod('google');
      if (user.displayName) setName(user.displayName);
      if (user.email) setEmail(user.email);
      setFormError(null);
      setStep(2);
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setFormError('Google sign-in popup was closed before completing. You can try again or enter your details below.');
      } else if (code === 'auth/popup-blocked') {
        setFormError('Your browser blocked the Google popup window. Please allow popups or sign in directly below.');
      } else {
        setFormError('Google sign-in is unavailable right now. You can save your explorer profile directly below.');
      }
    } finally {
      setIsGoogleLoading(false);
      onGooglePopupStarted?.(false);
    }
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep1()) {
      setStep(1);
      return;
    }

    setIsSaving(true);
    setFormError(null);

    try {
      const preset = getPresetForTravelerType(travelerType);
      const chosenCityObj =
        POPULAR_DESTINATIONS.find((d) => d.city === selectedDestCity) ||
        POPULAR_DESTINATIONS[0];

      const finalLocationPref: SavedLocationPreference =
        locationMode === 'manual'
          ? {
              locationMode: 'manual',
              manualCityName: chosenCityObj.city,
              manualStateName: chosenCityObj.state,
              manualCountryName: chosenCityObj.country,
              manualLatitude: chosenCityObj.lat,
              manualLongitude: chosenCityObj.lng,
            }
          : {
              locationMode: 'gps',
            };

      const finalSettings: GuideSettings = {
        ...initialSettings,
        outputMode,
        voiceGender,
        voicePitch: voiceGender === 'female' ? 1.08 : 0.95,
        persona: preset.recommendedPersona,
        topics: { ...preset.topics },
        savePhotosToDeviceMemory: savePhotosToMemory,
      };

      const nowIso = new Date().toISOString();
      const finalProfile: UserProfile = {
        uid: authUid,
        authMethod,
        name: name.trim(),
        email: email.trim(),
        preferredLanguage: selectedLanguage.code,
        travelerType,
        visitedCount: initialProfile?.visitedCount || 0,
        createdAt: initialProfile?.createdAt || nowIso,
        updatedAt: nowIso,
        badges: initialProfile?.badges || [],
      };

      await onCompleteLogin({
        profile: finalProfile,
        guideSettings: finalSettings,
        language: selectedLanguage,
        locationPref: finalLocationPref,
        theme: currentTheme,
        isExistingCloudRestore: false,
      });
    } catch (err) {
      console.error('Failed to save onboarding preferences:', err);
      setFormError('Could not save your preferences right now. Please try once more.');
      setIsSaving(false);
    }
  };

  const quickLanguages = SUPPORTED_LANGUAGES.filter((l) =>
    QUICK_LANGUAGE_CODES.includes(l.code)
  );
  const selectedIsInQuick = quickLanguages.some((l) => l.code === selectedLanguage.code);
  const displayLanguages = selectedIsInQuick
    ? quickLanguages
    : [selectedLanguage, ...quickLanguages.slice(0, 7)];

  return (
    <div
      id="login-onboarding-screen"
      className="relative z-10 flex-1 min-h-0 overflow-y-auto overflow-x-hidden flex flex-col select-none"
    >
      {/* Compact Setup Step & Guest Action Bar */}
      <div
        style={{
          backgroundColor: 'var(--theme-card-bg)',
          borderColor: 'var(--theme-card-border)',
        }}
        className="sticky top-0 z-20 border-b backdrop-blur-xl px-4 py-2 shrink-0"
      >
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-serif font-bold text-[var(--theme-text-title)]">
                Explorer Sign In &amp; Preferences
              </span>
              <span className="text-[var(--theme-text-muted)]">·</span>
              <span className="font-semibold text-[var(--theme-accent-primary)] whitespace-nowrap">
                Step {step} of 2
              </span>
            </div>
            <p className="text-[11px] text-[var(--theme-text-muted)] truncate hidden sm:block">
              Set your details once — synced automatically to Settings
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onReviewIntro && (
              <button
                type="button"
                onClick={onReviewIntro}
                className="min-h-[36px] px-2.5 text-xs font-semibold text-[var(--theme-text-muted)] hover:text-[var(--theme-text-title)] hidden sm:inline cursor-pointer whitespace-nowrap"
              >
                Intro
              </button>
            )}
            {onReviewTour && (
              <button
                type="button"
                onClick={onReviewTour}
                className="min-h-[36px] px-2.5 text-xs font-semibold text-[var(--theme-text-muted)] hover:text-[var(--theme-text-title)] hidden sm:inline cursor-pointer whitespace-nowrap"
              >
                Tour
              </button>
            )}
            <button
              id="btn-login-skip-guest"
              type="button"
              onClick={onSkipAsGuest}
              style={{
                backgroundColor: 'var(--theme-card-bg-subtle)',
                borderColor: 'var(--theme-card-border)',
                color: 'var(--theme-text-title)',
              }}
              className="min-h-[38px] px-3.5 rounded-xl border text-xs font-bold cursor-pointer hover:border-[var(--theme-accent-primary)] transition-all whitespace-nowrap shrink-0"
            >
              Skip &amp; Explore as Guest
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Form Column */}
          <div className="lg:col-span-8">
            <div
              style={{
                backgroundColor: 'var(--theme-card-bg)',
                borderColor: 'var(--theme-card-border)',
              }}
              className="p-5 sm:p-7 rounded-2xl border shadow-2xl space-y-6"
            >
              {/* Step 1: Explorer Account & Traveler Style */}
              {step === 1 && (
                <form onSubmit={handleContinueStep1} className="space-y-5" noValidate>
                  <div className="space-y-1.5">
                    <p className="text-xs font-bold uppercase tracking-widest text-[var(--theme-accent-secondary)]">
                      Step 1 · Explorer Identity
                    </p>
                    <h1 className="font-serif font-bold text-2xl text-[var(--theme-text-title)]">
                      Welcome, Traveler
                    </h1>
                    <p className="text-xs sm:text-sm text-[var(--theme-text-muted)] leading-relaxed">
                      Tell Charaiva who is exploring so we can save your preferences in Settings. Returning explorers won&apos;t be asked these questions again.
                    </p>
                  </div>

                  {/* Cloud Google Sign-In Option */}
                  <div className="space-y-2.5">
                    <button
                      id="btn-google-signin"
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={isGoogleLoading}
                      style={{
                        backgroundColor: 'var(--theme-card-bg-subtle)',
                        borderColor: 'var(--theme-accent-secondary)',
                        color: 'var(--theme-text-title)',
                      }}
                      className="w-full min-h-[48px] px-4 rounded-xl border font-bold text-sm flex items-center justify-center gap-2.5 cursor-pointer hover:brightness-110 active:scale-[0.99] transition-all shadow-md"
                    >
                      {isGoogleLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-[var(--theme-accent-secondary)]" />
                          <span>Connecting to Google...</span>
                        </>
                      ) : (
                        <>
                          <Cloud className="w-4 h-4 text-[var(--theme-accent-secondary)]" />
                          <span>Continue with Google (Sync Across Devices)</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Divider */}
                  <div className="flex items-center gap-3 text-[11px] uppercase tracking-wider text-[var(--theme-text-muted)]">
                    <div className="flex-1 h-px bg-[var(--theme-card-border)]" />
                    <span>Or save directly on this device</span>
                    <div className="flex-1 h-px bg-[var(--theme-card-border)]" />
                  </div>

                  {/* Inline Validation / Error Banner */}
                  {formError && (
                    <div
                      role="alert"
                      className="p-3 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-200 text-xs flex items-start gap-2"
                    >
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <span>{formError}</span>
                    </div>
                  )}

                  {/* Name & Email Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1.5">
                      <label
                        htmlFor="login-explorer-name"
                        className="text-xs font-bold text-[var(--theme-text-body)] flex items-center gap-1.5"
                      >
                        <User className="w-3.5 h-3.5 text-[var(--theme-accent-primary)]" />
                        <span>Full Name</span>
                      </label>
                      <input
                        id="login-explorer-name"
                        type="text"
                        required
                        maxLength={80}
                        placeholder="e.g. Aarav Sharma"
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          if (formError) setFormError(null);
                        }}
                        className="theme-input w-full min-h-[44px] px-3.5 text-sm font-medium"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label
                        htmlFor="login-explorer-email"
                        className="text-xs font-bold text-[var(--theme-text-body)] flex items-center gap-1.5"
                      >
                        <Mail className="w-3.5 h-3.5 text-[var(--theme-accent-primary)]" />
                        <span>Email Address</span>
                      </label>
                      <input
                        id="login-explorer-email"
                        type="email"
                        required
                        maxLength={160}
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (formError) setFormError(null);
                        }}
                        className="theme-input w-full min-h-[44px] px-3.5 text-sm font-medium"
                      />
                    </div>
                  </div>

                  {/* Traveler Style Selector */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-xs font-bold text-[var(--theme-text-body)] flex items-center gap-1.5">
                        <Compass className="w-3.5 h-3.5 text-[var(--theme-accent-primary)]" />
                        <span>Your Traveler Style</span>
                      </label>
                      <span className="text-[11px] text-[var(--theme-text-muted)]">
                        Tailors story topics automatically
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {TRAVELER_TYPE_PRESETS.map((preset) => {
                        const isSelected = travelerType === preset.id;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => setTravelerType(preset.id)}
                            style={{
                              backgroundColor: isSelected
                                ? 'var(--theme-card-bg-subtle)'
                                : 'transparent',
                              borderColor: isSelected
                                ? 'var(--theme-accent-primary)'
                                : 'var(--theme-card-border)',
                            }}
                            className="p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start justify-between gap-2 hover:border-[var(--theme-card-border-glow)]"
                          >
                            <div className="min-w-0 space-y-0.5">
                              <span className="text-xs font-bold text-[var(--theme-text-title)] block">
                                {preset.label}
                              </span>
                              <span className="text-[11px] text-[var(--theme-text-muted)] leading-snug block">
                                {preset.subtitle}
                              </span>
                            </div>
                            {isSelected && (
                              <CheckCircle2 className="w-4 h-4 text-[var(--theme-accent-primary)] shrink-0 mt-0.5" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-end">
                    <button
                      id="btn-login-next-step"
                      type="submit"
                      className="min-h-[48px] px-6 py-3 rounded-xl theme-btn-primary text-sm font-bold flex items-center gap-2 cursor-pointer whitespace-nowrap"
                    >
                      <span>Continue to App Preferences</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              )}

              {/* Step 2: Essential App Preferences Only */}
              {step === 2 && (
                <form onSubmit={handleFinalSubmit} className="space-y-5" noValidate>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1">
                      <p className="text-xs font-bold uppercase tracking-widest text-[var(--theme-accent-secondary)]">
                        Step 2 · Essential Guide Preferences
                      </p>
                      <h1 className="font-serif font-bold text-xl sm:text-2xl text-[var(--theme-text-title)]">
                        Tailor Charaiva for {name.trim() || 'Your Trip'}
                      </h1>
                      <p className="text-xs text-[var(--theme-text-muted)]">
                        {authMethod === 'google'
                          ? `Signed in via Google (${email}) · Saves straight to cloud Settings`
                          : `Saving to your device Settings (${email}) · Editable anytime later`}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="min-h-[40px] px-3 rounded-xl theme-btn-secondary text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Edit Details</span>
                    </button>
                  </div>

                  {formError && (
                    <div
                      role="alert"
                      className="p-3 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-200 text-xs flex items-start gap-2"
                    >
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <span>{formError}</span>
                    </div>
                  )}

                  {/* 1. Preferred Language */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <label className="text-xs font-bold text-[var(--theme-text-title)] flex items-center gap-1.5">
                        <Languages className="w-3.5 h-3.5 text-[var(--theme-accent-primary)]" />
                        <span>Preferred Guide Language</span>
                      </label>
                      <button
                        type="button"
                        onClick={onOpenLanguageModal}
                        className="text-xs font-semibold text-[var(--theme-accent-secondary)] hover:underline cursor-pointer"
                      >
                        Browse all {SUPPORTED_LANGUAGES.length} languages →
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {displayLanguages.map((lang) => {
                        const isSelected = selectedLanguage.code === lang.code;
                        return (
                          <button
                            key={lang.code}
                            type="button"
                            onClick={() => onSelectLanguage(lang)}
                            style={
                              isSelected
                                ? {
                                    background: 'var(--theme-accent-primary-gradient)',
                                    color: 'var(--theme-accent-primary-text)',
                                    borderColor: 'var(--theme-accent-primary)',
                                  }
                                : {
                                    backgroundColor: 'var(--theme-card-bg-subtle)',
                                    borderColor: 'var(--theme-card-border)',
                                    color: 'var(--theme-text-body)',
                                  }
                            }
                            className="min-h-[44px] px-2.5 py-2 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2"
                          >
                            <span className="text-base shrink-0">{lang.flag}</span>
                            <div className="min-w-0">
                              <span className="text-xs font-bold block truncate">
                                {lang.nativeName}
                              </span>
                              <span className="text-[10px] opacity-80 block truncate">
                                {lang.name}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. Output Mode & Voice Gender */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[var(--theme-text-title)] flex items-center gap-1.5">
                        <Volume2 className="w-3.5 h-3.5 text-[var(--theme-accent-primary)]" />
                        <span>Tour Output Mode</span>
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'both' as GuideOutputMode, label: 'Both', icon: Volume2 },
                          { id: 'speech' as GuideOutputMode, label: 'Speech', icon: Headphones },
                          { id: 'text' as GuideOutputMode, label: 'Text Only', icon: FileText },
                        ].map((m) => {
                          const Icon = m.icon;
                          const isSelected = outputMode === m.id;
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => setOutputMode(m.id)}
                              style={
                                isSelected
                                  ? {
                                      background: 'var(--theme-accent-primary-gradient)',
                                      color: 'var(--theme-accent-primary-text)',
                                      borderColor: 'var(--theme-accent-primary)',
                                    }
                                  : {
                                      backgroundColor: 'var(--theme-card-bg-subtle)',
                                      borderColor: 'var(--theme-card-border)',
                                      color: 'var(--theme-text-body)',
                                    }
                              }
                              className="min-h-[44px] px-2 py-2 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 cursor-pointer transition-all"
                            >
                              <Icon className="w-3.5 h-3.5" />
                              <span className="whitespace-nowrap">{m.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[var(--theme-text-title)] flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[var(--theme-accent-primary)]" />
                        <span>Narrator Voice</span>
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {(['female', 'male'] as const).map((g) => {
                          const isSelected = voiceGender === g;
                          return (
                            <button
                              key={g}
                              type="button"
                              onClick={() => setVoiceGender(g)}
                              style={
                                isSelected
                                  ? {
                                      background: 'var(--theme-accent-primary-gradient)',
                                      color: 'var(--theme-accent-primary-text)',
                                      borderColor: 'var(--theme-accent-primary)',
                                    }
                                  : {
                                      backgroundColor: 'var(--theme-card-bg-subtle)',
                                      borderColor: 'var(--theme-card-border)',
                                      color: 'var(--theme-text-body)',
                                    }
                              }
                              className="min-h-[44px] px-3 rounded-xl border text-xs font-bold capitalize cursor-pointer transition-all"
                            >
                              {g} Voice
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* 3. Location Mode (GPS vs Manual City) */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[var(--theme-text-title)] flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[var(--theme-accent-primary)]" />
                      <span>Location Detection Preference</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setLocationMode('gps')}
                        style={{
                          backgroundColor:
                            locationMode === 'gps' ? 'var(--theme-card-bg-subtle)' : 'transparent',
                          borderColor:
                            locationMode === 'gps'
                              ? 'var(--theme-accent-primary)'
                              : 'var(--theme-card-border)',
                        }}
                        className="min-h-[48px] p-3 rounded-xl border text-left cursor-pointer flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2">
                          <Navigation className="w-4 h-4 text-[var(--theme-accent-secondary)] shrink-0" />
                          <div>
                            <span className="text-xs font-bold text-[var(--theme-text-title)] block">
                              Automatic GPS
                            </span>
                            <span className="text-[11px] text-[var(--theme-text-muted)]">
                              Auto-locate nearby landmarks around me
                            </span>
                          </div>
                        </div>
                        {locationMode === 'gps' && (
                          <CheckCircle2 className="w-4 h-4 text-[var(--theme-accent-primary)] shrink-0" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setLocationMode('manual')}
                        style={{
                          backgroundColor:
                            locationMode === 'manual' ? 'var(--theme-card-bg-subtle)' : 'transparent',
                          borderColor:
                            locationMode === 'manual'
                              ? 'var(--theme-accent-primary)'
                              : 'var(--theme-card-border)',
                        }}
                        className="min-h-[48px] p-3 rounded-xl border text-left cursor-pointer flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-[var(--theme-accent-primary)] shrink-0" />
                          <div>
                            <span className="text-xs font-bold text-[var(--theme-text-title)] block">
                              Pick Destination City
                            </span>
                            <span className="text-[11px] text-[var(--theme-text-muted)]">
                              Explore a specific city right away
                            </span>
                          </div>
                        </div>
                        {locationMode === 'manual' && (
                          <CheckCircle2 className="w-4 h-4 text-[var(--theme-accent-primary)] shrink-0" />
                        )}
                      </button>
                    </div>

                    {locationMode === 'manual' && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {POPULAR_DESTINATIONS.map((dest) => {
                          const isActive = selectedDestCity === dest.city;
                          return (
                            <button
                              key={dest.city}
                              type="button"
                              onClick={() => setSelectedDestCity(dest.city)}
                              style={
                                isActive
                                  ? {
                                      background: 'var(--theme-accent-primary-gradient)',
                                      color: 'var(--theme-accent-primary-text)',
                                      borderColor: 'var(--theme-accent-primary)',
                                    }
                                  : {
                                      backgroundColor: 'var(--theme-card-bg-subtle)',
                                      borderColor: 'var(--theme-card-border)',
                                      color: 'var(--theme-text-body)',
                                    }
                              }
                              className="min-h-[36px] px-2.5 py-1 rounded-lg border text-xs font-semibold cursor-pointer flex items-center gap-1"
                            >
                              <span>{dest.flag}</span>
                              <span>{dest.city}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* 4. Save Clicked Photos to Phone Memory YES/NO */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[var(--theme-text-title)] flex items-center gap-1.5">
                      <HardDrive className="w-3.5 h-3.5 text-[var(--theme-accent-primary)]" />
                      <span>Save Clicked Photos to Phone Memory?</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setSavePhotosToMemory(false)}
                        style={{
                          backgroundColor: !savePhotosToMemory
                            ? 'var(--theme-card-bg-subtle)'
                            : 'transparent',
                          borderColor: !savePhotosToMemory
                            ? 'var(--theme-accent-primary)'
                            : 'var(--theme-card-border)',
                        }}
                        className="min-h-[48px] p-3 rounded-xl border text-left cursor-pointer flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-[var(--theme-accent-primary)] shrink-0" />
                          <div>
                            <span className="text-xs font-bold text-[var(--theme-text-title)] block">
                              NO · Do Not Save (Recommended)
                            </span>
                            <span className="text-[11px] text-[var(--theme-text-muted)]">
                              In-memory scan only · Saves phone storage space
                            </span>
                          </div>
                        </div>
                        {!savePhotosToMemory && (
                          <CheckCircle2 className="w-4 h-4 text-[var(--theme-accent-primary)] shrink-0" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setSavePhotosToMemory(true)}
                        style={{
                          backgroundColor: savePhotosToMemory
                            ? 'var(--theme-card-bg-subtle)'
                            : 'transparent',
                          borderColor: savePhotosToMemory
                            ? 'var(--theme-accent-secondary)'
                            : 'var(--theme-card-border)',
                        }}
                        className="min-h-[48px] p-3 rounded-xl border text-left cursor-pointer flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2">
                          <HardDrive className="w-4 h-4 text-[var(--theme-accent-secondary)] shrink-0" />
                          <div>
                            <span className="text-xs font-bold text-[var(--theme-text-title)] block">
                              YES · Save to App Data Folder
                            </span>
                            <span className="text-[11px] text-[var(--theme-text-muted)]">
                              Stores photos locally in /app-data/photos
                            </span>
                          </div>
                        </div>
                        {savePhotosToMemory && (
                          <CheckCircle2 className="w-4 h-4 text-[var(--theme-accent-secondary)] shrink-0" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* 5. Color Theme Atmosphere Live Picker */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[var(--theme-text-title)] flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5 text-[var(--theme-accent-primary)]" />
                      <span>Color Theme Atmosphere (Live Preview)</span>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {THEME_PRESETS.map((preset) => {
                        const isSelected = currentTheme === preset.id;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => onSelectTheme(preset.id)}
                            style={{
                              backgroundColor: isSelected
                                ? 'var(--theme-card-hover)'
                                : 'var(--theme-card-bg-subtle)',
                              borderColor: isSelected
                                ? 'var(--theme-accent-secondary)'
                                : 'var(--theme-card-border)',
                            }}
                            className="min-h-[48px] p-2.5 rounded-xl border text-left cursor-pointer flex items-center justify-between gap-2"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className="w-4 h-4 rounded-full shrink-0 border border-white/20"
                                style={{
                                  background: `linear-gradient(135deg, ${preset.primaryColor}, ${preset.secondaryColor})`,
                                }}
                              />
                              <span className="text-xs font-bold text-[var(--theme-text-title)] truncate">
                                {preset.name.split(' ')[0]}
                              </span>
                            </div>
                            {isSelected && (
                              <Check className="w-3.5 h-3.5 text-[var(--theme-accent-secondary)] shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Final Save & Explore Button */}
                  <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="min-h-[48px] px-4 rounded-xl theme-btn-secondary text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back</span>
                    </button>

                    <button
                      id="btn-save-preferences-start"
                      type="submit"
                      disabled={isSaving}
                      className="min-h-[48px] px-6 py-3 rounded-xl theme-btn-primary text-sm font-bold flex items-center gap-2 cursor-pointer whitespace-nowrap"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Syncing to Settings...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Save Preferences &amp; Start Exploring</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Right Summary Sidebar */}
          <aside className="lg:col-span-4 space-y-4">
            <div
              style={{
                backgroundColor: 'var(--theme-card-bg)',
                borderColor: 'var(--theme-card-border)',
              }}
              className="p-5 rounded-2xl border shadow-lg space-y-3"
            >
              <h2 className="font-serif font-bold text-sm text-[var(--theme-text-title)]">
                Why Charaiva Asks Once
              </h2>
              <p className="text-xs leading-relaxed text-[var(--theme-text-muted)]">
                Every selection made here flows directly into your{' '}
                <strong className="text-[var(--theme-text-title)]">Settings &rarr; Profile &amp; Preferences</strong>{' '}
                panel. Next time you open Charaiva, you will skip directly to Explore without seeing setup prompts again.
              </p>

              <div
                className="pt-3 border-t space-y-2 text-xs"
                style={{ borderColor: 'var(--theme-card-border)' }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[var(--theme-text-muted)]">Selected Style</span>
                  <span className="font-semibold text-[var(--theme-accent-primary)]">
                    {getPresetForTravelerType(travelerType).label.split(' & ')[0]}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--theme-text-muted)]">Language</span>
                  <span className="font-semibold text-[var(--theme-text-title)]">
                    {selectedLanguage.flag} {selectedLanguage.nativeName}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--theme-text-muted)]">Phone Photo Save</span>
                  <span className="font-semibold text-[var(--theme-accent-secondary)]">
                    {savePhotosToMemory ? 'YES (/app-data/photos)' : 'NO (In-Memory)'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--theme-text-muted)]">Storage Mode</span>
                  <span className="font-semibold text-[var(--theme-text-title)]">
                    {authMethod === 'google' ? 'Firebase Cloud Sync' : 'Device Settings'}
                  </span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};
