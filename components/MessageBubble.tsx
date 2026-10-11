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
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import CodeBlock from './CodeBlock';
import ToolCallCard from './ToolCallCard';
import { looksLikeHarnessJson } from '@/lib/agent/protocol';
import { writeToClipboard } from '@/lib/clipboard';
import { modelBadgeLabel, formatClockTime } from '@/lib/format';
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
          className="font-medium text-sky-600 underline decoration-sky-600/30 underline-offset-2 hover:decoration-sky-600 dark:text-sky-400 dark:decoration-sky-400/30 dark:hover:decoration-sky-400"
        >
          {children}
        </a>
      );
    },

    table({ children }) {
      return (
        <div className="my-4 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
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
          className="focus-ring absolute right-3 top-11 z-10 flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 text-[11px] font-medium text-zinc-300 backdrop-blur transition-colors hover:bg-white/20"
        >
          <Eye className="h-3 w-3" />
          Hide
        </button>
      </div>
    );
  }

  const lines = code.split('\n').length;

  return (
    <div className="not-prose my-4 flex items-center gap-2.5 rounded-xl border border-overlay/[0.08] bg-overlay/[0.02] px-3.5 py-2.5">
      <Braces className="h-3.5 w-3.5 shrink-0 text-zinc-500 dark:text-zinc-400" />
      <span className="min-w-0 flex-1 text-[12px] text-zinc-500 dark:text-zinc-400">
        JSON output · {lines} {lines === 1 ? 'line' : 'lines'} · hidden
      </span>
      <button
        type="button"
        onClick={() => setRevealed(true)}
        className="focus-ring shrink-0 rounded-md border border-overlay/[0.1] bg-overlay/[0.04] px-2 py-1 text-[11px] font-medium text-zinc-600 transition-colors hover:bg-overlay/[0.08] dark:text-zinc-300"
      >
        Show
      </button>
    </div>
  );
}

const PROSE_CLASSES = [
  'prose prose-zinc max-w-none dark:prose-invert',
  'prose-headings:scroll-mt-20 prose-headings:font-semibold prose-headings:tracking-tight',
  'prose-h1:text-xl prose-h2:text-lg prose-h3:text-base',
  'prose-p:text-[15px] prose-p:leading-7',
  'prose-li:text-[15px] prose-li:leading-7 prose-li:marker:text-zinc-400 dark:prose-li:marker:text-zinc-600',
  'prose-strong:font-semibold prose-strong:text-zinc-900 dark:prose-strong:text-zinc-50',
  'prose-blockquote:border-l-2 prose-blockquote:border-zinc-300 prose-blockquote:font-normal prose-blockquote:not-italic dark:prose-blockquote:border-zinc-700',
  'prose-img:rounded-lg',
].join(' ');

interface MessageBubbleProps {
  message: Message;
  streaming?: boolean;
  canRegenerate?: boolean;
  onRegenerate?: () => void;
  onDecideTool?: (callId: string, approved: boolean) => void;
  showJson?: boolean;
}

function MessageBubbleBase({
  message,
  streaming,
  canRegenerate,
  onRegenerate,
  onDecideTool,
  showJson = false,
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
    prev.showJson === next.showJson
  );
});

export default MessageBubble;

function UserMessage({ message }: { message: Message }) {
  return (
    <div className="flex justify-end px-4 py-3 sm:px-6">
      <div className="max-w-[85%] rounded-2xl rounded-tr-sm border border-overlay/[0.1] bg-overlay/[0.06] px-4 py-3">
        <p className="whitespace-pre-wrap break-words text-[14.5px] leading-7 text-zinc-800 dark:text-zinc-100">
          {message.content}
        </p>
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
}

function AssistantMessage({
  message,
  streaming,
  canRegenerate,
  onRegenerate,
  onDecideTool,
  showJson = false,
}: AssistantMessageProps) {
  const isError = message.status === 'error';
  const showEmptyPulse = streaming && !message.content && !message.thinking;
  const markdownComponents = useMemo(
    () => buildMarkdownComponents(!showJson),
    [showJson],
  );

  return (
    <div className="group/msg flex gap-3 px-4 py-4 sm:px-6">
      <div className="relative mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-overlay/[0.1] bg-overlay/[0.05]">
        <Sparkles className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-300" />
      </div>

      <div className="min-w-0 flex-1">
        {message.thinking ? <ThinkingPanel text={message.thinking} streaming={streaming} /> : null}

        {}
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
                    className="ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[0.15em] animate-blink rounded-sm bg-zinc-500 align-baseline dark:bg-zinc-400"
                  />
                ) : null}
              </div>
            ) : null}

            {!streaming && message.content ? (
              <MessageFooter message={message} canRegenerate={canRegenerate} onRegenerate={onRegenerate} />
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
}: {
  message: Message;
  canRegenerate?: boolean;
  onRegenerate?: () => void;
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
    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-zinc-500 opacity-70 transition-opacity group-hover/msg:opacity-100 dark:text-zinc-400">
      {message.model ? <span className="font-mono">{modelBadgeLabel(message.model)}</span> : null}

      <span aria-hidden>·</span>
      <span title={new Date(message.createdAt).toLocaleString()}>
        {formatClockTime(message.createdAt)}
      </span>

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

      <span aria-hidden>·</span>
      <div className="flex items-center gap-1">
        <FooterButton onClick={copy} label={copied ? 'Copied' : 'Copy reply'}>
          {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
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
      className="focus-ring flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-zinc-500 transition-colors hover:bg-overlay/[0.06] hover:text-zinc-800 dark:hover:text-zinc-100"
    >
      {children}
    </button>
  );
}

function ThinkingPanel({ text, streaming }: { text: string; streaming?: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-3 overflow-hidden rounded-xl border border-overlay/[0.08] bg-overlay/[0.03]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="focus-ring flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        <Brain className="h-3.5 w-3.5 shrink-0" />
        <span>{streaming ? 'Thinking…' : 'Thought process'}</span>
        <ChevronRight
          className={`ml-auto h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
        />
      </button>
      {open ? (
        <div className="thin-scrollbar max-h-72 overflow-y-auto border-t border-overlay/[0.08] px-3 py-2">
          <pre className="whitespace-pre-wrap break-words font-mono text-[11.5px] leading-relaxed text-zinc-500 dark:text-zinc-400">
            {text}
          </pre>
        </div>
      ) : null}
    </div>
  );
}

function ErrorCard({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-xl border border-red-500/25 bg-red-500/[0.06] px-3.5 py-3">
      <div className="flex gap-2.5">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500 dark:text-red-400" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-red-700 dark:text-red-300">Generation failed</p>
          <p className="mt-1 break-words text-[13px] leading-6 text-red-700/90 dark:text-red-300/80">
            {message}
          </p>
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="focus-ring mt-2 flex items-center gap-1.5 rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-500/20 dark:text-red-300"
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
      className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 dark:bg-zinc-500"
      style={{ animationDelay: delay, animationDuration: '900ms' }}
    />
  );
}
