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
  journalId?: string;
  placeId?: string;
  city?: string;
  country?: string;
  visitDate?: string;
  notes?: string;
  visitedConfirmed?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface TravelJournalEntry {
  journalId: string;
  userId: string;
  placeId: string;
  placeName: string;
  city: string;
  country: string;
  locationName: string;
  category: RecognitionResult['category'];
  visitDate: string;
  notes: string;
  guideSummary: string;
  narration?: string;
  keyFacts?: string[];
  tags?: string[];
  language?: string;
  imageUrl?: string;
  visitedConfirmed: boolean;
  createdAt?: string;
  updatedAt?: string;
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
    name: 'Celestial Twilight',
    subtitle: 'Midnight Slate · Muted Gold · Serene Teal',
    primaryColor: '#C99A4E',
    secondaryColor: '#2A9D8F',
    bgPreview: 'from-[#111b2e] via-[#0b1220] to-[#060912]',
    iconName: 'Sparkles',
  },
  {
    id: 'sunset',
    name: 'Dusk Terracotta',
    subtitle: 'Deep Plum Slate · Muted Rose · Sandstone',
    primaryColor: '#B86566',
    secondaryColor: '#C98B5B',
    bgPreview: 'from-[#241421] via-[#150c15] to-[#0b060b]',
    iconName: 'Sunset',
  },
  {
    id: 'emerald',
    name: 'Botanical Pine',
    subtitle: 'Deep Forest Slate · Calm Jade · Muted Brass',
    primaryColor: '#2C8C6F',
    secondaryColor: '#B59A4B',
    bgPreview: 'from-[#10251f] via-[#091713] to-[#050d0b]',
    iconName: 'Leaf',
  },
  {
    id: 'daylight',
    name: 'Warm Stone Daylight',
    subtitle: 'Soft Linen · Heritage Bronze · Slate Teal',
    primaryColor: '#8C5A2B',
    secondaryColor: '#1F7A74',
    bgPreview: 'from-[#f7f6f2] via-[#efeeea] to-[#e5e4df]',
    iconName: 'Sun',
  },
];
