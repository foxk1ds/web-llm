'use client';

import { memo, useMemo, useState } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  AlertTriangle,
  Braces,
  Brain,
  Check,
  ChevronRight,
  Copy,
  Eye,
  FileText,
  RefreshCw,
} from 'lucide-react';
import CodeBlock from './CodeBlock';
import ToolCallCard from './ToolCallCard';
import { looksLikeHarnessJson } from '@/lib/agent/protocol';
import { writeToClipboard } from '@/lib/clipboard';
import { formatBytes, modelBadgeLabel, formatClockTime } from '@/lib/format';
import type { Message } from '@/types';

function buildMarkdownComponents(hideHarnessJson: boolean): Components {
  return {
    pre: ({ children }) => <>{children}</>,

    code({ className, children }) {
      const text = String(children ?? '');
      const match = /language-([\w+#.-]+)/.exec(className ?? '');
      const isBlock = Boolean(match) || text.includes('\n');

      if (!isBlock) {
        return <code className="inline-code">{children}</code>;
      }

      const code = text.replace(/\n$/, '');
      const language = match?.[1];

      if (hideHarnessJson && looksLikeHarnessJson(code)) {
        return <JsonDisclosure code={code} language={language} />;
      }
      return <CodeBlock code={code} language={language} />;
    },

    a({ href, children }) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
<<<<<<< HEAD
          className="font-medium text-foreground underline decoration-muted-foreground/40 underline-offset-2 hover:decoration-foreground transition-colors"
=======
          className="font-medium text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent"
>>>>>>> origin/main
        >
          {children}
        </a>
      );
    },

    table({ children }) {
      return (
<<<<<<< HEAD
        <div className="my-4 overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">{children}</table>
=======
        <div className="my-4 overflow-x-auto rounded-md border border-line">
          <table className="w-full">{children}</table>
>>>>>>> origin/main
        </div>
      );
    },
  };
}

function JsonDisclosure({ code, language }: { code: string; language?: string }) {
  const [revealed, setRevealed] = useState(false);

  if (revealed) {
    return (
      <div className="relative">
        <CodeBlock code={code} language={language} />
        <button
          type="button"
          onClick={() => setRevealed(false)}
<<<<<<< HEAD
          className="focus-ring absolute right-3 top-10 z-10 flex items-center gap-1 rounded-md border border-border bg-panel px-2 py-1 text-[11px] font-medium text-foreground shadow-xs transition-colors hover:bg-muted"
=======
          className="focus-ring absolute right-3 top-11 z-10 flex items-center gap-1 rounded-sm bg-white/10 px-2 py-1 text-2xs font-medium text-zinc-200 transition-colors hover:bg-white/20"
>>>>>>> origin/main
        >
          <Eye className="h-3 w-3" />
          Hide
        </button>
      </div>
    );
  }

  const lines = code.split('\n').length;

  return (
<<<<<<< HEAD
    <div className="not-prose my-3 flex items-center gap-2.5 rounded-lg border border-border bg-muted/30 px-3 py-2">
      <Braces className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 text-xs text-muted-foreground font-mono">
        JSON payload · {lines} {lines === 1 ? 'line' : 'lines'} · collapsed
=======
    <div className="not-prose my-4 flex items-center gap-2.5 rounded-lg border border-line bg-surface px-3.5 py-2.5">
      <Braces className="h-3.5 w-3.5 shrink-0 text-ink-muted" />
      <span className="min-w-0 flex-1 text-xs text-ink-muted">
        JSON output · {lines} {lines === 1 ? 'line' : 'lines'} · hidden
>>>>>>> origin/main
      </span>
      <button
        type="button"
        onClick={() => setRevealed(true)}
<<<<<<< HEAD
        className="focus-ring shrink-0 rounded border border-border bg-panel px-2 py-1 text-[11px] font-medium text-foreground transition-colors hover:bg-muted"
=======
        className="focus-ring shrink-0 rounded-sm border border-line-strong bg-surface px-2 py-1 text-2xs font-medium text-ink-secondary transition-colors hover:bg-surface-hover"
>>>>>>> origin/main
      >
        Show
      </button>
    </div>
  );
}

