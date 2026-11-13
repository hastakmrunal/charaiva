import React, { useEffect, useMemo, useRef, useState } from 'react';

interface WordByWordTextProps {
  text: string;
  className?: string;
  wordIntervalMs?: number;
  isStreaming?: boolean;
}

/**
 * Renders text progressively word-by-word so longer explanations start appearing immediately
 * without waiting or causing layout flicker. When live SSE deltas append text, revelation
 * continues smoothly from the current word index rather than restarting from scratch.
 */
export const WordByWordText: React.FC<WordByWordTextProps> = ({
  text,
  className = '',
  wordIntervalMs,
  isStreaming = false,
}) => {
  const safeText = text || '';
  const tokens = useMemo(() => safeText.split(/(\s+)/).filter((t) => t.length > 0), [safeText]);
  const [revealedCount, setRevealedCount] = useState<number>(tokens.length > 0 ? Math.min(4, tokens.length) : 0);
  const prevPrefixRef = useRef<string>('');

  useEffect(() => {
    const newPrefix = safeText.slice(0, 24);
    const oldPrefix = prevPrefixRef.current;

    if (!safeText) {
      setRevealedCount(0);
      prevPrefixRef.current = '';
      return;
    }

    // Detect completely new text vs incremental append of the same response
    const isIncrementalAppend =
      oldPrefix.length > 0 &&
      (safeText.startsWith(oldPrefix) || oldPrefix.startsWith(newPrefix));

    if (!isIncrementalAppend) {
      setRevealedCount(Math.min(4, tokens.length));
    }
    prevPrefixRef.current = newPrefix;
  }, [safeText, tokens.length]);

  useEffect(() => {
    if (revealedCount >= tokens.length) return;

    const effectiveInterval =
      wordIntervalMs ?? Math.min(22, Math.max(6, Math.floor(1400 / Math.max(1, tokens.length))));

    const timer = window.setInterval(() => {
      setRevealedCount((prev) => {
        if (prev >= tokens.length) {
          window.clearInterval(timer);
          return prev;
        }
        // Advance a word + its trailing whitespace together so reveal feels rhythmic
        let next = prev + 1;
        if (next < tokens.length && /^\s+$/.test(tokens[next])) {
          next += 1;
        }
        return Math.min(tokens.length, next);
      });
    }, effectiveInterval);

    return () => window.clearInterval(timer);
  }, [revealedCount, tokens, wordIntervalMs]);

  const visibleText = useMemo(() => tokens.slice(0, revealedCount).join(''), [tokens, revealedCount]);
  const isRevealing = revealedCount < tokens.length || isStreaming;

  return (
    <span className={className}>
      {visibleText}
      {isRevealing && (
        <span
          aria-hidden="true"
          className="inline-block w-1.5 h-3.5 ml-1 align-middle rounded-sm animate-pulse"
          style={{ backgroundColor: 'var(--theme-accent-secondary)' }}
        />
      )}
    </span>
  );
};
