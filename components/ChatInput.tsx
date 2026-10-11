'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUp, ChevronDown, Plus, Settings2, Square } from 'lucide-react';
import { shortenModelName } from '@/lib/format';

const MAX_HEIGHT_PX = 168;

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
  modelLabel,
  hasSystemPrompt = false,
  onOpenSettings,
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
      <div className="command-bar rounded-[26px] px-2 py-1.5">
        <div className="flex items-end gap-1">
          {onNewChat ? (
            <button
              type="button"
              onClick={onNewChat}
              disabled={streaming}
              aria-label="New chat"
              title="New chat"
              className="focus-ring mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-overlay/[0.06] hover:text-zinc-800 disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              <Plus className="h-[18px] w-[18px]" />
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
            className="thin-scrollbar max-h-[168px] min-w-0 flex-1 resize-none border-0 bg-transparent px-1.5 py-2 text-[15px] leading-6 text-zinc-900 placeholder:text-zinc-500 focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-60 dark:text-zinc-100"
          />

          <div className="mb-0.5 flex shrink-0 items-center gap-0.5">
            {hasSystemPrompt ? (
              <button
                type="button"
                onClick={onOpenSettings}
                title="A system prompt is active — click to edit"
                className="focus-ring flex h-9 items-center gap-1 rounded-full px-2 text-[11.5px] font-medium text-indigo-600 transition-colors hover:bg-indigo-500/10 dark:text-indigo-300"
              >
                <Settings2 className="h-3.5 w-3.5" />
              </button>
            ) : null}

            {modelLabel ? (
              <span
                title={`Model: ${modelLabel} — change it in the sidebar`}
                className="hidden h-9 cursor-default items-center gap-1 rounded-full px-2.5 text-[12.5px] font-medium text-zinc-600 sm:flex dark:text-zinc-300"
              >
                {shortenModelName(modelLabel)}
                <ChevronDown className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
              </span>
            ) : null}

            {streaming ? (
              <button
                type="button"
                onClick={onStop}
                aria-label="Stop generating"
                title="Stop generating"
                className="focus-ring flex h-9 w-9 items-center justify-center rounded-full bg-overlay text-app transition-all duration-200 hover:opacity-85"
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
                className="focus-ring flex h-9 w-9 items-center justify-center rounded-full bg-overlay text-app transition-all duration-200 hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ArrowUp className="h-[18px] w-[18px]" />
              </button>
            )}
          </div>
        </div>
      </div>

      <p className="mt-2 hidden text-center font-mono text-[11px] text-zinc-500 sm:block dark:text-zinc-400">
        {streaming ? (
          'generating — press stop to cancel'
        ) : (
          <>
            <kbd className="font-mono font-medium">enter</kbd> to send ·{' '}
            <kbd className="font-mono font-medium">shift + enter</kbd> for a new line
          </>
        )}
      </p>
    </div>
  );
}
