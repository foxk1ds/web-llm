'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowUp,
  ChevronDown,
  FileText,
  Loader2,
  Paperclip,
  Plus,
  Settings2,
  Square,
  X,
} from 'lucide-react';
import {
  ATTACHMENT_ACCEPT,
  MAX_ATTACHMENTS,
  readAttachment,
} from '@/lib/attachments';
import { formatBytes, shortenModelName } from '@/lib/format';
import type { Attachment } from '@/types';

const MAX_HEIGHT_PX = 168;

interface ChatInputProps {
  onSubmit: (text: string, attachments: Attachment[]) => void;
  onStop: () => void;
  streaming: boolean;
  disabled?: boolean;
  placeholder?: string;
  modelLabel?: string | null;
  hasSystemPrompt?: boolean;
  onOpenSettings?: () => void;
  onNewChat?: () => void;
  /** When false, Enter inserts a newline and Shift+Enter / Ctrl+Enter sends. */
  enterToSend?: boolean;
  /** False while the app waits for a complete reply before rendering it. */
  streamEnabled?: boolean;
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
  enterToSend = true,
  streamEnabled = true,
}: ChatInputProps) {
  const [value, setValue] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [reading, setReading] = useState(0);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const addFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      setAttachError(null);

      const remaining = MAX_ATTACHMENTS - attachments.length;
      if (remaining <= 0) {
        setAttachError(`You can attach up to ${MAX_ATTACHMENTS} files per message.`);
        return;
      }

      const accepted = files.slice(0, remaining);
      if (files.length > remaining) {
        setAttachError(
          `Only ${remaining} more ${remaining === 1 ? 'file fits' : 'files fit'} in this message.`,
        );
      }

      setReading((count) => count + accepted.length);
      const results = await Promise.allSettled(accepted.map((file) => readAttachment(file)));
      setReading((count) => Math.max(0, count - accepted.length));

      const added: Attachment[] = [];
      for (const result of results) {
        if (result.status === 'fulfilled') {
          added.push(result.value);
        } else {
          setAttachError(
            result.reason instanceof Error ? result.reason.message : 'Could not attach that file.',
          );
        }
      }
      if (added.length > 0) {
        setAttachments((prev) => {
          const known = new Set(prev.map((attachment) => attachment.id));
          return [...prev, ...added.filter((attachment) => !known.has(attachment.id))].slice(
            0,
            MAX_ATTACHMENTS,
          );
        });
      }
    },
    [attachments.length],
  );

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((attachment) => attachment.id !== id));
    setAttachError(null);
  }, []);

  const submit = useCallback(() => {
    const text = value.trim();
    if ((!text && attachments.length === 0) || streaming || disabled || reading > 0) return;
    onSubmit(text, attachments);
    setValue('');
    setAttachments([]);
    setAttachError(null);
  }, [value, attachments, streaming, disabled, reading, onSubmit]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter') return;
    if (composingRef.current || event.nativeEvent.isComposing) return;

    // Enter-to-send (default): Enter sends, Shift+Enter breaks the line.
    // Otherwise: Enter breaks the line, Shift/Ctrl/Meta+Enter sends.
    const sends = enterToSend
      ? !event.shiftKey
      : event.shiftKey || event.ctrlKey || event.metaKey;
    if (!sends) return;

    event.preventDefault();
    submit();
  };

  const canSend =
    (value.trim().length > 0 || attachments.length > 0) && !streaming && !disabled && reading === 0;

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div
        className={`composer rounded-xl px-2 py-1.5 ${
          dragging ? 'border-accent bg-accent-soft/40' : ''
        }`}
        onDragOver={(event) => {
          if (!event.dataTransfer.types.includes('Files')) return;
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setDragging(false);
          }
        }}
        onDrop={(event) => {
          if (!event.dataTransfer.files.length) return;
          event.preventDefault();
          setDragging(false);
          void addFiles(Array.from(event.dataTransfer.files));
        }}
      >
        {attachments.length > 0 ? (
          <div className="flex flex-wrap gap-2 px-1 pb-2 pt-1">
            {attachments.map((attachment) => (
              <PendingAttachment
                key={attachment.id}
                attachment={attachment}
                onRemove={() => removeAttachment(attachment.id)}
              />
            ))}
          </div>
        ) : null}

        {attachError ? (
          <p className="px-1 pb-1.5 text-2xs leading-5 text-danger" role="alert">
            {attachError}
          </p>
        ) : null}

        <div className="flex items-end gap-1">
          {onNewChat ? (
            <button
              type="button"
              onClick={onNewChat}
              disabled={streaming}
              aria-label="New chat"
              title="New chat"
              className="focus-ring mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus className="h-[18px] w-[18px]" />
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={streaming || disabled || reading > 0 || attachments.length >= MAX_ATTACHMENTS}
            aria-label="Attach files or images"
            title="Attach images, PDF, DOCX, XLSX, CSV, SQL, or text/code files — images need a vision model"
            className="focus-ring mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
          >
            {reading > 0 ? (
              <Loader2 className="h-[18px] w-[18px] animate-spin motion-reduce:animate-none" />
            ) : (
              <Paperclip className="h-[18px] w-[18px]" />
            )}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            hidden
            accept={ATTACHMENT_ACCEPT}
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []);
              event.target.value = '';
              void addFiles(files);
            }}
          />

          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={(event) => {
              const files = Array.from(event.clipboardData.files);
              if (files.length === 0) return;
              event.preventDefault();
              void addFiles(files);
            }}
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
            className="thin-scrollbar max-h-[168px] min-w-0 flex-1 resize-none border-0 bg-transparent px-1.5 py-2 text-base leading-6 text-ink placeholder:text-ink-muted focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-60"
          />

          <div className="mb-0.5 flex shrink-0 items-center gap-0.5">
            {hasSystemPrompt ? (
              <button
                type="button"
                onClick={onOpenSettings}
                title="A system prompt is active — click to edit"
                aria-label="A system prompt is active — open settings"
                className="focus-ring flex h-9 items-center rounded-md px-2 text-accent transition-colors hover:bg-accent-soft"
              >
                <Settings2 className="h-3.5 w-3.5" />
              </button>
            ) : null}

            {modelLabel ? (
              <span
                title={`Model: ${modelLabel} — change it in the sidebar`}
                className="hidden h-9 cursor-default items-center gap-1 px-2.5 text-xs font-medium text-ink-secondary sm:flex"
              >
                {shortenModelName(modelLabel)}
                <ChevronDown className="h-3.5 w-3.5 text-ink-muted" />
              </span>
            ) : null}

            {streaming ? (
              <button
                type="button"
                onClick={onStop}
                aria-label="Stop generating"
                title="Stop generating"
                className="btn btn-sm h-9 w-9 border border-line-strong bg-surface p-0 text-ink hover:bg-surface-hover"
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
                className="btn btn-sm h-9 w-9 bg-accent p-0 text-accent-fg hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowUp className="h-[18px] w-[18px]" />
              </button>
            )}
          </div>
        </div>
      </div>

      <p className="mt-2 hidden items-center justify-center gap-1.5 text-center text-2xs text-ink-muted sm:flex">
        {streaming ? (
          streamEnabled ? (
            'Generating — press stop to cancel'
          ) : (
            'Generating — the reply appears when it is complete'
          )
        ) : enterToSend ? (
          <>
            <kbd className="font-mono font-medium">Enter</kbd> to send ·{' '}
            <kbd className="font-mono font-medium">Shift + Enter</kbd> for a new line
          </>
        ) : (
          <>
            <kbd className="font-mono font-medium">Shift + Enter</kbd> to send ·{' '}
            <kbd className="font-mono font-medium">Enter</kbd> for a new line
          </>
        )}
      </p>
    </div>
  );
}

