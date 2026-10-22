'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUp, Plus, Square } from 'lucide-react';

const MAX_HEIGHT_PX = 160;

interface ChatInputProps {
  onSubmit: (text: string) => void;
  onStop: () => void;
  streaming: boolean;
  disabled?: boolean;
  placeholder?: string;
  modelLabel?: string | null;
  hasSystemPrompt?: boolean;
  onOpenSettings?: () => void;
  onNewChat?: () => void;
}

export default function ChatInput({
  onSubmit,
  onStop,
  streaming,
  disabled = false,
  placeholder = 'Send a message…',
  onNewChat,
}: ChatInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const composingRef = useRef(false);

  const resize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;

    el.style.height = 'auto';
    const next = Math.min(el.scrollHeight, MAX_HEIGHT_PX);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > MAX_HEIGHT_PX ? 'auto' : 'hidden';
  }, []);

  useEffect(() => {
    resize();
  }, [value, resize]);

  useEffect(() => {
    if (!streaming && !disabled) textareaRef.current?.focus();
  }, [streaming, disabled]);

  const submit = useCallback(() => {
    const text = value.trim();
    if (!text || streaming || disabled) return;
    onSubmit(text);
    setValue('');
  }, [value, streaming, disabled, onSubmit]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter') return;
    if (event.shiftKey) return;
    if (composingRef.current || event.nativeEvent.isComposing) return;

    event.preventDefault();
    submit();
  };

  const canSend = value.trim().length > 0 && !streaming && !disabled;

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="relative flex items-end gap-2 rounded-lg border border-border bg-panel px-3 py-2 transition-colors focus-within:border-foreground/40">
        {onNewChat ? (
          <button
            type="button"
            onClick={onNewChat}
            disabled={streaming}
            aria-label="New chat"
            title="New chat"
            className="focus-ring mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40 transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        ) : null}

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => {
            composingRef.current = true;
          }}
          onCompositionEnd={() => {
            composingRef.current = false;
          }}
          rows={1}
          disabled={disabled}
          placeholder={placeholder}
          aria-label="Message"
          className="thin-scrollbar max-h-[160px] min-w-0 flex-1 resize-none border-0 bg-transparent py-1 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0 disabled:opacity-50 leading-relaxed font-sans"
        />

        {/* Action Button: Send or Stop */}
        <div className="mb-0.5 shrink-0">
          {streaming ? (
            <button
              type="button"
              onClick={onStop}
              aria-label="Stop generation"
              title="Stop generation"
              className="focus-ring flex h-7 w-7 items-center justify-center rounded-md bg-foreground text-app hover:opacity-85 transition-opacity"
            >
              <Square className="h-3 w-3 fill-current" />
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={!canSend}
              aria-label="Send message"
              title="Send message"
              className="focus-ring flex h-7 w-7 items-center justify-center rounded-md bg-foreground text-app hover:opacity-85 disabled:opacity-20 disabled:pointer-events-none transition-opacity"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <p className="mt-1.5 text-center font-mono text-[11px] text-muted-foreground hidden sm:block">
        {streaming ? (
          'Streaming… press Stop to cancel'
        ) : (
          <>
            <kbd className="font-mono">enter</kbd> to send ·{' '}
            <kbd className="font-mono">shift + enter</kbd> for new line
          </>
        )}
      </p>
    </div>
  );
}
