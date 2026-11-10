export type AppTab = 'home' | 'camera' | 'chat' | 'map' | 'history' | 'settings' | 'nearby' | 'city';

export type GuideOutputMode = 'speech' | 'text' | 'both';

export type GuidePersona = 'warm_female' | 'scholarly' | 'adventurous' | 'concise';

export interface SpeechTopicPreferences {
  historical: boolean;
  geographical: boolean;
  political: boolean;
  architectural: boolean;
  culturalMythology: boolean;
  culinary: boolean;
  economic: boolean;
  ecological: boolean;
  photography: boolean;
  mysteries: boolean;
}

export interface GuideSettings {
  topics: SpeechTopicPreferences;
  persona: GuidePersona;
  voiceGender: 'female' | 'male';
  voicePitch: number;
  speechRate: number;
  outputMode: GuideOutputMode;
  savePhotosToDeviceMemory?: boolean;
}

export interface LocationCoords {
  latitude: number;
  longitude: number;
  altitude?: number | null;
  accuracy?: number;
  address?: string;
  city?: string;
  country?: string;
}

export interface Language {
  code: string;
  name: string;
  nativeName: string;
  speechCode: string;
  flag: string;
  direction?: 'ltr' | 'rtl';
}

export interface LandmarkCategory {
  id: string;
  label: string;
  icon: string;
  color: string;
}

export interface SupplementaryImage {
  id: string;
  url: string;
  title: string;
  caption: string;
  type: 'historical' | 'interior' | 'aerial' | 'night' | 'detail' | 'art' | 'context';
}

export type BatchStreamingStage = 'batch1_structural' | 'batch2_core_text' | 'batch3_deferred_media' | 'complete';

export interface BatchStreamingStatus {
  batch1Ready: boolean;
  batch2Ready: boolean;
  batch3Ready: boolean;
  stage: BatchStreamingStage;
  timestamp: number;
}

export interface RecognitionResult {
  id: string;
  title: string;
  nativeTitle?: string;
  category: 'monument' | 'temple' | 'fort' | 'museum' | 'landscape' | 'food' | 'plant' | 'object' | 'building' | 'animal';
  confidence: number;
  locationName: string;
  historicalPeriod?: string;
  ocrDetectedText?: string;
  summary: string;
  narration: string;
  keyFacts: string[];
  architecturalHighlights?: string[];
  suggestedQuestions?: string[];
  culturalSignificance?: string;
  audioDurationSeconds?: number;
  timestamp?: string;
  imageUrl?: string;
  supplementaryImages?: SupplementaryImage[];
  coords?: LocationCoords;
  tags: string[];
  language?: string;
  batchStatus?: BatchStreamingStatus;
  isStreaming?: boolean;
  audioBase64?: string;
}

export interface NearbyLandmark {
  id: string;
  title: string;
  category: string;
  distanceMeters: number;
  teaser: string;
  imageUrl: string;
  lat: number;
  lng: number;
  rating: number;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'guide';
  text: string;
  timestamp: string;
  audioUrl?: string;
  landmarkContextId?: string;
}

export interface HistoryItem {
  id: string;
  landmark: RecognitionResult;
  timestamp: string;
  notes?: string;
  favorite?: boolean;
}

export type TravelerType = 'heritage_enthusiast' | 'foodie' | 'nature_explorer' | 'casual_tourist' | 'photographer';

export interface UserProfile {
  uid?: string;
  authMethod?: 'google' | 'local' | 'guest';
  name: string;
  email: string;
  preferredLanguage: string;
  travelerType: TravelerType;
  visitedCount: number;
  createdAt?: string;
  updatedAt?: string;
  badges: Array<{
    id: string;
    title: string;
    description: string;
    icon: string;
    unlockedAt: string;
  }>;
}

export interface OnboardingState {
  hasSeenIntro: boolean;
  hasCompletedTour: boolean;
  hasCompletedLoginSetup: boolean;
  skippedDirectly?: boolean;
}

export interface SavedLocationPreference {
  locationMode: 'gps' | 'manual';
  manualCityName?: string;
  manualStateName?: string;
  manualCountryName?: string;
  manualLatitude?: number;
  manualLongitude?: number;
}

export type ThemePreset = 'celestial' | 'sunset' | 'emerald' | 'daylight';

export interface ThemeOption {
  id: ThemePreset;
  name: string;
  subtitle: string;
  primaryColor: string;
  secondaryColor: string;
  bgPreview: string;
  iconName: string;
}

export const THEME_PRESETS: ThemeOption[] = [
  {
    id: 'celestial',
    name: 'Celestial Heritage',
    subtitle: 'Midnight Sapphire · Saffron Gold · Oasis Teal',
    primaryColor: '#F59E0B',
    secondaryColor: '#14B8A6',
    bgPreview: 'from-[#0f172a] via-[#090d16] to-[#04070e]',
    iconName: 'Sparkles',
  },
  {
    id: 'sunset',
    name: 'Sunset Terracotta',
    subtitle: 'Twilight Amethyst · Rose Terracotta · Honey',
    primaryColor: '#F43F5E',
    secondaryColor: '#FB923C',
    bgPreview: 'from-[#2a1122] via-[#130a17] to-[#0a050d]',
    iconName: 'Sunset',
  },
  {
    id: 'emerald',
    name: 'Emerald Sanctuary',
    subtitle: 'Deep Rainforest · Radiant Jade · Champagne',
    primaryColor: '#10B981',
    secondaryColor: '#EAB308',
    bgPreview: 'from-[#0d2922] via-[#061713] to-[#030d0a]',
    iconName: 'Leaf',
  },
  {
    id: 'daylight',
    name: 'Royal Daylight',
    subtitle: 'Sunlit Alabaster · Sandstone · Imperial Saffron',
    primaryColor: '#D97706',
    secondaryColor: '#0D9488',
    bgPreview: 'from-[#f8fafc] via-[#f1f5f9] to-[#e2e8f0]',
    iconName: 'Sun',
  },
];
