import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, RecognitionResult, Language } from '../types';
import { speechManager } from '../utils/speech';
import { WordByWordText } from './WordByWordText';
import {
  Send,
  Mic,
  MicOff,
  Sparkles,
  Bot,
  User,
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  X,
  Check
} from 'lucide-react';
import { getTodayDateStr } from '../utils/journalPersistence';

export interface AiGuideJournalSavePayload {
  placeName: string;
  city?: string;
  country?: string;
  visitDate: string;
  notes: string;
  guideSummary: string;
  landmark?: RecognitionResult | null;
}

interface AIChatScreenProps {
  initialQuestion?: string;
  onInitialQuestionConsumed?: () => void;
  landmarkContext?: RecognitionResult | null;
  selectedLanguage: Language;
  visitedHistory: RecognitionResult[];
  onBackToHome: () => void;
  guideSettings?: import('../types').GuideSettings;
  onSaveToJournal?: (payload: AiGuideJournalSavePayload) => Promise<void>;
  defaultCity?: string;
  defaultCountry?: string;
  isLandmarkSaved?: boolean;
  persistedMessages?: ChatMessage[];
  onMessagesChange?: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}

export const AIChatScreen: React.FC<AIChatScreenProps> = ({
  initialQuestion,
  onInitialQuestionConsumed,
  landmarkContext,
  selectedLanguage,
  visitedHistory,
  onBackToHome,
  guideSettings,
  onSaveToJournal,
  defaultCity,
  defaultCountry,
  isLandmarkSaved = false,
  persistedMessages,
  onMessagesChange,
}) => {
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome-msg',
      sender: 'guide',
      text: landmarkContext
        ? `Namaste! I am Charaiva, your AI guide. What would you like to know about ${landmarkContext.title}? Ask in ${selectedLanguage.nativeName} (${selectedLanguage.name})!`
        : `Namaste! I am Charaiva, your AI tourist guide. Ask me anything about monuments, history, architecture, legends, or local foods in ${selectedLanguage.nativeName}!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const messages = persistedMessages && persistedMessages.length > 0 ? persistedMessages : localMessages;
  const setMessages = onMessagesChange || setLocalMessages;

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
  }, [selectedLanguage, landmarkContext, setMessages]);

  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [streamingMsgId, setStreamingMsgId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);

  // Inline Save to Journal modal/card state
  const [isSaveCardOpen, setIsSaveCardOpen] = useState(false);
  const [savePlaceName, setSavePlaceName] = useState(landmarkContext?.title || '');
  const [saveCity, setSaveCity] = useState(landmarkContext?.city || defaultCity || '');
  const [saveCountry, setSaveCountry] = useState(landmarkContext?.country || defaultCountry || 'India');
  const [saveVisitDate, setSaveVisitDate] = useState(getTodayDateStr());
  const [saveNotes, setSaveNotes] = useState('');
  const [saveSummary, setSaveSummary] = useState(landmarkContext?.summary || '');
  const [isSavingJournal, setIsSavingJournal] = useState(false);
  const [journalSaveError, setJournalSaveError] = useState<string | null>(null);
  const [journalSavedSuccess, setJournalSavedSuccess] = useState(false);

  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const recognitionRef = useRef<any>(null);
  const isMountedRef = useRef(true);

  const cleanupActiveSessions = () => {
    if (abortControllerRef.current) {
      try {
        abortControllerRef.current.abort();
      } catch {
        // ignore abort errors
      }
      abortControllerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore recognition stop errors
      }
      recognitionRef.current = null;
    }
    speechManager.stop();
  };

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      cleanupActiveSessions();
    };
  }, []);

  const handleBackClick = () => {
    cleanupActiveSessions();
    setIsSaveCardOpen(false);
    setIsListening(false);
    setIsTyping(false);
    setStreamingMsgId(null);
    setVoiceNotice(null);
    onBackToHome();
  };

  const handleOpenSaveJournalCard = () => {
    const latestGuideReply = [...messages]
      .reverse()
      .find((m) => m.sender === 'guide' && m.id !== 'welcome-msg')?.text;
    setSavePlaceName((prev) => prev || landmarkContext?.title || '');
    setSaveCity((prev) => prev || landmarkContext?.city || defaultCity || '');
    setSaveCountry((prev) => prev || landmarkContext?.country || defaultCountry || 'India');
    setSaveVisitDate((prev) => prev || getTodayDateStr());
    setSaveSummary((prev) => prev || landmarkContext?.summary || (latestGuideReply ? latestGuideReply.slice(0, 600) : ''));
    setJournalSaveError(null);
    setIsSaveCardOpen(true);
  };

  const handleConfirmSaveToJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSaveToJournal || isSavingJournal) return;
    const cleanPlace = savePlaceName.trim();
    if (!cleanPlace) {
      setJournalSaveError('Please enter the destination or place name you visited.');
      return;
    }

    setIsSavingJournal(true);
    setJournalSaveError(null);
    try {
      await onSaveToJournal({
        placeName: cleanPlace,
        city: saveCity.trim(),
        country: saveCountry.trim(),
        visitDate: saveVisitDate || getTodayDateStr(),
        notes: saveNotes.trim(),
        guideSummary: saveSummary.trim(),
        landmark: landmarkContext,
      });
      if (!isMountedRef.current) return;
      setJournalSavedSuccess(true);
      setIsSaveCardOpen(false);
      setSaveNotes('');
    } catch (err: any) {
      if (!isMountedRef.current) return;
      setJournalSaveError(err?.message || 'Unable to save journal entry. Please try again.');
    } finally {
      if (isMountedRef.current) {
        setIsSavingJournal(false);
      }
    }
  };

  useEffect(() => {
    if (initialQuestion) {
      handleSendMessage(initialQuestion);
      onInitialQuestionConsumed?.();
    }
  }, [initialQuestion]);

  // Scroll ONLY the internal chat messages container — never scroll ancestor header/nav containers
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    container.scrollTo({
      top: container.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, isTyping]);

  const handleToggleVoiceInput = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceNotice('Voice dictation is not supported in this browser. Please type your question below.');
      setTimeout(() => {
        if (isMountedRef.current) setVoiceNotice(null);
      }, 4000);
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
        recognitionRef.current = null;
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = selectedLanguage.speechCode;
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        if (isMountedRef.current) setIsListening(true);
      };
      recognition.onend = () => {
        recognitionRef.current = null;
        if (isMountedRef.current) setIsListening(false);
      };
      recognition.onerror = () => {
        recognitionRef.current = null;
        if (isMountedRef.current) setIsListening(false);
      };

      recognition.onresult = (event: any) => {
        if (!isMountedRef.current) return;
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputMessage(transcript);
          handleSendMessage(transcript);
        }
      };

      recognition.start();
    } catch (e) {
      console.error('Speech recognition error:', e);
      recognitionRef.current = null;
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

    const guideMsgId = `msg-guide-${Date.now() + 1}`;
    const guideTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsTyping(true);
    setStreamingMsgId(guideMsgId);

    const requestPayload = {
      message: text,
      landmarkContext: landmarkContext ? { title: landmarkContext.title, summary: landmarkContext.summary } : undefined,
      language: selectedLanguage.name,
      history: visitedHistory.map((h) => h.title),
      topics: guideSettings?.topics,
      persona: guideSettings?.persona || 'warm_female',
      voiceGender: guideSettings?.voiceGender || 'female',
    };

    if (abortControllerRef.current) {
      try {
        abortControllerRef.current.abort();
      } catch {
        // ignore
      }
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    let accumulatedReply = '';

    try {
      const streamRes = await fetch('/api/chat-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify(requestPayload),
        signal: controller.signal,
      });

      if (!streamRes.ok || !streamRes.body) {
        throw new Error(`Stream unavailable (${streamRes.status})`);
      }

      if (!isMountedRef.current) return;

      // Insert live streaming message bubble cleanly
      setMessages((prev) => [
        ...prev,
        { id: guideMsgId, sender: 'guide', text: '', timestamp: guideTimestamp },
      ]);

      const reader = streamRes.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      const handleEventBlock = (block: string) => {
        if (!isMountedRef.current) return;
        const lines = block
          .split(/\r?\n/)
          .filter((l) => l.startsWith('data:'))
          .map((l) => l.replace(/^data:\s*/, ''));
        if (lines.length === 0) return;

        try {
          const parsed = JSON.parse(lines.join('\n'));
          if (parsed.type === 'delta' && parsed.data?.text) {
            accumulatedReply += parsed.data.text;
            const snapshot = accumulatedReply;
            setIsTyping(false);
            setMessages((prev) =>
              prev.map((m) => (m.id === guideMsgId ? { ...m, text: snapshot } : m))
            );
          } else if (parsed.type === 'done' && parsed.data?.reply) {
            accumulatedReply = parsed.data.reply;
            const finalText = accumulatedReply;
            setMessages((prev) =>
              prev.map((m) => (m.id === guideMsgId ? { ...m, text: finalText } : m))
            );
          }
        } catch {
          // ignore malformed SSE fragment
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (!isMountedRef.current || controller.signal.aborted) return;
        if (done) {
          if (buffer.trim()) handleEventBlock(buffer);
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split(/\r?\n\r?\n/);
        buffer = blocks.pop() || '';
        for (const blk of blocks) {
          handleEventBlock(blk);
        }
      }

      if (!isMountedRef.current || controller.signal.aborted) return;

      const finalReply = accumulatedReply.trim() || 'I am delighted to guide you further!';
      setMessages((prev) =>
        prev.map((m) => (m.id === guideMsgId ? { ...m, text: finalReply } : m))
      );

      if (guideSettings?.outputMode !== 'text' && isMountedRef.current && !controller.signal.aborted) {
        speechManager.speak({
          text: finalReply,
          language: selectedLanguage.name,
          languageCode: selectedLanguage.speechCode,
          gender: guideSettings?.voiceGender || 'female',
          pitch: guideSettings?.voicePitch,
          rate: guideSettings?.speechRate || 1.0,
        });
      }
    } catch (streamErr: any) {
      if (streamErr?.name === 'AbortError' || controller.signal.aborted || !isMountedRef.current) {
        return;
      }
      console.warn('Chat SSE fallback to standard endpoint:', streamErr);
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestPayload),
          signal: controller.signal,
        });
        if (!isMountedRef.current || controller.signal.aborted) return;
        const data = await response.json();
        const replyText = data.reply || 'I am delighted to guide you further!';

        setMessages((prev) => {
          const hasMsg = prev.some((m) => m.id === guideMsgId);
          if (hasMsg) {
            return prev.map((m) => (m.id === guideMsgId ? { ...m, text: replyText } : m));
          }
          return [
            ...prev,
            { id: guideMsgId, sender: 'guide', text: replyText, timestamp: guideTimestamp },
          ];
        });

        if (guideSettings?.outputMode !== 'text' && isMountedRef.current && !controller.signal.aborted) {
          speechManager.speak({
            text: replyText,
            language: selectedLanguage.name,
            languageCode: selectedLanguage.speechCode,
            gender: guideSettings?.voiceGender || 'female',
            pitch: guideSettings?.voicePitch,
            rate: guideSettings?.speechRate || 1.0,
          });
        }
      } catch (err: any) {
        if (err?.name === 'AbortError' || controller.signal.aborted || !isMountedRef.current) {
          return;
        }
        console.error('Chat error:', err);
        const fallbackText =
          'Based on heritage archives, this site has rich cultural prominence. Feel free to ask more details!';
        setMessages((prev) => {
          const hasMsg = prev.some((m) => m.id === guideMsgId);
          if (hasMsg) {
            return prev.map((m) => (m.id === guideMsgId ? { ...m, text: fallbackText } : m));
          }
          return [
            ...prev,
            { id: guideMsgId, sender: 'guide', text: fallbackText, timestamp: guideTimestamp },
          ];
        });
      }
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      if (isMountedRef.current) {
        setIsTyping(false);
        setStreamingMsgId(null);
      }
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
        className="shrink-0 flex items-center justify-between gap-2 p-2.5 border rounded-2xl backdrop-blur-xl shadow-lg"
      >
        <div className="flex items-center gap-2 min-w-0">
          <button
            id="btn-chat-back-home"
            type="button"
            onClick={handleBackClick}
            aria-label="Back to Explore Home"
            title="Back to Explore Home"
            style={{
              backgroundColor: 'var(--theme-card-bg-subtle)',
              borderColor: 'var(--theme-card-border)',
              color: 'var(--theme-accent-primary)',
            }}
            className="min-h-[44px] min-w-[44px] px-3.5 py-2 rounded-xl cursor-pointer border shadow-sm transition-all active:scale-95 hover:border-[var(--theme-card-border-glow)] flex items-center gap-1.5 font-bold text-xs shrink-0"
          >
            <ArrowLeft className="w-4 h-4 shrink-0 text-[var(--theme-accent-primary)]" />
            <span className="font-semibold">Back</span>
          </button>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-serif font-bold text-[var(--theme-text-title)] flex items-center gap-1.5 truncate">
              <Bot className="w-4 h-4 text-[var(--theme-accent-primary)] shrink-0" />
              <span className="truncate">AI Tourist Guide ({selectedLanguage.nativeName})</span>
            </h3>
            {landmarkContext && (
              <p className="text-[10px] text-[var(--theme-accent-secondary)] truncate max-w-[200px] sm:max-w-md font-medium">
                Active Topic: <strong>{landmarkContext.title}</strong>
              </p>
            )}
          </div>
        </div>

        {onSaveToJournal && (
          <button
            id="btn-chat-save-journal"
            type="button"
            onClick={handleOpenSaveJournalCard}
            style={
              journalSavedSuccess || isLandmarkSaved
                ? {
                    backgroundColor: 'var(--theme-card-bg-subtle)',
                    borderColor: 'var(--theme-card-border-glow)',
                    color: 'var(--theme-accent-secondary)',
                  }
                : undefined
            }
            className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shrink-0 border ${
              journalSavedSuccess || isLandmarkSaved ? 'border' : 'theme-btn-primary'
            }`}
            title="Save this place or tour experience to your Travel Journal"
          >
            {journalSavedSuccess || isLandmarkSaved ? (
              <>
                <BookmarkCheck className="w-3.5 h-3.5 text-[var(--theme-accent-secondary)]" />
                <span className="hidden xs:inline">Saved</span>
              </>
            ) : (
              <>
                <Bookmark className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Save to Journal</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Inline User-Confirmed Save to Journal Form */}
      {isSaveCardOpen && (
        <form
          onSubmit={handleConfirmSaveToJournal}
          style={{
            backgroundColor: 'var(--theme-card-bg)',
            borderColor: 'var(--theme-card-border-glow)',
          }}
          className="shrink-0 p-3 rounded-2xl border backdrop-blur-xl shadow-xl space-y-2 text-xs"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-serif font-bold text-[var(--theme-text-title)] flex items-center gap-1.5">
              <Bookmark className="w-3.5 h-3.5 text-[var(--theme-accent-primary)]" />
              <span>Save Destination to Travel Journal</span>
            </span>
            <button
              type="button"
              onClick={() => setIsSaveCardOpen(false)}
              className="p-1 rounded-lg text-[var(--theme-text-muted)] hover:text-[var(--theme-text-title)] cursor-pointer"
              aria-label="Close journal save form"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              type="text"
              required
              value={savePlaceName}
              onChange={(e) => setSavePlaceName(e.target.value)}
              placeholder="Place Name *"
              style={{
                backgroundColor: 'var(--theme-input-bg)',
                borderColor: 'var(--theme-input-border)',
                color: 'var(--theme-text-title)',
              }}
              className="px-2.5 py-1.5 rounded-xl border text-xs focus:outline-none focus:border-[var(--theme-card-border-glow)]"
            />
            <input
              type="text"
              value={saveCity}
              onChange={(e) => setSaveCity(e.target.value)}
              placeholder="City"
              style={{
                backgroundColor: 'var(--theme-input-bg)',
                borderColor: 'var(--theme-input-border)',
                color: 'var(--theme-text-title)',
              }}
              className="px-2.5 py-1.5 rounded-xl border text-xs focus:outline-none focus:border-[var(--theme-card-border-glow)]"
            />
            <input
              type="date"
              value={saveVisitDate}
              onChange={(e) => setSaveVisitDate(e.target.value)}
              style={{
                backgroundColor: 'var(--theme-input-bg)',
                borderColor: 'var(--theme-input-border)',
                color: 'var(--theme-text-title)',
              }}
              className="px-2.5 py-1.5 rounded-xl border text-xs focus:outline-none focus:border-[var(--theme-card-border-glow)]"
            />
          </div>

          <input
            type="text"
            value={saveNotes}
            onChange={(e) => setSaveNotes(e.target.value)}
            placeholder="Your personal notes from this visit (optional)"
            style={{
              backgroundColor: 'var(--theme-input-bg)',
              borderColor: 'var(--theme-input-border)',
              color: 'var(--theme-text-title)',
            }}
            className="w-full px-2.5 py-1.5 rounded-xl border text-xs focus:outline-none focus:border-[var(--theme-card-border-glow)]"
          />

          {journalSaveError && (
            <p className="text-[11px] text-rose-400 font-medium">{journalSaveError}</p>
          )}

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsSaveCardOpen(false)}
              style={{
                backgroundColor: 'var(--theme-card-bg-subtle)',
                borderColor: 'var(--theme-card-border)',
                color: 'var(--theme-text-muted)',
              }}
              className="px-3 py-1.5 rounded-xl border text-[11px] font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSavingJournal}
              className="px-3 py-1.5 rounded-xl theme-btn-primary text-[11px] font-bold flex items-center gap-1 cursor-pointer disabled:opacity-60"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSavingJournal ? 'Saving...' : 'Confirm & Save'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Messages Scroll Area (contained within viewport) */}
      <div ref={messagesContainerRef} className="flex-1 min-h-0 overflow-y-auto space-y-2.5 pr-1 p-1">
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
                <p className="whitespace-pre-line font-sans">
                  {isUser ? (
                    msg.text
                  ) : (
                    <WordByWordText
                      text={msg.text}
                      isStreaming={msg.id === streamingMsgId}
                    />
                  )}
                </p>
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

        <div className="h-1" />
      </div>

      {/* Inline Voice Support Notice */}
      {voiceNotice && (
        <div
          style={{
            backgroundColor: 'var(--theme-card-bg)',
            borderColor: 'var(--theme-accent-primary)',
            color: 'var(--theme-text-body)',
          }}
          className="shrink-0 px-3 py-1.5 rounded-xl border text-[11px] font-medium flex items-center justify-between gap-2"
        >
          <span>{voiceNotice}</span>
          <button
            type="button"
            onClick={() => setVoiceNotice(null)}
            className="text-[var(--theme-accent-primary)] hover:underline font-bold cursor-pointer"
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
