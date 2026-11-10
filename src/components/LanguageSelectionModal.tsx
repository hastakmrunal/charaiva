import React, { useState } from 'react';
import { Language } from '../types';
import { SUPPORTED_LANGUAGES } from '../data/languages';
import { speechManager } from '../utils/speech';
import { Globe, Volume2, Check, X, Search, Sparkles } from 'lucide-react';

interface LanguageSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLanguage: Language;
  onSelectLanguage: (lang: Language) => void;
}

export const LanguageSelectionModal: React.FC<LanguageSelectionModalProps> = ({
  isOpen,
  onClose,
  selectedLanguage,
  onSelectLanguage,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const filteredLanguages = SUPPORTED_LANGUAGES.filter(
    (l) =>
      l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.nativeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePreviewVoice = (lang: Language, e: React.MouseEvent) => {
    e.stopPropagation();
    speechManager.speak({
      text: `Welcome to Charaiva AI tourist guide in ${lang.name}`,
      languageCode: lang.speechCode,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-amber-950 border border-amber-800/80 rounded-3xl max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-5 border-b border-amber-800/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-amber-950 font-bold">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-serif font-bold text-amber-100">
                Select Guide Language
              </h3>
              <p className="text-xs text-amber-300/70">
                20+ Multilingual Audio Tour Voices
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-amber-900/60 hover:bg-amber-800 text-amber-300 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-amber-800/40">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-amber-400/70" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search language (e.g. Hindi, French, Spanish)..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-amber-900/60 border border-amber-700/60 text-amber-100 placeholder-amber-400/50 text-xs focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>

        {/* Language List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin">
          {filteredLanguages.map((lang) => {
            const isSelected = selectedLanguage.code === lang.code;
            return (
              <div
                key={lang.code}
                onClick={() => {
                  onSelectLanguage(lang);
                  onClose();
                }}
                className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-amber-500 text-amber-950 font-bold border-amber-300 shadow-md'
                    : 'bg-amber-900/40 hover:bg-amber-900/80 text-amber-200 border-amber-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{lang.flag}</span>
                  <div>
                    <div className="text-sm font-bold flex items-center gap-2">
                      <span>{lang.nativeName}</span>
                      {isSelected && <Check className="w-4 h-4 text-amber-950" />}
                    </div>
                    <div className="text-[11px] opacity-75">{lang.name} ({lang.speechCode})</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => handlePreviewVoice(lang, e)}
                  className={`p-2 rounded-xl transition-all ${
                    isSelected ? 'bg-amber-950 text-amber-300' : 'bg-amber-800/80 hover:bg-amber-700 text-amber-200'
                  }`}
                  title="Test voice sample"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
