import { SUPPORTED_LANGUAGES } from '../data/languages';

export interface SpeechOptions {
  text: string;
  languageCode: string;
  language?: string;
  rate?: number;
  pitch?: number;
  gender?: 'female' | 'male';
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
}

const FEMALE_VOICE_HINTS = [
  'female', 'woman', 'zira', 'samantha', 'victoria', 'karen', 'moira', 'tessa',
  'veena', 'priya', 'sangeeta', 'neerja', 'swara', 'amelie', 'aurelie', 'celine',
  'marie', 'monica', 'paulina', 'sofia', 'luciana', 'kyoko', 'ayumi', 'haruka',
  'anna', 'marlene', 'vicki', 'alice', 'federica', 'ting-ting', 'ya-ling', 'mei-jia',
  'eva', 'lucy', 'ava', 'allison', 'serena', 'zoe', 'joana', 'helena',
  'susan', 'catherine', 'kate', 'hazel', 'fiona', 'ellen', 'nora', 'lekha', 'kalpana',
  'heera', 'aria', 'jenny', 'michelle', 'sonia', 'libby', 'en-us-x-sfg', 'en-gb-x-gba',
];

const MALE_VOICE_HINTS = [
  'male', 'man', 'david', 'george', 'rishi', 'daniel', 'alex', 'fred', 'mark', 'guy',
  'andrew', 'christopher', 'eric', 'roger', 'steffan', 'ryan', 'thomas', 'oliver',
  'arthur', 'madhur', 'prabhat', 'hemant', 'ravi', 'suresh', 'aaron', 'nathan',
  'james', 'john', 'paul', 'lee', 'neil', 'brian', 'russell', 'joey', 'matthew',
  'william', 'amit', 'arjun', 'kabir', 'reed', 'rocko', 'eddy', 'albert', 'junior',
  'en-gb-x-gbd', 'en-gb-x-rjs', 'en-us-x-iol', 'en-us-x-tpf', 'en-in-x-ahp', 'hi-in-x-hia',
];

function resolveLanguageName(languageCode: string, explicitLanguage?: string): string {
  if (explicitLanguage && explicitLanguage.trim().length > 0) {
    return explicitLanguage;
  }
  const normalized = (languageCode || 'en-US').toLowerCase().replace('_', '-');
  const exact = SUPPORTED_LANGUAGES.find(
    (l) => l.speechCode.toLowerCase() === normalized || l.code.toLowerCase() === normalized
  );
  if (exact) return exact.name;
  const primary = normalized.split('-')[0];
  const byPrimary = SUPPORTED_LANGUAGES.find(
    (l) => l.code.toLowerCase() === primary || l.speechCode.toLowerCase().startsWith(`${primary}-`)
  );
  return byPrimary?.name || 'English';
}

