import { RecognitionResult, LocationCoords, Language, SpeechTopicPreferences, SupplementaryImage } from '../types';
import { SAMPLE_LANDMARKS } from '../data/sampleLandmarks';

export interface ProgressiveStreamOptions {
  imageBase64: string;
  coords?: LocationCoords | null;
  language: string;
  history?: string[];
  userPrompt?: string;
  topics?: SpeechTopicPreferences;
  persona?: string;
  voiceGender?: 'female' | 'male';
  sampleFallback?: Partial<RecognitionResult>;
  onBatch1: (data: Partial<RecognitionResult>) => void;
  onBatch2: (data: Partial<RecognitionResult>) => void;
  onBatch3: (data: Partial<RecognitionResult>) => void;
  onComplete?: (finalResult: RecognitionResult) => void;
  onError?: (error: any) => void;
}

/**
 * Progressive Batch-Streaming Engine for Landmark & Sight Vision Analysis
 * Slices API/Vision responses into 3 non-blocking async batches:
 * - Batch 1 (Immediate / < 100ms): Sets basic structural state (Canonical POI Title, preview image, category)
 * - Batch 2 (Fast Stream / < 600ms): Sets core text, narration, confidence score, and OCR detected text
 * - Batch 3 (Deferred Async): Sets heavy media (Leaflet map coordinates, supplementary perspectives, authentic photos)
 */
