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
  Sparkles,
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
          className="font-medium text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent"
        >
          {children}
        </a>
      );
    },

    table({ children }) {
      return (
        <div className="my-4 overflow-x-auto rounded-md border border-line">
          <table className="w-full">{children}</table>
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
          className="focus-ring absolute right-3 top-11 z-10 flex items-center gap-1 rounded-sm bg-white/10 px-2 py-1 text-2xs font-medium text-zinc-200 transition-colors hover:bg-white/20"
        >
          <Eye className="h-3 w-3" />
          Hide
        </button>
      </div>
    );
  }

  const lines = code.split('\n').length;

  return (
    <div className="not-prose my-4 flex items-center gap-2.5 rounded-lg border border-line bg-surface px-3.5 py-2.5">
      <Braces className="h-3.5 w-3.5 shrink-0 text-ink-muted" />
      <span className="min-w-0 flex-1 text-xs text-ink-muted">
        JSON output · {lines} {lines === 1 ? 'line' : 'lines'} · hidden
      </span>
      <button
        type="button"
        onClick={() => setRevealed(true)}
        className="focus-ring shrink-0 rounded-sm border border-line-strong bg-surface px-2 py-1 text-2xs font-medium text-ink-secondary transition-colors hover:bg-surface-hover"
      >
        Show
      </button>
    </div>
  );
}

const PROSE_CLASSES = [
  'prose prose-neutral max-w-none dark:prose-invert',
  'prose-headings:scroll-mt-20 prose-headings:font-semibold prose-headings:tracking-tight',
  'prose-h1:text-xl prose-h2:text-lg prose-h3:text-base',
  'prose-p:text-[15px] prose-p:leading-7',
  'prose-li:text-[15px] prose-li:leading-7 prose-li:marker:text-ink-muted',
  'prose-strong:font-semibold prose-strong:text-ink',
  'prose-blockquote:border-l-2 prose-blockquote:border-line-strong prose-blockquote:font-normal prose-blockquote:not-italic',
  'prose-img:rounded-md',
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

function UserMessage({ message }: { message: Message }) {
  const attachments = message.attachments ?? [];

  return (
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
    <div className="group/msg flex gap-3 px-4 sm:px-6" style={TURN_PADDING}>
      <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line-strong bg-canvas">
        <Sparkles className="h-3.5 w-3.5 text-ink" />
      </div>

      <div className="min-w-0 flex-1">
        {message.thinking ? <ThinkingPanel text={message.thinking} streaming={streaming} /> : null}

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

        <>
          {isError && !message.content ? (
            <ErrorCard message={message.error ?? 'Generation failed.'} onRetry={canRegenerate ? onRegenerate : undefined} />
          ) : null}
          {!isError || message.content ? (
            <>
            {showEmptyPulse ? (
              <div className="flex items-center gap-1.5 py-1" aria-label="Generating response">
                <Dot delay="0ms" />
                <Dot delay="150ms" />
                <Dot delay="300ms" />
              </div>
            ) : null}

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
              />
            ) : null}
            </>
          ) : null}
          {isError && message.content ? (
            <ErrorCard message={message.error ?? 'Generation failed.'} onRetry={canRegenerate ? onRegenerate : undefined} />
          ) : null}
        </>
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
    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-2xs text-ink-muted">
      {message.model ? (
        <span className="font-mono">{modelBadgeLabel(message.model)}</span>
      ) : null}

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
          <span title="Generation speed reported by Ollama">{speed.toFixed(1)} tok/s</span>
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
        <FooterButton onClick={copy} label={copied ? 'Copied' : 'Copy reply'}>
          {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </FooterButton>

        {canRegenerate && onRegenerate ? (
          <FooterButton onClick={onRegenerate} label="Regenerate response">
            <RefreshCw className="h-3 w-3" />
            <span>Regenerate</span>
          </FooterButton>
        ) : null}
      </div>
    </div>
  );
}

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

function ThinkingPanel({ text, streaming }: { text: string; streaming?: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-3 overflow-hidden rounded-lg border border-line bg-surface-sunken">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="focus-ring flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-ink-muted transition-colors hover:text-ink"
      >
        <Brain className="h-3.5 w-3.5 shrink-0" />
        <span>{streaming ? 'Thinking…' : 'Thought process'}</span>
        <ChevronRight
          className={`ml-auto h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
        />
      </button>
      {open ? (
        <div className="thin-scrollbar max-h-72 overflow-y-auto border-t border-line px-3 py-2">
          <pre className="whitespace-pre-wrap break-words font-mono text-2xs leading-relaxed text-ink-muted">
            {text}
          </pre>
        </div>
      ) : null}
    </div>
  );
}

function ErrorCard({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-lg border border-danger/30 bg-danger-soft px-3.5 py-3">
      <div className="flex gap-2.5">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-danger">Generation failed</p>
          <p className="mt-1 break-words text-xs leading-6 text-danger">
            {message}
          </p>
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="focus-ring mt-2 flex items-center gap-1.5 rounded-sm border border-danger/40 bg-surface px-2 py-1 text-xs font-medium text-danger transition-colors hover:bg-danger-soft"
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

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="h-1.5 w-1.5 animate-dot-pulse rounded-full bg-ink-muted motion-reduce:animate-none"
      style={{ animationDelay: delay }}
    />
  );
}
