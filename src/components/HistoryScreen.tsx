import React, { useState } from 'react';
import { RecognitionResult, Language } from '../types';
import { speechManager } from '../utils/speech';
import { PlaceCardImage } from './PlaceCardImage';
import {
  History,
  Volume2,
  Trash2,
  Search,
  ArrowRight,
  Compass
} from 'lucide-react';

interface HistoryScreenProps {
  visitedHistory: RecognitionResult[];
  selectedLanguage: Language;
  onSelectLandmarkToView: (landmark: RecognitionResult) => void;
  onClearHistory: () => void;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({
  visitedHistory,
  selectedLanguage,
  onSelectLandmarkToView,
  onClearHistory,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(null);

  const filtered = visitedHistory.filter((item) =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.summary.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePlaySpeech = (landmark: RecognitionResult) => {
    if (currentlyPlayingId === landmark.id) {
      speechManager.stop();
      setCurrentlyPlayingId(null);
      return;
    }

    speechManager.speak({
      text: landmark.narration,
      languageCode: selectedLanguage.speechCode,
      onStart: () => setCurrentlyPlayingId(landmark.id),
      onEnd: () => setCurrentlyPlayingId(null),
      onError: () => setCurrentlyPlayingId(null),
    });
  };

  return (
    <div id="history-screen" className="h-full flex flex-col overflow-hidden py-1 space-y-2 select-none">
      {/* Header */}
      <div
        style={{
          backgroundColor: 'var(--theme-card-bg)',
          borderColor: 'var(--theme-card-border)',
        }}
        className="shrink-0 flex items-center justify-between p-2.5 border rounded-2xl backdrop-blur-xl shadow-lg"
      >
        <div>
          <h3 className="text-sm font-serif font-bold text-[var(--theme-text-title)] flex items-center gap-1.5">
            <History className="w-4 h-4 text-[var(--theme-accent-primary)]" />
            <span>Tour Journal & Visit Log</span>
          </h3>
          <p className="text-[11px] text-[var(--theme-accent-secondary)]">
            {visitedHistory.length} places explained in {selectedLanguage.nativeName}
          </p>
        </div>

        {visitedHistory.length > 0 && (
          <button
            onClick={onClearHistory}
            className="px-2.5 py-1 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-800/60 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-sm"
          >
            <Trash2 className="w-3 h-3" />
            <span>Clear</span>
          </button>
        )}
      </div>

      {/* Search Bar */}
      {visitedHistory.length > 0 && (
        <div className="shrink-0 relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[var(--theme-accent-primary)]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search saved tour history..."
            style={{
              backgroundColor: 'var(--theme-input-bg)',
              borderColor: 'var(--theme-input-border)',
              color: 'var(--theme-text-title)',
            }}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border placeholder:text-[var(--theme-text-muted)] text-xs focus:outline-none focus:border-[var(--theme-card-border-glow)] transition-colors backdrop-blur-md"
          />
        </div>
      )}

      {/* Scrollable Items Container */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        {visitedHistory.length === 0 ? (
          <div
            style={{
              backgroundColor: 'var(--theme-card-bg)',
              borderColor: 'var(--theme-card-border)',
            }}
            className="h-full flex flex-col items-center justify-center p-6 rounded-2xl border text-center space-y-2 backdrop-blur-md"
          >
            <div
              style={{
                backgroundColor: 'var(--theme-card-bg-subtle)',
                borderColor: 'var(--theme-card-border)',
              }}
              className="w-12 h-12 rounded-2xl border flex items-center justify-center mx-auto text-[var(--theme-accent-primary)]"
            >
              <Compass className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-serif font-bold text-[var(--theme-text-title)]">
              Journal is Empty
            </h4>
            <p className="text-xs text-[var(--theme-text-muted)] max-w-xs mx-auto">
              Scan monuments, explore attractions, or tap any sight preset to build your audio tour log!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((item) => {
              const isPlaying = currentlyPlayingId === item.id;
              return (
                <div
                  key={item.id}
                  style={{
                    backgroundColor: 'var(--theme-card-bg)',
                    borderColor: 'var(--theme-card-border)',
                  }}
                  className="p-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 backdrop-blur-md shadow-sm hover:border-[var(--theme-card-border-glow)]"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <PlaceCardImage
                      placeName={item.title}
                      initialImageUrl={item.imageUrl}
                      category={item.category}
                      locality={item.locationName}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <span className="px-1.5 py-0.5 rounded-md theme-badge-teal text-[9px] font-bold uppercase tracking-wider">
                        {item.category}
                      </span>
                      <h4 className="text-xs font-serif font-bold text-[var(--theme-text-title)] truncate mt-0.5">
                        {item.title}
                      </h4>
                      <p className="text-[10px] text-[var(--theme-text-muted)] line-clamp-1">
                        {item.summary}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handlePlaySpeech(item)}
                      style={
                        !isPlaying
                          ? {
                              backgroundColor: 'var(--theme-card-bg-subtle)',
                              borderColor: 'var(--theme-card-border)',
                              color: 'var(--theme-accent-primary)',
                            }
                          : undefined
                      }
                      className={`p-2 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                        isPlaying
                          ? 'bg-rose-500 text-white shadow-md border-rose-400'
                          : 'hover:border-[var(--theme-card-border-glow)]'
                      }`}
                      title="Replay Audio"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => onSelectLandmarkToView(item)}
                      className="p-2 rounded-lg theme-btn-primary cursor-pointer font-bold shadow-sm"
                      title="View Details"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
