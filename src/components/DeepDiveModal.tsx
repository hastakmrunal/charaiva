import React, { useState, useEffect } from 'react';
import { Language, GuideSettings, GuideOutputMode } from '../types';
import { speechManager } from '../utils/speech';
import {
  Sparkles,
  Volume2,
  VolumeX,
  Play,
  Pause,
  X,
  CheckCircle2,
  HelpCircle,
  Clock,
  Compass,
  MessageSquare,
  Flame,
  Key,
  Layers,
  ChevronRight
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
  outputMode = 'both',
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
        languageCode: selectedLanguage.speechCode,
        rate: guideSettings?.speechRate || 1.0,
        pitch: guideSettings?.voicePitch || 1.08,
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
        className="w-full max-w-2xl max-h-[90vh] bg-gradient-to-b from-[#221812] to-[#140e0a] rounded-3xl border border-amber-600/70 shadow-2xl flex flex-col overflow-hidden text-amber-50"
      >
        {/* Modal Header */}
        <div className="shrink-0 p-4 border-b border-amber-800/60 bg-[#1c140e] flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[10px] uppercase tracking-wider border border-amber-500/40 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                Deep In-Depth Exploration
              </span>
              <span className="text-[10px] text-amber-400/80 font-medium">
                {selectedLanguage.nativeName}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-serif font-bold text-amber-100 truncate mt-0.5">
              {title}
            </h3>
            {locationName && (
              <p className="text-xs text-amber-300/70 truncate">{locationName}</p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {data && (
              <button
                onClick={handleToggleSpeech}
                className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold ${
                  isPlaying
                    ? 'bg-amber-500 text-amber-950 border-amber-400 animate-pulse'
                    : 'bg-amber-950 text-amber-300 border-amber-700 hover:bg-amber-900'
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
              className="p-2 rounded-xl bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-700/60 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        {data && (
          <div className="shrink-0 flex items-center gap-1 px-3 pt-2 bg-[#18110b] border-b border-amber-800/50 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveTab('narration')}
              className={`pb-2 px-3 text-xs font-bold border-b-2 whitespace-nowrap cursor-pointer transition-all flex items-center gap-1.5 ${
                activeTab === 'narration'
                  ? 'border-amber-400 text-amber-200'
                  : 'border-transparent text-amber-400/60 hover:text-amber-200'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Deep Story</span>
            </button>

            <button
              onClick={() => setActiveTab('secrets')}
              className={`pb-2 px-3 text-xs font-bold border-b-2 whitespace-nowrap cursor-pointer transition-all flex items-center gap-1.5 ${
                activeTab === 'secrets'
                  ? 'border-amber-400 text-amber-200'
                  : 'border-transparent text-amber-400/60 hover:text-amber-200'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>Hidden Secrets ({data.secretFacts?.length || 0})</span>
            </button>

            <button
              onClick={() => setActiveTab('architecture')}
              className={`pb-2 px-3 text-xs font-bold border-b-2 whitespace-nowrap cursor-pointer transition-all flex items-center gap-1.5 ${
                activeTab === 'architecture'
                  ? 'border-amber-400 text-amber-200'
                  : 'border-transparent text-amber-400/60 hover:text-amber-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Architecture</span>
            </button>

            <button
              onClick={() => setActiveTab('mysteries')}
              className={`pb-2 px-3 text-xs font-bold border-b-2 whitespace-nowrap cursor-pointer transition-all flex items-center gap-1.5 ${
                activeTab === 'mysteries'
                  ? 'border-amber-400 text-amber-200'
                  : 'border-transparent text-amber-400/60 hover:text-amber-200'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Mysteries</span>
            </button>

            <button
              onClick={() => setActiveTab('tips')}
              className={`pb-2 px-3 text-xs font-bold border-b-2 whitespace-nowrap cursor-pointer transition-all flex items-center gap-1.5 ${
                activeTab === 'tips'
                  ? 'border-amber-400 text-amber-200'
                  : 'border-transparent text-amber-400/60 hover:text-amber-200'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Insider Tips</span>
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-10 h-10 border-3 border-amber-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-amber-200 font-medium animate-pulse">
                Uncovering untold legends, secrets, and historical records about {title}...
              </p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-2xl bg-red-950/50 border border-red-800 text-center space-y-2">
              <p className="text-xs text-red-200 font-medium">{error}</p>
              <button
                onClick={() => onClose()}
                className="px-3 py-1.5 rounded-xl bg-amber-800 text-amber-100 text-xs font-bold"
              >
                Close
              </button>
            </div>
          )}

          {data && !loading && (
            <>
              {activeTab === 'narration' && (
                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-amber-950/60 border border-amber-700/60 leading-relaxed text-xs sm:text-sm text-amber-100 font-sans shadow-md space-y-2.5 whitespace-pre-line">
                    {data.deepDiveNarration}
                  </div>

                  {data.historicalTimeline && data.historicalTimeline.length > 0 && (
                    <div className="p-3.5 rounded-2xl bg-[#1c140e] border border-amber-800/60 space-y-2">
                      <h4 className="text-xs font-bold text-amber-300 flex items-center gap-1.5 uppercase tracking-wider">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        Historical Timeline Milestones
                      </h4>
                      <div className="space-y-1.5">
                        {data.historicalTimeline.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-2.5 text-xs text-amber-100 border-l-2 border-amber-500/50 pl-2.5 py-0.5"
                          >
                            <span className="font-bold text-amber-400 shrink-0">{item.era}:</span>
                            <span className="text-amber-200/90">{item.event}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'secrets' && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-amber-400" />
                    Lesser-Known Secrets & Folklore:
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {data.secretFacts.map((fact, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-2xl bg-[#1c140e] border border-amber-800/60 text-xs text-amber-100 space-y-1 shadow-sm flex items-start gap-2"
                      >
                        <Flame className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{fact}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'architecture' && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-amber-400" />
                    Architectural & Craft Secrets to Spot:
                  </h4>
                  <div className="space-y-2">
                    {data.architecturalSecrets.map((arch, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-2xl bg-[#1c140e] border border-amber-800/60 text-xs text-amber-100 flex items-start gap-2.5"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{arch}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'mysteries' && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                    Unsolved Mysteries & Debates:
                  </h4>
                  <div className="space-y-2">
                    {data.unsolvedMysteries.map((mystery, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-800/60 text-xs text-amber-100 space-y-1"
                      >
                        <p className="leading-relaxed">{mystery}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'tips' && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-amber-400" />
                    Insider Visitor Pro Tips:
                  </h4>
                  <div className="space-y-2">
                    {data.visitorProTips.map((tip, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-2xl bg-[#1c140e] border border-amber-800/60 text-xs text-amber-100 flex items-start gap-2.5"
                      >
                        <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
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
        <div className="shrink-0 p-3 bg-[#18110b] border-t border-amber-800/60 flex items-center justify-between gap-2">
          <button
            onClick={() => {
              speechManager.stop();
              onOpenChatWithQuestion(`Tell me more fascinating secrets and questions about ${title}`);
              onClose();
            }}
            className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-900 to-amber-800 hover:brightness-110 text-amber-100 border border-amber-600/70 text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-98"
          >
            <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
            <span>Ask AI Guide a Question About This</span>
          </button>
        </div>
      </div>
    </div>
  );
};