const PROSE_CLASSES = [
<<<<<<< HEAD
  'prose prose-zinc max-w-none dark:prose-invert',
  'prose-headings:scroll-mt-20 prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-foreground',
  'prose-h1:text-xl prose-h2:text-lg prose-h3:text-base',
  'prose-p:text-[14.5px] prose-p:leading-7 prose-p:text-foreground',
  'prose-li:text-[14.5px] prose-li:leading-7 prose-li:marker:text-muted-foreground',
  'prose-strong:font-semibold prose-strong:text-foreground',
  'prose-blockquote:border-l-2 prose-blockquote:border-border prose-blockquote:font-normal prose-blockquote:not-italic prose-blockquote:text-muted-foreground',
  'prose-img:rounded-lg',
=======
  'prose prose-neutral max-w-none dark:prose-invert',
  'prose-headings:scroll-mt-20 prose-headings:font-semibold prose-headings:tracking-tight',
  'prose-h1:text-xl prose-h2:text-lg prose-h3:text-base',
  'prose-p:text-[15px] prose-p:leading-7',
  'prose-li:text-[15px] prose-li:leading-7 prose-li:marker:text-ink-muted',
  'prose-strong:font-semibold prose-strong:text-ink',
  'prose-blockquote:border-l-2 prose-blockquote:border-line-strong prose-blockquote:font-normal prose-blockquote:not-italic',
  'prose-img:rounded-md',
>>>>>>> origin/main
].join(' ');

interface MessageBubbleProps {
  message: Message;
  streaming?: boolean;
  canRegenerate?: boolean;
  onRegenerate?: () => void;
  onDecideTool?: (callId: string, approved: boolean) => void;
  showJson?: boolean;
  showTimestamps?: boolean;
}

/** Vertical padding for each turn, scaled by the saved chat layout. */
const TURN_PADDING: React.CSSProperties = {
  paddingTop: 'calc(var(--chat-density) * 1.25rem)',
  paddingBottom: 'calc(var(--chat-density) * 1.25rem)',
};

function MessageBubbleBase({
  message,
  streaming,
  canRegenerate,
  onRegenerate,
  onDecideTool,
  showJson = false,
  showTimestamps = true,
}: MessageBubbleProps) {
  if (message.role === 'user') return <UserMessage message={message} />;
  return (
    <AssistantMessage
      message={message}
      streaming={streaming}
      canRegenerate={canRegenerate}
      onRegenerate={onRegenerate}
      onDecideTool={onDecideTool}
      showJson={showJson}
      showTimestamps={showTimestamps}
    />
  );
}

const MessageBubble = memo(MessageBubbleBase, (prev, next) => {
  return (
    prev.message === next.message &&
    prev.streaming === next.streaming &&
    prev.canRegenerate === next.canRegenerate &&
    prev.onRegenerate === next.onRegenerate &&
    prev.onDecideTool === next.onDecideTool &&
    prev.showJson === next.showJson &&
    prev.showTimestamps === next.showTimestamps
  );
});

export default MessageBubble;

/**
 * User messages: in a subtle gray bubble on the right
 */
function UserMessage({ message }: { message: Message }) {
  const attachments = message.attachments ?? [];

  return (
<<<<<<< HEAD
    <div className="flex justify-end px-4 py-3 sm:px-6">
      <div className="max-w-[80%] rounded-lg border border-border bg-muted/60 px-4 py-2.5">
        <p className="whitespace-pre-wrap break-words text-[14px] leading-relaxed text-foreground font-sans">
          {message.content}
        </p>
=======
    <div className="flex justify-end px-4 sm:px-6" style={TURN_PADDING}>
      <div className="max-w-[85%] rounded-2xl rounded-tr-md border border-line bg-surface-sunken px-4 py-3">
        {attachments.length > 0 ? (
          <div className={`flex flex-wrap justify-end gap-2 ${message.content ? 'mb-2.5' : ''}`}>
            {attachments.map((attachment) =>
              attachment.kind === 'image' && attachment.dataUrl ? (
                <a
                  key={attachment.id}
                  href={attachment.dataUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`${attachment.name} — open full size`}
                  className="focus-ring block overflow-hidden rounded-md border border-line"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={attachment.dataUrl}
                    alt={attachment.name}
                    className="h-24 w-24 object-cover"
                  />
                </a>
              ) : (
                <span
                  key={attachment.id}
                  className="flex max-w-[16rem] items-center gap-2 rounded-md border border-line bg-surface-sunken px-2 py-1 text-xs text-ink-secondary"
                  title={attachment.name}
                >
                  <FileText className="h-3.5 w-3.5 shrink-0 text-ink-muted" />
                  <span className="min-w-0 truncate">{attachment.name}</span>
                  <span className="shrink-0 text-2xs tabular-nums text-ink-muted">
                    {formatBytes(attachment.size)}
                  </span>
                </span>
              ),
            )}
          </div>
        ) : null}

        {message.content ? (
          <p className="chat-prose whitespace-pre-wrap">
            {message.content}
          </p>
        ) : null}
>>>>>>> origin/main
      </div>
    </div>
  );
}

