import React, { useState, useEffect } from 'react';
import {
  Compass,
  Camera,
  MapPin,
  MessageSquare,
  Map,
  History,
  Sliders,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Volume2,
  HardDrive,
  Languages,
  Navigation,
  Search,
  CheckCircle2,
  X,
} from 'lucide-react';
import { GuideSettings, Language, UserProfile } from '../types';
import { speechManager } from '../utils/speech';
import introHeroImg from '../assets/images/intro_heritage_hero_1794280981908.jpg';
import tourPillarsImg from '../assets/images/tour_vision_pillars_1794280982922.jpg';
import tourCityImg from '../assets/images/tour_city_skyline_1794280982464.jpg';

interface AppTourOverlayProps {
  selectedLanguage: Language;
  guideSettings: GuideSettings;
  userProfile?: UserProfile | null;
  isReplayMode?: boolean;
  onCompleteTour: () => void;
  onSkipTourToExploreNow: () => void;
  onBackToIntro?: () => void;
}

interface TourStepConfig {
  id: string;
  number: string;
  tabLabel: string;
  title: string;
  headline: string;
  description: string;
  whatItDoes: Array<{ label: string; detail: string }>;
  image?: string;
  imageAlt?: string;
  icon: React.ComponentType<{ className?: string }>;
  spokenHint: string;
}

