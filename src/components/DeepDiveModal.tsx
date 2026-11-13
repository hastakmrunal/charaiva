import React, { useState, useEffect } from 'react';
import { Language, GuideSettings, GuideOutputMode } from '../types';
import { speechManager } from '../utils/speech';
import { WordByWordText } from './WordByWordText';
import {
  Sparkles,
  Volume2,
  Pause,
  X,
  CheckCircle2,
  HelpCircle,
  Clock,
  Compass,
  MessageSquare,
  Flame,
  Key,
  Layers
} from 'lucide-react';

interface DeepDiveData {
  title: string;
  deepDiveNarration: string;
  secretFacts: string[];
  architecturalSecrets: string[];
  historicalTimeline: Array<{ era: string; event: string }>;
  unsolvedMysteries: string[];
  visitorProTips: string[];
}

interface DeepDiveModalProps {
  title: string;
  category?: string;
  locationName?: string;
  currentNarration?: string;
  selectedLanguage: Language;
  guideSettings?: GuideSettings;
  outputMode?: GuideOutputMode;
  onClose: () => void;
  onOpenChatWithQuestion: (question: string) => void;
}

export const DeepDiveModal: React.FC<DeepDiveModalProps> = ({
  title,
  category,
  locationName,
  currentNarration,
  selectedLanguage,
  guideSettings,
  onClose,
  onOpenChatWithQuestion,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DeepDiveData | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState<'narration' | 'secrets' | 'architecture' | 'mysteries' | 'tips'>('narration');

  useEffect(() => {
    let isMounted = true;
    async function fetchDeepDive() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/deep-dive-topic', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            category,
            locationName,
            currentNarration,
            language: selectedLanguage.name,
          }),
        });

        if (!res.ok) throw new Error('Could not fetch deep dive data');
        const json = await res.json();
        if (isMounted && json.success) {
          setData(json);
        } else {
          throw new Error(json.error || 'Failed to load');
        }
      } catch (err: any) {
        if (isMounted) setError(err.message || 'Failed to generate deep dive');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchDeepDive();

    return () => {
      isMounted = false;
      speechManager.stop();
    };
  }, [title, selectedLanguage.name]);

  // Handle Speech Narration
  const handleToggleSpeech = () => {
    if (isPlaying) {
      speechManager.stop();
      setIsPlaying(false);
    } else if (data?.deepDiveNarration) {
      speechManager.speak({
        text: data.deepDiveNarration,
        language: selectedLanguage.name,
        languageCode: selectedLanguage.speechCode,
        rate: guideSettings?.speechRate || 1.0,
        pitch: guideSettings?.voicePitch,
        gender: guideSettings?.voiceGender || 'female',
        onStart: () => setIsPlaying(true),
        onEnd: () => setIsPlaying(false),
        onError: () => setIsPlaying(false),
      });
    }
  };

  return (
    <div
      id="deep-dive-modal-overlay"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-fade-in"
    >
      <div
        id="deep-dive-modal-content"
        style={{
          backgroundColor: 'var(--theme-card-bg)',
          borderColor: 'var(--theme-card-border-glow)',
          color: 'var(--theme-text-title)',
        }}
        className="w-full max-w-2xl max-h-[90vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Modal Header */}
        <div
          style={{
            backgroundColor: 'var(--theme-card-bg-subtle)',
            borderColor: 'var(--theme-card-border)',
          }}
          className="shrink-0 p-4 border-b flex items-center justify-between gap-3"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded-full theme-badge-gold font-bold text-[10px] uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Deep In-Depth Exploration
              </span>
              <span className="text-[10px] text-[var(--theme-accent-secondary)] font-medium">
                {selectedLanguage.nativeName}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-serif font-bold text-[var(--theme-text-title)] truncate mt-0.5">
              {title}
            </h3>
            {locationName && (
              <p className="text-xs text-[var(--theme-text-muted)] truncate">{locationName}</p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {data && (
              <button
                onClick={handleToggleSpeech}
                style={
                  isPlaying
                    ? undefined
                    : {
                        backgroundColor: 'var(--theme-card-bg)',
                        borderColor: 'var(--theme-card-border)',
                        color: 'var(--theme-accent-primary)',
                      }
                }
                className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold ${
                  isPlaying
                    ? 'theme-btn-primary animate-pulse border-transparent'
                    : 'hover:border-[var(--theme-card-border-glow)]'
                }`}
                title={isPlaying ? 'Pause Audio' : 'Listen to Deep Dive Audio'}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                <span className="hidden sm:inline">{isPlaying ? 'Playing' : 'Listen'}</span>
              </button>
            )}

            <button
              onClick={() => {
                speechManager.stop();
                onClose();
              }}
              style={{
                backgroundColor: 'var(--theme-card-bg)',
                borderColor: 'var(--theme-card-border)',
                color: 'var(--theme-text-muted)',
              }}
              className="p-2 rounded-xl border hover:text-[var(--theme-text-title)] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        {data && (
          <div
            style={{
              backgroundColor: 'var(--theme-card-bg-subtle)',
              borderColor: 'var(--theme-card-border)',
            }}
            className="shrink-0 flex items-center gap-1 px-3 pt-2 border-b overflow-x-auto scrollbar-none"
          >
            {[
              { id: 'narration' as const, label: 'Deep Story', icon: Volume2 },
              { id: 'secrets' as const, label: `Hidden Secrets (${data.secretFacts?.length || 0})`, icon: Key },
              { id: 'architecture' as const, label: 'Architecture', icon: Layers },
              { id: 'mysteries' as const, label: 'Mysteries', icon: HelpCircle },
              { id: 'tips' as const, label: 'Insider Tips', icon: Compass },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`pb-2 px-3 text-xs font-bold border-b-2 whitespace-nowrap cursor-pointer transition-all flex items-center gap-1.5 ${
                    active
                      ? 'border-[var(--theme-accent-primary)] text-[var(--theme-text-title)]'
                      : 'border-transparent text-[var(--theme-text-muted)] hover:text-[var(--theme-text-title)]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-10 h-10 border-3 border-[var(--theme-accent-primary)] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-[var(--theme-text-muted)] font-medium animate-pulse">
                Uncovering legends, secrets, and historical records about {title}...
              </p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-2xl bg-rose-950/50 border border-rose-700/50 text-center space-y-2">
              <p className="text-xs text-rose-200 font-medium">{error}</p>
              <button
                onClick={() => onClose()}
                className="px-3 py-1.5 rounded-xl theme-btn-secondary text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          )}

          {data && !loading && (
            <>
              {activeTab === 'narration' && (
                <div className="space-y-3">
                  <div
                    style={{
                      backgroundColor: 'var(--theme-card-bg-subtle)',
                      borderColor: 'var(--theme-card-border)',
                    }}
                    className="p-4 rounded-2xl border leading-relaxed text-xs sm:text-sm text-[var(--theme-text-body)] font-sans shadow-sm whitespace-pre-line"
                  >
                    <WordByWordText text={data.deepDiveNarration} />
                  </div>

                  {data.historicalTimeline && data.historicalTimeline.length > 0 && (
                    <div
                      style={{
                        backgroundColor: 'var(--theme-card-bg-subtle)',
                        borderColor: 'var(--theme-card-border)',
                      }}
                      className="p-3.5 rounded-2xl border space-y-2"
                    >
                      <h4 className="text-xs font-bold text-[var(--theme-accent-primary)] flex items-center gap-1.5 uppercase tracking-wider">
                        <Clock className="w-3.5 h-3.5" />
                        Historical Timeline Milestones
                      </h4>
                      <div className="space-y-1.5">
                        {data.historicalTimeline.map((item, idx) => (
                          <div
                            key={idx}
                            style={{ borderColor: 'var(--theme-accent-secondary)' }}
                            className="flex items-start gap-2.5 text-xs text-[var(--theme-text-body)] border-l-2 pl-2.5 py-0.5"
                          >
                            <span className="font-bold text-[var(--theme-accent-primary)] shrink-0">{item.era}:</span>
                            <span>{item.event}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'secrets' && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold text-[var(--theme-accent-primary)] uppercase tracking-wider flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5" />
                    Lesser-Known Secrets &amp; Folklore:
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {data.secretFacts.map((fact, idx) => (
                      <div
                        key={idx}
                        style={{
                          backgroundColor: 'var(--theme-card-bg-subtle)',
                          borderColor: 'var(--theme-card-border)',
                        }}
                        className="p-3 rounded-2xl border text-xs text-[var(--theme-text-body)] shadow-sm flex items-start gap-2"
                      >
                        <Flame className="w-4 h-4 text-[var(--theme-accent-primary)] shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{fact}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'architecture' && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold text-[var(--theme-accent-primary)] uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    Architectural &amp; Craft Secrets to Spot:
                  </h4>
                  <div className="space-y-2">
                    {data.architecturalSecrets.map((arch, idx) => (
                      <div
                        key={idx}
                        style={{
                          backgroundColor: 'var(--theme-card-bg-subtle)',
                          borderColor: 'var(--theme-card-border)',
                        }}
                        className="p-3 rounded-2xl border text-xs text-[var(--theme-text-body)] flex items-start gap-2.5"
                      >
                        <CheckCircle2 className="w-4 h-4 text-[var(--theme-accent-secondary)] shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{arch}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'mysteries' && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold text-[var(--theme-accent-primary)] uppercase tracking-wider flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5" />
                    Unsolved Mysteries &amp; Debates:
                  </h4>
                  <div className="space-y-2">
                    {data.unsolvedMysteries.map((mystery, idx) => (
                      <div
                        key={idx}
                        style={{
                          backgroundColor: 'var(--theme-card-bg-subtle)',
                          borderColor: 'var(--theme-card-border)',
                        }}
                        className="p-3.5 rounded-2xl border text-xs text-[var(--theme-text-body)] space-y-1"
                      >
                        <p className="leading-relaxed">{mystery}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'tips' && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold text-[var(--theme-accent-primary)] uppercase tracking-wider flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5" />
                    Insider Visitor Pro Tips:
                  </h4>
                  <div className="space-y-2">
                    {data.visitorProTips.map((tip, idx) => (
                      <div
                        key={idx}
                        style={{
                          backgroundColor: 'var(--theme-card-bg-subtle)',
                          borderColor: 'var(--theme-card-border)',
                        }}
                        className="p-3 rounded-2xl border text-xs text-[var(--theme-text-body)] flex items-start gap-2.5"
                      >
                        <CheckCircle2 className="w-4 h-4 text-[var(--theme-accent-primary)] shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{tip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer: Ask AI Question */}
        <div
          style={{
            backgroundColor: 'var(--theme-card-bg-subtle)',
            borderColor: 'var(--theme-card-border)',
          }}
          className="shrink-0 p-3 border-t flex items-center justify-between gap-2"
        >
          <button
            onClick={() => {
              speechManager.stop();
              onOpenChatWithQuestion(`Tell me more fascinating secrets and questions about ${title}`);
              onClose();
            }}
            className="flex-1 py-2.5 px-3 rounded-xl theme-btn-primary text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-[0.99]"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Ask AI Guide a Question About This</span>
          </button>
        </div>
      </div>
    </div>
  );
};