interface AssistantMessageProps {
  message: Message;
  streaming?: boolean;
  canRegenerate?: boolean;
  onRegenerate?: () => void;
  onDecideTool?: (callId: string, approved: boolean) => void;
  showJson?: boolean;
  showTimestamps?: boolean;
}

/**
 * Assistant messages: full-width with NO bubble
 */
function AssistantMessage({
  message,
  streaming,
  canRegenerate,
  onRegenerate,
  onDecideTool,
  showJson = false,
  showTimestamps = true,
}: AssistantMessageProps) {
  const isError = message.status === 'error';
  const showEmptyPulse = streaming && !message.content && !message.thinking;
  const markdownComponents = useMemo(
    () => buildMarkdownComponents(!showJson),
    [showJson],
  );

  return (
<<<<<<< HEAD
    <div className="group/msg w-full px-4 py-4 sm:px-6 text-foreground">
      <div className="w-full">
        {/* Thinking Panel (DeepSeek-R1 / CoT models) */}
        {message.thinking ? <ThinkingPanel text={message.thinking} streaming={streaming} /> : null}

        {/* Tool Call Cards */}
=======
    <div className="group/msg flex gap-3 px-4 sm:px-6" style={TURN_PADDING}>
      <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line-strong bg-canvas">
        <Sparkles className="h-3.5 w-3.5 text-ink" />
      </div>

      <div className="min-w-0 flex-1">
        {message.thinking ? <ThinkingPanel text={message.thinking} streaming={streaming} /> : null}

>>>>>>> origin/main
        {message.toolCalls?.length ? (
          <div className="mb-3">
            {message.toolCalls.map((call) => (
              <ToolCallCard
                key={call.id}
                call={call}
                onDecide={
                  call.status === 'awaiting_approval' && onDecideTool
                    ? (approved: boolean) => onDecideTool(call.id, approved)
                    : undefined
                }
              />
            ))}
          </div>
        ) : null}

        {/* Error message card */}
        {isError && !message.content ? (
          <ErrorCard message={message.error ?? 'Generation failed.'} onRetry={canRegenerate ? onRegenerate : undefined} />
        ) : null}

<<<<<<< HEAD
        {/* Streaming placeholder indicator */}
        {showEmptyPulse ? (
          <div className="flex items-center gap-1.5 py-1" aria-label="Generating response">
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-pulse" />
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-pulse [animation-delay:150ms]" />
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-pulse [animation-delay:300ms]" />
          </div>
        ) : null}

        {/* Full-width Assistant Message Content */}
        {message.content ? (
          <div className={PROSE_CLASSES}>
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {message.content}
            </ReactMarkdown>
            {streaming ? (
              <span
                aria-hidden
                className="ml-0.5 inline-block h-[1.1em] w-[2px] translate-y-[0.15em] animate-blink bg-foreground align-baseline"
=======
            {message.content ? (
              <div className={PROSE_CLASSES}>
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                  {message.content}
                </ReactMarkdown>
                {streaming ? (
                  <span
                    aria-hidden
                    className="ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[0.15em] animate-blink rounded-sm bg-ink-muted align-baseline motion-reduce:animate-none motion-reduce:opacity-60"
                  />
                ) : null}
              </div>
            ) : null}

            {!streaming && message.content ? (
              <MessageFooter
                message={message}
                canRegenerate={canRegenerate}
                onRegenerate={onRegenerate}
                showTimestamp={showTimestamps}
>>>>>>> origin/main
              />
            ) : null}
          </div>
        ) : null}

        {/* Error appended if partially generated */}
        {isError && message.content ? (
          <div className="mt-2">
            <ErrorCard message={message.error ?? 'Generation failed.'} onRetry={canRegenerate ? onRegenerate : undefined} />
          </div>
        ) : null}

        {/* Footer actions: Copy, Regenerate, stats */}
        {!streaming && message.content ? (
          <MessageFooter message={message} canRegenerate={canRegenerate} onRegenerate={onRegenerate} />
        ) : null}
      </div>
    </div>
  );
}

function MessageFooter({
  message,
  canRegenerate,
  onRegenerate,
  showTimestamp,
}: {
  message: Message;
  canRegenerate?: boolean;
  onRegenerate?: () => void;
  showTimestamp: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (await writeToClipboard(message.content)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
  };

  const speed = message.stats?.tokensPerSecond;

  return (
<<<<<<< HEAD
    <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
      {message.model ? <span className="font-mono">{modelBadgeLabel(message.model)}</span> : null}
=======
    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-2xs text-ink-muted">
      {message.model ? (
        <span className="font-mono">{modelBadgeLabel(message.model)}</span>
      ) : null}
>>>>>>> origin/main

      {showTimestamp ? (
        <>
          <span aria-hidden>·</span>
          <span title={new Date(message.createdAt).toLocaleString()}>
            {formatClockTime(message.createdAt)}
          </span>
        </>
      ) : null}

      {typeof speed === 'number' && speed > 0 ? (
        <>
          <span aria-hidden>·</span>
          <span title="Generation speed">{speed.toFixed(1)} tok/s</span>
        </>
      ) : null}

      {message.status === 'stopped' ? (
        <>
          <span aria-hidden>·</span>
          <span className="italic">stopped</span>
        </>
      ) : null}

      {message.model || showTimestamp || speed ? <span aria-hidden>·</span> : null}
      <div className="flex items-center gap-1">
<<<<<<< HEAD
        <button
          type="button"
          onClick={copy}
          aria-label={copied ? 'Copied' : 'Copy message'}
          className="focus-ring flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          {copied ? <Check className="h-3 w-3 text-foreground" /> : <Copy className="h-3 w-3" />}
          <span className={copied ? 'text-foreground font-medium' : ''}>{copied ? 'Copied' : 'Copy'}</span>
        </button>
=======
        <FooterButton onClick={copy} label={copied ? 'Copied' : 'Copy reply'}>
          {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </FooterButton>
>>>>>>> origin/main

        {canRegenerate && onRegenerate ? (
          <button
            type="button"
            onClick={onRegenerate}
            aria-label="Regenerate reply"
            className="focus-ring flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Regenerate</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}

<<<<<<< HEAD
=======
function FooterButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="focus-ring flex items-center gap-1 rounded-sm px-1.5 py-1 text-2xs text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
    >
      {children}
    </button>
  );
}

>>>>>>> origin/main
function ThinkingPanel({ text, streaming }: { text: string; streaming?: boolean }) {
  const [open, setOpen] = useState(false);

  return (
<<<<<<< HEAD
    <div className="mb-3 overflow-hidden rounded-lg border border-border bg-muted/30">
=======
    <div className="mb-3 overflow-hidden rounded-lg border border-line bg-surface-sunken">
>>>>>>> origin/main
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
<<<<<<< HEAD
        className="focus-ring flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
=======
        className="focus-ring flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-ink-muted transition-colors hover:text-ink"
>>>>>>> origin/main
      >
        <Brain className="h-3.5 w-3.5 shrink-0" />
        <span>{streaming ? 'Thinking…' : 'Thought process'}</span>
        <ChevronRight
          className={`ml-auto h-3.5 w-3.5 shrink-0 transition-transform duration-150 ${open ? 'rotate-90' : ''}`}
        />
      </button>
      {open ? (
<<<<<<< HEAD
        <div className="thin-scrollbar max-h-72 overflow-y-auto border-t border-border px-3 py-2 bg-panel">
          <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-muted-foreground">
=======
        <div className="thin-scrollbar max-h-72 overflow-y-auto border-t border-line px-3 py-2">
          <pre className="whitespace-pre-wrap break-words font-mono text-2xs leading-relaxed text-ink-muted">
>>>>>>> origin/main
            {text}
          </pre>
        </div>
      ) : null}
    </div>
  );
}

function ErrorCard({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
<<<<<<< HEAD
    <div className="rounded-lg border border-red-500/30 bg-red-500/[0.04] p-3">
      <div className="flex gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-red-600 dark:text-red-400">Generation failed</p>
          <p className="mt-1 break-words text-xs text-red-600/90 dark:text-red-400/90 leading-relaxed">
=======
    <div className="rounded-lg border border-danger/30 bg-danger-soft px-3.5 py-3">
      <div className="flex gap-2.5">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-danger">Generation failed</p>
          <p className="mt-1 break-words text-xs leading-6 text-danger">
>>>>>>> origin/main
            {message}
          </p>
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
<<<<<<< HEAD
              className="focus-ring mt-2 flex items-center gap-1.5 rounded border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-500/20 dark:text-red-400 transition-colors"
=======
              className="focus-ring mt-2 flex items-center gap-1.5 rounded-sm border border-danger/40 bg-surface px-2 py-1 text-xs font-medium text-danger transition-colors hover:bg-danger-soft"
>>>>>>> origin/main
            >
              <RefreshCw className="h-3 w-3" />
              Try again
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
<<<<<<< HEAD
=======

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="h-1.5 w-1.5 animate-dot-pulse rounded-full bg-ink-muted motion-reduce:animate-none"
      style={{ animationDelay: delay }}
    />
  );
}
>>>>>>> origin/main