const TOUR_STEPS: TourStepConfig[] = [
  {
    id: 'home',
    number: '01',
    tabLabel: 'Explore',
    title: 'Explore Home & Two-Tier City Dossier',
    headline: 'Your live cultural command center for wherever you are',
    description:
      'Displays your exact GPS city or manually picked destination with a live atmosphere snapshot, authentic local photography, and instant 1-tap shortcuts to scan sights or browse attractions.',
    whatItDoes: [
      {
        label: 'Explore City Modal',
        detail: 'Opens a two-tier City Guide: an instant Brief Overview or a multi-section In-Depth Historian Dossier.',
      },
      {
        label: 'Live GPS or Chosen City Badge',
        detail: 'Always shows whether you are exploring physical GPS coordinates or a remote city destination.',
      },
      {
        label: '1-Tap Launch Strip',
        detail: 'Jumps directly into Click / Upload Sight, Attractions Radar, or Settings without hunting menus.',
      },
    ],
    image: tourCityImg,
    imageAlt: 'Historic Indian stone waterfront ghats and skyline bathed in twilight lantern light',
    icon: Compass,
    spokenHint:
      'Step one is Explore Home. View your live destination overview, atmosphere, and open curated two-tier City Guides anytime.',
  },
  {
    id: 'camera',
    number: '02',
    tabLabel: 'Photo Guide',
    title: 'Photo Guide & Three-Batch Streaming Vision',
    headline: 'Snap or upload any sight—zero lag, zero wasted space',
    description:
      'A unified screen handles both camera capture and photo library upload while automatically compressing frames for mobile speed. Results stream in three non-blocking batches so your tour begins immediately.',
    whatItDoes: [
      {
        label: 'Batch 1 → Batch 2 → Batch 3 Streaming',
        detail: 'Instant title and heritage era appear first, core story & voice follow immediately, and deep architectural context loads right behind.',
      },
      {
        label: 'OCR Plaque & Script Translation',
        detail: 'Reads carvings, museum plaques, and street signage aloud in your chosen language.',
      },
      {
        label: 'Deep Dive Explorer & Phone Memory Control',
        detail: 'Expand deeper architectural riddles inside Deep Dive, with photos stored to /app-data/photos only when you enable YES.',
      },
    ],
    image: tourPillarsImg,
    imageAlt: 'Illuminated carved stone temple corridor pillars',
    icon: Camera,
    spokenHint:
      'Step two is Photo Guide. Click or upload a single photo to stream stories, OCR plaque translations, and Deep Dive trivia without freezing.',
  },
  {
    id: 'nearby',
    number: '03',
    tabLabel: 'Attractions',
    title: 'Nearby Attractions Radar',
    headline: 'Discover verified monuments, food, markets & shrines around you',
    description:
      'Queries real verified geographic places via Google Places and OpenStreetMap around your live GPS or chosen city, ranked by distance or rating with concise highlights.',
    whatItDoes: [
      {
        label: '8 Category Chips & Distance Slider',
        detail: 'Filter across Temples, Heritage, Museums, Nature, Food & Chai, Markets, or Viewpoints from 500m up to 10km.',
      },
      {
        label: 'Instant Audio Pitch & AI Tour',
        detail: 'Tap any spot for a 1-line "Why Visit" summary, listen live, or launch a tailored AI Guide narration.',
      },
      {
        label: 'Google Maps Handoff',
        detail: 'Open real walking or driving directions straight to any discovered monument or cafe.',
      },
    ],
    icon: MapPin,
    spokenHint:
      'Step three is Nearby Attractions Radar. Filter real places by category and radius from five hundred meters to ten kilometers.',
  },
  {
    id: 'chat',
    number: '04',
    tabLabel: 'AI Guide',
    title: 'Multilingual AI Guide Chat with Tour Memory',
    headline: 'Ask anything aloud or in text—never hear repeated tours',
    description:
      'Hold voice conversations or type quick questions about architecture, local dishes, legends, or photography angles in any of 20 supported languages.',
    whatItDoes: [
      {
        label: 'Voice Dictation Microphone',
        detail: 'Speak naturally in Hindi, Tamil, Spanish, Japanese, English, or any supported language for instant conversational replies.',
      },
      {
        label: 'Anti-Repetition Session Memory',
        detail: 'Remembers every sight already visited in your session so follow-up answers weave connected stories instead of repeating basics.',
      },
      {
        label: 'Context-Linked Questions',
        detail: 'Carry specific scanned monuments directly from Photo Guide or Attractions into conversation.',
      },
    ],
    icon: MessageSquare,
    spokenHint:
      'Step four is AI Guide Chat. Ask spoken or typed follow-up questions while Charaiva remembers your session visits.',
  },
  {
    id: 'map',
    number: '05',
    tabLabel: 'Map',
    title: 'Interactive Sightseeing Map',
    headline: 'See nearby heritage pins spatially around your position',
    description:
      'Powered by live interactive mapping tiles that re-center seamlessly whenever you toggle GPS or pick a remote city worldwide.',
    whatItDoes: [
      {
        label: 'Auto-Centered Viewport',
        detail: 'Updates smoothly to Nagpur, Madurai, Jaipur, Paris, Kyoto, or your live coordinates.',
      },
      {
        label: 'Tap Pin to Launch Tour',
        detail: 'Select any mapped heritage marker to read its summary and open a full guided sight view.',
      },
    ],
    icon: Map,
    spokenHint:
      'Step five is the Interactive Map, keeping historic markers and walking proximity visible around your destination.',
  },
  {
    id: 'history',
    number: '06',
    tabLabel: 'Journal',
    title: 'Tour Journal & Offline Photo Vault',
    headline: 'Every sight visited today organized for instant replay',
    description:
      'Automatically chronicles scanned monuments and explored landmarks in chronological order, paired with private photo vault management when enabled.',
    whatItDoes: [
      {
        label: 'Instant Story Replay',
        detail: 'Reopen any past sight explanation, key facts, and voice narration without re-scanning.',
      },
      {
        label: 'Full Privacy Management',
        detail: 'Browse or clear saved photos inside your sandboxed internal app folder whenever needed.',
      },
    ],
    image: introHeroImg,
    imageAlt: 'Sunlit temple colonnade preserved as a travel memory',
    icon: History,
    spokenHint:
      'Step six is Tour Journal. Revisit scanned stories anytime and inspect or clear locally saved sight photos.',
  },
  {
    id: 'settings',
    number: '07',
    tabLabel: 'Settings',
    title: 'Settings, Profile & Personalization',
    headline: 'Tailored once during sign-in—editable anytime across 5 panels',
    description:
      'Everything you configure at login automatically lives here so Charaiva never asks twice: Profile, GPS/Manual City, 20 Languages, Output & Storage, Voice & Topics, and Color Themes.',
    whatItDoes: [
      {
        label: '20 Languages & Output Flexibility',
        detail: 'Switch between Speech + Text, Speech Only, or Text Only silent reading for museums.',
      },
      {
        label: 'Female / Male Voice & 10 Topic Lenses',
        detail: 'Fine-tune pitch and speaking speed plus pick History, Mythology, Food, Photography, Architecture, and Mysteries.',
      },
      {
        label: '4 Live Themes & Account Controls',
        detail: 'Preview Celestial, Sunset, Emerald, or Royal Daylight themes anytime or replay this tour.',
      },
    ],
    icon: Sliders,
    spokenHint:
      'Step seven is Settings. Adjust your profile, language, speech output mode, phone memory storage, voice tone, and themes anytime.',
  },
];

