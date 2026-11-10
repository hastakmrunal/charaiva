import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import {
  GuidePersona,
  GuideSettings,
  OnboardingState,
  SavedLocationPreference,
  SpeechTopicPreferences,
  ThemePreset,
  TravelerType,
  UserProfile,
} from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const STORAGE_KEYS = {
  PROFILE: 'charaiva_user_profile',
  ONBOARDING: 'charaiva_onboarding_state',
  SETTINGS: 'charaiva_guide_settings',
  LANGUAGE: 'charaiva_language_code',
  LOCATION: 'charaiva_location_pref',
  THEME: 'charaiva_theme',
} as const;

export const DEFAULT_TOPICS: SpeechTopicPreferences = {
  historical: true,
  geographical: true,
  political: true,
  architectural: true,
  culturalMythology: true,
  culinary: true,
  economic: true,
  ecological: true,
  photography: true,
  mysteries: true,
};

export const DEFAULT_GUIDE_SETTINGS: GuideSettings = {
  topics: { ...DEFAULT_TOPICS },
  persona: 'warm_female',
  voiceGender: 'female',
  voicePitch: 1.08,
  speechRate: 1.0,
  outputMode: 'both',
  savePhotosToDeviceMemory: false,
};

export const DEFAULT_ONBOARDING_STATE: OnboardingState = {
  hasSeenIntro: false,
  hasCompletedTour: false,
  hasCompletedLoginSetup: false,
  skippedDirectly: false,
};

export interface TravelerPresetConfig {
  id: TravelerType;
  label: string;
  subtitle: string;
  recommendedPersona: GuidePersona;
  topics: SpeechTopicPreferences;
}

export const TRAVELER_TYPE_PRESETS: TravelerPresetConfig[] = [
  {
    id: 'heritage_enthusiast',
    label: 'Heritage & History Explorer',
    subtitle: 'Dynasties, temple engineering, sacred mythology & architectural mysteries',
    recommendedPersona: 'scholarly',
    topics: {
      historical: true,
      geographical: true,
      political: true,
      architectural: true,
      culturalMythology: true,
      culinary: false,
      economic: true,
      ecological: false,
      photography: false,
      mysteries: true,
    },
  },
  {
    id: 'foodie',
    label: 'Culinary & Local Culture Seeker',
    subtitle: 'Regional street foods, royal recipes, spice markets & living traditions',
    recommendedPersona: 'warm_female',
    topics: {
      historical: true,
      geographical: false,
      political: false,
      architectural: false,
      culturalMythology: true,
      culinary: true,
      economic: true,
      ecological: false,
      photography: true,
      mysteries: false,
    },
  },
  {
    id: 'nature_explorer',
    label: 'Nature & Landscape Wanderer',
    subtitle: 'Sacred groves, river basins, ecology, viewpoints & serene heritage gardens',
    recommendedPersona: 'adventurous',
    topics: {
      historical: true,
      geographical: true,
      political: false,
      architectural: false,
      culturalMythology: true,
      culinary: false,
      economic: false,
      ecological: true,
      photography: true,
      mysteries: true,
    },
  },
  {
    id: 'photographer',
    label: 'Visual & Architecture Photographer',
    subtitle: 'Golden hour vantage spots, corridor symmetry, light angles & stonework',
    recommendedPersona: 'warm_female',
    topics: {
      historical: true,
      geographical: true,
      political: false,
      architectural: true,
      culturalMythology: false,
      culinary: false,
      economic: false,
      ecological: true,
      photography: true,
      mysteries: true,
    },
  },
  {
    id: 'casual_tourist',
    label: 'All-Round Casual Sightseer',
    subtitle: 'Balanced highlights across history, food, hidden gems & top sights',
    recommendedPersona: 'warm_female',
    topics: { ...DEFAULT_TOPICS },
  },
];

export function getPresetForTravelerType(type: TravelerType): TravelerPresetConfig {
  return TRAVELER_TYPE_PRESETS.find((t) => t.id === type) || TRAVELER_TYPE_PRESETS[4];
}

// Local Persistence Helpers
export function loadLocalUserProfile(): UserProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROFILE);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.name === 'string') {
      return parsed as UserProfile;
    }
  } catch {
    // ignore storage errors
  }
  return null;
}

export function saveLocalUserProfile(profile: UserProfile | null): void {
  try {
    if (!profile) {
      localStorage.removeItem(STORAGE_KEYS.PROFILE);
    } else {
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
    }
  } catch {
    // ignore storage errors
  }
}

export function loadLocalOnboardingState(): OnboardingState {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ONBOARDING);
    if (raw) {
      return { ...DEFAULT_ONBOARDING_STATE, ...JSON.parse(raw) };
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_ONBOARDING_STATE };
}

