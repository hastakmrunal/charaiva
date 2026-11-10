import { Language } from '../types';

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', speechCode: 'en-US', flag: '🇺🇸' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी', speechCode: 'hi-IN', flag: '🇮🇳' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', speechCode: 'es-ES', flag: '🇪🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', speechCode: 'fr-FR', flag: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', speechCode: 'de-DE', flag: '🇩🇪' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', speechCode: 'ja-JP', flag: '🇯🇵' },
  { code: 'zh', name: 'Mandarin', nativeName: '中文', speechCode: 'zh-CN', flag: '🇨🇳' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', speechCode: 'ta-IN', flag: '🇮🇳' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', speechCode: 'bn-IN', flag: '🇮🇳' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', speechCode: 'mr-IN', flag: '🇮🇳' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', speechCode: 'te-IN', flag: '🇮🇳' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', speechCode: 'gu-IN', flag: '🇮🇳' },
  { code: 'kn', name: 'Kannada', nativeName: 'કન્નડ', speechCode: 'kn-IN', flag: '🇮🇳' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', speechCode: 'ar-SA', flag: '🇸🇦', direction: 'rtl' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', speechCode: 'it-IT', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', speechCode: 'pt-BR', flag: '🇧🇷' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', speechCode: 'ru-RU', flag: '🇷🇺' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', speechCode: 'ko-KR', flag: '🇰🇷' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', speechCode: 'tr-TR', flag: '🇹🇷' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', speechCode: 'vi-VN', flag: '🇻🇳' }
];

export function getLanguageByCode(code: string): Language {
  return SUPPORTED_LANGUAGES.find(l => l.code === code) || SUPPORTED_LANGUAGES[0];
}