export const AppTourOverlay: React.FC<AppTourOverlayProps> = ({
  selectedLanguage,
  guideSettings,
  userProfile,
  isReplayMode = false,
  onCompleteTour,
  onSkipTourToExploreNow,
  onBackToIntro,
}) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [isSpeakingHint, setIsSpeakingHint] = useState(false);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const currentStep = TOUR_STEPS[stepIndex];
  const isLastStep = stepIndex === TOUR_STEPS.length - 1;
  const StepIcon = currentStep.icon;

  useEffect(() => {
    return () => {
      speechManager.stop();
    };
  }, []);

  // Stop speech cleanly when step changes
  useEffect(() => {
    speechManager.stop();
    setIsSpeakingHint(false);
  }, [stepIndex]);

  const handleToggleHintSpeech = () => {
    if (isSpeakingHint) {
      speechManager.stop();
      setIsSpeakingHint(false);
      return;
    }

    setIsSpeakingHint(true);
    speechManager.speak({
      text: currentStep.spokenHint,
      language: 'English',
      languageCode: 'en-US',
      gender: guideSettings.voiceGender || 'female',
      pitch: guideSettings.voicePitch || (guideSettings.voiceGender === 'male' ? 0.95 : 1.08),
      rate: guideSettings.speechRate || 1.0,
      onStart: () => setIsSpeakingHint(true),
      onEnd: () => setIsSpeakingHint(false),
      onError: () => setIsSpeakingHint(false),
    });
  };

  const handleSkipNow = () => {
    speechManager.stop();
    onSkipTourToExploreNow();
  };

  const handleNext = () => {
    speechManager.stop();
    if (isLastStep) {
      onCompleteTour();
    } else {
      setStepIndex((i) => Math.min(TOUR_STEPS.length - 1, i + 1));
    }
  };

  const handlePrev = () => {
    speechManager.stop();
    if (stepIndex > 0) {
      setStepIndex((i) => i - 1);
    }
  };

  const renderScreenSchematic = (step: TourStepConfig) => {
    if (step.image && !failedImages[step.id]) {
      return (
        <div className="relative aspect-[4/3] w-full overflow-hidden">
          <img
            src={step.image}
            alt={step.imageAlt || step.title}
            referrerPolicy="no-referrer"
            onError={() => setFailedImages((prev) => ({ ...prev, [step.id]: true }))}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
          <div className="absolute bottom-3 left-3 right-3 text-white flex items-end justify-between gap-2">
            <div>
              <p className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--theme-accent-primary)]">
                Screen {step.number} · {step.tabLabel}
              </p>
              <p className="text-xs font-medium text-white/95">{step.title}</p>
            </div>
          </div>
        </div>
      );
    }

    // Authentic interactive schematic preview matching real controls inside that Charaiva screen
    return (
      <div
        style={{ background: 'var(--theme-card-bg-subtle)' }}
        className="aspect-[4/3] w-full p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div
              style={{
                background: 'var(--theme-accent-primary-gradient)',
                color: 'var(--theme-accent-primary-text)',
              }}
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            >
              <StepIcon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--theme-accent-primary)]">
                Screen {step.number} Preview
              </p>
              <p className="text-xs font-serif font-bold text-[var(--theme-text-title)]">
                {step.tabLabel} Workspace
              </p>
            </div>
          </div>
          <span className="text-[11px] font-semibold text-[var(--theme-text-muted)]">
            {selectedLanguage.flag} {selectedLanguage.nativeName}
          </span>
        </div>

        {/* Specific Real Control Showcase per Screen */}
        {step.id === 'nearby' && (
          <div className="space-y-2.5 my-auto">
            <div className="flex flex-wrap gap-1.5 text-[11px] font-semibold">
              {['All Sights', 'Temples', 'Heritage', 'Museums', 'Food & Chai'].map((cat, idx) => (
                <span
                  key={cat}
                  style={
                    idx === 1
                      ? {
                          background: 'var(--theme-accent-primary-gradient)',
                          color: 'var(--theme-accent-primary-text)',
                        }
                      : {
                          backgroundColor: 'var(--theme-card-bg)',
                          borderColor: 'var(--theme-card-border)',
                          color: 'var(--theme-text-body)',
                        }
                  }
                  className="px-2.5 py-1 rounded-lg border"
                >
                  {cat}
                </span>
              ))}
            </div>
            <div
              style={{
                backgroundColor: 'var(--theme-card-bg)',
                borderColor: 'var(--theme-card-border)',
              }}
              className="p-3 rounded-xl border space-y-1"
            >
              <div className="flex items-center justify-between text-xs font-bold text-[var(--theme-text-title)]">
                <span>Meenakshi Amman Temple</span>
                <span className="text-[var(--theme-accent-secondary)]">420m · ★ 4.9</span>
              </div>
              <p className="text-[11px] text-[var(--theme-text-muted)]">
                14 towering polychrome gopurams and the acoustic musical pillars of Pandyan Madurai.
              </p>
            </div>
          </div>
        )}

        {step.id === 'chat' && (
          <div className="space-y-2 my-auto text-xs">
            <div
              style={{
                backgroundColor: 'var(--theme-card-bg)',
                borderColor: 'var(--theme-card-border)',
              }}
              className="p-2.5 rounded-xl border ml-8 text-[var(--theme-text-title)]"
            >
              “Why do the granite pillars near the mandapam produce musical notes?”
            </div>
            <div
              style={{
                backgroundColor: 'var(--theme-card-bg)',
                borderColor: 'var(--theme-accent-secondary)',
              }}
              className="p-2.5 rounded-xl border mr-4 space-y-1"
            >
              <p className="text-[10.5px] font-bold text-[var(--theme-accent-secondary)]">
                AI Guide · Session Memory Aware
              </p>
              <p className="text-[11px] text-[var(--theme-text-body)]">
                Each slender shaft beside the hall you scanned earlier is carved to a unique resonant thickness from a single block of high-silica granite.
              </p>
            </div>
          </div>
        )}

        {step.id === 'map' && (
          <div
            style={{
              backgroundColor: 'var(--theme-card-bg)',
              borderColor: 'var(--theme-card-border)',
            }}
            className="rounded-xl border p-3.5 my-auto space-y-2.5"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[var(--theme-text-title)] flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-[var(--theme-accent-secondary)]" />
                <span>Interactive Destination Viewport</span>
              </span>
              <span className="text-[11px] text-[var(--theme-accent-primary)]">3km Radius</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
              <div
                style={{ backgroundColor: 'var(--theme-card-bg-subtle)', borderColor: 'var(--theme-card-border)' }}
                className="p-2 rounded-lg border"
              >
                <MapPin className="w-3.5 h-3.5 mx-auto text-[var(--theme-accent-primary)] mb-1" />
                <span className="font-semibold text-[var(--theme-text-title)] block truncate">Heritage Pin</span>
              </div>
              <div
                style={{ backgroundColor: 'var(--theme-card-bg-subtle)', borderColor: 'var(--theme-card-border)' }}
                className="p-2 rounded-lg border"
              >
                <Search className="w-3.5 h-3.5 mx-auto text-[var(--theme-accent-secondary)] mb-1" />
                <span className="font-semibold text-[var(--theme-text-title)] block truncate">City Re-Center</span>
              </div>
              <div
                style={{ backgroundColor: 'var(--theme-card-bg-subtle)', borderColor: 'var(--theme-card-border)' }}
                className="p-2 rounded-lg border"
              >
                <Volume2 className="w-3.5 h-3.5 mx-auto text-[var(--theme-accent-primary)] mb-1" />
                <span className="font-semibold text-[var(--theme-text-title)] block truncate">Tap Audio</span>
              </div>
            </div>
          </div>
        )}

        {step.id === 'settings' && (
          <div className="grid grid-cols-2 gap-2 my-auto text-xs">
            {[
              { icon: Compass, label: 'GPS / Manual City' },
              { icon: Languages, label: '20 Languages' },
              { icon: Volume2, label: 'Speech · Text · Both' },
              { icon: HardDrive, label: 'Phone Memory YES/NO' },
            ].map((item) => {
              const IconComp = item.icon;
              return (
                <div
                  key={item.label}
                  style={{
                    backgroundColor: 'var(--theme-card-bg)',
                    borderColor: 'var(--theme-card-border)',
                  }}
                  className="p-2.5 rounded-xl border flex items-center gap-2"
                >
                  <IconComp className="w-4 h-4 text-[var(--theme-accent-primary)] shrink-0" />
                  <span className="font-semibold text-[11px] text-[var(--theme-text-title)] truncate">
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {(step.id === 'home' || step.id === 'camera' || step.id === 'history') && (
          <div className="p-3 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] my-auto text-xs text-[var(--theme-text-body)]">
            {step.description}
          </div>
        )}

        <div className="flex items-center justify-between text-[11px] text-[var(--theme-text-muted)] pt-2 border-t border-[var(--theme-card-border)]">
          <span>Bottom Bar Destination #{step.number}</span>
          <span className="font-semibold text-[var(--theme-accent-secondary)]">Ready in Real Time</span>
        </div>
      </div>
    );
  };

  return (
    <div
      id="app-tour-overlay"
      className="relative z-10 flex-1 min-h-0 overflow-y-auto overflow-x-hidden flex flex-col select-none"
    >
      {/* Compact Tour Step & Skip Bar */}
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
                Interactive Screen Tour
              </span>
              <span className="text-[var(--theme-text-muted)]">·</span>
              <span className="font-semibold text-[var(--theme-accent-primary)] whitespace-nowrap">
                Screen {stepIndex + 1} of {TOUR_STEPS.length}
              </span>
            </div>
            <p className="text-[11px] text-[var(--theme-text-muted)] truncate hidden sm:block">
              Learn what every screen does — or tap any option above to explore live
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onBackToIntro && (
              <button
                type="button"
                onClick={() => {
                  speechManager.stop();
                  onBackToIntro();
                }}
                style={{
                  backgroundColor: 'var(--theme-card-bg-subtle)',
                  borderColor: 'var(--theme-card-border)',
                  color: 'var(--theme-text-body)',
                }}
                className="min-h-[38px] px-3 rounded-xl border text-xs font-semibold hidden sm:flex items-center gap-1 cursor-pointer hover:border-[var(--theme-card-border-glow)] whitespace-nowrap shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Intro</span>
              </button>
            )}

            <button
              id="btn-skip-tour-now"
              type="button"
              onClick={handleSkipNow}
              style={{
                backgroundColor: 'var(--theme-card-bg-subtle)',
                borderColor: 'var(--theme-card-border)',
                color: 'var(--theme-text-title)',
              }}
              className="min-h-[38px] px-3.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:border-[var(--theme-accent-primary)] active:scale-95 transition-all whitespace-nowrap shrink-0"
            >
              <X className="w-3.5 h-3.5 text-[var(--theme-accent-primary)]" />
              <span>{isReplayMode ? 'Close Tour' : 'Skip Tour & Explore Now'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Centered Tour Card Container */}
      <div className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-5 sm:py-7 flex flex-col justify-between gap-6">
        {/* Step Navigation Pills / Screen Switcher Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {TOUR_STEPS.map((s, idx) => {
            const Icon = s.icon;
            const isActive = idx === stepIndex;
            const isVisited = idx < stepIndex;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setStepIndex(idx)}
                style={
                  isActive
                    ? {
                        background: 'var(--theme-accent-primary-gradient)',
                        color: 'var(--theme-accent-primary-text)',
                        borderColor: 'var(--theme-accent-primary)',
                      }
                    : {
                        backgroundColor: 'var(--theme-card-bg)',
                        borderColor: isVisited
                          ? 'var(--theme-accent-secondary)'
                          : 'var(--theme-card-border)',
                        color: isVisited
                          ? 'var(--theme-text-title)'
                          : 'var(--theme-text-muted)',
                      }
                }
                className="min-h-[44px] px-3 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all whitespace-nowrap shrink-0"
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {s.number}. {s.tabLabel}
                </span>
              </button>
            );
          })}
        </div>

        {/* Active Step Split Grid */}
        <div
          style={{
            backgroundColor: 'var(--theme-card-bg)',
            borderColor: 'var(--theme-card-border)',
          }}
          className="rounded-2xl border shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12"
        >
          {/* Left Column: Detailed Screen Functionality Explanation */}
          <div className="lg:col-span-7 p-5 sm:p-7 flex flex-col justify-between space-y-5">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-xs font-bold uppercase tracking-widest text-[var(--theme-accent-secondary)]">
                  Screen {currentStep.number} · {currentStep.tabLabel}
                </p>

                <button
                  type="button"
                  onClick={handleToggleHintSpeech}
                  style={{
                    backgroundColor: 'var(--theme-card-bg-subtle)',
                    borderColor: isSpeakingHint
                      ? 'var(--theme-accent-primary)'
                      : 'var(--theme-card-border)',
                    color: 'var(--theme-text-title)',
                  }}
                  className="min-h-[36px] px-3 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Volume2 className="w-3.5 h-3.5 text-[var(--theme-accent-primary)]" />
                  <span>{isSpeakingHint ? 'Stop Hint' : 'Hear Screen Hint'}</span>
                </button>
              </div>

              <h1 className="font-serif font-bold text-xl sm:text-2xl text-[var(--theme-text-title)] leading-snug [text-wrap:balance]">
                {currentStep.title}
              </h1>
              <p className="text-sm font-semibold text-[var(--theme-accent-primary)]">
                {currentStep.headline}
              </p>
              <p className="text-sm leading-relaxed text-[var(--theme-text-body)]">
                {currentStep.description}
              </p>
            </div>

            {/* Key Capabilities Breakdown */}
            <div className="space-y-2.5 pt-1">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--theme-text-muted)]">
                What you can do on this screen
              </p>
              <div className="space-y-2">
                {currentStep.whatItDoes.map((item) => (
                  <div
                    key={item.label}
                    style={{
                      backgroundColor: 'var(--theme-card-bg-subtle)',
                      borderColor: 'var(--theme-card-border)',
                    }}
                    className="p-3 rounded-xl border flex items-start gap-2.5"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[var(--theme-accent-secondary)] shrink-0 mt-0.5" />
                    <div className="min-w-0 text-xs">
                      <span className="font-bold text-[var(--theme-text-title)] block">
                        {item.label}
                      </span>
                      <span className="text-[var(--theme-text-muted)] leading-relaxed">
                        {item.detail}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Visual Screen Preview / Artwork */}
          <div
            className="lg:col-span-5 border-t lg:border-t-0 lg:border-l flex flex-col justify-between"
            style={{ borderColor: 'var(--theme-card-border)' }}
          >
            {renderScreenSchematic(currentStep)}

            <div
              className="p-4 border-t text-xs space-y-1.5"
              style={{
                backgroundColor: 'var(--theme-card-bg-subtle)',
                borderColor: 'var(--theme-card-border)',
              }}
            >
              <p className="font-semibold text-[var(--theme-text-title)] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[var(--theme-accent-primary)] shrink-0" />
                <span>Real-Time Exploration Ready</span>
              </p>
              <p className="text-[11px] text-[var(--theme-text-muted)] leading-relaxed">
                Every control on {currentStep.tabLabel} automatically inherits your chosen language ({selectedLanguage.nativeName}), location mode, and theme.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Tour Controls */}
        <footer className="flex flex-wrap items-center justify-between gap-3 pb-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrev}
              disabled={stepIndex === 0}
              className={`min-h-[46px] px-4 rounded-xl theme-btn-secondary text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                stepIndex === 0 ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <button
              type="button"
              onClick={handleSkipNow}
              className="min-h-[46px] px-3 text-xs font-semibold text-[var(--theme-text-muted)] hover:text-[var(--theme-text-title)] underline underline-offset-4 cursor-pointer whitespace-nowrap shrink-0"
            >
              Skip Tour &amp; Explore in Real Time
            </button>
          </div>

          <button
            id="btn-tour-next"
            type="button"
            onClick={handleNext}
            className="min-h-[46px] px-5 py-2.5 rounded-xl theme-btn-primary text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
          >
            <span>
              {isLastStep
                ? isReplayMode
                  ? 'Finish Tour & Return'
                  : 'Continue to Sign In & Preferences'
                : `Next: ${TOUR_STEPS[stepIndex + 1].tabLabel}`}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </footer>
      </div>
    </div>
  );
};
