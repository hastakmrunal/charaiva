/**
 * Speech Synthesis Helper for Charaiva Multilingual Narration
 * Prioritizes natural female tour guide voices and tone
 */

interface SpeechOptions {
  text: string;
  languageCode: string;
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
  'eva', 'lucy', 'ava', 'allison', 'serena', 'zoe', 'joana', 'helena'
];

class SpeechManager {
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isSpeakingState = false;
  private audioContext: AudioContext | null = null;
  private currentAudioSource: AudioBufferSourceNode | null = null;

  public getAvailableVoices(): SpeechSynthesisVoice[] {
    if (!('speechSynthesis' in window)) return [];
    return window.speechSynthesis.getVoices();
  }

  public getBestVoice(languageCode: string, gender: 'female' | 'male' = 'female'): SpeechSynthesisVoice | null {
    if (!('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) return null;

    const targetLangCode = languageCode.toLowerCase().replace('_', '-');
    const primaryCode = targetLangCode.split('-')[0];

    // Filter by matching language
    const langMatchingVoices = voices.filter(v => {
      const vLang = v.lang.toLowerCase().replace('_', '-');
      return vLang === targetLangCode || vLang.startsWith(primaryCode);
    });

    if (langMatchingVoices.length === 0) {
      // Fallback to any voice matching gender
      if (gender === 'female') {
        const anyFemale = voices.find(v => FEMALE_VOICE_HINTS.some(h => v.name.toLowerCase().includes(h)));
        return anyFemale || voices[0] || null;
      }
      return voices[0] || null;
    }

    if (gender === 'female') {
      // Find female matching voice in target language
      const femaleMatch = langMatchingVoices.find(v =>
        FEMALE_VOICE_HINTS.some(h => v.name.toLowerCase().includes(h)) ||
        v.name.toLowerCase().includes('google') ||
        v.name.toLowerCase().includes('natural')
      );
      if (femaleMatch) return femaleMatch;
    } else {
      // Find male matching voice
      const maleMatch = langMatchingVoices.find(v =>
        v.name.toLowerCase().includes('male') ||
        v.name.toLowerCase().includes('david') ||
        v.name.toLowerCase().includes('george')
      );
      if (maleMatch) return maleMatch;
    }

    // Default to first language match
    return langMatchingVoices[0];
  }

  public speak(options: SpeechOptions): void {
    this.stop(); // Always stop previous speech immediately

    if (!('speechSynthesis' in window)) {
      console.warn('Browser Speech Synthesis is not supported in this environment.');
      if (options.onError) options.onError('Speech synthesis not supported');
      return;
    }

    const utterance = new SpeechSynthesisUtterance(options.text);
    this.currentUtterance = utterance;

    // Target language code
    utterance.lang = options.languageCode;

    // Rate & Pitch Tuning for Female Guide Tone
    utterance.rate = options.rate || 1.0;
    
    // For warm female guide persona, slight lift to 1.08 - 1.12 delivers natural clarity
    const targetGender = options.gender || 'female';
    if (options.pitch !== undefined) {
      utterance.pitch = options.pitch;
    } else {
      utterance.pitch = targetGender === 'female' ? 1.08 : 0.95;
    }

    // Select suitable voice
    const bestVoice = this.getBestVoice(options.languageCode, targetGender);
    if (bestVoice) {
      utterance.voice = bestVoice;
    }

    utterance.onstart = () => {
      this.isSpeakingState = true;
      if (options.onStart) options.onStart();
    };

    utterance.onend = () => {
      this.isSpeakingState = false;
      this.currentUtterance = null;
      if (options.onEnd) options.onEnd();
    };

    utterance.onerror = (e) => {
      this.isSpeakingState = false;
      this.currentUtterance = null;
      if (options.onError) options.onError(e);
    };

    window.speechSynthesis.speak(utterance);
  }

  public stop(): void {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (this.currentAudioSource) {
      try {
        this.currentAudioSource.stop();
      } catch (e) {}
      this.currentAudioSource = null;
    }
    this.isSpeakingState = false;
    this.currentUtterance = null;
  }

  public pause(): void {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.pause();
    }
  }

  public resume(): void {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.resume();
    }
  }

  public isSpeaking(): boolean {
    return this.isSpeakingState || (window.speechSynthesis && window.speechSynthesis.speaking);
  }

  // Play base64 audio PCM/WAV buffer returned by Gemini TTS
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
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }

      this.audioContext.decodeAudioData(bytes.buffer, (buffer) => {
        const source = this.audioContext!.createBufferSource();
        source.buffer = buffer;
        source.connect(this.audioContext!.destination);
        source.onended = () => {
          this.isSpeakingState = false;
          if (onEnd) onEnd();
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