export function streamLandmarkRecognition({
  imageBase64,
  coords,
  language,
  history = [],
  userPrompt,
  topics,
  persona = 'warm_female',
  voiceGender = 'female',
  sampleFallback,
  onBatch1,
  onBatch2,
  onBatch3,
  onComplete,
  onError,
}: ProgressiveStreamOptions): () => void {
  const abortController = new AbortController();
  const scanId = `scan-${Date.now()}`;

  // -------------------------------------------------------------
  // BATCH 1 (Immediate / < 100ms): Instantly set basic structural state
  // -------------------------------------------------------------
  const initialLocName =
    sampleFallback?.locationName ||
    (coords?.city ? `${coords.city}, ${coords.country || 'India'}` : 'Local Heritage Sight');

  const preliminaryTitle =
    sampleFallback?.title ||
    (userPrompt ? `Exploring "${userPrompt}"` : 'Heritage Sight / Subject');

  const batch1Payload: RecognitionResult = {
    id: scanId,
    title: preliminaryTitle,
    category: (sampleFallback?.category as RecognitionResult['category']) || 'monument',
    confidence: 0.95,
    locationName: initialLocName,
    summary: 'Analyzing captured sight and historical context...',
    narration: '',
    keyFacts: [],
    tags: sampleFallback?.tags || ['heritage', 'sightseeing'],
    imageUrl: imageBase64,
    coords: coords || undefined,
    timestamp: new Date().toISOString(),
    language,
    batchStatus: {
      batch1Ready: true,
      batch2Ready: false,
      batch3Ready: false,
      stage: 'batch1_structural',
      timestamp: Date.now(),
    },
    isStreaming: true,
  };

  // Immediate dispatch for instantaneous 60fps UI feedback (<100ms)
  onBatch1(batch1Payload);

  let mergedResult: RecognitionResult = { ...batch1Payload };

  const processSseBlock = (block: string) => {
    const trimmed = block.trim();
    if (!trimmed) return;

    const dataLines = trimmed
      .split(/\r?\n/)
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.replace(/^data:\s*/, ''));
    if (dataLines.length === 0) return;

    const jsonStr = dataLines.join('\n').trim();
    if (!jsonStr) return;

    let eventData: any;
    try {
      eventData = JSON.parse(jsonStr);
    } catch (parseErr) {
      console.warn('Error parsing SSE event chunk:', parseErr);
      return;
    }

    const { type, data } = eventData;

    if (type === 'error') {
      throw new Error(data?.message || 'Streaming landmark recognition failed');
    } else if (type === 'batch1') {
      mergedResult = {
        ...mergedResult,
        ...data,
        imageUrl: imageBase64,
        batchStatus: {
          batch1Ready: true,
          batch2Ready: false,
          batch3Ready: false,
          stage: 'batch1_structural',
          timestamp: Date.now(),
        },
      };
      onBatch1(mergedResult);
    } else if (type === 'batch2') {
      mergedResult = {
        ...mergedResult,
        ...data,
        imageUrl: imageBase64,
        batchStatus: {
          batch1Ready: true,
          batch2Ready: true,
          batch3Ready: false,
          stage: 'batch2_core_text',
          timestamp: Date.now(),
        },
      };
      onBatch2(mergedResult);
    } else if (type === 'batch3') {
      mergedResult = {
        ...mergedResult,
        ...data,
        imageUrl: imageBase64,
        batchStatus: {
          batch1Ready: true,
          batch2Ready: true,
          batch3Ready: true,
          stage: 'complete',
          timestamp: Date.now(),
        },
        isStreaming: false,
      };
      onBatch3(mergedResult);
    } else if (type === 'done') {
      mergedResult.isStreaming = false;
      if (mergedResult.batchStatus?.batch2Ready) {
        onComplete?.(mergedResult);
      }
    }
  };

  // Stream reader execution
  (async () => {
    try {
      const response = await fetch('/api/recognize-landmark-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({
          imageBase64,
          coords,
          language,
          history,
          userPrompt,
          topics,
          persona,
          voiceGender,
        }),
        signal: abortController.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`Stream request failed with status ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          if (buffer.trim()) {
            processSseBlock(buffer);
          }
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split(/\r?\n\r?\n/);
        buffer = blocks.pop() || '';

        for (const block of blocks) {
          processSseBlock(block);
        }
      }

      // If stream ended before Batch 2 core text arrived, trigger fallback fetch
      if (!mergedResult.batchStatus?.batch2Ready) {
        throw new Error('Recognition stream ended before landmark details were delivered');
      }

      // Ensure final state is marked as complete
      if (mergedResult.batchStatus && !mergedResult.batchStatus.batch3Ready) {
        mergedResult = {
          ...mergedResult,
          isStreaming: false,
          batchStatus: {
            batch1Ready: true,
            batch2Ready: true,
            batch3Ready: true,
            stage: 'complete',
            timestamp: Date.now(),
          },
        };
        onBatch3(mergedResult);
      }
      onComplete?.(mergedResult);
    } catch (err: any) {
      if (abortController.signal.aborted) {
        return;
      }
      console.warn('SSE Streaming failed or emitted error, falling back to JSON recognition:', err);

      // Fallback: Perform standard endpoint fetch and slice into batches
      try {
        const fbRes = await fetch('/api/recognize-landmark', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64,
            coords,
            language,
            history,
            userPrompt,
            topics,
            persona,
            voiceGender,
          }),
          signal: abortController.signal,
        });

        const data = await fbRes.json().catch(() => ({}));
        if (!fbRes.ok || !data.success || !data.landmark) {
          throw new Error(data.error || data.details || `Recognition failed (${fbRes.status})`);
        }

        const fullLandmark: RecognitionResult = {
          ...data.landmark,
          id: data.landmark.id || scanId,
          imageUrl: imageBase64,
        };

        // Dispatch Batch 2
        const b2: RecognitionResult = {
          ...fullLandmark,
          batchStatus: {
            batch1Ready: true,
            batch2Ready: true,
            batch3Ready: false,
            stage: 'batch2_core_text',
            timestamp: Date.now(),
          },
        };
        onBatch2(b2);

        // Dispatch Batch 3
        const b3: RecognitionResult = {
          ...fullLandmark,
          batchStatus: {
            batch1Ready: true,
            batch2Ready: true,
            batch3Ready: true,
            stage: 'complete',
            timestamp: Date.now(),
          },
          isStreaming: false,
        };
        onBatch3(b3);
        onComplete?.(b3);
      } catch (fallbackErr: any) {
        if (abortController.signal.aborted) return;

        // If user tapped a curated 1-tap demo preset, seamlessly use that matching landmark on offline/error fallback
        const matchedSample =
          sampleFallback || SAMPLE_LANDMARKS.find((s) => s.imageUrl === imageBase64);

        if (matchedSample) {
          const fbLandmark: RecognitionResult = {
            ...SAMPLE_LANDMARKS[0],
            ...matchedSample,
            id: `fb-${Date.now()}`,
            imageUrl: imageBase64 || matchedSample.imageUrl,
            language,
            batchStatus: {
              batch1Ready: true,
              batch2Ready: true,
              batch3Ready: true,
              stage: 'complete',
              timestamp: Date.now(),
            },
            isStreaming: false,
          };

          onBatch2(fbLandmark);
          onBatch3(fbLandmark);
          onComplete?.(fbLandmark);
          return;
        }

        console.error('All recognition attempts failed:', fallbackErr);
        onError?.(fallbackErr);
      }
    }
  })();

  return () => {
    abortController.abort();
  };
}
