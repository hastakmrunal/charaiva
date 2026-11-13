import React, { useState, useEffect } from 'react';
import { Language, GuideSettings } from '../types';
import { speechManager } from '../utils/speech';
import { PlaceCardImage } from './PlaceCardImage';
import { WordByWordText } from './WordByWordText';
import {
  X,
  Sparkles,
  Volume2,
  Pause,
  Play,
  MapPin,
  Clock,
  Calendar,
  Utensils,
  Landmark,
  Building,
  ChevronDown,
  ChevronUp,
  Compass,
  ArrowRight,
  BookOpen,
  Info,
  ShieldCheck,
  Navigation as NavIcon,
  CheckCircle2,
  Sun
} from 'lucide-react';

export interface CityGuideData {
  cityName: string;
  state?: string;
  country: string;
  moniker: string;
  photoUrl?: string;
  briefOverview: string;
  quickHighlights: string[];
  famousFoods: string[];
  bestTimeToVisit: string;
  climateAndGeography?: string;
  inDepthGuide?: {
    foundingAndHistory: string;
    architecturalHeritage: string;
    culinaryTrail: string;
    topDistricts: Array<{
      name: string;
      character: string;
      mustSee: string;
    }>;
    visitorInsiderTips: string[];
  };
}

interface CityGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  cityName: string;
  stateName?: string;
  countryName?: string;
  selectedLanguage: Language;
  guideSettings?: GuideSettings;
  onProceedToNearby?: (city: string) => void;
}