function cleanSpeechText(rawText: string): string {
  return (rawText || '')
    .replace(/[\*#_`~>]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitIntoSpeechChunks(text: string, maxChars: number = 320): string[] {
  const cleaned = cleanSpeechText(text);
  if (!cleaned) return [];
  if (cleaned.length <= maxChars) return [cleaned];

  const rawSentences = cleaned.split(/(?<=[.!?।。！？؛؟])\s+/);
  const chunks: string[] = [];
  let buffer = '';

  const pushHardSplit = (longStr: string) => {
    let remaining = longStr.trim();
    while (remaining.length > maxChars) {
      let splitIdx = remaining.lastIndexOf(',', maxChars);
      if (splitIdx < Math.floor(maxChars * 0.45)) {
        splitIdx = remaining.lastIndexOf(' ', maxChars);
      }
      if (splitIdx < Math.floor(maxChars * 0.35)) {
        splitIdx = maxChars;
      }
      chunks.push(remaining.slice(0, splitIdx + 1).trim());
      remaining = remaining.slice(splitIdx + 1).trim();
    }
    if (remaining.length > 0) {
      buffer = remaining;
    }
  };

  for (const sentence of rawSentences) {
    const s = sentence.trim();
    if (!s) continue;
    if (s.length > maxChars) {
      if (buffer) {
        chunks.push(buffer);
        buffer = '';
      }
      pushHardSplit(s);
    } else if (!buffer) {
      buffer = s;
    } else if (buffer.length + 1 + s.length <= maxChars) {
      buffer = `${buffer} ${s}`;
    } else {
      chunks.push(buffer);
      buffer = s;
    }
  }
  if (buffer) {
    chunks.push(buffer);
  }
  return chunks;
}

class SpeechManager {
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isSpeakingState = false;
  private isPausedState = false;
  private currentAudio: HTMLAudioElement | null = null;
  private currentObjectUrl: string | null = null;
  private activeJobId = 0;
  private activeAbortController: AbortController | null = null;
  private audioContext: AudioContext | null = null;
  private currentAudioSource: AudioBufferSourceNode | null = null;

  public getAvailableVoices(): SpeechSynthesisVoice[] {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
    return window.speechSynthesis.getVoices();
  }

  private async waitForVoices(timeoutMs: number = 350): Promise<SpeechSynthesisVoice[]> {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
    const existing = window.speechSynthesis.getVoices();
    if (existing.length > 0) return existing;

    return new Promise((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        window.speechSynthesis.removeEventListener?.('voiceschanged', finish);
        resolve(window.speechSynthesis.getVoices());
      };
      window.speechSynthesis.addEventListener?.('voiceschanged', finish);
      setTimeout(finish, timeoutMs);
    });
  }

  public getStrictBestVoice(
    voices: SpeechSynthesisVoice[],
    languageCode: string,
    gender: 'female' | 'male' = 'female'
  ): SpeechSynthesisVoice | null {
    if (voices.length === 0) return null;

    const targetLangCode = languageCode.toLowerCase().replace('_', '-');
    const primaryCode = targetLangCode.split('-')[0];

    const langMatchingVoices = voices.filter((v) => {
      const vLang = v.lang.toLowerCase().replace('_', '-');
      return vLang === targetLangCode || vLang === primaryCode || vLang.startsWith(`${primaryCode}-`);
    });

    if (langMatchingVoices.length === 0) {
      // Never speak non-English text with an unrelated English system voice
      if (primaryCode !== 'en') {
        return null;
      }
      if (gender === 'female') {
        const anyFemale = voices.find((v) => FEMALE_VOICE_HINTS.some((h) => v.name.toLowerCase().includes(h)));
        return anyFemale || voices[0] || null;
      }
      const anyMale = voices.find((v) => MALE_VOICE_HINTS.some((h) => v.name.toLowerCase().includes(h)));
      if (anyMale) return anyMale;
      const nonFemale = voices.find((v) => !FEMALE_VOICE_HINTS.some((h) => v.name.toLowerCase().includes(h)));
      return nonFemale || voices[0] || null;
    }

    if (gender === 'female') {
      const femaleMatch = langMatchingVoices.find(
        (v) =>
          FEMALE_VOICE_HINTS.some((h) => v.name.toLowerCase().includes(h)) ||
          v.name.toLowerCase().includes('google') ||
          v.name.toLowerCase().includes('natural')
      );
      if (femaleMatch) return femaleMatch;
    } else {
      const maleMatch = langMatchingVoices.find((v) =>
        MALE_VOICE_HINTS.some((h) => v.name.toLowerCase().includes(h))
      );
      if (maleMatch) return maleMatch;
      const nonFemaleMatch = langMatchingVoices.find(
        (v) => !FEMALE_VOICE_HINTS.some((h) => v.name.toLowerCase().includes(h))
      );
      if (nonFemaleMatch) return nonFemaleMatch;
    }

    return langMatchingVoices[0];
  }

  private cleanupAudioElement(): void {
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.onended = null;
        this.currentAudio.onerror = null;
        this.currentAudio.src = '';
      } catch {
        // ignore cleanup error
      }
      this.currentAudio = null;
    }
    if (this.currentObjectUrl) {
      try {
        URL.revokeObjectURL(this.currentObjectUrl);
      } catch {
        // ignore cleanup error
      }
      this.currentObjectUrl = null;
    }
  }

  private async fetchTtsChunkUrl(
    chunkText: string,
    options: SpeechOptions,
    languageName: string,
    signal: AbortSignal
  ): Promise<string> {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: chunkText,
        language: languageName,
        languageCode: options.languageCode,
        gender: options.gender || 'female',
      }),
      signal,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success || data.fallbackToBrowser || !data.audioBase64) {
      throw { fallbackToBrowser: true, message: data.error || 'Online TTS synthesis unavailable' };
    }

    const binaryString = atob(data.audioBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Ensure raw PCM returned without RIFF header gets a valid 24kHz mono 16-bit WAV header
    const hasRiffHeader =
      bytes.length >= 12 &&
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46;

    let finalBytes: Uint8Array = bytes;
    if (!hasRiffHeader) {
      const wavHeader = new ArrayBuffer(44);
      const view = new DataView(wavHeader);
      const dataLength = bytes.length;
      const writeAscii = (offset: number, str: string) => {
        for (let i = 0; i < str.length; i++) {
          view.setUint8(offset + i, str.charCodeAt(i));
        }
      };
      writeAscii(0, 'RIFF');
      view.setUint32(4, 36 + dataLength, true);
      writeAscii(8, 'WAVE');
      writeAscii(12, 'fmt ');
      view.setUint32(16, 16, true); // PCM chunk size
      view.setUint16(20, 1, true); // PCM format
      view.setUint16(22, 1, true); // Mono
      view.setUint32(24, 24000, true); // 24kHz
      view.setUint32(28, 24000 * 2, true); // Byte rate
      view.setUint16(32, 2, true); // Block align
      view.setUint16(34, 16, true); // Bits per sample
      writeAscii(36, 'data');
      view.setUint32(40, dataLength, true);

      const combined = new Uint8Array(44 + dataLength);
      combined.set(new Uint8Array(wavHeader), 0);
      combined.set(bytes, 44);
      finalBytes = combined;
    }

    const blob = new Blob([finalBytes], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
  }

  private playAudioUrl(url: string, rate: number, jobId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      if (jobId !== this.activeJobId) {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // ignore
        }
        resolve();
        return;
      }

      this.cleanupAudioElement();
      const audio = new Audio(url);
      this.currentAudio = audio;
      this.currentObjectUrl = url;
      audio.playbackRate = Math.min(2.0, Math.max(0.5, rate || 1.0));

      audio.onended = () => {
        resolve();
      };
      audio.onerror = () => {
        reject(new Error('Audio playback failed'));
      };

      const playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch((err) => reject(err));
      }
    });
  }

  private async speakWithBrowserFallback(
    chunks: string[],
    options: SpeechOptions,
    jobId: number
  ): Promise<void> {
    if (jobId !== this.activeJobId) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      this.isSpeakingState = false;
      options.onError?.(new Error('Voice synthesis is unavailable for this device right now.'));
      return;
    }

    const voices = await this.waitForVoices(350);
    if (jobId !== this.activeJobId) return;

    const targetGender = options.gender || 'female';
    const bestVoice = this.getStrictBestVoice(voices, options.languageCode, targetGender);
    if (!bestVoice) {
      this.isSpeakingState = false;
      options.onError?.(
        new Error('Voice synthesis is temporarily unavailable for this language on your browser.')
      );
      return;
    }

    let startedNotified = false;

    for (let i = 0; i < chunks.length; i++) {
      if (jobId !== this.activeJobId) return;

      await new Promise<void>((resolve, reject) => {
        const utterance = new SpeechSynthesisUtterance(chunks[i]);
        this.currentUtterance = utterance;
        utterance.lang = options.languageCode;
        utterance.rate = Math.min(2.0, Math.max(0.5, options.rate || 1.0));

        const voiceLower = bestVoice.name.toLowerCase();
        const selectedVoiceIsFemale = FEMALE_VOICE_HINTS.some((h) => voiceLower.includes(h));
        let resolvedPitch: number;
        if (targetGender === 'male') {
          if (selectedVoiceIsFemale) {
            resolvedPitch = 0.84;
          } else if (options.pitch !== undefined && options.pitch <= 1.0) {
            resolvedPitch = Math.max(0.75, options.pitch);
          } else {
            resolvedPitch = 0.91;
          }
        } else {
          resolvedPitch = options.pitch !== undefined ? options.pitch : 1.08;
        }
        utterance.pitch = resolvedPitch;
        utterance.voice = bestVoice;

        utterance.onstart = () => {
          if (jobId !== this.activeJobId) return;
          this.isSpeakingState = true;
          this.isPausedState = false;
          if (!startedNotified) {
            startedNotified = true;
            options.onStart?.();
          }
        };

        utterance.onend = () => {
          this.currentUtterance = null;
          resolve();
        };

        utterance.onerror = (e) => {
          this.currentUtterance = null;
          if (jobId !== this.activeJobId) {
            resolve();
          } else {
            reject(e);
          }
        };

        window.speechSynthesis.speak(utterance);
      }).catch((err) => {
        if (jobId === this.activeJobId) {
          this.isSpeakingState = false;
          options.onError?.(err);
          throw err;
        }
      });
    }

    if (jobId === this.activeJobId) {
      this.isSpeakingState = false;
      this.isPausedState = false;
      options.onEnd?.();
    }
  }

  public speak(options: SpeechOptions): void {
    this.stop();
    const jobId = this.activeJobId;
    const chunks = splitIntoSpeechChunks(options.text, 320);

    if (chunks.length === 0) {
      options.onEnd?.();
      return;
    }

    const languageName = resolveLanguageName(options.languageCode, options.language);
    const controller = new AbortController();
    this.activeAbortController = controller;

    this.isSpeakingState = true;
    this.isPausedState = false;

    (async () => {
      try {
        let nextUrlPromise: Promise<string> | null = this.fetchTtsChunkUrl(
          chunks[0],
          options,
          languageName,
          controller.signal
        );

        for (let i = 0; i < chunks.length; i++) {
          if (jobId !== this.activeJobId) break;
          const currentUrl = await nextUrlPromise!;
          if (jobId !== this.activeJobId) {
            try {
              URL.revokeObjectURL(currentUrl);
            } catch {
              // ignore
            }
            break;
          }

          // Pre-fetch next chunk concurrently while current audio plays
          if (i + 1 < chunks.length) {
            nextUrlPromise = this.fetchTtsChunkUrl(
              chunks[i + 1],
              options,
              languageName,
              controller.signal
            );
          } else {
            nextUrlPromise = null;
          }

          if (i === 0) {
            options.onStart?.();
          }

          await this.playAudioUrl(currentUrl, options.rate || 1.0, jobId);
        }

        if (jobId === this.activeJobId) {
          this.cleanupAudioElement();
          this.isSpeakingState = false;
          this.isPausedState = false;
          options.onEnd?.();
        }
      } catch (err: any) {
        if (jobId !== this.activeJobId || controller.signal.aborted) {
          return;
        }
        this.cleanupAudioElement();
        console.warn('Gemini neural TTS fallback to strict browser synthesis:', err?.message || err);
        try {
          await this.speakWithBrowserFallback(chunks, options, jobId);
        } catch {
          // Error already propagated inside speakWithBrowserFallback
        }
      }
    })();
  }

  public stop(): void {
    this.activeJobId += 1;
    if (this.activeAbortController) {
      try {
        this.activeAbortController.abort();
      } catch {
        // ignore
      }
      this.activeAbortController = null;
    }
    this.cleanupAudioElement();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (this.currentAudioSource) {
      try {
        this.currentAudioSource.stop();
      } catch {
        // ignore
      }
      this.currentAudioSource = null;
    }
    this.isSpeakingState = false;
    this.isPausedState = false;
    this.currentUtterance = null;
  }

  public pause(): void {
    if (this.currentAudio && !this.currentAudio.paused) {
      this.currentAudio.pause();
      this.isPausedState = true;
    } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.pause();
      this.isPausedState = true;
    }
  }

  public resume(): void {
    if (this.currentAudio && this.currentAudio.paused) {
      this.currentAudio.play().catch(() => {});
      this.isPausedState = false;
    } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.resume();
      this.isPausedState = false;
    }
  }

  public isSpeaking(): boolean {
    if (this.currentAudio) {
      return !this.currentAudio.paused && this.isSpeakingState;
    }
    return (
      this.isSpeakingState &&
      !this.isPausedState &&
      typeof window !== 'undefined' &&
      Boolean(window.speechSynthesis?.speaking)
    );
  }

  public playRawAudio(base64Data: string, onEnd?: () => void): void {
    this.stop();
    try {
      const binaryString = atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
          sampleRate: 24000,
        });
      }

      this.audioContext.decodeAudioData(bytes.buffer, (buffer) => {
        const source = this.audioContext!.createBufferSource();
        source.buffer = buffer;
        source.connect(this.audioContext!.destination);
        source.onended = () => {
          this.isSpeakingState = false;
          onEnd?.();
        };
        this.currentAudioSource = source;
        this.isSpeakingState = true;
        source.start(0);
      });
    } catch (e) {
      console.error('Failed to play raw PCM audio:', e);
    }
  }
}

export const speechManager = new SpeechManager();