export function saveLocalOnboardingState(state: OnboardingState): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ONBOARDING, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function loadLocalLocationPref(): SavedLocationPreference {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LOCATION);
    if (raw) {
      return JSON.parse(raw) as SavedLocationPreference;
    }
  } catch {
    // ignore
  }
  return { locationMode: 'gps' };
}

export function saveLocalLocationPref(pref: SavedLocationPreference): void {
  try {
    localStorage.setItem(STORAGE_KEYS.LOCATION, JSON.stringify(pref));
  } catch {
    // ignore
  }
}

export function loadLocalLanguageCode(): string {
  try {
    return localStorage.getItem(STORAGE_KEYS.LANGUAGE) || 'en';
  } catch {
    return 'en';
  }
}

export function saveLocalLanguageCode(code: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.LANGUAGE, code);
  } catch {
    // ignore
  }
}

// Sanitize strings strictly to match firebase-blueprint.json & firestore.rules bounds
function clampStr(val: string | undefined, maxLen: number, fallback = ''): string {
  const cleaned = (val || fallback).trim();
  return cleaned.length > maxLen ? cleaned.slice(0, maxLen) : cleaned;
}

function normalizeTopicsMap(topics?: Partial<SpeechTopicPreferences>): SpeechTopicPreferences {
  return {
    historical: Boolean(topics?.historical ?? true),
    geographical: Boolean(topics?.geographical ?? true),
    political: Boolean(topics?.political ?? true),
    architectural: Boolean(topics?.architectural ?? true),
    culturalMythology: Boolean(topics?.culturalMythology ?? true),
    culinary: Boolean(topics?.culinary ?? true),
    economic: Boolean(topics?.economic ?? true),
    ecological: Boolean(topics?.ecological ?? true),
    photography: Boolean(topics?.photography ?? true),
    mysteries: Boolean(topics?.mysteries ?? true),
  };
}

export interface LoadedCloudBundle {
  profile: UserProfile | null;
  guideSettings?: GuideSettings;
  locationPref?: SavedLocationPreference;
  theme?: ThemePreset;
  onboardingState?: OnboardingState;
}

export async function loadUserFromFirestore(uid: string): Promise<LoadedCloudBundle> {
  const profilePath = `users/${uid}/private/profile`;
  const prefsPath = `users/${uid}/preferences/guide`;

  let profile: UserProfile | null = null;
  let guideSettings: GuideSettings | undefined;
  let locationPref: SavedLocationPreference | undefined;
  let theme: ThemePreset | undefined;
  let onboardingState: OnboardingState | undefined;

  try {
    const profileSnap = await getDoc(doc(db, 'users', uid, 'private', 'profile'));
    if (profileSnap.exists()) {
      const data = profileSnap.data();
      profile = {
        uid,
        authMethod: 'google',
        name: String(data.name || ''),
        email: String(data.email || ''),
        preferredLanguage: String(data.preferredLanguage || 'en'),
        travelerType: (data.travelerType as TravelerType) || 'casual_tourist',
        visitedCount: typeof data.visitedCount === 'number' ? data.visitedCount : 0,
        badges: [],
      };
    }
  } catch (err: any) {
    if (err?.code === 'permission-denied' || String(err?.message).includes('Missing or insufficient permissions')) {
      handleFirestoreError(err, OperationType.GET, profilePath);
    }
    console.warn('Firestore profile fetch skipped/offline:', err);
  }

  try {
    const prefsSnap = await getDoc(doc(db, 'users', uid, 'preferences', 'guide'));
    if (prefsSnap.exists()) {
      const d = prefsSnap.data();
      guideSettings = {
        topics: normalizeTopicsMap(d.topics),
        persona: (d.persona as GuidePersona) || 'warm_female',
        voiceGender: d.voiceGender === 'male' ? 'male' : 'female',
        voicePitch: typeof d.voicePitch === 'number' ? d.voicePitch : 1.08,
        speechRate: typeof d.speechRate === 'number' ? d.speechRate : 1.0,
        outputMode: d.outputMode === 'speech' || d.outputMode === 'text' ? d.outputMode : 'both',
        savePhotosToDeviceMemory: Boolean(d.savePhotosToDeviceMemory),
      };
      locationPref = {
        locationMode: d.locationMode === 'manual' ? 'manual' : 'gps',
        manualCityName: d.manualCityName || undefined,
        manualStateName: d.manualStateName || undefined,
        manualCountryName: d.manualCountryName || undefined,
        manualLatitude: typeof d.manualLatitude === 'number' ? d.manualLatitude : undefined,
        manualLongitude: typeof d.manualLongitude === 'number' ? d.manualLongitude : undefined,
      };
      if (d.theme && ['celestial', 'sunset', 'emerald', 'daylight'].includes(d.theme)) {
        theme = d.theme as ThemePreset;
      }
      onboardingState = {
        hasSeenIntro: Boolean(d.hasSeenIntro),
        hasCompletedTour: Boolean(d.hasCompletedTour),
        hasCompletedLoginSetup: Boolean(d.hasCompletedLoginSetup),
        skippedDirectly: false,
      };
    }
  } catch (err: any) {
    if (err?.code === 'permission-denied' || String(err?.message).includes('Missing or insufficient permissions')) {
      handleFirestoreError(err, OperationType.GET, prefsPath);
    }
    console.warn('Firestore preferences fetch skipped/offline:', err);
  }

  return { profile, guideSettings, locationPref, theme, onboardingState };
}

