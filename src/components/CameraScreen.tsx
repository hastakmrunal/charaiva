import React, { useRef, useState, useCallback, useEffect } from 'react';
import { RecognitionResult, LocationCoords, Language, GuideOutputMode, SupplementaryImage, GuideSettings } from '../types';
import { SAMPLE_LANDMARKS } from '../data/sampleLandmarks';
import { speechManager } from '../utils/speech';
import { streamLandmarkRecognition } from '../utils/progressiveStreamingEngine';
import { savePhotoToAppStorage } from '../utils/photoStorage';
import { DeepDiveModal } from './DeepDiveModal';
import { WordByWordText } from './WordByWordText';
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
  BookOpen,
  HardDrive,
  AlertCircle,
  SwitchCamera
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

const FALLBACK_GALLERY_PHOTO = '/heritage-fallback.svg';

function drawSourceToJpegDataUrl(source: CanvasImageSource, naturalW: number, naturalH: number): string {
  const MAX_DIM = 1200;
  let width = naturalW || 0;
  let height = naturalH || 0;
  if (!width || !height) return '';

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
  canvas.width = Math.max(1, width);
  canvas.height = Math.max(1, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.86);
}

// Client-side non-blocking fast image compressor (scales photos to 1200px max JPEG)
async function compressImageForVision(file: File): Promise<string> {
  // Primary fast decode via createImageBitmap when available (handles EXIF orientation cleanly)
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      const jpegUrl = drawSourceToJpegDataUrl(bitmap, bitmap.width, bitmap.height);
      bitmap.close?.();
      if (jpegUrl && jpegUrl.startsWith('data:image/')) {
        return jpegUrl;
      }
    } catch {
      // Fall through to FileReader + HTMLImageElement decode
    }
  }

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
        try {
          const jpegUrl = drawSourceToJpegDataUrl(img, img.naturalWidth || img.width, img.naturalHeight || img.height);
          resolve(jpegUrl || rawDataUrl);
        } catch {
          resolve(rawDataUrl);
        }
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
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const streamCancelRef = useRef<(() => void) | null>(null);

  const [isLiveCameraActive, setIsLiveCameraActive] = useState(false);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [isCameraStalled, setIsCameraStalled] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraFallbackPrompt, setCameraFallbackPrompt] = useState<string | null>(null);

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

  // Attach MediaStream to <video> AFTER React renders the live camera container
  useEffect(() => {
    if (!isLiveCameraActive || !mediaStreamRef.current || !videoRef.current) return;
    const videoEl = videoRef.current;
    setIsVideoReady(false);
    setIsCameraStalled(false);
    videoEl.srcObject = mediaStreamRef.current;

    const checkVideoDimensions = () => {
      if (videoEl.readyState >= 2 && videoEl.videoWidth > 0 && videoEl.videoHeight > 0) {
        setIsVideoReady(true);
        setIsCameraStalled(false);
        return true;
      }
      return false;
    };

    const handleReadyEvent = () => {
      checkVideoDimensions();
      if (videoEl.paused) {
        videoEl.play().catch(() => {});
      }
    };

    videoEl.addEventListener('loadedmetadata', handleReadyEvent);
    videoEl.addEventListener('loadeddata', handleReadyEvent);
    videoEl.addEventListener('canplay', handleReadyEvent);
    videoEl.addEventListener('playing', handleReadyEvent);
    videoEl.addEventListener('resize', handleReadyEvent);

    videoEl.play().then(handleReadyEvent).catch(() => {});

    const pollTimer = window.setInterval(() => {
      if (checkVideoDimensions()) {
        window.clearInterval(pollTimer);
      }
    }, 150);

    const stallTimer = window.setTimeout(() => {
      if (!checkVideoDimensions()) {
        setIsCameraStalled(true);
      }
    }, 2500);

    return () => {
      window.clearInterval(pollTimer);
      window.clearTimeout(stallTimer);
      videoEl.removeEventListener('loadedmetadata', handleReadyEvent);
      videoEl.removeEventListener('loadeddata', handleReadyEvent);
      videoEl.removeEventListener('canplay', handleReadyEvent);
      videoEl.removeEventListener('playing', handleReadyEvent);
      videoEl.removeEventListener('resize', handleReadyEvent);
    };
  }, [isLiveCameraActive, cameraFacingMode]);

  // Stop Live Camera Stream cleanly
  const stopLiveCamera = useCallback(() => {
    if (videoRef.current) {
      try {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      } catch {}
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      mediaStreamRef.current = null;
    }
    setIsLiveCameraActive(false);
    setIsVideoReady(false);
    setIsStartingCamera(false);
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
        language: selectedLanguage.name,
        languageCode: selectedLanguage.speechCode,
        rate: guideSettings?.speechRate || speechRate,
        pitch: guideSettings?.voicePitch,
        gender: guideSettings?.voiceGender || 'female',
        onStart: () => setIsPlayingAudio(true),
        onEnd: () => setIsPlayingAudio(false),
        onError: () => setIsPlayingAudio(false),
      });
    },
    [outputMode, selectedLanguage.name, selectedLanguage.speechCode, speechRate, guideSettings]
  );

  // Process & Recognize Photo with Progressive Batch-Streaming Architecture
  const processImage = useCallback(
    (imageSource: string, samplePreset?: RecognitionResult) => {
      stopLiveCamera();
      setCameraFallbackPrompt(null);
      if (!imageSource || imageSource.trim().length < 20) {
        setScanError('Captured photo appears empty. Please click or upload a clear photo of the sight.');
        return;
      }

      lastImageAttemptRef.current = { source: imageSource, sample: samplePreset };
      setScanError(null);
      setIsScanning(true);
      setActivePhotoPreview(imageSource);
      setActiveTabSection('narration');
      speechManager.stop();
      setIsPlayingAudio(false);

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

        // Batch 1 (Immediate / < 100ms): Instantly display structural card
        onBatch1: (b1Data) => {
          const res = b1Data as RecognitionResult;
          setIdentifiedResult(res);
          setIsScanning(false);

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

        // Live streaming text delta so words reveal immediately as they arrive
        onDelta: (deltaData) => {
          setIsScanning(false);
          setIdentifiedResult((prev) => {
            const merged = { ...(prev || {}), ...deltaData, isStreaming: true } as RecognitionResult;
            return merged;
          });
        },

        // Batch 2 (Core Text + Voice)
        onBatch2: (b2Data) => {
          const res = b2Data as RecognitionResult;
          setIsScanning(false);
          setIdentifiedResult(res);
          onScanComplete(res);
          if (outputMode === 'speech' || outputMode === 'both') {
            playNarrationAudio(res);
          }
        },

        // Batch 3 (Deferred Media & Context Photos)
        onBatch3: (b3Data) => {
          const res = b3Data as RecognitionResult;
          setIsScanning(false);
          setIdentifiedResult(res);
          onScanComplete(res);
        },

        onComplete: (finalRes) => {
          setIsScanning(false);
          setIdentifiedResult(finalRes);
          onScanComplete(finalRes);
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
      stopLiveCamera,
      visitedHistory,
    ]
  );

  // Ref for processImage so captureLiveFrame never uses a stale closure
  const processImageRef = useRef(processImage);
  useEffect(() => {
    processImageRef.current = processImage;
  }, [processImage]);

  // Start Live Camera Stream Viewfinder
  const startLiveCamera = useCallback(
    async (facing: 'environment' | 'user' = cameraFacingMode) => {
      setScanError(null);
      setCameraFallbackPrompt(null);
      stopLiveCamera();
      setIsStartingCamera(true);

      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setIsStartingCamera(false);
          setCameraFallbackPrompt(
            'Live browser viewfinder is unavailable on this device. Tap below to open your system camera app directly or upload a photo.'
          );
          return;
        }

        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: facing },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          });
        } catch {
          // Relax constraints if facingMode ideal causes OverconstrainedError on desktop webcams
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }

        mediaStreamRef.current = stream;
        setIsStartingCamera(false);
        setIsLiveCameraActive(true);
      } catch (err: any) {
        console.warn('getUserMedia blocked or unavailable:', err);
        stopLiveCamera();
        setCameraFallbackPrompt(
          'Browser camera permission was denied or unavailable inside this view. Use your device camera app or pick an image directly below.'
        );
      }
    },
    [cameraFacingMode, stopLiveCamera]
  );

  // Toggle Camera Facing Mode (Front vs Rear)
  const toggleCameraFacingMode = useCallback(() => {
    const nextFacing = cameraFacingMode === 'environment' ? 'user' : 'environment';
    setCameraFacingMode(nextFacing);
    startLiveCamera(nextFacing);
  }, [cameraFacingMode, startLiveCamera]);

  // Capture Photo Frame from Live Video Viewfinder
  const captureLiveFrame = useCallback(async () => {
    const video = videoRef.current;
    if (!video) {
      setCameraFallbackPrompt('Camera viewfinder closed unexpectedly. Tap below to use your device camera app or pick a photo.');
      stopLiveCamera();
      return;
    }

    // Brief retry wait if stream just started and frame 1 is still decoding
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      await new Promise((r) => window.setTimeout(r, 250));
    }

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      setIsCameraStalled(true);
      setScanError('Live browser camera frame was not delivered yet. Use "Device Camera App" or "Choose Photo" below.');
      return;
    }

    const dataUrl = drawSourceToJpegDataUrl(video, video.videoWidth, video.videoHeight);
    if (!dataUrl || dataUrl.length < 200) {
      setScanError('Could not read a valid camera frame. Please try again or pick a photo.');
      return;
    }

    stopLiveCamera();
    processImageRef.current(dataUrl);
  }, [stopLiveCamera]);

  // Stop speech & cleanup stream when component unmounts
  useEffect(() => {
    return () => {
      speechManager.stop();
      stopLiveCamera();
      if (streamCancelRef.current) {
        streamCancelRef.current();
        streamCancelRef.current = null;
      }
    };
  }, [stopLiveCamera]);

  // Handle Photo File Capture or Upload with Fast Client-Side Compression
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    try {
      if (file) {
        const compressedBase64 = await compressImageForVision(file);
        if (compressedBase64 && compressedBase64.startsWith('data:image/')) {
          processImage(compressedBase64);
        } else {
          setScanError('Could not process the selected image format. Please choose a JPG or PNG photo.');
        }
      }
    } finally {
      e.target.value = '';
    }
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
    stopLiveCamera();
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
    setCameraFallbackPrompt(null);
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
      {/* Native Camera Shutter Input (Direct OS Camera for Mobile / Desktop) */}
      <input
        ref={cameraInputRef}
        id="input-native-camera-snap"
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="sr-only"
      />

      {/* File Upload Input (Gallery / Device files) */}
      <input
        ref={fileInputRef}
        id="input-camera-file"
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="sr-only"
      />

      {/* Top Header Bar */}
      <div
        style={{
          backgroundColor: 'var(--theme-card-bg)',
          borderColor: 'var(--theme-card-border)',
        }}
        className="shrink-0 flex items-center justify-between p-2.5 backdrop-blur-md rounded-2xl border shadow-sm"
      >
        <button
          id="btn-camera-back-home"
          onClick={() => {
            stopLiveCamera();
            speechManager.stop();
            onBackToHome();
          }}
          aria-label="Back to Explore Home"
          title="Back to Explore Home"
          style={{
            backgroundColor: 'var(--theme-card-bg-subtle)',
            borderColor: 'var(--theme-card-border)',
            color: 'var(--theme-text-title)',
          }}
          className="min-h-[40px] px-3 py-1.5 rounded-xl cursor-pointer transition-all active:scale-95 flex items-center gap-1.5 font-bold text-xs border hover:border-[var(--theme-card-border-glow)] shadow-sm"
        >
          <ArrowLeft className="w-4 h-4 shrink-0 text-[var(--theme-accent-primary)]" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full theme-badge-gold text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-[var(--theme-accent-primary)]" />
          <span>{identifiedResult ? 'Sight Analysis Ready' : 'Click or Upload Sight Photo'}</span>
        </div>

        {/* Output Mode Switcher (Speech / Text / Both) */}
        <button
          onClick={() => {
            if (outputMode === 'speech') onToggleOutputMode('both');
            else if (outputMode === 'both') onToggleOutputMode('text');
            else onToggleOutputMode('speech');
          }}
          style={
            outputMode === 'text'
              ? {
                  backgroundColor: 'var(--theme-card-bg-subtle)',
                  borderColor: 'var(--theme-card-border)',
                  color: 'var(--theme-text-muted)',
                }
              : undefined
          }
          className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1 ${
            outputMode === 'speech' || outputMode === 'both'
              ? 'theme-btn-primary border-transparent'
              : 'hover:text-[var(--theme-text-title)]'
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
          <div
            style={{
              backgroundColor: 'var(--theme-card-bg)',
              borderColor: 'var(--theme-card-border)',
            }}
            className="flex-1 flex flex-col items-center justify-center p-6 rounded-2xl border text-center space-y-4 shadow-xl"
          >
            <div className="relative w-16 h-16 flex items-center justify-center">
              <div
                style={{
                  borderColor: 'var(--theme-card-border)',
                  borderTopColor: 'var(--theme-accent-primary)',
                }}
                className="absolute inset-0 rounded-full border-4 animate-spin"
              />
              <Landmark className="w-7 h-7 text-[var(--theme-accent-primary)] animate-pulse" />
            </div>

            <div className="space-y-1.5 max-w-sm">
              <h3 className="text-base font-serif font-bold text-[var(--theme-text-title)]">
                AI Guide is Analyzing Your Photo
              </h3>
              <p className="text-xs text-[var(--theme-text-muted)] leading-relaxed">
                Identifying historical landmark, architecture, and streaming narration in{' '}
                <strong className="text-[var(--theme-text-title)]">{selectedLanguage.nativeName}</strong>...
              </p>
            </div>

            <div
              style={{
                backgroundColor: 'var(--theme-card-bg-subtle)',
                borderColor: 'var(--theme-card-border)',
              }}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--theme-text-muted)] px-3 py-1.5 rounded-xl border"
            >
              {guideSettings?.savePhotosToDeviceMemory ? (
                <>
                  <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">Saving photo to phone internal memory (App Data)</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-[var(--theme-accent-secondary)]" />
                  <span>In-memory analysis · Not saved to phone memory</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* State 2: Result Identified & Ready */}
        {!isScanning && identifiedResult && (
          <div
            style={{
              backgroundColor: 'var(--theme-card-bg)',
              borderColor: 'var(--theme-card-border)',
            }}
            className="flex-1 min-h-0 flex flex-col backdrop-blur-md rounded-2xl border overflow-hidden shadow-xl"
          >
            {/* Sight Header Banner */}
            <div
              style={{
                backgroundColor: 'var(--theme-card-bg-subtle)',
                borderColor: 'var(--theme-card-border)',
              }}
              className="p-3 border-b flex items-center justify-between gap-2 shrink-0"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="px-2 py-0.5 rounded theme-badge-gold font-bold text-[9px] uppercase tracking-wider">
                    {identifiedResult.category}
                  </span>
                  <span className="text-[11px] text-[var(--theme-accent-secondary)] truncate font-medium">
                    {identifiedResult.locationName}
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-serif font-bold text-[var(--theme-text-title)] truncate mt-0.5">
                  {identifiedResult.title}
                </h2>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={handleResetScanner}
                  className="px-3 py-1.5 rounded-xl theme-btn-primary text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Scan Next Sight</span>
                </button>
              </div>
            </div>

            {/* Audio Narration Controls */}
            <div
              style={{
                backgroundColor: 'var(--theme-card-bg-subtle)',
                borderColor: 'var(--theme-card-border)',
              }}
              className="p-2.5 border-b shrink-0 flex items-center justify-between gap-2"
            >
              <button
                onClick={handleTogglePlay}
                disabled={!identifiedResult.narration && !identifiedResult.summary}
                className={`flex-1 py-2 px-3.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all ${
                  !identifiedResult.narration && !identifiedResult.summary
                    ? 'theme-btn-secondary opacity-80 cursor-wait animate-pulse'
                    : isPlayingAudio
                    ? 'bg-rose-700 hover:bg-rose-600 text-white'
                    : 'theme-btn-primary'
                }`}
              >
                {!identifiedResult.narration && identifiedResult.isStreaming ? (
                  <>
                    <Sparkles className="w-4 h-4 text-[var(--theme-accent-primary)] animate-spin" />
                    <span>Composing Spoken Guide in {selectedLanguage.nativeName}...</span>
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

              <div
                style={{
                  backgroundColor: 'var(--theme-card-bg)',
                  borderColor: 'var(--theme-card-border)',
                }}
                className="flex items-center gap-1 p-1 rounded-xl border shrink-0"
              >
                {[1.0, 1.25, 1.5].map((rate) => (
                  <button
                    key={rate}
                    onClick={() => {
                      setSpeechRate(rate);
                      if (isPlayingAudio && identifiedResult.narration) {
                        speechManager.stop();
                        speechManager.speak({
                          text: identifiedResult.narration,
                          language: selectedLanguage.name,
                          languageCode: selectedLanguage.speechCode,
                          rate,
                          pitch: guideSettings?.voicePitch,
                          gender: guideSettings?.voiceGender || 'female',
                          onStart: () => setIsPlayingAudio(true),
                          onEnd: () => setIsPlayingAudio(false),
                          onError: () => setIsPlayingAudio(false),
                        });
                      }
                    }}
                    style={
                      speechRate === rate
                        ? {
                            background: 'var(--theme-accent-primary-gradient)',
                            color: 'var(--theme-accent-primary-text)',
                          }
                        : { color: 'var(--theme-text-muted)' }
                    }
                    className="px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            </div>

            {/* Sub-tabs: Narration vs Key Facts vs Supplementary Visuals */}
            <div
              style={{ borderColor: 'var(--theme-card-border)' }}
              className="flex items-center gap-1 px-3 pt-2 shrink-0 border-b"
            >
              <button
                onClick={() => setActiveTabSection('narration')}
                className={`pb-1.5 px-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTabSection === 'narration'
                    ? 'border-[var(--theme-accent-primary)] text-[var(--theme-text-title)]'
                    : 'border-transparent text-[var(--theme-text-muted)] hover:text-[var(--theme-text-title)]'
                }`}
              >
                <Volume2 className="w-3.5 h-3.5 text-[var(--theme-accent-primary)]" />
                <span>Narration</span>
              </button>

              <button
                onClick={() => setActiveTabSection('facts')}
                className={`pb-1.5 px-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTabSection === 'facts'
                    ? 'border-[var(--theme-accent-primary)] text-[var(--theme-text-title)]'
                    : 'border-transparent text-[var(--theme-text-muted)] hover:text-[var(--theme-text-title)]'
                }`}
              >
                <Info className="w-3.5 h-3.5" />
                <span>Key Facts ({identifiedResult.keyFacts?.length || 0})</span>
              </button>

              <button
                onClick={() => setActiveTabSection('context')}
                className={`pb-1.5 px-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTabSection === 'context'
                    ? 'border-[var(--theme-accent-primary)] text-[var(--theme-text-title)]'
                    : 'border-transparent text-[var(--theme-text-muted)] hover:text-[var(--theme-text-title)]'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Perspectives ({identifiedResult.supplementaryImages?.length || 0})</span>
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
              {activeTabSection === 'narration' && (
                <div className="space-y-3">
                  {/* Clickable Photo Preview Thumbnail & OCR detected badge */}
                  {(activePhotoPreview || identifiedResult.imageUrl) && (
                    <div
                      style={{
                        backgroundColor: 'var(--theme-card-bg-subtle)',
                        borderColor: 'var(--theme-card-border)',
                      }}
                      className="flex items-center gap-3 p-2.5 rounded-xl border"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedLightboxImage({
                            id: 'captured-preview',
                            url: activePhotoPreview || identifiedResult.imageUrl || FALLBACK_GALLERY_PHOTO,
                            title: identifiedResult.title,
                            caption: identifiedResult.summary || identifiedResult.locationName,
                            type: 'detail',
                          })
                        }
                        className="relative group w-16 h-16 rounded-lg overflow-hidden border border-[var(--theme-card-border)] shrink-0 cursor-pointer"
                        title="Tap to zoom photo"
                      >
                        <img
                          src={activePhotoPreview || identifiedResult.imageUrl}
                          alt={identifiedResult.title}
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = FALLBACK_GALLERY_PHOTO;
                          }}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Maximize2 className="w-4 h-4 text-white" />
                        </div>
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded theme-badge-gold">
                            Captured Sight
                          </span>
                          {photoStorageStatus === 'saved' ? (
                            <span className="text-[9px] text-emerald-300 font-bold px-1.5 py-0.5 rounded bg-emerald-950/70 border border-emerald-700/50 flex items-center gap-1">
                              <HardDrive className="w-2.5 h-2.5" />
                              <span>Saved to Phone</span>
                            </span>
                          ) : (
                            <span className="text-[9px] text-[var(--theme-text-muted)] font-medium px-1.5 py-0.5 rounded border border-[var(--theme-card-border)]">
                              In-Memory Only
                            </span>
                          )}
                          {identifiedResult.ocrDetectedText && (
                            <span className="text-[9px] text-[var(--theme-accent-secondary)] font-medium truncate">
                              OCR: &quot;{identifiedResult.ocrDetectedText}&quot;
                            </span>
                          )}
                          {identifiedResult.isStreaming && (
                            <span className="text-[9px] theme-badge-teal font-mono flex items-center gap-1 px-1.5 py-0.5 rounded">
                              <Sparkles className="w-2.5 h-2.5 animate-spin" />
                              Streaming Live
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs font-serif font-bold text-[var(--theme-text-title)] truncate mt-0.5">
                          {identifiedResult.title}
                        </h4>
                        <p className="text-[10px] text-[var(--theme-text-muted)] truncate">
                          {identifiedResult.locationName}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Spoken Text Display Card */}
                  {!identifiedResult.narration && identifiedResult.isStreaming ? (
                    <div
                      style={{
                        backgroundColor: 'var(--theme-card-bg-subtle)',
                        borderColor: 'var(--theme-card-border)',
                      }}
                      className="p-3.5 rounded-2xl border text-xs sm:text-sm shadow-sm space-y-2.5"
                    >
                      <div
                        style={{ borderColor: 'var(--theme-card-border)' }}
                        className="flex items-center justify-between border-b pb-1.5"
                      >
                        <span className="text-[10px] font-bold text-[var(--theme-accent-primary)] flex items-center gap-1.5 uppercase tracking-wider">
                          <Sparkles className="w-3.5 h-3.5 animate-spin" />
                          Streaming Spoken Tour Script ({selectedLanguage.nativeName})...
                        </span>
                      </div>
                      <div className="space-y-2 py-1 animate-pulse">
                        <div className="h-3 bg-slate-700/40 rounded w-full" />
                        <div className="h-3 bg-slate-700/35 rounded w-11/12" />
                        <div className="h-3 bg-slate-700/30 rounded w-4/5" />
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        backgroundColor: 'var(--theme-card-bg-subtle)',
                        borderColor: 'var(--theme-card-border)',
                      }}
                      className="p-3.5 rounded-2xl border text-xs sm:text-sm text-[var(--theme-text-body)] leading-relaxed font-sans shadow-sm space-y-2"
                    >
                      <div
                        style={{ borderColor: 'var(--theme-card-border)' }}
                        className="flex items-center justify-between border-b pb-1.5 mb-1.5"
                      >
                        <span className="text-[10px] font-bold text-[var(--theme-accent-primary)] flex items-center gap-1 uppercase tracking-wider">
                          <Volume2 className="w-3.5 h-3.5" />
                          Spoken Audio Tour Script ({selectedLanguage.nativeName})
                        </span>
                        {isPlayingAudio && (
                          <span className="flex items-center gap-1 text-[10px] text-[var(--theme-accent-secondary)] font-bold animate-pulse">
                            <span
                              style={{ backgroundColor: 'var(--theme-accent-secondary)' }}
                              className="w-2 h-2 rounded-full"
                            />
                            Speaking Now
                          </span>
                        )}
                      </div>
                      <p className="whitespace-pre-line text-[var(--theme-text-body)] text-xs sm:text-sm leading-relaxed">
                        <WordByWordText
                          text={identifiedResult.narration || identifiedResult.summary}
                          isStreaming={identifiedResult.isStreaming}
                        />
                      </p>
                    </div>
                  )}

                  {/* Summary Callout */}
                  {identifiedResult.summary && (
                    <div
                      style={{
                        backgroundColor: 'var(--theme-card-bg-subtle)',
                        borderColor: 'var(--theme-card-border)',
                      }}
                      className="p-2.5 rounded-xl border text-xs text-[var(--theme-text-body)]"
                    >
                      <strong className="text-[var(--theme-accent-primary)]">Why You Must Visit: </strong>
                      <WordByWordText text={identifiedResult.summary} />
                    </div>
                  )}

                  {/* Deep-Dive Details Button */}
                  <button
                    id="btn-deep-dive-topic"
                    onClick={() => {
                      speechManager.stop();
                      setIsPlayingAudio(false);
                      setIsDeepDiveOpen(true);
                    }}
                    className="w-full py-3 px-4 rounded-2xl theme-btn-primary font-bold text-xs sm:text-sm shadow-lg active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Discover In-Depth Details &amp; Secrets</span>
                    <Sparkles className="w-4 h-4" />
                  </button>

                  {/* Ask Question Quick Trigger */}
                  {onOpenChatWithQuestion && (
                    <button
                      onClick={() =>
                        onOpenChatWithQuestion(`Tell me more fascinating secrets about ${identifiedResult.title}`)
                      }
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl theme-btn-secondary text-xs font-bold cursor-pointer transition-all shadow-sm active:scale-[0.99]"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-[var(--theme-accent-secondary)]" />
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
                        <div
                          key={i}
                          style={{
                            backgroundColor: 'var(--theme-card-bg-subtle)',
                            borderColor: 'var(--theme-card-border)',
                          }}
                          className="flex items-center gap-2 p-2.5 rounded-xl border"
                        >
                          <div className="w-4 h-4 rounded-full bg-slate-700/40 shrink-0" />
                          <div className="h-3 bg-slate-700/40 rounded w-3/4" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {identifiedResult.keyFacts.map((fact, idx) => (
                        <div
                          key={idx}
                          style={{
                            backgroundColor: 'var(--theme-card-bg-subtle)',
                            borderColor: 'var(--theme-card-border)',
                          }}
                          className="flex items-start gap-2 p-2.5 rounded-xl border text-xs text-[var(--theme-text-body)] shadow-sm"
                        >
                          <CheckCircle2 className="w-4 h-4 text-[var(--theme-accent-secondary)] shrink-0 mt-0.5" />
                          <span>{fact}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {identifiedResult.architecturalHighlights && identifiedResult.architecturalHighlights.length > 0 && (
                    <div
                      style={{
                        backgroundColor: 'var(--theme-card-bg-subtle)',
                        borderColor: 'var(--theme-card-border)',
                      }}
                      className="p-3 rounded-xl border space-y-1.5"
                    >
                      <h4 className="text-xs font-bold text-[var(--theme-accent-primary)] flex items-center gap-1.5">
                        <Landmark className="w-3.5 h-3.5" />
                        Architectural Highlights to Spot:
                      </h4>
                      <ul className="space-y-1 text-xs text-[var(--theme-text-body)] list-disc list-inside">
                        {identifiedResult.architecturalHighlights.map((arch, i) => (
                          <li key={i}>{arch}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {identifiedResult.summary && (
                    <div
                      style={{
                        backgroundColor: 'var(--theme-card-bg-subtle)',
                        borderColor: 'var(--theme-card-border)',
                      }}
                      className="p-3 rounded-xl border text-xs text-[var(--theme-text-body)]"
                    >
                      <strong className="text-[var(--theme-accent-primary)]">Overview: </strong>
                      {identifiedResult.summary}
                    </div>
                  )}
                </div>
              )}

              {activeTabSection === 'context' && (
                <div className="space-y-2">
                  {!identifiedResult.supplementaryImages || identifiedResult.supplementaryImages.length === 0 ? (
                    <div className="space-y-2">
                      <p className="text-[11px] text-[var(--theme-text-muted)] flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-[var(--theme-accent-primary)] animate-spin" />
                        Fetching perspective views in background...
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 animate-pulse">
                        {[1, 2, 3].map((i) => (
                          <div
                            key={i}
                            style={{
                              backgroundColor: 'var(--theme-card-bg-subtle)',
                              borderColor: 'var(--theme-card-border)',
                            }}
                            className="h-28 rounded-xl border flex items-center justify-center"
                          >
                            <Layers className="w-5 h-5 text-[var(--theme-text-muted)]" />
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-[11px] text-[var(--theme-text-muted)]">
                        Supplementary contextual perspectives for this sight (tap to zoom):
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {identifiedResult.supplementaryImages.map((img) => (
                          <div
                            key={img.id}
                            onClick={() => setSelectedLightboxImage(img)}
                            style={{ borderColor: 'var(--theme-card-border)' }}
                            className="group relative h-28 rounded-xl overflow-hidden border cursor-pointer shadow-md hover:border-[var(--theme-card-border-glow)]"
                          >
                            <img
                              src={img.url}
                              alt={img.title}
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = FALLBACK_GALLERY_PHOTO;
                              }}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-2">
                              <span className="text-[10px] font-bold text-white truncate">{img.title}</span>
                              <span className="text-[8px] text-[var(--theme-accent-primary)] capitalize">{img.type}</span>
                            </div>
                            <div className="absolute top-1.5 right-1.5 bg-black/60 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                              <Maximize2 className="w-3 h-3 text-white" />
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
            style={{
              backgroundColor: isDragging ? 'var(--theme-card-hover)' : 'var(--theme-card-bg)',
              borderColor: isDragging ? 'var(--theme-accent-primary)' : 'var(--theme-card-border)',
            }}
            className="flex-1 min-h-0 flex flex-col justify-between p-3.5 sm:p-4 rounded-2xl border-2 transition-all shadow-xl overflow-y-auto space-y-3"
          >
            {/* Error Notice Banner */}
            {scanError && (
              <div className="p-3 rounded-xl bg-rose-950/75 border border-rose-500/50 text-rose-100 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-md">
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
                      className="px-2.5 py-1 rounded-lg bg-rose-700 hover:bg-rose-600 text-white font-bold cursor-pointer"
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

            {/* Direct Camera & File Fallback Notice (Uses Native <label> so Browser Never Blocks Clicks) */}
            {cameraFallbackPrompt && (
              <div
                style={{
                  backgroundColor: 'var(--theme-card-bg-subtle)',
                  borderColor: 'var(--theme-accent-primary)',
                }}
                className="p-3.5 rounded-xl border text-xs space-y-2.5 shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 text-[var(--theme-text-body)]">
                    <Camera className="w-4 h-4 text-[var(--theme-accent-primary)] shrink-0 mt-0.5" />
                    <span>{cameraFallbackPrompt}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCameraFallbackPrompt(null)}
                    className="text-[var(--theme-text-muted)] hover:text-[var(--theme-text-title)] cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label
                    htmlFor="input-native-camera-snap"
                    onClick={() => setCameraFallbackPrompt(null)}
                    className="px-3 py-1.5 rounded-lg theme-btn-primary text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Take Photo / System Camera</span>
                  </label>
                  <label
                    htmlFor="input-camera-file"
                    onClick={() => setCameraFallbackPrompt(null)}
                    className="px-3 py-1.5 rounded-lg theme-btn-secondary text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Choose Photo File</span>
                  </label>
                </div>
              </div>
            )}

            {/* Hero Card / Instructions */}
            <div className="space-y-1 text-center pt-1">
              <h2 className="text-base sm:text-lg font-serif font-bold text-[var(--theme-text-title)]">
                Snap or Upload Any Sight or Object
              </h2>
              <p className="text-xs text-[var(--theme-text-muted)] max-w-md mx-auto leading-relaxed">
                Point your camera at temple pillars, monuments, historic facades, or everyday objects for instant intelligent narration.
              </p>
            </div>

            {/* Live Camera Viewfinder OR Dual Action (Click vs Upload) */}
            {isLiveCameraActive ? (
              <div
                style={{ borderColor: 'var(--theme-accent-secondary)' }}
                className="relative w-full aspect-[4/3] sm:aspect-video rounded-2xl overflow-hidden bg-black border-2 shadow-2xl flex flex-col justify-between shrink-0"
              >
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute inset-0 w-full h-full object-cover"
                />

                {/* Viewfinder Target Framing Reticle */}
                <div className="absolute inset-4 sm:inset-6 border border-white/25 rounded-2xl pointer-events-none flex flex-col justify-between p-3">
                  <div className="flex justify-between">
                    <span className="w-5 h-5 border-t-2 border-l-2 border-[var(--theme-accent-primary)]" />
                    <span className="w-5 h-5 border-t-2 border-r-2 border-[var(--theme-accent-primary)]" />
                  </div>
                  <div className="flex justify-center">
                    <span className="text-[11px] font-semibold text-white bg-black/75 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 shadow-md text-center">
                      {isVideoReady
                        ? 'Align sight in frame and tap Shutter'
                        : isCameraStalled
                        ? 'Camera preview blocked in browser — use options below'
                        : 'Starting camera stream...'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="w-5 h-5 border-b-2 border-l-2 border-[var(--theme-accent-primary)]" />
                    <span className="w-5 h-5 border-b-2 border-r-2 border-[var(--theme-accent-primary)]" />
                  </div>
                </div>

                {/* Top Overlay Controls: Flip Camera & Close */}
                <div className="relative z-10 p-3 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={toggleCameraFacingMode}
                    className="p-2 sm:px-3 sm:py-2 rounded-xl bg-black/70 hover:bg-black/90 text-white border border-white/20 backdrop-blur-md cursor-pointer transition-all active:scale-95 flex items-center gap-1.5 text-xs font-bold shadow-lg"
                    title="Switch Camera (Front / Rear)"
                  >
                    <SwitchCamera className="w-4 h-4 text-[var(--theme-accent-primary)]" />
                    <span className="hidden sm:inline">Flip Camera</span>
                  </button>

                  <button
                    type="button"
                    onClick={stopLiveCamera}
                    className="p-2 sm:px-3 sm:py-2 rounded-xl bg-black/70 hover:bg-black/90 text-white border border-white/20 backdrop-blur-md cursor-pointer transition-all active:scale-95 flex items-center gap-1 text-xs font-bold shadow-lg"
                    title="Close Live Camera"
                  >
                    <X className="w-4 h-4" />
                    <span className="hidden sm:inline">Cancel</span>
                  </button>
                </div>

                {/* Bottom Overlay Controls: Shutter Button + Direct Camera Fallback if Stalled */}
                <div className="relative z-10 p-3.5 bg-gradient-to-t from-black/95 via-black/55 to-transparent flex flex-col items-center justify-center gap-2">
                  {isCameraStalled && (
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <label
                        htmlFor="input-native-camera-snap"
                        onClick={() => stopLiveCamera()}
                        className="px-3 py-1.5 rounded-xl theme-btn-primary text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-lg"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Device Camera App</span>
                      </label>
                      <label
                        htmlFor="input-camera-file"
                        onClick={() => stopLiveCamera()}
                        className="px-3 py-1.5 rounded-xl theme-btn-secondary text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-lg"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Choose Photo</span>
                      </label>
                    </div>
                  )}

                  <button
                    type="button"
                    id="btn-live-camera-shutter"
                    onClick={captureLiveFrame}
                    className="group relative flex items-center justify-center w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-white border-4 border-[var(--theme-accent-primary)] shadow-2xl transition-all cursor-pointer active:scale-90 hover:scale-105"
                    title="Click Sight Photo Now"
                  >
                    <div
                      style={{ background: 'var(--theme-accent-primary-gradient)' }}
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-white shadow-inner"
                    >
                      <Camera className="w-6 h-6 sm:w-7 sm:h-7" />
                    </div>
                  </button>
                  <span className="text-[11px] font-bold text-white drop-shadow">
                    {isVideoReady ? 'Tap Shutter to Click Photo' : 'Waiting for camera frame...'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-2 py-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Option 1: Live Click Sight Photo */}
                  <button
                    type="button"
                    id="btn-click-sight-photo"
                    disabled={isStartingCamera}
                    onClick={() => startLiveCamera('environment')}
                    className="group relative flex flex-col justify-between p-4 rounded-2xl theme-btn-primary font-bold shadow-lg active:scale-[0.99] transition-all cursor-pointer gap-3 text-left"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="w-11 h-11 rounded-2xl bg-black/25 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform shrink-0">
                        <Camera className="w-5 h-5" />
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-black/25 text-[10px] font-extrabold uppercase tracking-wider">
                        {isStartingCamera ? 'Starting...' : 'Live Shutter'}
                      </span>
                    </div>
                    <div>
                      <div className="text-sm sm:text-base font-extrabold">
                        Click Sight Photo
                      </div>
                      <div className="text-[11px] opacity-85 font-medium mt-0.5">
                        Open live camera viewfinder &amp; snap any sight or object
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-bold group-hover:translate-x-1 transition-transform">
                      <span>{isStartingCamera ? 'Requesting Camera...' : 'Start Camera'}</span>
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                  </button>

                  {/* Option 2: Upload Sight Photo */}
                  <button
                    type="button"
                    id="btn-upload-sight-photo"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      backgroundColor: 'var(--theme-card-bg-subtle)',
                      borderColor: 'var(--theme-card-border)',
                      color: 'var(--theme-text-title)',
                    }}
                    className="group relative flex flex-col justify-between p-4 rounded-2xl font-bold shadow-lg border hover:border-[var(--theme-card-border-glow)] active:scale-[0.99] transition-all cursor-pointer gap-3 text-left"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div
                        style={{
                          backgroundColor: 'var(--theme-card-bg)',
                          borderColor: 'var(--theme-card-border)',
                        }}
                        className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform shrink-0 border"
                      >
                        <Upload className="w-5 h-5 text-[var(--theme-accent-secondary)]" />
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full theme-badge-teal text-[10px] font-extrabold uppercase tracking-wider">
                        Gallery / Files
                      </span>
                    </div>
                    <div>
                      <div className="text-sm sm:text-base font-extrabold text-[var(--theme-text-title)]">
                        Upload Sight Photo
                      </div>
                      <div className="text-[11px] text-[var(--theme-text-muted)] font-medium mt-0.5">
                        Pick photo from device memory or drag &amp; drop image
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--theme-accent-secondary)] group-hover:translate-x-1 transition-transform">
                      <span>Browse Files</span>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                  </button>
                </div>

                {/* Direct Native Camera Shutter Link */}
                <div className="flex items-center justify-center pt-0.5">
                  <label
                    htmlFor="input-native-camera-snap"
                    id="btn-native-shutter-fallback"
                    className="text-[11px] text-[var(--theme-text-muted)] hover:text-[var(--theme-text-title)] underline underline-offset-2 flex items-center gap-1 cursor-pointer py-0.5"
                  >
                    <Camera className="w-3 h-3 text-[var(--theme-accent-primary)]" />
                    <span>Or take photo with your device system camera directly</span>
                  </label>
                </div>
              </div>
            )}

            {/* Optional Specific Question Prompt */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={customUserQuery}
                  onChange={(e) => setCustomUserQuery(e.target.value)}
                  placeholder="Ask a specific question about this sight (optional)..."
                  className="theme-input flex-1 px-3.5 py-2 text-xs"
                />
              </div>
            </div>

            {/* Privacy / Device Storage Status Badge */}
            {guideSettings?.savePhotosToDeviceMemory ? (
              <div className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-emerald-950/35 border border-emerald-700/40 text-emerald-300 text-[11px] font-medium">
                <HardDrive className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  <strong>App Storage Enabled:</strong> Photos save to internal app memory (Settings → Output).
                </span>
              </div>
            ) : (
              <div
                style={{
                  backgroundColor: 'var(--theme-card-bg-subtle)',
                  borderColor: 'var(--theme-card-border)',
                  color: 'var(--theme-text-muted)',
                }}
                className="flex items-center justify-center gap-1.5 p-2 rounded-xl border text-[11px] font-medium"
              >
                <ShieldCheck className="w-4 h-4 text-[var(--theme-accent-secondary)] shrink-0" />
                <span>
                  <strong>Privacy Guaranteed:</strong> Photos are analyzed in temporary RAM and never stored on your device.
                </span>
              </div>
            )}

            {/* Quick Sights Demo Presets */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[var(--theme-text-title)] flex items-center gap-1">
                  <Compass className="w-3.5 h-3.5 text-[var(--theme-accent-primary)]" />
                  Or Try Famous Sights Instantly:
                </span>
                <span className="text-[10px] text-[var(--theme-text-muted)]">1-tap sample</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {SAMPLE_LANDMARKS.slice(0, 4).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => processImage(s.imageUrl, s)}
                    style={{
                      backgroundColor: 'var(--theme-card-bg-subtle)',
                      borderColor: 'var(--theme-card-border)',
                    }}
                    className="flex items-center gap-2 p-1.5 rounded-xl border hover:border-[var(--theme-card-border-glow)] text-left transition-all cursor-pointer group"
                  >
                    <img
                      src={s.imageUrl}
                      alt={s.title}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = FALLBACK_GALLERY_PHOTO;
                      }}
                      className="w-8 h-8 rounded-lg object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="min-w-0 pr-1">
                      <div className="text-[11px] font-bold text-[var(--theme-text-title)] truncate">{s.title}</div>
                      <div className="text-[9px] text-[var(--theme-text-muted)] truncate capitalize">{s.category}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Supplementary / Captured Image Lightbox Modal */}
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
                className="p-1.5 rounded-lg hover:text-[var(--theme-text-title)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="w-full h-64 rounded-xl overflow-hidden bg-black">
              <img
                src={selectedLightboxImage.url}
                alt={selectedLightboxImage.title}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = FALLBACK_GALLERY_PHOTO;
                }}
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
