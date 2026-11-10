import React, { useRef, useState, useCallback, useEffect, useTransition } from 'react';
import { RecognitionResult, LocationCoords, Language, GuideOutputMode, SupplementaryImage, GuideSettings } from '../types';
import { SAMPLE_LANDMARKS } from '../data/sampleLandmarks';
import { speechManager } from '../utils/speech';
import { streamLandmarkRecognition } from '../utils/progressiveStreamingEngine';
import { savePhotoToAppStorage } from '../utils/photoStorage';
import { DeepDiveModal } from './DeepDiveModal';
import {
  Camera,
  Upload,
  Sparkles,
  ArrowLeft,
  Volume2,
  FileText,
  Play,
  Pause,
  Layers,
  Maximize2,
  X,
  Compass,
  CheckCircle2,
  ShieldCheck,
  RotateCcw,
  MessageSquare,
  Landmark,
  Info,
  Sliders,
  BookOpen,
  HardDrive,
  Check,
  AlertCircle
} from 'lucide-react';

interface CameraScreenProps {
  onScanComplete: (result: RecognitionResult) => void;
  locationCoords: LocationCoords | null;
  selectedLanguage: Language;
  visitedHistory: RecognitionResult[];
  onBackToHome: () => void;
  outputMode: GuideOutputMode;
  onToggleOutputMode: (mode: GuideOutputMode) => void;
  guideSettings?: GuideSettings;
  onOpenChatWithQuestion?: (question: string) => void;
}