export const CityGuideModal: React.FC<CityGuideModalProps> = ({
  isOpen,
  onClose,
  cityName,
  stateName = '',
  countryName = 'India',
  selectedLanguage,
  guideSettings,
  onProceedToNearby,
}) => {
  const [cityData, setCityData] = useState<CityGuideData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isExpandedMore, setIsExpandedMore] = useState<boolean>(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen || !cityName) return;

    let isMounted = true;
    setIsLoading(true);
    setIsExpandedMore(false);
    speechManager.stop();
    setIsPlayingAudio(false);

    async function fetchCityGuide() {
      try {
        const res = await fetch('/api/city/info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            city: cityName,
            state: stateName,
            country: countryName,
            language: selectedLanguage.name,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.success) {
            setCityData(data);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch city info:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchCityGuide();

    return () => {
      isMounted = false;
      speechManager.stop();
      setIsPlayingAudio(false);
    };
  }, [isOpen, cityName, selectedLanguage.name]);

  if (!isOpen) return null;

  const handleTogglePlayAudio = () => {
    if (isPlayingAudio) {
      speechManager.stop();
      setIsPlayingAudio(false);
      return;
    }

    if (!cityData) return;

    const audioScript = isExpandedMore && cityData.inDepthGuide
      ? `Welcome to ${cityData.cityName}, ${cityData.moniker}. ${cityData.briefOverview} History and founding: ${cityData.inDepthGuide.foundingAndHistory} Architectural heritage: ${cityData.inDepthGuide.architecturalHeritage} Culinary trail: ${cityData.inDepthGuide.culinaryTrail}`
      : `Welcome to ${cityData.cityName}, ${cityData.moniker}. ${cityData.briefOverview} Famous for: ${cityData.quickHighlights.slice(0, 3).join(', ')}. Iconic foods: ${cityData.famousFoods.slice(0, 3).join(', ')}. Best time to visit is ${cityData.bestTimeToVisit}.`;

    speechManager.speak({
      text: audioScript,
      language: selectedLanguage.name,
      languageCode: selectedLanguage.speechCode,
      rate: guideSettings?.speechRate || 1.0,
      pitch: guideSettings?.voicePitch || (guideSettings?.voiceGender === 'male' ? 0.95 : 1.08),
      gender: guideSettings?.voiceGender || 'female',
      onStart: () => setIsPlayingAudio(true),
      onEnd: () => setIsPlayingAudio(false),
      onError: () => setIsPlayingAudio(false),
    });
  };

  return (
    <div
      id="city-guide-modal-overlay"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          speechManager.stop();
          onClose();
        }
      }}
    >
      <div
        id="city-guide-modal-container"
        style={{
          backgroundColor: 'var(--theme-card-bg)',
          borderColor: 'var(--theme-card-border-glow)',
          color: 'var(--theme-text-title)',
        }}
        className="relative w-full max-w-2xl border rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto backdrop-blur-xl"
      >
        {/* Modal Top Bar */}
        <div
          style={{
            backgroundColor: 'var(--theme-card-bg-subtle)',
            borderColor: 'var(--theme-card-border)',
          }}
          className="shrink-0 p-3 sm:p-4 border-b flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div
              style={{
                backgroundColor: 'var(--theme-card-bg)',
                borderColor: 'var(--theme-card-border)',
              }}
              className="w-8 h-8 rounded-xl border flex items-center justify-center text-[var(--theme-accent-primary)] shrink-0"
            >
              <Compass className="w-4 h-4 text-[var(--theme-accent-primary)]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-base sm:text-lg font-serif font-bold text-[var(--theme-text-title)] truncate">
                  {cityName}
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full theme-badge-gold">
                  City Dossier
                </span>
              </div>
              <p className="text-[11px] text-[var(--theme-accent-secondary)] truncate">
                {stateName ? `${stateName}, ${countryName}` : countryName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Audio narration button */}
            {cityData && (
              <button
                onClick={handleTogglePlayAudio}
                style={{
                  background: isPlayingAudio ? 'var(--theme-accent-primary-gradient)' : 'var(--theme-card-bg)',
                  color: isPlayingAudio ? 'var(--theme-accent-primary-text)' : 'var(--theme-accent-primary)',
                  borderColor: 'var(--theme-card-border)',
                }}
                className={`p-2 rounded-full border transition-all cursor-pointer ${
                  isPlayingAudio ? 'animate-pulse' : 'hover:border-[var(--theme-card-border-glow)]'
                }`}
                title={isPlayingAudio ? 'Pause Narration' : 'Listen to City Story'}
              >
                {isPlayingAudio ? <Pause className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            )}

            <button
              onClick={() => {
                speechManager.stop();
                onClose();
              }}
              style={{
                backgroundColor: 'var(--theme-card-bg)',
                color: 'var(--theme-text-muted)',
                borderColor: 'var(--theme-card-border)',
              }}
              className="p-2 rounded-full border cursor-pointer active:scale-95 transition-all hover:text-[var(--theme-text-title)]"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-3 text-center">
              <div className="w-10 h-10 border-3 border-[var(--theme-accent-primary)] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-medium text-[var(--theme-accent-secondary)]">
                Compiling rich heritage dossier for {cityName} in {selectedLanguage.nativeName}...
              </p>
            </div>
          ) : cityData ? (
            <>
              {/* City Hero Image & Moniker Banner */}
              <div
                style={{
                  backgroundColor: 'var(--theme-card-bg-subtle)',
                  borderColor: 'var(--theme-card-border)',
                }}
                className="relative rounded-2xl overflow-hidden border shadow-lg"
              >
                <div className="w-full h-44 sm:h-52 overflow-hidden relative">
                  <PlaceCardImage
                    placeName={cityData.cityName}
                    cityName={cityData.cityName}
                    initialImageUrl={cityData.photoUrl}
                    size="full"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                </div>

                <div className="absolute bottom-3 left-3 right-3 flex flex-col gap-1">
                  <span className="self-start text-[10px] sm:text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full theme-badge-gold shadow-md">
                    {cityData.moniker}
                  </span>
                  <h2 className="text-xl sm:text-2xl font-serif font-bold text-white drop-shadow-md">
                    {cityData.cityName}
                  </h2>
                </div>
              </div>

              {/* TIER 1: Brief Information Section */}
              <div
                style={{
                  backgroundColor: 'var(--theme-card-bg-subtle)',
                  borderColor: 'var(--theme-card-border)',
                }}
                className="space-y-3 p-3.5 sm:p-4 rounded-2xl border"
              >
                <div
                  style={{ borderColor: 'var(--theme-card-border)' }}
                  className="flex items-center gap-2 text-[var(--theme-accent-primary)] font-serif font-bold text-sm sm:text-base border-b pb-1.5"
                >
                  <Sparkles className="w-4 h-4 text-[var(--theme-accent-primary)]" />
                  <span>Brief City Overview</span>
                </div>

                <WordByWordText
                  text={cityData.briefOverview}
                  wordsPerTick={2}
                  intervalMs={28}
                  as="p"
                  className="text-xs sm:text-sm text-[var(--theme-text-body)] leading-relaxed whitespace-pre-line"
                />

                {/* Quick Highlights Grid */}
                {cityData.quickHighlights && cityData.quickHighlights.length > 0 && (
                  <div className="pt-2">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--theme-accent-primary)] mb-2 flex items-center gap-1.5">
                      <Landmark className="w-3.5 h-3.5 text-[var(--theme-accent-primary)]" />
                      <span>Key City Highlights</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {cityData.quickHighlights.map((hl, idx) => (
                        <div
                          key={idx}
                          style={{
                            backgroundColor: 'var(--theme-card-bg)',
                            borderColor: 'var(--theme-card-border)',
                          }}
                          className="p-2 rounded-xl border flex items-start gap-2 text-xs text-[var(--theme-text-title)]"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--theme-accent-primary)] mt-1.5 shrink-0" />
                          <span className="leading-snug">{hl}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Famous Foods Badges */}
                {cityData.famousFoods && cityData.famousFoods.length > 0 && (
                  <div className="pt-2">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--theme-accent-primary)] mb-2 flex items-center gap-1.5">
                      <Utensils className="w-3.5 h-3.5 text-[var(--theme-accent-primary)]" />
                      <span>Famous Foods & Specialties</span>
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {cityData.famousFoods.map((food, idx) => (
                        <span
                          key={idx}
                          style={{
                            backgroundColor: 'var(--theme-card-bg)',
                            borderColor: 'var(--theme-card-border)',
                            color: 'var(--theme-accent-secondary)',
                          }}
                          className="px-2.5 py-1 rounded-lg border text-xs font-medium flex items-center gap-1.5"
                        >
                          <span>🍴</span>
                          <span>{food}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Best Time to Visit & Climate */}
                <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div
                    style={{
                      backgroundColor: 'var(--theme-card-bg)',
                      borderColor: 'var(--theme-card-border)',
                    }}
                    className="p-2.5 rounded-xl border flex items-start gap-2"
                  >
                    <Calendar className="w-4 h-4 text-[var(--theme-accent-primary)] mt-0.5 shrink-0" />
                    <div>
                      <span className="text-[10px] font-bold text-[var(--theme-accent-primary)] uppercase tracking-wider block">
                        Best Season
                      </span>
                      <span className="text-xs text-[var(--theme-text-title)] font-medium">
                        {cityData.bestTimeToVisit}
                      </span>
                    </div>
                  </div>

                  {cityData.climateAndGeography && (
                    <div
                      style={{
                        backgroundColor: 'var(--theme-card-bg)',
                        borderColor: 'var(--theme-card-border)',
                      }}
                      className="p-2.5 rounded-xl border flex items-start gap-2"
                    >
                      <Sun className="w-4 h-4 text-[var(--theme-accent-primary)] mt-0.5 shrink-0" />
                      <div>
                        <span className="text-[10px] font-bold text-[var(--theme-accent-primary)] uppercase tracking-wider block">
                          Geography & Setting
                        </span>
                        <span className="text-xs text-[var(--theme-text-muted)] line-clamp-2">
                          {cityData.climateAndGeography}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* TIER 2: Explore More Expandable Button & In-Depth Section */}
              <div className="pt-1">
                {!isExpandedMore ? (
                  <button
                    id="btn-explore-more-city-guide"
                    onClick={() => setIsExpandedMore(true)}
                    className="w-full py-3 px-4 rounded-2xl theme-btn-primary font-bold text-xs sm:text-sm shadow-xl active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Explore More About {cityData.cityName} (In-Depth Guide)</span>
                    <ChevronDown className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="space-y-4 animate-fadeIn">
                    {/* Collapsible toggle header */}
                    <div
                      style={{
                        backgroundColor: 'var(--theme-card-bg-subtle)',
                        borderColor: 'var(--theme-card-border)',
                      }}
                      className="flex items-center justify-between p-3 rounded-2xl border"
                    >
                      <div className="flex items-center gap-2 text-[var(--theme-accent-primary)] font-serif font-bold text-sm">
                        <BookOpen className="w-4 h-4 text-[var(--theme-accent-primary)]" />
                        <span>In-Depth Heritage & Tourism Guide</span>
                      </div>
                      <button
                        onClick={() => setIsExpandedMore(false)}
                        style={{
                          backgroundColor: 'var(--theme-card-bg)',
                          color: 'var(--theme-text-title)',
                          borderColor: 'var(--theme-card-border)',
                        }}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 border cursor-pointer hover:border-[var(--theme-card-border-glow)]"
                      >
                        <span>Show Less</span>
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {cityData.inDepthGuide && (
                      <div className="space-y-3.5">
                        {/* History & Founding Dynasties */}
                        <div
                          style={{
                            backgroundColor: 'var(--theme-card-bg-subtle)',
                            borderColor: 'var(--theme-card-border)',
                          }}
                          className="p-3.5 sm:p-4 rounded-2xl border space-y-2"
                        >
                          <h4 className="text-xs sm:text-sm font-serif font-bold text-[var(--theme-accent-primary)] flex items-center gap-1.5">
                            <Building className="w-4 h-4 text-[var(--theme-accent-primary)]" />
                            <span>Founding Dynasties & Historical Eras</span>
                          </h4>
                          <p className="text-xs sm:text-sm text-[var(--theme-text-body)] leading-relaxed whitespace-pre-line">
                            {cityData.inDepthGuide.foundingAndHistory}
                          </p>
                        </div>

                        {/* Architectural Heritage */}
                        <div
                          style={{
                            backgroundColor: 'var(--theme-card-bg-subtle)',
                            borderColor: 'var(--theme-card-border)',
                          }}
                          className="p-3.5 sm:p-4 rounded-2xl border space-y-2"
                        >
                          <h4 className="text-xs sm:text-sm font-serif font-bold text-[var(--theme-accent-primary)] flex items-center gap-1.5">
                            <Landmark className="w-4 h-4 text-[var(--theme-accent-primary)]" />
                            <span>Architectural Styles & Stonework</span>
                          </h4>
                          <p className="text-xs sm:text-sm text-[var(--theme-text-body)] leading-relaxed whitespace-pre-line">
                            {cityData.inDepthGuide.architecturalHeritage}
                          </p>
                        </div>

                        {/* Culinary Trail */}
                        <div
                          style={{
                            backgroundColor: 'var(--theme-card-bg-subtle)',
                            borderColor: 'var(--theme-card-border)',
                          }}
                          className="p-3.5 sm:p-4 rounded-2xl border space-y-2"
                        >
                          <h4 className="text-xs sm:text-sm font-serif font-bold text-[var(--theme-accent-primary)] flex items-center gap-1.5">
                            <Utensils className="w-4 h-4 text-[var(--theme-accent-primary)]" />
                            <span>Culinary Trail & Street Food Secrets</span>
                          </h4>
                          <p className="text-xs sm:text-sm text-[var(--theme-text-body)] leading-relaxed whitespace-pre-line">
                            {cityData.inDepthGuide.culinaryTrail}
                          </p>
                        </div>

                        {/* Top Districts */}
                        {cityData.inDepthGuide.topDistricts && cityData.inDepthGuide.topDistricts.length > 0 && (
                          <div
                            style={{
                              backgroundColor: 'var(--theme-card-bg-subtle)',
                              borderColor: 'var(--theme-card-border)',
                            }}
                            className="p-3.5 sm:p-4 rounded-2xl border space-y-2.5"
                          >
                            <h4 className="text-xs sm:text-sm font-serif font-bold text-[var(--theme-accent-primary)] flex items-center gap-1.5">
                              <MapPin className="w-4 h-4 text-[var(--theme-accent-primary)]" />
                              <span>Key Cultural Districts & Neighborhoods</span>
                            </h4>
                            <div className="space-y-2">
                              {cityData.inDepthGuide.topDistricts.map((dist, idx) => (
                                <div
                                  key={idx}
                                  style={{
                                    backgroundColor: 'var(--theme-card-bg)',
                                    borderColor: 'var(--theme-card-border)',
                                  }}
                                  className="p-2.5 rounded-xl border space-y-1 text-xs"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-bold text-[var(--theme-accent-primary)]">{dist.name}</span>
                                    <span className="text-[10px] px-2 py-0.5 rounded-md theme-badge-teal">
                                      Must See: {dist.mustSee}
                                    </span>
                                  </div>
                                  <p className="text-[var(--theme-text-body)] leading-relaxed">{dist.character}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Visitor Insider Tips */}
                        {cityData.inDepthGuide.visitorInsiderTips && cityData.inDepthGuide.visitorInsiderTips.length > 0 && (
                          <div
                            style={{
                              backgroundColor: 'var(--theme-card-bg-subtle)',
                              borderColor: 'var(--theme-card-border)',
                            }}
                            className="p-3.5 sm:p-4 rounded-2xl border space-y-2"
                          >
                            <h4 className="text-xs sm:text-sm font-serif font-bold text-[var(--theme-accent-primary)] flex items-center gap-1.5">
                              <ShieldCheck className="w-4 h-4 text-emerald-400" />
                              <span>Insider Visitor Tips & Transit</span>
                            </h4>
                            <div className="space-y-1.5">
                              {cityData.inDepthGuide.visitorInsiderTips.map((tip, idx) => (
                                <div
                                  key={idx}
                                  style={{
                                    backgroundColor: 'var(--theme-card-bg)',
                                    borderColor: 'var(--theme-card-border)',
                                  }}
                                  className="p-2 rounded-xl border flex items-start gap-2 text-xs text-[var(--theme-text-body)]"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                                  <span className="leading-snug">{tip}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* Modal Bottom Actions */}
        <div
          style={{
            backgroundColor: 'var(--theme-card-bg-subtle)',
            borderColor: 'var(--theme-card-border)',
          }}
          className="shrink-0 p-3 sm:p-4 border-t flex items-center justify-between gap-2"
        >
          <button
            onClick={() => {
              speechManager.stop();
              onClose();
            }}
            style={{
              backgroundColor: 'var(--theme-card-bg)',
              color: 'var(--theme-text-title)',
              borderColor: 'var(--theme-card-border)',
            }}
            className="px-4 py-2 rounded-xl font-bold text-xs border cursor-pointer active:scale-95 transition-all hover:border-[var(--theme-card-border-glow)]"
          >
            Close
          </button>

          {onProceedToNearby && cityData && (
            <button
              id="btn-modal-explore-attractions"
              onClick={() => {
                speechManager.stop();
                onProceedToNearby(cityData.cityName);
                onClose();
              }}
              className="px-4 py-2 rounded-xl theme-btn-primary font-bold text-xs sm:text-sm shadow-md active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <NavIcon className="w-3.5 h-3.5" />
              <span>Explore All Attractions in {cityData.cityName}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
