import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, RecognitionResult, Language } from '../types';
import { speechManager } from '../utils/speech';
import {
  Send,
  Mic,
  MicOff,
  Volume2,
  Sparkles,
  Bot,
  User,
  ArrowLeft
} from 'lucide-react';

interface AIChatScreenProps {
  initialQuestion?: string;
  landmarkContext?: RecognitionResult | null;
  selectedLanguage: Language;
  visitedHistory: RecognitionResult[];
  onBackToHome: () => void;
  guideSettings?: import('../types').GuideSettings;
}

export const AIChatScreen: React.FC<AIChatScreenProps> = ({
  initialQuestion,
  landmarkContext,
  selectedLanguage,
  visitedHistory,
  onBackToHome,
  guideSettings,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      sender: 'guide',
      text: landmarkContext
        ? `Namaste! I am Charaiva, your AI guide. What would you like to know about ${landmarkContext.title}? Ask in ${selectedLanguage.nativeName} (${selectedLanguage.name})!`
        : `Namaste! I am Charaiva, your AI tourist guide. Ask me anything about monuments, history, architecture, legends, or local foods in ${selectedLanguage.nativeName}!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  useEffect(() => {
    setMessages((prev) => {
      if (prev.length <= 1) {
        return [
          {
            id: 'welcome-msg',
            sender: 'guide',
            text: landmarkContext
              ? `Namaste! I am Charaiva, your AI guide. What would you like to know about ${landmarkContext.title}? Ask in ${selectedLanguage.nativeName} (${selectedLanguage.name})!`
              : `Namaste! I am Charaiva, your AI tourist guide. Ask me anything about monuments, history, architecture, legends, or local foods in ${selectedLanguage.nativeName}!`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ];
      }
      return prev;
    });
  }, [selectedLanguage, landmarkContext]);

  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (initialQuestion) {
      handleSendMessage(initialQuestion);
    }
  }, [initialQuestion]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleToggleVoiceInput = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceNotice('Voice dictation is not supported in this browser. Please type your question below.');
      setTimeout(() => setVoiceNotice(null), 4000);
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = selectedLanguage.speechCode;
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputMessage(transcript);
          handleSendMessage(transcript);
        }
      };

      recognition.start();
    } catch (e) {
      console.error('Speech recognition error:', e);
      setIsListening(false);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsTyping(true);

    try {
      const historyTitles = visitedHistory.map((h) => h.title);

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          landmarkContext: landmarkContext ? { title: landmarkContext.title, summary: landmarkContext.summary } : undefined,
          language: selectedLanguage.name,
          history: historyTitles,
          topics: guideSettings?.topics,
          persona: guideSettings?.persona || 'warm_female',
          voiceGender: guideSettings?.voiceGender || 'female',
        }),
      });

      const data = await response.json();
      const replyText = data.reply || 'I am delighted to guide you further!';

      const guideMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'guide',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, guideMsg]);

      // Speak response if speech mode active
      if (guideSettings?.outputMode !== 'text') {
        speechManager.speak({
          text: replyText,
          languageCode: selectedLanguage.speechCode,
          gender: guideSettings?.voiceGender || 'female',
          pitch: guideSettings?.voicePitch || 1.08,
          rate: guideSettings?.speechRate || 1.0,
        });
      }
    } catch (err) {
      console.error('Chat error:', err);
      const fallbackMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'guide',
        text: `Based on heritage archives, this site has rich cultural prominence. Feel free to ask more details!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div id="ai-chat-screen" className="h-full flex flex-col overflow-hidden py-1 space-y-2 select-none">
      {/* Header */}
      <div
        style={{
          backgroundColor: 'var(--theme-card-bg)',
          borderColor: 'var(--theme-card-border)',
        }}
        className="shrink-0 flex items-center justify-between p-2.5 border rounded-2xl backdrop-blur-xl shadow-lg"
      >
        <div className="flex items-center gap-2">
          <button
            onClick={onBackToHome}
            style={{
              backgroundColor: 'var(--theme-card-bg-subtle)',
              borderColor: 'var(--theme-card-border)',
              color: 'var(--theme-accent-primary)',
            }}
            className="p-1.5 rounded-xl cursor-pointer border shadow-sm transition-all active:scale-95 hover:border-[var(--theme-card-border-glow)]"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h3 className="text-xs sm:text-sm font-serif font-bold text-[var(--theme-text-title)] flex items-center gap-1.5">
              <Bot className="w-4 h-4 text-[var(--theme-accent-primary)]" />
              <span>AI Tourist Guide ({selectedLanguage.nativeName})</span>
            </h3>
            {landmarkContext && (
              <p className="text-[10px] text-[var(--theme-accent-secondary)] truncate max-w-[200px] sm:max-w-md font-medium">
                Active Topic: <strong>{landmarkContext.title}</strong>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Messages Scroll Area (contained within viewport) */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-2.5 pr-1 p-1">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div
                style={
                  isUser
                    ? {
                        background: 'var(--theme-accent-primary-gradient)',
                        color: 'var(--theme-accent-primary-text)',
                      }
                    : {
                        backgroundColor: 'var(--theme-card-bg)',
                        borderColor: 'var(--theme-card-border)',
                        color: 'var(--theme-accent-primary)',
                      }
                }
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 shadow-md ${!isUser ? 'border' : ''}`}
              >
                {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
              </div>

              <div
                style={
                  isUser
                    ? {
                        background: 'var(--theme-accent-primary-gradient)',
                        color: 'var(--theme-accent-primary-text)',
                      }
                    : {
                        backgroundColor: 'var(--theme-card-bg)',
                        borderColor: 'var(--theme-card-border)',
                        color: 'var(--theme-text-title)',
                      }
                }
                className={`max-w-[82%] p-3 rounded-2xl text-xs leading-relaxed ${
                  isUser
                    ? 'font-medium rounded-tr-sm shadow-md'
                    : 'border rounded-tl-sm shadow-sm backdrop-blur-md'
                }`}
              >
                <p className="whitespace-pre-line font-sans">{msg.text}</p>
                <span
                  style={{
                    color: isUser ? 'var(--theme-accent-primary-text)' : 'var(--theme-text-muted)',
                    opacity: isUser ? 0.8 : 1,
                  }}
                  className="text-[9px] block mt-1"
                >
                  {msg.timestamp}
                </span>
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex items-center gap-2">
            <div
              style={{
                backgroundColor: 'var(--theme-card-bg)',
                borderColor: 'var(--theme-card-border)',
                color: 'var(--theme-accent-primary)',
              }}
              className="w-7 h-7 rounded-full border flex items-center justify-center shrink-0"
            >
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div
              style={{
                backgroundColor: 'var(--theme-card-bg)',
                borderColor: 'var(--theme-card-border)',
                color: 'var(--theme-accent-secondary)',
              }}
              className="p-2.5 rounded-2xl border text-xs flex items-center gap-1.5 backdrop-blur-md shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5 animate-spin text-[var(--theme-accent-primary)]" />
              <span>Charaiva is composing explanation...</span>
            </div>
          </div>
        )}

        <div ref={chatBottomRef} />
      </div>

      {/* Inline Voice Support Notice (Replaces browser alert) */}
      {voiceNotice && (
        <div className="shrink-0 px-3 py-1.5 rounded-xl bg-amber-950/90 border border-amber-500/60 text-amber-200 text-[11px] font-medium flex items-center justify-between gap-2">
          <span>{voiceNotice}</span>
          <button
            type="button"
            onClick={() => setVoiceNotice(null)}
            className="text-amber-400 hover:text-amber-200 font-bold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Input Bar */}
      <div
        style={{
          backgroundColor: 'var(--theme-card-bg)',
          borderColor: 'var(--theme-card-border)',
        }}
        className="shrink-0 flex items-center gap-1.5 p-1.5 rounded-2xl border backdrop-blur-xl shadow-lg"
      >
        <button
          onClick={handleToggleVoiceInput}
          style={
            !isListening
              ? {
                  backgroundColor: 'var(--theme-card-bg-subtle)',
                  borderColor: 'var(--theme-card-border)',
                  color: 'var(--theme-accent-primary)',
                }
              : undefined
          }
          className={`p-2 rounded-xl transition-all cursor-pointer border ${
            isListening
              ? 'bg-rose-500 text-white animate-pulse border-rose-400'
              : 'hover:border-[var(--theme-card-border-glow)]'
          }`}
          title="Speak in your language"
        >
          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder={`Ask AI guide in ${selectedLanguage.nativeName}...`}
          style={{
            backgroundColor: 'var(--theme-input-bg)',
            borderColor: 'var(--theme-input-border)',
            color: 'var(--theme-text-title)',
          }}
          className="flex-1 px-3 py-2 rounded-xl border placeholder:text-[var(--theme-text-muted)] text-xs focus:outline-none focus:border-[var(--theme-card-border-glow)] transition-colors"
        />

        <button
          onClick={() => handleSendMessage()}
          disabled={!inputMessage.trim()}
          className="p-2 rounded-xl theme-btn-primary font-bold disabled:opacity-50 transition-all cursor-pointer shadow-sm"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
