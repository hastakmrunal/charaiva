import React, { useState, useEffect, useTransition } from 'react';
import { RecognitionResult, Language, GuideOutputMode, SupplementaryImage } from '../types';
import { speechManager } from '../utils/speech';
import { DeepDiveModal } from './DeepDiveModal';
import { PlaceCardImage } from './PlaceCardImage';
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  Sparkles,
  MessageSquare,
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  Layers,
  ArrowLeft,
  HelpCircle,
  FileText,
  Headphones,
  Maximize2,
  X,
  Camera,
  Image as ImageIcon,
  BookOpen
} from 'lucide-react';

interface ExplanationViewProps {
  landmark: RecognitionResult;
  selectedLanguage: Language;
  onBack: () => void;
  onOpenChatWithQuestion: (question: string) => void;
  onSaveToHistory: (landmark: RecognitionResult) => void;
  isSavedInHistory: boolean;
  onOpenLanguageModal?: () => void;
  outputMode: GuideOutputMode;
  onToggleOutputMode: (mode: GuideOutputMode) => void;
  guideSettings?: import('../types').GuideSettings;
}

export const ExplanationView: React.FC<ExplanationViewProps> = ({
  landmark,
  selectedLanguage,
  onBack,
  onOpenChatWithQuestion,
  onSaveToHistory,
  isSavedInHistory,
  onOpenLanguageModal,
  outputMode,
  onToggleOutputMode,
  guideSettings,
}) => {
  const [isPendingTransition, startTransition] = useTransition();
  const [activeLandmark, setActiveLandmark] = useState<RecognitionResult>(landmark);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [activeTab, setActiveTab] = useState<'narration' | 'contextImages' | 'facts' | 'architecture' | 'questions' | 'ocr'>('narration');
  const [selectedLightboxImage, setSelectedLightboxImage] = useState<SupplementaryImage | null>(null);
  const [isDeepDiveOpen, setIsDeepDiveOpen] = useState(false);

  // Keep active landmark synced when prop changes
  useEffect(() => {
    startTransition(() => {
      setActiveLandmark(landmark);
    });
  }, [landmark]);

  // Translate landmark when selectedLanguage changes or if activeLandmark isn't in selectedLanguage
  useEffect(() => {
    let isMounted = true;

    async function translateIfNeeded() {
      if (selectedLanguage.code === 'en' && activeLandmark.language === 'English') {
        return;
      }

      if (activeLandmark.language === selectedLanguage.name) {
        return;
      }

      setIsTranslating(true);
      speechManager.stop();
      setIsPlaying(false);

      try {
        const response = await fetch('/api/translate-landmark', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            landmark: activeLandmark,
            targetLanguage: selectedLanguage.name,
          }),
        });

        const data = await response.json();
        if (isMounted && data.success && data.landmark) {
          startTransition(() => {
            setActiveLandmark(data.landmark);
          });
        }
      } catch (err) {
        console.error('Translation error:', err);
      } finally {
        if (isMounted) {
          setIsTranslating(false);
        }
      }
    }

    translateIfNeeded();

    return () => {
      isMounted = false;
    };
  }, [selectedLanguage, landmark.id]);

  // Start Narration Automatically on Load only if outputMode includes speech
  useEffect(() => {
    if (!isTranslating && (outputMode === 'speech' || outputMode === 'both')) {
      handlePlaySpeech();
    } else {
      speechManager.stop();
      setIsPlaying(false);
    }

    return () => {
      speechManager.stop();
      setIsPlaying(false);
    };
  }, [activeLandmark, selectedLanguage, isTranslating, outputMode]);

  const handlePlaySpeech = () => {
    speechManager.speak({
      text: activeLandmark.narration,
      languageCode: selectedLanguage.speechCode,
      rate: guideSettings?.speechRate || speechRate,
      pitch: guideSettings?.voicePitch || 1.08,
      gender: guideSettings?.voiceGender || 'female',
      onStart: () => setIsPlaying(true),
      onEnd: () => setIsPlaying(false),
      onError: () => setIsPlaying(false),
    });
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      speechManager.stop();
      setIsPlaying(false);
    } else {
      handlePlaySpeech();
    }
  };

  const handleSpeedChange = (newRate: number) => {
    setSpeechRate(newRate);
    if (isPlaying) {
      speechManager.stop();
      speechManager.speak({
        text: activeLandmark.narration,
        languageCode: selectedLanguage.speechCode,
        rate: newRate,
        onStart: () => setIsPlaying(true),
        onEnd: () => setIsPlaying(false),
      });
    }
  };

  return (
    <div id="explanation-view" className="h-full flex flex-col overflow-hidden py-1.5 space-y-1.5 relative select-none">
      {/* Top Header Controls */}
      <div className="shrink-0 flex items-center justify-between gap-2">
        <button
          onClick={onBack}
          style={{
            backgroundColor: 'var(--theme-card-bg-subtle)',
            borderColor: 'var(--theme-card-border)',
            color: 'var(--theme-text-title)',
          }}
          className="px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 cursor-pointer active:scale-95 hover:border-[var(--theme-card-border-glow)]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onSaveToHistory(activeLandmark)}
            style={{
              backgroundColor: isSavedInHistory ? 'var(--theme-card-bg-subtle)' : undefined,
              borderColor: isSavedInHistory ? 'var(--theme-card-border-glow)' : undefined,
              color: isSavedInHistory ? 'var(--theme-accent-secondary)' : undefined,
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer border active:scale-95 ${
              isSavedInHistory ? 'border' : 'theme-btn-primary'
            }`}
          >
            {isSavedInHistory ? (
              <>
                <BookmarkCheck className="w-3.5 h-3.5 text-[var(--theme-accent-secondary)]" />
                <span>Saved to Journal</span>
              </>
            ) : (
              <>
                <Bookmark className="w-3.5 h-3.5" />
                <span>Save to Journal</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Primary Sight Header Card */}
      <div
        style={{
          backgroundColor: 'var(--theme-card-bg)',
          borderColor: 'var(--theme-card-border)',
        }}
        className="shrink-0 rounded-2xl border p-2 flex items-center gap-3 shadow-md backdrop-blur-md"
      >
        <PlaceCardImage
          placeName={activeLandmark.title}
          initialImageUrl={activeLandmark.imageUrl}
          category={activeLandmark.category}
          locality={activeLandmark.locationName}
          size="sm"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider theme-badge-gold">
              {activeLandmark.category}
            </span>
            <span className="text-[10px] text-[var(--theme-accent-secondary)] font-medium truncate">
              {activeLandmark.locationName}
            </span>
          </div>

          <h3 className="text-sm sm:text-base font-serif font-bold text-[var(--theme-text-title)] truncate mt-0.5">
            {activeLandmark.title}
          </h3>

          {activeLandmark.historicalPeriod && (
            <p className="text-[10px] text-[var(--theme-text-muted)] truncate">
              {activeLandmark.historicalPeriod}
            </p>
          )}
        </div>
      </div>

      {/* Fixed Audio Player Bar */}
      <div
        style={{
          backgroundColor: 'var(--theme-card-bg-subtle)',
          borderColor: 'var(--theme-card-border)',
        }}
        className="shrink-0 p-2 rounded-xl border flex items-center justify-between gap-2 shadow-md backdrop-blur-md"
      >
        <button
          id="btn-toggle-narration"
          onClick={handleTogglePlay}
          disabled={isTranslating}
          className={`flex-1 py-1.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer ${
            isPlaying
              ? 'bg-rose-500 hover:bg-rose-600 text-white'
              : 'theme-btn-primary'
          }`}
        >
          {isPlaying ? (
            <>
              <Pause className="w-3.5 h-3.5 fill-current" />
              <span>Pause Voice Guide</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Speak in {selectedLanguage.nativeName}</span>
            </>
          )}
        </button>

        {/* Speed rates */}
        <div
          style={{
            backgroundColor: 'var(--theme-card-bg)',
            borderColor: 'var(--theme-card-border)',
          }}
          className="flex items-center gap-0.5 p-0.5 rounded-lg border shrink-0"
        >
          {[0.8, 1.0, 1.25, 1.5].map((rate) => (
            <button
              key={rate}
              onClick={() => handleSpeedChange(rate)}
              style={{
                background: speechRate === rate ? 'var(--theme-accent-primary-gradient)' : 'transparent',
                color: speechRate === rate ? 'var(--theme-accent-primary-text)' : 'var(--theme-text-muted)',
              }}
              className="px-1.5 py-0.5 rounded text-[10px] font-bold transition-all hover:text-[var(--theme-text-title)]"
            >
              {rate}x
            </button>
          ))}
        </div>
      </div>

      {/* Tabs Selector on Same Screen */}
      <div
        style={{ borderColor: 'var(--theme-card-border)' }}
        className="shrink-0 flex items-center gap-1.5 border-b pb-1 overflow-x-auto scrollbar-none"
      >
        <button
          onClick={() => setActiveTab('narration')}
          style={{
            background: activeTab === 'narration' ? 'var(--theme-accent-primary-gradient)' : 'var(--theme-card-bg-subtle)',
            color: activeTab === 'narration' ? 'var(--theme-accent-primary-text)' : 'var(--theme-text-muted)',
            borderColor: activeTab === 'narration' ? 'transparent' : 'var(--theme-card-border)',
          }}
          className="px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap border hover:text-[var(--theme-text-title)]"
        >
          📖 Story Script
        </button>

        {activeLandmark.supplementaryImages && activeLandmark.supplementaryImages.length > 0 && (
          <button
            onClick={() => setActiveTab('contextImages')}
            style={{
              background: activeTab === 'contextImages' ? 'var(--theme-accent-primary-gradient)' : 'var(--theme-card-bg-subtle)',
              color: activeTab === 'contextImages' ? 'var(--theme-accent-primary-text)' : 'var(--theme-text-muted)',
              borderColor: activeTab === 'contextImages' ? 'transparent' : 'var(--theme-card-border)',
            }}
            className="px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 border hover:text-[var(--theme-text-title)]"
          >
            <ImageIcon className="w-3 h-3" />
            <span>Contextual Views ({activeLandmark.supplementaryImages.length})</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('facts')}
          style={{
            background: activeTab === 'facts' ? 'var(--theme-accent-primary-gradient)' : 'var(--theme-card-bg-subtle)',
            color: activeTab === 'facts' ? 'var(--theme-accent-primary-text)' : 'var(--theme-text-muted)',
            borderColor: activeTab === 'facts' ? 'transparent' : 'var(--theme-card-border)',
          }}
          className="px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap border hover:text-[var(--theme-text-title)]"
        >
          ⚡ Key Facts
        </button>

        {activeLandmark.architecturalHighlights && activeLandmark.architecturalHighlights.length > 0 && (
          <button
            onClick={() => setActiveTab('architecture')}
            style={{
              background: activeTab === 'architecture' ? 'var(--theme-accent-primary-gradient)' : 'var(--theme-card-bg-subtle)',
              color: activeTab === 'architecture' ? 'var(--theme-accent-primary-text)' : 'var(--theme-text-muted)',
              borderColor: activeTab === 'architecture' ? 'transparent' : 'var(--theme-card-border)',
            }}
            className="px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap border hover:text-[var(--theme-text-title)]"
          >
            🏛️ Highlights
          </button>
        )}

        <button
          onClick={() => setActiveTab('questions')}
          style={{
            background: activeTab === 'questions' ? 'var(--theme-accent-primary-gradient)' : 'var(--theme-card-bg-subtle)',
            color: activeTab === 'questions' ? 'var(--theme-accent-primary-text)' : 'var(--theme-text-muted)',
            borderColor: activeTab === 'questions' ? 'transparent' : 'var(--theme-card-border)',
          }}
          className="px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap border hover:text-[var(--theme-text-title)]"
        >
          ❓ Ask AI
        </button>

        {activeLandmark.ocrDetectedText && (
          <button
            onClick={() => setActiveTab('ocr')}
            style={{
              background: activeTab === 'ocr' ? 'var(--theme-accent-primary-gradient)' : 'var(--theme-card-bg-subtle)',
              color: activeTab === 'ocr' ? 'var(--theme-accent-primary-text)' : 'var(--theme-text-muted)',
              borderColor: activeTab === 'ocr' ? 'transparent' : 'var(--theme-card-border)',
            }}
            className="px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap border hover:text-[var(--theme-text-title)]"
          >
            🔍 Sign Text
          </button>
        )}
      </div>

      {/* Tab Body (Self-contained scrollable container) */}
      <div
        style={{
          backgroundColor: 'var(--theme-card-bg)',
          borderColor: 'var(--theme-card-border)',
        }}
        className="flex-1 min-h-0 overflow-y-auto p-3 border rounded-2xl backdrop-blur-md"
      >
        {isTranslating ? (
          <div className="h-full flex items-center justify-center p-4 text-center text-xs text-[var(--theme-accent-secondary)] animate-pulse gap-2">
            <Sparkles className="w-4 h-4 text-[var(--theme-accent-primary)] animate-spin" />
            <span>Translating guide script into {selectedLanguage.nativeName}...</span>
          </div>
        ) : activeTab === 'narration' ? (
          <div className="space-y-3">
            {/* Contextual Visual Mini Carousel inside story view */}
            {activeLandmark.supplementaryImages && activeLandmark.supplementaryImages.length > 0 && (
              <div
                style={{
                  backgroundColor: 'var(--theme-card-bg-subtle)',
                  borderColor: 'var(--theme-card-border)',
                }}
                className="p-2.5 rounded-xl border space-y-1.5"
              >
                <div className="flex items-center justify-between text-[10px] text-[var(--theme-accent-secondary)] font-bold uppercase tracking-wider">
                  <span className="flex items-center gap-1">
                    <Layers className="w-3 h-3 text-[var(--theme-accent-primary)]" />
                    Rare Perspectives & Historical Archive
                  </span>
                  <span className="text-[9px] text-[var(--theme-text-muted)]">tap to expand</span>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {activeLandmark.supplementaryImages.map((img) => (
                    <div
                      key={img.id}
                      onClick={() => setSelectedLightboxImage(img)}
                      style={{ borderColor: 'var(--theme-card-border)' }}
                      className="group relative shrink-0 w-28 h-18 rounded-xl overflow-hidden border cursor-pointer shadow-md hover:border-[var(--theme-card-border-glow)] transition-colors"
                    >
                      <img
                        src={img.url}
                        alt={img.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-1">
                        <span className="text-[8px] font-bold text-white truncate">{img.title}</span>
                        <span className="text-[7px] text-[var(--theme-accent-primary)] capitalize">{img.type}</span>
                      </div>
                      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 p-0.5 rounded">
                        <Maximize2 className="w-2.5 h-2.5 text-white" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <h4 className="text-[11px] font-bold text-[var(--theme-accent-primary)] uppercase tracking-wider">
                {selectedLanguage.nativeName} Audio Narration
              </h4>
              <p className="text-xs sm:text-sm text-[var(--theme-text-body)] leading-relaxed whitespace-pre-line font-sans">
                {activeLandmark.narration}
              </p>

              {/* Want to Know More / Deep Dive In-Depth Button */}
              <div className="pt-2">
                <button
                  id="btn-explanation-deep-dive"
                  onClick={() => {
                    speechManager.stop();
                    setIsPlaying(false);
                    setIsDeepDiveOpen(true);
                  }}
                  className="w-full py-3 px-4 rounded-2xl theme-btn-primary text-xs sm:text-sm shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Want to know more about this topic? Discover In-Depth Details</span>
                  <Sparkles className="w-4 h-4 animate-bounce" />
                </button>
              </div>
            </div>
          </div>
        ) : activeTab === 'contextImages' && activeLandmark.supplementaryImages ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-[11px] text-[var(--theme-accent-secondary)] font-bold">
              <span>Contextual Perspectives (Beyond Live Camera)</span>
              <span className="text-[10px] text-[var(--theme-text-muted)] font-normal">Tap any image to view details</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {activeLandmark.supplementaryImages.map((img) => (
                <div
                  key={img.id}
                  onClick={() => setSelectedLightboxImage(img)}
                  style={{
                    backgroundColor: 'var(--theme-card-bg-subtle)',
                    borderColor: 'var(--theme-card-border)',
                  }}
                  className="rounded-xl overflow-hidden border p-2 cursor-pointer hover:border-[var(--theme-card-border-glow)] transition-all shadow-md group space-y-1.5"
                >
                  <div className="relative h-32 w-full rounded-lg overflow-hidden bg-black">
                    <img
                      src={img.url}
                      alt={img.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded theme-badge-teal text-[9px] font-bold uppercase">
                      {img.type}
                    </span>
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-[var(--theme-text-title)] group-hover:text-[var(--theme-accent-primary)]">{img.title}</h5>
                    <p className="text-[11px] text-[var(--theme-text-muted)] leading-normal mt-0.5">{img.caption}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : activeTab === 'facts' ? (
          <div className="space-y-2.5">
            <h4 className="text-[11px] font-bold text-[var(--theme-accent-primary)] uppercase tracking-wider">
              Historical Highlights & Trivia
            </h4>
            <ul className="space-y-2">
              {activeLandmark.keyFacts.map((fact, idx) => (
                <li key={idx} className="flex items-start gap-2 text-xs text-[var(--theme-text-body)] leading-normal">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{fact}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : activeTab === 'architecture' ? (
          <div className="space-y-2.5">
            <h4 className="text-[11px] font-bold text-[var(--theme-accent-primary)] uppercase tracking-wider">
              Visual & Architectural Highlights
            </h4>
            <ul className="space-y-2">
              {(activeLandmark.architecturalHighlights || []).map((arch, idx) => (
                <li key={idx} className="flex items-start gap-2 text-xs text-[var(--theme-text-body)] leading-normal">
                  <Layers className="w-3.5 h-3.5 text-[var(--theme-accent-primary)] shrink-0 mt-0.5" />
                  <span>{arch}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : activeTab === 'questions' ? (
          <div className="space-y-2.5">
            <h4 className="text-[11px] font-bold text-[var(--theme-accent-primary)] uppercase tracking-wider flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5 text-[var(--theme-accent-secondary)]" />
              <span>Tap to ask AI Guide in {selectedLanguage.nativeName}</span>
            </h4>
            <div className="space-y-2">
              {activeLandmark.suggestedQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => onOpenChatWithQuestion(q)}
                  style={{
                    backgroundColor: 'var(--theme-card-bg-subtle)',
                    borderColor: 'var(--theme-card-border)',
                    color: 'var(--theme-text-title)',
                  }}
                  className="w-full p-2.5 rounded-xl border text-left text-xs font-medium hover:border-[var(--theme-card-border-glow)] flex items-center justify-between transition-all cursor-pointer group"
                >
                  <span className="truncate pr-2">"{q}"</span>
                  <MessageSquare className="w-3.5 h-3.5 text-[var(--theme-accent-primary)] shrink-0 group-hover:scale-110" />
                </button>
              ))}
            </div>
          </div>
        ) : activeTab === 'ocr' && activeLandmark.ocrDetectedText ? (
          <div className="space-y-2">
            <h4 className="text-[11px] font-bold text-[var(--theme-accent-primary)] uppercase tracking-wider">
              Detected Inscription
            </h4>
            <div
              style={{
                backgroundColor: 'var(--theme-card-bg-subtle)',
                borderColor: 'var(--theme-card-border)',
                color: 'var(--theme-text-title)',
              }}
              className="p-3 rounded-xl border text-xs font-mono"
            >
              "{activeLandmark.ocrDetectedText}"
            </div>
          </div>
        ) : null}
      </div>

      {/* Contextual Image Lightbox Modal */}
      {selectedLightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setSelectedLightboxImage(null)}
        >
          <div
            style={{
              backgroundColor: 'var(--theme-card-bg)',
              borderColor: 'var(--theme-card-border)',
            }}
            className="relative max-w-lg w-full rounded-2xl border overflow-hidden shadow-2xl space-y-2 p-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[9px] uppercase font-bold theme-badge-gold px-2 py-0.5 rounded">
                  {selectedLightboxImage.type} perspective
                </span>
                <h4 className="text-sm font-bold text-[var(--theme-text-title)] mt-1">{selectedLightboxImage.title}</h4>
              </div>
              <button
                onClick={() => setSelectedLightboxImage(null)}
                style={{
                  backgroundColor: 'var(--theme-card-bg-subtle)',
                  color: 'var(--theme-text-muted)',
                }}
                className="p-1 rounded-lg hover:text-[var(--theme-text-title)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="w-full h-64 rounded-xl overflow-hidden bg-black">
              <img
                src={selectedLightboxImage.url}
                alt={selectedLightboxImage.title}
                className="w-full h-full object-contain"
              />
            </div>

            <p
              style={{
                backgroundColor: 'var(--theme-card-bg-subtle)',
                borderColor: 'var(--theme-card-border)',
                color: 'var(--theme-text-body)',
              }}
              className="text-xs leading-relaxed p-2.5 rounded-xl border"
            >
              {selectedLightboxImage.caption}
            </p>
          </div>
        </div>
      )}
      {/* Deep Dive In-Depth Dossier Modal */}
      {isDeepDiveOpen && (
        <DeepDiveModal
          title={activeLandmark.title}
          category={activeLandmark.category}
          locationName={activeLandmark.locationName}
          currentNarration={activeLandmark.narration}
          selectedLanguage={selectedLanguage}
          guideSettings={guideSettings}
          outputMode={outputMode}
          onClose={() => setIsDeepDiveOpen(false)}
          onOpenChatWithQuestion={(q) => {
            setIsDeepDiveOpen(false);
            onOpenChatWithQuestion(q);
          }}
        />
      )}
    </div>
  );
};