// Client-side non-blocking fast image compressor (scales photos to 1200px max, converts to WebP/JPEG, cuts 10MB to ~120KB in <30ms)
async function compressImageForVision(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string;
      if (!rawDataUrl) {
        resolve('');
        return;
      }
      const img = new Image();
      img.onload = () => {
        const MAX_DIM = 1200;
        let { width, height } = img;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(rawDataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        try {
          const webpData = canvas.toDataURL('image/webp', 0.85);
          if (webpData.startsWith('data:image/webp')) {
            resolve(webpData);
            return;
          }
        } catch {
          // fallback to standard jpeg
        }
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => {
        resolve(rawDataUrl);
      };
      img.src = rawDataUrl;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

export const CameraScreen: React.FC<CameraScreenProps> = ({
  onScanComplete,
  locationCoords,
  selectedLanguage,
  visitedHistory,
  onBackToHome,
  outputMode,
  onToggleOutputMode,
  guideSettings,
  onOpenChatWithQuestion,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamCancelRef = useRef<(() => void) | null>(null);

  // React 18 Concurrent Rendering Hook
  const [isPendingTransition, startTransition] = useTransition();

  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [customUserQuery, setCustomUserQuery] = useState('');
  const [activePhotoPreview, setActivePhotoPreview] = useState<string | null>(null);
  const [photoStorageStatus, setPhotoStorageStatus] = useState<'saved' | 'in_memory' | null>(null);
  const lastImageAttemptRef = useRef<{ source: string; sample?: RecognitionResult } | null>(null);

  // Identified Landmark / Sight Details
  const [identifiedResult, setIdentifiedResult] = useState<RecognitionResult | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [speechRate, setSpeechRate] = useState(guideSettings?.speechRate || 1.0);
  const [activeTabSection, setActiveTabSection] = useState<'narration' | 'facts' | 'context'>('narration');
  const [isDeepDiveOpen, setIsDeepDiveOpen] = useState(false);

  // Contextual Image Lightbox
  const [selectedLightboxImage, setSelectedLightboxImage] = useState<SupplementaryImage | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Stop speech & cleanup stream when component unmounts
  useEffect(() => {
    return () => {
      speechManager.stop();
      if (streamCancelRef.current) {
        streamCancelRef.current();
        streamCancelRef.current = null;
      }
    };
  }, []);

  // Audio Playback
  const playNarrationAudio = useCallback(
    (result: RecognitionResult) => {
      if (outputMode === 'text' || !result.narration) {
        speechManager.stop();
        setIsPlayingAudio(false);
        return;
      }

      speechManager.speak({
        text: result.narration,
        languageCode: selectedLanguage.speechCode,
        rate: guideSettings?.speechRate || speechRate,
        pitch: guideSettings?.voicePitch || 1.08,
        gender: guideSettings?.voiceGender || 'female',
        onStart: () => setIsPlayingAudio(true),
        onEnd: () => setIsPlayingAudio(false),
        onError: () => setIsPlayingAudio(false),
      });
    },
    [outputMode, selectedLanguage.speechCode, speechRate, guideSettings]
  );

  // Process & Recognize Photo with Progressive Batch-Streaming Architecture
  const processImage = useCallback(
    (imageSource: string, samplePreset?: RecognitionResult) => {
      lastImageAttemptRef.current = { source: imageSource, sample: samplePreset };
      setScanError(null);
      setActivePhotoPreview(imageSource);
      speechManager.stop();
      setIsPlayingAudio(false);

      // Check user setting: Save clicked photo to phone memory (App Data folder) YES or NO
      // Only persist user-captured/uploaded photos (data:image/...), not remote sample demo URLs
      const isUserPhotoDataUrl = imageSource.startsWith('data:image/');
      const shouldSaveToDevice = Boolean(guideSettings?.savePhotosToDeviceMemory) && isUserPhotoDataUrl;
      const photoRecordId = `photo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      if (shouldSaveToDevice) {
        setPhotoStorageStatus('saved');
        savePhotoToAppStorage({
          id: photoRecordId,
          dataUrl: imageSource,
          title: 'Captured Sight Photo',
          locationName: locationCoords?.city || 'Local Area',
        }).catch((e) => console.warn('App data storage error:', e));
      } else {
        setPhotoStorageStatus('in_memory');
      }

      if (streamCancelRef.current) {
        streamCancelRef.current();
        streamCancelRef.current = null;
      }

      const historyTitles = visitedHistory.map((h) => h.title);

      const cancel = streamLandmarkRecognition({
        imageBase64: imageSource,
        coords: locationCoords,
        language: selectedLanguage.name,
        history: historyTitles,
        userPrompt: customUserQuery || undefined,
        topics: guideSettings?.topics,
        persona: guideSettings?.persona || 'warm_female',
        voiceGender: guideSettings?.voiceGender || 'female',
        sampleFallback: samplePreset,

        // Batch 1 (Immediate / < 100ms): Instantly set basic structural state (Canonical POI Title, preview image, status flags)
        onBatch1: (b1Data) => {
          const res = b1Data as RecognitionResult;
          setIdentifiedResult(res);
          setIsScanning(false);

          // Update stored photo title with official sight title if saved
          if (shouldSaveToDevice && res.title) {
            savePhotoToAppStorage({
              id: photoRecordId,
              dataUrl: imageSource,
              title: res.title,
              category: res.category,
              locationName: res.locationName || locationCoords?.city || '',
            }).catch(() => {});
          }
        },

        // Batch 2 (Fast Stream / < 600ms): Fetch and append core text, confidence scores, OCR translations into state
        onBatch2: (b2Data) => {
          startTransition(() => {
            const res = b2Data as RecognitionResult;
            setIdentifiedResult(res);
            onScanComplete(res);
            if (outputMode === 'speech' || outputMode === 'both') {
              playNarrationAudio(res);
            }
          });
        },

        // Batch 3 (Deferred Async): Fetch heavy media (Leaflet map coordinates, supplementary perspectives) in background
        onBatch3: (b3Data) => {
          startTransition(() => {
            const res = b3Data as RecognitionResult;
            setIdentifiedResult(res);
            onScanComplete(res);
          });
        },

        onComplete: (finalRes) => {
          startTransition(() => {
            setIdentifiedResult(finalRes);
            onScanComplete(finalRes);
          });
        },

        onError: (err) => {
          console.warn('Stream recognition error:', err);
          setIsScanning(false);
          setIdentifiedResult(null);
          setScanError(
            err?.message || 'Unable to analyze this image right now. Please try again or pick another photo.'
          );
        },
      });

      streamCancelRef.current = cancel;
    },
    [
      customUserQuery,
      guideSettings,
      locationCoords,
      onScanComplete,
      outputMode,
      playNarrationAudio,
      selectedLanguage.name,
      visitedHistory,
    ]
  );

  // Handle Photo File Capture or Upload with Fast Client-Side Compression
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const compressedBase64 = await compressImageForVision(file);
      if (compressedBase64) {
        processImage(compressedBase64);
      }
    }
    // Reset file input so user can re-select the same image if desired
    e.target.value = '';
  };

  // Handle Drag & Drop
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const compressedBase64 = await compressImageForVision(file);
      if (compressedBase64) {
        processImage(compressedBase64);
      }
    }
  };

  const handleResetScanner = () => {
    if (streamCancelRef.current) {
      streamCancelRef.current();
      streamCancelRef.current = null;
    }
    setIsScanning(false);
    speechManager.stop();
    setIsPlayingAudio(false);
    setIdentifiedResult(null);
    setActivePhotoPreview(null);
    setPhotoStorageStatus(null);
    setScanError(null);
    setCustomUserQuery('');
  };

  const handleTogglePlay = () => {
    if (isPlayingAudio) {
      speechManager.stop();
      setIsPlayingAudio(false);
    } else if (identifiedResult) {
      playNarrationAudio(identifiedResult);
    }
  };

  return (
    <div id="photo-guide-screen" className="h-full flex flex-col overflow-hidden py-1 space-y-2 select-none">
      {/* Single Hidden File Input: Natively supports both Camera Snap & File Picker without duplicate inputs */}
      <input
        ref={fileInputRef}
        id="input-camera-file"
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Top Header Bar */}
      <div className="shrink-0 flex items-center justify-between p-2.5 bg-amber-950/85 backdrop-blur-md rounded-2xl border border-amber-800/50 shadow-sm">
        <button
          onClick={onBackToHome}
          className="p-1.5 rounded-xl bg-amber-900/60 text-amber-200 hover:bg-amber-800 cursor-pointer transition-colors"
          title="Back to Home"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-900/80 text-amber-300 text-xs font-semibold border border-amber-700/50">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>{identifiedResult ? 'Tour Guide Analysis' : 'Click or Upload Sight Photo'}</span>
        </div>

        {/* Output Mode Switcher (Speech / Text / Both) */}
        <button
          onClick={() => {
            if (outputMode === 'speech') onToggleOutputMode('both');
            else if (outputMode === 'both') onToggleOutputMode('text');
            else onToggleOutputMode('speech');
          }}
          className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center gap-1 ${
            outputMode === 'speech'
              ? 'bg-orange-500 text-orange-950 border-orange-400'
              : outputMode === 'both'
              ? 'bg-amber-500 text-amber-950 border-amber-300'
              : 'bg-zinc-800 text-zinc-300 border-zinc-700'
          }`}
          title="Toggle Output Mode"
        >
          {outputMode !== 'text' && <Volume2 className="w-3.5 h-3.5" />}
          {outputMode === 'text' && <FileText className="w-3.5 h-3.5" />}
          <span className="capitalize">{outputMode}</span>
        </button>
      </div>

      {/* Main Interactive Stage */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {/* State 1: Scanning / Processing in Progress */}
        {isScanning && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 bg-amber-950/80 rounded-2xl border border-amber-700/60 text-center space-y-4 shadow-xl">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-amber-500/20 border-t-amber-400 animate-spin" />
              <Landmark className="w-7 h-7 text-amber-400 animate-pulse" />
            </div>

            <div className="space-y-1.5 max-w-sm">
              <h3 className="text-base font-serif font-bold text-amber-100">
                AI Guide is Analyzing Your Photo
              </h3>
              <p className="text-xs text-amber-300/80 leading-relaxed">
                Identifying historical landmark, architecture, and generating spoken narration in{' '}
                <strong className="text-amber-200">{selectedLanguage.nativeName}</strong>...
              </p>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-400/90 bg-amber-900/50 px-3 py-1.5 rounded-xl border border-amber-800">
              {guideSettings?.savePhotosToDeviceMemory ? (
                <>
                  <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">Saving photo to phone internal memory (App Data)</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>In-memory analysis • Not saved to phone memory</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* State 2: Result Identified & Ready */}
        {!isScanning && identifiedResult && (
          <div className="flex-1 min-h-0 flex flex-col bg-amber-950/90 backdrop-blur-md rounded-2xl border border-amber-700/60 overflow-hidden shadow-xl">
            {/* Sight Header Banner */}
            <div className="p-3 border-b border-amber-800/60 flex items-center justify-between gap-2 shrink-0 bg-gradient-to-r from-amber-900/70 to-amber-950/90">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[9px] uppercase tracking-wider border border-amber-500/30">
                    {identifiedResult.category}
                  </span>
                  <span className="text-[11px] text-amber-400/90 truncate font-medium">
                    {identifiedResult.locationName}
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-serif font-bold text-amber-100 truncate mt-0.5">
                  {identifiedResult.title}
                </h2>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={handleResetScanner}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-amber-950 text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Scan Next Sight</span>
                </button>
              </div>
            </div>

            {/* Audio Narration Controls */}
            <div className="p-2.5 bg-amber-900/70 border-b border-amber-800/60 shrink-0 flex items-center justify-between gap-2">
              <button
                onClick={handleTogglePlay}
                disabled={!identifiedResult.narration}
                className={`flex-1 py-2 px-3.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all ${
                  !identifiedResult.narration
                    ? 'bg-amber-900/50 text-amber-300/70 border border-amber-800/50 cursor-wait animate-pulse'
                    : isPlayingAudio
                    ? 'bg-rose-600 hover:bg-rose-500 text-white'
                    : 'bg-gradient-to-r from-amber-400 via-orange-400 to-amber-300 text-amber-950 hover:brightness-105'
                }`}
              >
                {!identifiedResult.narration ? (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
                    <span>Synthesizing Spoken Guide in {selectedLanguage.nativeName}...</span>
                  </>
                ) : isPlayingAudio ? (
                  <>
                    <Pause className="w-4 h-4 fill-current" />
                    <span>Pause Spoken Guide</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>
                      Listen in {selectedLanguage.nativeName} ({guideSettings?.voiceGender === 'male' ? 'Male Voice' : 'Female Voice'})
                    </span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-1 bg-amber-950 p-1 rounded-xl border border-amber-800 shrink-0">
                {[1.0, 1.25, 1.5].map((rate) => (
                  <button
                    key={rate}
                    onClick={() => {
                      setSpeechRate(rate);
                      if (isPlayingAudio && identifiedResult.narration) {
                        speechManager.stop();
                        speechManager.speak({
                          text: identifiedResult.narration,
                          languageCode: selectedLanguage.speechCode,
                          rate,
                          pitch: guideSettings?.voicePitch || 1.08,
                          gender: guideSettings?.voiceGender || 'female',
                          onStart: () => setIsPlayingAudio(true),
                          onEnd: () => setIsPlayingAudio(false),
                        });
                      }
                    }}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
                      speechRate === rate ? 'bg-amber-400 text-amber-950' : 'text-amber-300/70 hover:text-amber-100'
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            </div>

            {/* Sub-tabs: Narration vs Key Facts vs Supplementary Visuals */}
            <div className="flex items-center gap-1 px-3 pt-2 shrink-0 border-b border-amber-800/40">
              <button
                onClick={() => setActiveTabSection('narration')}
                className={`pb-1.5 px-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTabSection === 'narration'
                    ? 'border-amber-400 text-amber-200'
                    : 'border-transparent text-amber-400/60 hover:text-amber-200'
                }`}
              >
                <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Text Speech Narration</span>
              </button>

              <button
                onClick={() => setActiveTabSection('facts')}
                className={`pb-1.5 px-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTabSection === 'facts'
                    ? 'border-amber-400 text-amber-200'
                    : 'border-transparent text-amber-400/60 hover:text-amber-200'
                }`}
              >
                <Info className="w-3.5 h-3.5" />
                <span>Key Facts ({identifiedResult.keyFacts?.length || 0})</span>
              </button>

              <button
                onClick={() => setActiveTabSection('context')}
                className={`pb-1.5 px-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTabSection === 'context'
                    ? 'border-amber-400 text-amber-200'
                    : 'border-transparent text-amber-400/60 hover:text-amber-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Visual Perspectives ({identifiedResult.supplementaryImages?.length || 0})</span>
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
              {activeTabSection === 'narration' && (
                <div className="space-y-3">
                  {/* Photo Preview Thumbnail & OCR detected badge */}
                  {(activePhotoPreview || identifiedResult.imageUrl) && (
                    <div className="flex items-center gap-3 p-2 rounded-xl bg-amber-900/40 border border-amber-800/60">
                      <img
                        src={activePhotoPreview || identifiedResult.imageUrl}
                        alt={identifiedResult.title}
                        className="w-16 h-16 rounded-lg object-cover border border-amber-700/60 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-amber-400 px-1.5 py-0.5 rounded bg-amber-950 border border-amber-700/50">
                            Captured Sight
                          </span>
                          {photoStorageStatus === 'saved' ? (
                            <span className="text-[9px] text-emerald-300 font-bold px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-700/50 flex items-center gap-1">
                              <HardDrive className="w-2.5 h-2.5" />
                              <span>Saved to Phone Storage</span>
                            </span>
                          ) : (
                            <span className="text-[9px] text-amber-400/80 font-medium px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-800/40">
                              In-Memory Only
                            </span>
                          )}
                          {identifiedResult.ocrDetectedText && (
                            <span className="text-[9px] text-emerald-300 font-medium truncate">
                              OCR: &quot;{identifiedResult.ocrDetectedText}&quot;
                            </span>
                          )}
                          {identifiedResult.batchStatus?.stage && identifiedResult.batchStatus.stage !== 'complete' && (
                            <span className="text-[9px] text-amber-300 font-mono flex items-center gap-1 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-700/40 animate-pulse">
                              <Sparkles className="w-2.5 h-2.5 text-amber-400 animate-spin" />
                              Progressive Stream
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs font-serif font-bold text-amber-100 truncate mt-0.5">
                          {identifiedResult.title}
                        </h4>
                        <p className="text-[10px] text-amber-300/80 truncate">
                          {identifiedResult.locationName}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Spoken Text Display Card (or Streaming Pulse Skeleton) */}
                  {!identifiedResult.narration ? (
                    <div className="p-3.5 bg-gradient-to-b from-amber-900/50 to-amber-950/80 rounded-2xl border border-amber-700/70 text-xs sm:text-sm shadow-md space-y-3 animate-pulse">
                      <div className="flex items-center justify-between border-b border-amber-800/60 pb-1.5">
                        <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1.5 uppercase tracking-wider">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                          Streaming Spoken Audio Tour Script ({selectedLanguage.nativeName})...
                        </span>
                      </div>
                      <div className="space-y-2 py-1">
                        <div className="h-3 bg-amber-800/40 rounded w-full" />
                        <div className="h-3 bg-amber-800/35 rounded w-11/12" />
                        <div className="h-3 bg-amber-800/30 rounded w-4/5" />
                        <div className="h-3 bg-amber-800/25 rounded w-2/3" />
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 bg-gradient-to-b from-amber-900/50 to-amber-950/80 rounded-2xl border border-amber-700/70 text-xs sm:text-sm text-amber-50 leading-relaxed font-sans shadow-md space-y-2">
                      <div className="flex items-center justify-between border-b border-amber-800/60 pb-1.5 mb-1.5">
                        <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1 uppercase tracking-wider">
                          <Volume2 className="w-3.5 h-3.5" />
                          Spoken Audio Tour Script ({selectedLanguage.nativeName})
                        </span>
                        {isPlayingAudio && (
                          <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold animate-pulse">
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            Speaking Now...
                          </span>
                        )}
                      </div>
                      <p className="whitespace-pre-line text-amber-100 text-xs sm:text-sm leading-relaxed">
                        {identifiedResult.narration}
                      </p>
                    </div>
                  )}

                  {/* Summary Callout */}
                  {identifiedResult.summary && (
                    <div className="p-2.5 rounded-xl bg-amber-900/30 border border-amber-800/40 text-xs text-amber-200">
                      <strong className="text-amber-300">Why You Must Visit: </strong>
                      {identifiedResult.summary}
                    </div>
                  )}

                  {/* Want to Know More / Deep-Dive Button */}
                  <button
                    id="btn-deep-dive-topic"
                    onClick={() => {
                      speechManager.stop();
                      setIsPlayingAudio(false);
                      setIsDeepDiveOpen(true);
                    }}
                    className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 hover:from-amber-400 hover:to-orange-400 text-amber-950 font-bold text-xs sm:text-sm shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer border border-amber-300/80"
                  >
                    <BookOpen className="w-4 h-4 text-amber-950" />
                    <span>Want to know more about this topic? Discover In-Depth Details</span>
                    <Sparkles className="w-4 h-4 text-amber-950 animate-bounce" />
                  </button>

                  {/* Ask Question Quick Trigger */}
                  {onOpenChatWithQuestion && (
                    <button
                      onClick={() => onOpenChatWithQuestion(`Tell me more fascinating secrets about ${identifiedResult.title}`)}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-900/80 to-amber-800/80 hover:brightness-110 text-amber-100 border border-amber-600/70 text-xs font-bold cursor-pointer transition-all shadow-md active:scale-98"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                      <span>Ask AI Guide a follow-up question</span>
                    </button>
                  )}
                </div>
              )}

              {activeTabSection === 'facts' && (
                <div className="space-y-2.5">
                  {!identifiedResult.keyFacts || identifiedResult.keyFacts.length === 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 animate-pulse">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-900/30 border border-amber-800/40">
                          <div className="w-4 h-4 rounded-full bg-amber-700/40 shrink-0" />
                          <div className="h-3 bg-amber-800/40 rounded w-3/4" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {identifiedResult.keyFacts.map((fact, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-900/40 border border-amber-800/50 text-xs text-amber-100 shadow-sm"
                        >
                          <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          <span>{fact}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {identifiedResult.architecturalHighlights && identifiedResult.architecturalHighlights.length > 0 && (
                    <div className="p-3 rounded-xl bg-amber-900/30 border border-amber-800/50 space-y-1.5">
                      <h4 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                        <Landmark className="w-3.5 h-3.5 text-amber-400" />
                        Architectural Highlights to Spot:
                      </h4>
                      <ul className="space-y-1 text-xs text-amber-100 list-disc list-inside">
                        {identifiedResult.architecturalHighlights.map((arch, i) => (
                          <li key={i}>{arch}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {identifiedResult.summary && (
                    <div className="p-3 rounded-xl bg-amber-900/30 border border-amber-800/40 text-xs text-amber-200">
                      <strong className="text-amber-300">Overview: </strong>
                      {identifiedResult.summary}
                    </div>
                  )}
                </div>
              )}

              {activeTabSection === 'context' && (
                <div className="space-y-2">
                  {!identifiedResult.supplementaryImages || identifiedResult.supplementaryImages.length === 0 ? (
                    <div className="space-y-2">
                      <p className="text-[11px] text-amber-300/80 flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-amber-400 animate-spin" />
                        Fetching perspective views in background...
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 animate-pulse">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="h-28 rounded-xl bg-amber-900/30 border border-amber-800/40 flex items-center justify-center">
                            <Layers className="w-5 h-5 text-amber-600/40" />
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-[11px] text-amber-300/80">
                        Supplementary contextual perspectives generated for this sight (tap to zoom):
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {identifiedResult.supplementaryImages.map((img) => (
                          <div
                            key={img.id}
                            onClick={() => setSelectedLightboxImage(img)}
                            className="group relative h-28 rounded-xl overflow-hidden border border-amber-600/50 cursor-pointer shadow-md"
                          >
                            <img
                              src={img.url}
                              alt={img.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-2">
                              <span className="text-[10px] font-bold text-amber-100 truncate">{img.title}</span>
                              <span className="text-[8px] text-amber-400 capitalize">{img.type}</span>
                            </div>
                            <div className="absolute top-1.5 right-1.5 bg-black/60 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                              <Maximize2 className="w-3 h-3 text-amber-300" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* State 3: Ready to Click or Upload Photo */}
        {!isScanning && !identifiedResult && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`flex-1 min-h-0 flex flex-col justify-between p-3.5 sm:p-4 rounded-2xl border-2 transition-all shadow-xl bg-amber-950/80 overflow-y-auto space-y-3 ${
              isDragging ? 'border-amber-400 bg-amber-900/60' : 'border-amber-700/60'
            }`}
          >
            {/* Error Notice Banner (if previous recognition failed) */}
            {scanError && (
              <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/60 text-rose-100 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-md">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{scanError}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  {lastImageAttemptRef.current && (
                    <button
                      type="button"
                      onClick={() => {
                        const attempt = lastImageAttemptRef.current;
                        if (attempt) processImage(attempt.source, attempt.sample);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer"
                    >
                      Retry
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setScanError(null)}
                    className="px-2 py-1 rounded-lg bg-rose-900/70 hover:bg-rose-800 text-rose-200 cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {/* Hero Card / Instructions */}
            <div className="space-y-1 text-center pt-1">
              <h2 className="text-base sm:text-lg font-serif font-bold text-amber-100">
                Snap or Upload Any Sight or Object
              </h2>
              <p className="text-xs text-amber-300/80 max-w-md mx-auto leading-relaxed">
                Point your camera at singing temple pillars, monuments, historic facades, or any everyday object (furniture, gadgets, tools) for instant intelligent audio narration.
              </p>
            </div>

            {/* Single Compact Option: Click or Upload Photo (Saves Space & Zero App Storage) */}
            <div className="py-1">
              <button
                id="btn-click-or-upload-photo"
                onClick={() => fileInputRef.current?.click()}
                className="w-full group relative flex flex-col sm:flex-row items-center justify-between p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-amber-950 font-bold shadow-lg hover:shadow-amber-500/25 active:scale-[0.99] transition-all cursor-pointer border border-amber-300 gap-3"
              >
                <div className="flex items-center gap-3.5 w-full sm:w-auto">
                  <div className="w-12 h-12 rounded-2xl bg-amber-950 text-amber-300 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform shrink-0">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div className="text-left min-w-0">
                    <div className="text-sm sm:text-base font-extrabold tracking-tight flex items-center gap-2">
                      <span>Click or Upload Photo</span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-950/20 text-amber-950 text-[10px] font-bold uppercase tracking-wider">
                        {guideSettings?.savePhotosToDeviceMemory ? 'Saves to App Memory' : 'Fast In-Memory'}
                      </span>
                    </div>
                    <div className="text-[11px] text-amber-950/80 font-medium truncate sm:whitespace-normal">
                      {guideSettings?.savePhotosToDeviceMemory
                        ? 'Snap camera or pick from gallery • Drag & drop • Saves to App Data'
                        : 'Snap camera or pick from gallery • Drag & drop • Zero device storage'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-950 text-amber-200 text-xs font-bold shrink-0 shadow-sm group-hover:bg-black transition-colors self-end sm:self-auto">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Choose / Snap</span>
                </div>
              </button>
            </div>

            {/* Optional Specific Question Prompt */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={customUserQuery}
                  onChange={(e) => setCustomUserQuery(e.target.value)}
                  placeholder="Ask a specific question about this sight (optional)..."
                  className="flex-1 px-3.5 py-2 rounded-xl bg-amber-950 border border-amber-700/70 text-amber-100 placeholder-amber-400/50 text-xs focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {/* Privacy / Device Storage Status Badge */}
            {guideSettings?.savePhotosToDeviceMemory ? (
              <div className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-emerald-950/40 border border-emerald-700/50 text-emerald-300 text-[11px] font-medium">
                <HardDrive className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  <strong>App Storage Enabled:</strong> Clicked/uploaded photos will be saved to internal app memory (Settings → Output & Storage).
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-[11px] font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  <strong>Privacy Guaranteed:</strong> Photos are analyzed dynamically in temporary RAM and are never stored or saved to your device memory.
                </span>
              </div>
            )}

            {/* Quick Sights Demo Presets */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-amber-200 flex items-center gap-1">
                  <Compass className="w-3.5 h-3.5 text-amber-400" />
                  Or Try Famous Sights Instantly:
                </span>
                <span className="text-[10px] text-amber-400/70">1-tap demo</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {SAMPLE_LANDMARKS.slice(0, 4).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => processImage(s.imageUrl, s)}
                    className="flex items-center gap-2 p-1.5 rounded-xl bg-amber-900/40 hover:bg-amber-900/80 border border-amber-800/60 text-left transition-all cursor-pointer group"
                  >
                    <img src={s.imageUrl} alt={s.title} className="w-8 h-8 rounded-lg object-cover group-hover:scale-105 transition-transform" />
                    <div className="min-w-0 pr-1">
                      <div className="text-[11px] font-bold text-amber-100 truncate">{s.title}</div>
                      <div className="text-[9px] text-amber-400/80 truncate capitalize">{s.category}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Supplementary Image Lightbox Modal */}
      {selectedLightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setSelectedLightboxImage(null)}
        >
          <div
            className="relative max-w-lg w-full bg-amber-950 rounded-2xl border border-amber-600/60 overflow-hidden shadow-2xl space-y-2 p-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[9px] uppercase font-bold text-amber-400 bg-amber-900/60 px-2 py-0.5 rounded border border-amber-700/50">
                  {selectedLightboxImage.type} perspective
                </span>
                <h4 className="text-sm font-bold text-amber-100 mt-1">{selectedLightboxImage.title}</h4>
              </div>
              <button
                onClick={() => setSelectedLightboxImage(null)}
                className="p-1 rounded-lg bg-amber-900/80 text-amber-200 hover:bg-amber-800 cursor-pointer"
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

            <p className="text-xs text-amber-200 leading-relaxed bg-amber-900/40 p-2.5 rounded-xl border border-amber-800/50">
              {selectedLightboxImage.caption}
            </p>
          </div>
        </div>
      )}
      {/* Deep Dive In-Depth Dossier Modal */}
      {isDeepDiveOpen && identifiedResult && (
        <DeepDiveModal
          title={identifiedResult.title}
          category={identifiedResult.category}
          locationName={identifiedResult.locationName}
          currentNarration={identifiedResult.narration}
          selectedLanguage={selectedLanguage}
          guideSettings={guideSettings}
          outputMode={outputMode}
          onClose={() => setIsDeepDiveOpen(false)}
          onOpenChatWithQuestion={(q) => {
            setIsDeepDiveOpen(false);
            if (onOpenChatWithQuestion) onOpenChatWithQuestion(q);
          }}
        />
      )}
    </div>
  );
};