function PendingAttachment({
  attachment,
  onRemove,
}: {
  attachment: Attachment;
  onRemove: () => void;
}) {
  const removeButton = (
    <button
      type="button"
      onClick={onRemove}
      aria-label={`Remove ${attachment.name}`}
      title={`Remove ${attachment.name}`}
      className="focus-ring flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface/95 text-ink-secondary transition-colors hover:bg-surface-hover hover:text-ink"
    >
      <X className="h-3 w-3" />
    </button>
  );

  if (attachment.kind === 'image' && attachment.dataUrl) {
    return (
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={attachment.dataUrl}
          alt={attachment.name}
          title={attachment.name}
          className="h-16 w-16 rounded-md border border-line object-cover"
        />
        <div className="absolute -right-1.5 -top-1.5">{removeButton}</div>
      </div>
    );
  }

  return (
    <div className="flex max-w-[15rem] items-center gap-2 rounded-md border border-line bg-surface-sunken py-1 pl-2 pr-1">
      <FileText className="h-3.5 w-3.5 shrink-0 text-ink-muted" />
      <span
        className="min-w-0 flex-1 truncate text-xs text-ink-secondary"
        title={attachment.name}
      >
        {attachment.name}
      </span>
      <span className="shrink-0 text-2xs tabular-nums text-ink-muted">
        {formatBytes(attachment.size)}
      </span>
      {removeButton}
    </div>
  );
}