export async function saveUserToFirestore(params: {
  uid: string;
  profile: UserProfile;
  guideSettings: GuideSettings;
  locationPref: SavedLocationPreference;
  theme: ThemePreset;
  onboardingState: OnboardingState;
}): Promise<void> {
  const { uid, profile, guideSettings, locationPref, theme, onboardingState } = params;
  if (!auth.currentUser || auth.currentUser.uid !== uid) return;

  const profileRef = doc(db, 'users', uid, 'private', 'profile');
  const prefsRef = doc(db, 'users', uid, 'preferences', 'guide');
  const profilePath = `users/${uid}/private/profile`;
  const prefsPath = `users/${uid}/preferences/guide`;

  const safeName = clampStr(profile.name, 80, 'Explorer');
  const safeEmail = clampStr(profile.email || auth.currentUser.email || '', 160, 'explorer@charaiva.app');
  const safeLang = clampStr(profile.preferredLanguage, 16, 'en');

  // 1. Save / Update Private Profile Document
  try {
    const existingProfile = await getDoc(profileRef);
    if (!existingProfile.exists()) {
      await setDoc(profileRef, {
        uid,
        name: safeName,
        email: safeEmail,
        preferredLanguage: safeLang,
        travelerType: profile.travelerType || 'casual_tourist',
        visitedCount: Math.max(0, Math.min(100000, Math.floor(profile.visitedCount || 0))),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(profileRef, {
        name: safeName,
        email: safeEmail,
        preferredLanguage: safeLang,
        travelerType: profile.travelerType || 'casual_tourist',
        visitedCount: Math.max(0, Math.min(100000, Math.floor(profile.visitedCount || 0))),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err: any) {
    if (err?.code === 'permission-denied' || String(err?.message).includes('Missing or insufficient permissions')) {
      handleFirestoreError(err, OperationType.WRITE, profilePath);
    }
    console.warn('Could not sync profile to Firestore:', err);
  }

  // 2. Save / Update Guide Preferences Document
  const prefsPayload: Record<string, any> = {
    uid,
    outputMode: guideSettings.outputMode || 'both',
    voiceGender: guideSettings.voiceGender || 'female',
    persona: guideSettings.persona || 'warm_female',
    voicePitch: Math.min(2.0, Math.max(0.5, Number(guideSettings.voicePitch) || 1.08)),
    speechRate: Math.min(2.0, Math.max(0.5, Number(guideSettings.speechRate) || 1.0)),
    savePhotosToDeviceMemory: Boolean(guideSettings.savePhotosToDeviceMemory),
    locationMode: locationPref.locationMode === 'manual' ? 'manual' : 'gps',
    theme: theme || 'celestial',
    topics: normalizeTopicsMap(guideSettings.topics),
    hasSeenIntro: Boolean(onboardingState.hasSeenIntro),
    hasCompletedTour: Boolean(onboardingState.hasCompletedTour),
    hasCompletedLoginSetup: Boolean(onboardingState.hasCompletedLoginSetup),
    updatedAt: serverTimestamp(),
  };

  if (locationPref.manualCityName) {
    prefsPayload.manualCityName = clampStr(locationPref.manualCityName, 100);
  }
  if (locationPref.manualStateName) {
    prefsPayload.manualStateName = clampStr(locationPref.manualStateName, 100);
  }
  if (locationPref.manualCountryName) {
    prefsPayload.manualCountryName = clampStr(locationPref.manualCountryName, 100);
  }
  if (typeof locationPref.manualLatitude === 'number' && locationPref.manualLatitude >= -90 && locationPref.manualLatitude <= 90) {
    prefsPayload.manualLatitude = locationPref.manualLatitude;
  }
  if (typeof locationPref.manualLongitude === 'number' && locationPref.manualLongitude >= -180 && locationPref.manualLongitude <= 180) {
    prefsPayload.manualLongitude = locationPref.manualLongitude;
  }

  try {
    const existingPrefs = await getDoc(prefsRef);
    if (!existingPrefs.exists()) {
      await setDoc(prefsRef, prefsPayload);
    } else {
      const { uid: _omitUid, ...updateFields } = prefsPayload;
      await updateDoc(prefsRef, updateFields);
    }
  } catch (err: any) {
    if (err?.code === 'permission-denied' || String(err?.message).includes('Missing or insufficient permissions')) {
      handleFirestoreError(err, OperationType.WRITE, prefsPath);
    }
    console.warn('Could not sync preferences to Firestore:', err);
  }
}
