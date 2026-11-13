import React, { useState, useEffect } from 'react';
import {
  Camera,
  MapPin,
  Volume2,
  Square,
  Play,
  Compass,
  MessageSquare,
  Map,
  History,
  Sliders,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Languages,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { GuideSettings, Language, UserProfile } from '../types';
import { MeenakshiLogo } from './MeenakshiLogo';
import { speechManager } from '../utils/speech';
import introHeroImg from '../assets/images/intro_heritage_hero_1794280981908.jpg';
import tourPillarsImg from '../assets/images/tour_vision_pillars_1794280982922.jpg';

interface AppIntroductionPageProps {
  selectedLanguage: Language;
  guideSettings: GuideSettings;
  userProfile?: UserProfile | null;
  isReplayMode?: boolean;
  onOpenLanguageModal: () => void;
  onStartTour: () => void;
  onSkipIntroOnly?: () => void;
  onSkipToLogin: () => void;
  onSkipAllToApp: () => void;
}

const WELCOME_SPEECH_AUDIO_SCRIPT =
  "Welcome to Charaiva — your personal, intelligent, multilingual cultural and travel guide in your pocket. " +
  "Most guides hand you static, dry text only in one language. Charaiva transforms how you experience the world. " +
  "With one tap in Photo Guide, snap a monument, temple carving, dish, or inscription sign — even unfamiliar scripts via OCR — " +
  "and Charaiva streams vivid architectural stories, facts, and imagery in three lightning-fast batches without freezing your screen. " +
  "Tap Nearby Attractions to sweep any city or your live GPS with category filters and 500-meter to 10-kilometer radius control. " +
  "Talk freely with the AI Guide in 20 languages, featuring anti-repetition memory that connects discoveries without repeating what you already saw. " +
  "Switch effortlessly between Speech and Text, Speech Only, or silent museum Text Only, explore two-tier City Dossiers, " +
  "and keep full privacy control over saving clicked photos to phone memory. " +
  "Let's take a quick screen-by-screen tour, or skip anytime to start exploring in real time.";

const SPEECH_CHAPTERS = [
  {
    heading: '1. Greeting & Vision — A Living Cultural Companion',
    body: "Imagine standing before a thousand-year-old temple gopuram, a historic fort courtyard, a regional street food stall, or an weathered stone inscription in a script you cannot read — and having a warm, eloquent historian, cultural insider, and multilingual storyteller standing right beside you. Charaiva transforms your smartphone into that personal AI tourist and universal visual guide.",
  },
  {
    heading: '2. Zero-Freeze Vision, OCR & Three-Batch Streaming',
    body: "Instead of forcing travelers to stare at frozen spinners over spotty mobile data, Charaiva introduces Three-Batch Progressive Streaming: structural recognition and title appear immediately, vivid narration and spoken audio begin streaming right behind them, and deep architectural context fills in smoothly while you listen. Point at carvings, museum plaques, or heritage signboards and built-in OCR reads and translates them into your language. Even everyday objects receive rich storytelling, and every scanned sight unlocks a dedicated Deep Dive Explorer with secret facts, timelines, and unsolved mysteries.",
  },
  {
    heading: '3. Interactive Storytelling, Memory & Real-Time Radar',
    body: "Ask anything aloud or in text using AI Guide Chat across 20 global and Indian languages — powered by Session Anti-Repetition Memory so Charaiva remembers sites you already toured and connects new secrets without repeating old facts. Step onto any street or choose any destination remotely via Country, State, and City selectors to explore Two-Tier City Dossiers, sweep Nearby Attractions across a 500m to 10km radar with 8 category filters and Google Maps directions, visualize pins on the Interactive Map, and review every journey inside your Tour Journal.",
  },
  {
    heading: '4. One-Time Preferences, Privacy & Storage Control',
    body: "On first launch, Charaiva asks only essential guide preferences once — syncing your profile, Traveler Style, output modality (Speech + Text, Speech Only, or Silent Museum Text Only), Male or Female voice tuning, 10 story topic lenses, 4 eye-soothing color themes, and your explicit YES or NO permission to save clicked photos into your app data folder — straight into Settings so you are never prompted repeatedly again.",
  },
];

const WORKFLOW_STEPS = [
  {
    step: '01',
    title: 'Lock GPS or Pick Any City',
    detail: 'Start from your live physical coordinates or explore Nagpur, Madurai, Jaipur, Paris, Kyoto, and more remotely.',
    icon: MapPin,
  },
  {
    step: '02',
    title: 'Snap a Sight or Scan Nearby',
    detail: 'Use a single space-saving Photo Guide screen to click/upload photos, or open Attractions Radar to browse real sights around you.',
    icon: Camera,
  },
  {
    step: '03',
    title: 'Listen & Read in 20 Languages',
    detail: 'Three-batch progressive narration starts fast with synchronized voice output, OCR translation, and 10 customizable topic lenses.',
    icon: Volume2,
  },
  {
    step: '04',
    title: 'Ask Questions & Build Journal',
    detail: 'Follow up with voice dictation in AI Guide Chat while every discovered place logs neatly into your searchable Tour Journal.',
    icon: History,
  },
];

const OPTIONS_GUIDE = [
  {
    id: 'home',
    name: 'Explore Home & City Dossier',
    summary: 'Shows your active GPS or chosen city overview, current atmosphere tag, and launches the 2-tier City Guide modal.',
    icon: Compass,
  },
  {
    id: 'camera',
    name: 'Photo Guide & Deep Dive',
    summary: 'Single fast interface to snap or upload landmarks, monuments, dishes, or inscriptions with zero-freeze 3-batch AI narration.',
    icon: Camera,
  },
  {
    id: 'nearby',
    name: 'Attractions Radar',
    summary: 'Sweeps live Google Places & OpenStreetMap data from 500m to 10km with 8 category filters and Google Maps turn-by-turn links.',
    icon: MapPin,
  },
  {
    id: 'chat',
    name: 'AI Guide Chat',
    summary: 'Interactive voice and text Q&A in 20 languages with session awareness that remembers places you already visited.',
    icon: MessageSquare,
  },
  {
    id: 'map',
    name: 'Interactive Map',
    summary: 'Live Leaflet map centering on your destination with tap-to-tour landmark pins and spatial distance awareness.',
    icon: Map,
  },
  {
    id: 'history',
    name: 'Tour Journal',
    summary: 'Searchable memory log of every sight scanned or sampled, letting you replay complete stories and facts anytime.',
    icon: History,
  },
  {
    id: 'settings',
    name: 'Settings & Personalization',
    summary: 'Configure Location Mode, 20 Languages, Output Mode (Speech/Text/Both), Phone Memory Photo Storage (YES/NO), Voice Pitch/Pace & 10 Topics.',
    icon: Sliders,
  },
];

export const AppIntroductionPage: React.FC<AppIntroductionPageProps> = ({
  selectedLanguage,
  guideSettings,
  userProfile,
  isReplayMode = false,
  onOpenLanguageModal,
  onStartTour,
  onSkipIntroOnly,
  onSkipToLogin,
  onSkipAllToApp,
}) => {
  const [isSpeakingWelcome, setIsSpeakingWelcome] = useState(false);
  const [speechRate, setSpeechRate] = useState<number>(guideSettings.speechRate || 1.0);
  const [showFullTranscript, setShowFullTranscript] = useState(false);
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [pillarsImgFailed, setPillarsImgFailed] = useState(false);

  // Clean up any active speech when unmounting
  useEffect(() => {
    return () => {
      speechManager.stop();
    };
  }, []);

  const handleToggleSpeech = () => {
    if (isSpeakingWelcome) {
      speechManager.stop();
      setIsSpeakingWelcome(false);
      return;
    }

    setIsSpeakingWelcome(true);
    speechManager.speak({
      text: WELCOME_SPEECH_AUDIO_SCRIPT,
      language: 'English',
      languageCode: 'en-US',
      gender: guideSettings.voiceGender || 'female',
      pitch: guideSettings.voicePitch || (guideSettings.voiceGender === 'male' ? 0.95 : 1.08),
      rate: speechRate,
      onStart: () => setIsSpeakingWelcome(true),
      onEnd: () => setIsSpeakingWelcome(false),
      onError: () => setIsSpeakingWelcome(false),
    });
  };

  const handleCycleSpeechSpeed = () => {
    const nextRate = speechRate >= 1.2 ? 1.0 : 1.2;
    setSpeechRate(nextRate);
    if (isSpeakingWelcome) {
      speechManager.stop();
      setIsSpeakingWelcome(true);
      speechManager.speak({
        text: WELCOME_SPEECH_AUDIO_SCRIPT,
        language: 'English',
        languageCode: 'en-US',
        gender: guideSettings.voiceGender || 'female',
        pitch: guideSettings.voicePitch || (guideSettings.voiceGender === 'male' ? 0.95 : 1.08),
        rate: nextRate,
        onStart: () => setIsSpeakingWelcome(true),
        onEnd: () => setIsSpeakingWelcome(false),
        onError: () => setIsSpeakingWelcome(false),
      });
    }
  };

  const handleActionWithStop = (callback: () => void) => {
    speechManager.stop();
    setIsSpeakingWelcome(false);
    callback();
  };

  return (
    <div
      id="app-introduction-page"
      className="relative z-10 flex-1 min-h-0 overflow-y-auto overflow-x-hidden select-none"
    >
      {/* Compact Sub-View Context & Skip Action Strip */}
      <div
        style={{
          backgroundColor: 'var(--theme-card-bg)',
          borderColor: 'var(--theme-card-border)',
        }}
        className="sticky top-0 z-20 border-b backdrop-blur-xl px-4 py-2"
      >
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-serif font-bold text-[var(--theme-text-title)]">
                App Introduction &amp; Workflow
              </span>
              <span className="text-[var(--theme-text-muted)] hidden sm:inline">·</span>
              <span className="text-[11px] text-[var(--theme-text-muted)] hidden sm:inline truncate">
                Overview of features &amp; real-time guide
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onOpenLanguageModal}
              style={{
                backgroundColor: 'var(--theme-card-bg-subtle)',
                borderColor: 'var(--theme-card-border)',
                color: 'var(--theme-text-body)',
              }}
              className="min-h-[38px] px-3 rounded-xl border text-xs font-semibold flex items-center gap-1.5 cursor-pointer hover:border-[var(--theme-card-border-glow)] transition-colors whitespace-nowrap shrink-0"
              title="Choose narration language"
            >
              <span>{selectedLanguage.flag}</span>
              <span className="hidden xs:inline">{selectedLanguage.nativeName}</span>
              <Languages className="w-3.5 h-3.5 text-[var(--theme-accent-secondary)]" />
            </button>

            <button
              id="btn-skip-intro-top"
              type="button"
              onClick={() => handleActionWithStop(isReplayMode ? onSkipAllToApp : (onSkipIntroOnly || onSkipToLogin))}
              style={{
                backgroundColor: 'var(--theme-card-bg-subtle)',
                borderColor: 'var(--theme-card-border)',
                color: 'var(--theme-text-title)',
              }}
              className="min-h-[38px] px-3.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:border-[var(--theme-accent-primary)] transition-all active:scale-95 whitespace-nowrap shrink-0"
            >
              <span>{isReplayMode ? 'Back to Explore' : 'Skip Intro'}</span>
              <ArrowRight className="w-3.5 h-3.5 text-[var(--theme-accent-primary)]" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8 pb-12">
        {/* Hero Split Grid */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left Editorial Pitch & Welcome Speech Player */}
          <div className="lg:col-span-7 space-y-5">
            <div className="space-y-2.5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--theme-accent-secondary)]">
                Explore Smarter · Listen Deeper · Travel Free
              </p>
              <h1 className="font-serif font-bold text-2xl sm:text-4xl text-[var(--theme-text-title)] leading-tight [text-wrap:balance]">
                Your Personal AI Historian, Vision Scanner & Live Guide
              </h1>
              <p className="text-[15px] leading-relaxed text-[var(--theme-text-body)]">
                Charaiva turns your camera, location, and curiosity into live guided storytelling across 20 languages. Whether standing before an ancient temple facade or planning tomorrow&apos;s walk from home, every monument, inscription, and hidden gem comes alive cleanly without app freeze or clutter.
              </p>
            </div>

            {/* Playable Welcome Speech Module */}
            <div
              style={{
                backgroundColor: 'var(--theme-card-bg)',
                borderColor: isSpeakingWelcome ? 'var(--theme-accent-primary)' : 'var(--theme-card-border)',
              }}
              className="p-4 rounded-2xl border shadow-lg space-y-3 backdrop-blur-xl transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    style={{
                      background: isSpeakingWelcome
                        ? 'var(--theme-accent-primary-gradient)'
                        : 'var(--theme-card-bg-subtle)',
                      color: isSpeakingWelcome
                        ? 'var(--theme-accent-primary-text)'
                        : 'var(--theme-accent-primary)',
                      borderColor: 'var(--theme-card-border)',
                    }}
                    className="w-10 h-10 rounded-xl border flex items-center justify-center shrink-0"
                  >
                    <Volume2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-serif font-bold text-sm text-[var(--theme-text-title)]">
                      Listen to Charaiva&apos;s Welcome Speech
                    </h2>
                    <p className="text-xs text-[var(--theme-text-muted)]">
                      {isSpeakingWelcome
                        ? 'Playing narrated app feature highlights aloud...'
                        : 'Hear a spoken overview of Charaiva’s unique features · English preview'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleCycleSpeechSpeed}
                    style={{
                      backgroundColor: 'var(--theme-card-bg-subtle)',
                      borderColor: 'var(--theme-card-border)',
                      color: 'var(--theme-text-body)',
                    }}
                    className="min-h-[44px] px-3 rounded-xl border text-xs font-bold cursor-pointer hover:border-[var(--theme-card-border-glow)] whitespace-nowrap shrink-0"
                    title="Adjust speech speed"
                  >
                    {speechRate.toFixed(1)}x
                  </button>

                  <button
                    id="btn-play-welcome-speech"
                    type="button"
                    onClick={handleToggleSpeech}
                    style={
                      isSpeakingWelcome
                        ? { backgroundColor: '#e11d48', color: '#ffffff' }
                        : undefined
                    }
                    className={`min-h-[44px] px-4 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all whitespace-nowrap shrink-0 ${
                      isSpeakingWelcome ? 'shadow-md' : 'theme-btn-primary'
                    }`}
                  >
                    {isSpeakingWelcome ? (
                      <>
                        <Square className="w-3.5 h-3.5 fill-current" />
                        <span>Stop Speech</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Play Speech</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Active Audio Level Bars */}
              {isSpeakingWelcome && (
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="text-[11px] font-semibold text-[var(--theme-accent-secondary)] mr-1">
                    Voice Active:
                  </span>
                  {[0, 1, 2, 3, 4, 5].map((bar) => (
                    <span
                      key={bar}
                      style={{ backgroundColor: 'var(--theme-accent-primary)' }}
                      className="w-1 h-3 rounded-full animate-pulse"
                    />
                  ))}
                </div>
              )}

              {/* Toggle Full Speech Transcript */}
              <div
                className="pt-2 border-t flex items-center justify-between"
                style={{ borderColor: 'var(--theme-card-border)' }}
              >
                <button
                  type="button"
                  onClick={() => setShowFullTranscript((prev) => !prev)}
                  className="text-xs font-semibold text-[var(--theme-accent-secondary)] hover:underline flex items-center gap-1 cursor-pointer min-h-[36px]"
                >
                  <span>
                    {showFullTranscript
                      ? 'Hide Full Feature Speech'
                      : 'Read Complete Charaiva Feature Speech'}
                  </span>
                  {showFullTranscript ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {showFullTranscript && (
                <div
                  style={{
                    backgroundColor: 'var(--theme-card-bg-subtle)',
                    borderColor: 'var(--theme-card-border)',
                  }}
                  className="p-3.5 rounded-xl border space-y-3 text-xs leading-relaxed text-[var(--theme-text-body)] max-h-60 overflow-y-auto"
                >
                  {SPEECH_CHAPTERS.map((chapter) => (
                    <div key={chapter.heading} className="space-y-1">
                      <h3 className="font-serif font-bold text-[var(--theme-accent-primary)] text-xs">
                        {chapter.heading}
                      </h3>
                      <p>{chapter.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Primary Call-To-Action Row */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                id="btn-intro-start-tour"
                type="button"
                onClick={() => handleActionWithStop(onStartTour)}
                className="min-h-[48px] px-5 py-3 rounded-xl theme-btn-primary text-sm font-bold flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Sparkles className="w-4 h-4" />
                <span>Start Screen-by-Screen Tour</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {!isReplayMode && (
                <button
                  id="btn-intro-skip-to-login"
                  type="button"
                  onClick={() => handleActionWithStop(onSkipToLogin)}
                  className="min-h-[48px] px-4 py-3 rounded-xl theme-btn-secondary text-xs sm:text-sm font-semibold cursor-pointer whitespace-nowrap shrink-0"
                >
                  Skip to Sign In & Setup
                </button>
              )}

              <button
                id="btn-intro-skip-all"
                type="button"
                onClick={() => handleActionWithStop(onSkipAllToApp)}
                className="min-h-[44px] px-3 py-2 text-xs font-semibold text-[var(--theme-text-muted)] hover:text-[var(--theme-text-title)] underline underline-offset-4 cursor-pointer whitespace-nowrap shrink-0"
              >
                {isReplayMode ? 'Return to Workspace' : 'Skip All & Explore Now'}
              </button>
            </div>
          </div>

          {/* Right Atmospheric Heritage Showcase Frame */}
          <div className="lg:col-span-5">
            <div
              style={{
                backgroundColor: 'var(--theme-card-bg)',
                borderColor: 'var(--theme-card-border)',
              }}
              className="rounded-2xl border overflow-hidden shadow-2xl"
            >
              <div className="relative aspect-[16/10] w-full overflow-hidden">
                {!heroImgFailed ? (
                  <img
                    src={introHeroImg}
                    alt="Golden carved sandstone heritage temple courtyard at dusk"
                    referrerPolicy="no-referrer"
                    onError={() => setHeroImgFailed(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    style={{ background: 'var(--theme-bg-gradient)' }}
                    className="w-full h-full flex flex-col items-center justify-center p-6 text-center"
                  >
                    <MeenakshiLogo className="w-16 h-16 mb-2" />
                    <span className="font-serif font-bold text-sm text-[var(--theme-accent-primary)]">
                      Charaiva Cultural Lens
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent pointer-events-none" />
                <div className="absolute bottom-3 left-3 right-3 text-white space-y-0.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--theme-accent-primary)]">
                    Real-Time Multimodal Vision
                  </p>
                  <p className="text-xs font-medium text-white/90">
                    Monuments · Street Food · Inscriptions · Live GPS Radar
                  </p>
                </div>
              </div>

              <div className="p-4 space-y-2.5 text-xs">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[var(--theme-accent-secondary)] shrink-0 mt-0.5" />
                  <p className="text-[var(--theme-text-body)]">
                    <strong className="text-[var(--theme-text-title)]">Zero-Freeze Speed:</strong>{' '}
                    3-batch streaming delivers initial sight title and facts before rich commentary finishes.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[var(--theme-accent-secondary)] shrink-0 mt-0.5" />
                  <p className="text-[var(--theme-text-body)]">
                    <strong className="text-[var(--theme-text-title)]">Phone Storage Choice:</strong>{' '}
                    Save clicked photos to your internal app folder (YES) or run zero-footprint in memory (NO).
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How Charaiva Works: 4-Step Workflow */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <h2 className="font-serif font-bold text-xl text-[var(--theme-text-title)]">
                How Charaiva Works — 4-Step Workflow
              </h2>
              <p className="text-xs text-[var(--theme-text-muted)]">
                Designed for effortless standing tours in crowded monuments or remote trip discovery from home.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {WORKFLOW_STEPS.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.step}
                  style={{
                    backgroundColor: 'var(--theme-card-bg)',
                    borderColor: 'var(--theme-card-border)',
                  }}
                  className="p-4 rounded-2xl border space-y-2.5 shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-serif font-bold text-sm text-[var(--theme-accent-primary)]">
                      {item.step}
                    </span>
                    <Icon className="w-4 h-4 text-[var(--theme-accent-secondary)]" />
                  </div>
                  <h3 className="font-serif font-bold text-sm text-[var(--theme-text-title)]">
                    {item.title}
                  </h3>
                  <p className="text-xs leading-relaxed text-[var(--theme-text-muted)]">
                    {item.detail}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Brief Guide to Every Screen & Option */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-8 space-y-4">
            <div>
              <h2 className="font-serif font-bold text-xl text-[var(--theme-text-title)]">
                What Every Option & Screen Does
              </h2>
              <p className="text-xs text-[var(--theme-text-muted)]">
                A brief guide to Charaiva&apos;s seven primary navigation tabs before your live tour begins.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {OPTIONS_GUIDE.map((opt) => {
                const Icon = opt.icon;
                return (
                  <div
                    key={opt.id}
                    style={{
                      backgroundColor: 'var(--theme-card-bg)',
                      borderColor: 'var(--theme-card-border)',
                    }}
                    className="p-3.5 rounded-2xl border flex items-start gap-3 shadow-sm"
                  >
                    <div
                      style={{
                        backgroundColor: 'var(--theme-card-bg-subtle)',
                        borderColor: 'var(--theme-card-border)',
                        color: 'var(--theme-accent-primary)',
                      }}
                      className="w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 mt-0.5"
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <h3 className="text-xs font-bold text-[var(--theme-text-title)]">
                        {opt.name}
                      </h3>
                      <p className="text-[11.5px] leading-relaxed text-[var(--theme-text-muted)]">
                        {opt.summary}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Highlight Image Panel */}
          <div className="lg:col-span-4 space-y-3">
            <div
              style={{
                backgroundColor: 'var(--theme-card-bg)',
                borderColor: 'var(--theme-card-border)',
              }}
              className="rounded-2xl border overflow-hidden shadow-lg"
            >
              <div className="aspect-[4/3] w-full overflow-hidden">
                {!pillarsImgFailed ? (
                  <img
                    src={tourPillarsImg}
                    alt="Carved temple stone colonnade pillars lit by warm afternoon sunlight"
                    referrerPolicy="no-referrer"
                    onError={() => setPillarsImgFailed(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    style={{ background: 'var(--theme-bg-gradient)' }}
                    className="w-full h-full flex items-center justify-center p-6"
                  >
                    <Camera className="w-10 h-10 text-[var(--theme-accent-primary)]" />
                  </div>
                )}
              </div>
              <div className="p-4 space-y-2">
                <h3 className="font-serif font-bold text-sm text-[var(--theme-text-title)]">
                  Ready for the Interactive Screen Tour?
                </h3>
                <p className="text-xs leading-relaxed text-[var(--theme-text-muted)]">
                  Preview each screen step by step so you know where every control lives—or skip directly to Sign In or real-time exploring whenever you wish.
                </p>
                <button
                  type="button"
                  onClick={() => handleActionWithStop(onStartTour)}
                  className="w-full min-h-[44px] px-4 rounded-xl theme-btn-primary text-xs font-bold flex items-center justify-center gap-2 cursor-pointer mt-2 whitespace-nowrap"
                >
                  <span>Begin Interactive Tour</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
