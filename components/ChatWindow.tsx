'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  Bug,
  Eraser,
  FileCode,
  ListChecks,
  Mail,
  Menu,
  Plug,
  ShieldAlert,
  Terminal,
  X,
} from 'lucide-react';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import { modelBadgeLabel } from '@/lib/format';
import type { ChatSession, ConnectionState } from '@/types';

const PIN_THRESHOLD_PX = 96;

const SUGGESTIONS = [
  { icon: Bug, text: 'Explain what this error means and how to fix it' },
  { icon: FileCode, text: 'Write a Python script that renames every file in a folder' },
  { icon: ListChecks, text: 'Summarise the key trade-offs in three bullet points' },
  { icon: Mail, text: 'Draft a polite email asking a client to confirm a deadline' },
] as const;

interface ChatWindowProps {
  session: ChatSession | null;
  model: string | null;
  modelCount: number;
  streaming: boolean;
  error: string | null;
  connection: ConnectionState;
  connectionMessage: string;
  onSend: (text: string) => void;
  onStop: () => void;
  onRegenerate: () => void;
  onClear: () => void;
  onRetryConnection: () => void;
  onDismissError: () => void;
  onOpenSidebar: () => void;
  hasSystemPrompt: boolean;
  onOpenSettings: () => void;
  onDecideTool: (callId: string, approved: boolean) => void;
  onNewChat: () => void;
  showJson: boolean;
}

export default function ChatWindow({
  session,
  model,
  modelCount,
  streaming,
  error,
  connection,
  connectionMessage,
  onSend,
  onStop,
  onRegenerate,
  onClear,
  onRetryConnection,
  onDismissError,
  onOpenSidebar,
  hasSystemPrompt,
  onOpenSettings,
  onDecideTool,
  onNewChat,
  showJson,
}: ChatWindowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [pinned, setPinned] = useState(true);

  const messages = useMemo(() => session?.messages ?? [], [session]);
  const lastIndex = messages.length - 1;
  const isEmpty = messages.length === 0;

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
    setPinned(true);
  }, []);

  const scrollToApproval = useCallback(() => {
    const card = scrollRef.current?.querySelector('[data-awaiting-approval="true"]');
    card?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    setPinned(distance < PIN_THRESHOLD_PX);
  }, []);

  const [announcement, setAnnouncement] = useState('');
  const hasStreamed = useRef(false);
  useEffect(() => {
    if (streaming) {
      hasStreamed.current = true;
      setAnnouncement('Generating a response');
    } else if (hasStreamed.current) {
      hasStreamed.current = false;
      setAnnouncement('Response finished');
    }
  }, [streaming]);

  useEffect(() => {
    if (!pinned) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, pinned, streaming]);

  useEffect(() => {
    setPinned(true);
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [session?.id]);

  const disabled = connection === 'offline' || modelCount === 0 || !model;
  const banner = error ?? (connection === 'offline' && !isEmpty ? connectionMessage : null);
  const placeholder = disabled
    ? connection === 'checking'
      ? 'Contacting Ollama…'
      : connection === 'offline'
        ? 'Ollama is not reachable…'
        : modelCount === 0
          ? 'Install a model to start chatting…'
          : 'Select a model in the sidebar…'
    : 'Send a message…';

  const title = session?.title && !isEmpty ? session.title : 'New chat';
  const pendingApprovals = messages.reduce(
    (n, m) => n + (m.toolCalls?.filter((c) => c.status === 'awaiting_approval').length ?? 0),
    0,
  );  const subtitle = isEmpty
    ? model
      ? modelBadgeLabel(model)
      : 'No model selected'
    : `${messages.length} ${messages.length === 1 ? 'message' : 'messages'}${
        model ? ` · ${modelBadgeLabel(model)}` : ''
      }`;

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col bg-transparent">
      {}
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-overlay/[0.06] px-3 sm:px-4">
        <button
          type="button"
          onClick={onOpenSidebar}
          aria-label="Open sidebar"
          className="focus-ring -ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-overlay/[0.06] hover:text-zinc-800 md:hidden dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <Menu className="h-4 w-4" />
        </button>

        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <h1 className="truncate text-[13.5px] font-semibold leading-tight tracking-tight text-zinc-900 dark:text-zinc-50">
            {title}
          </h1>
          <p className="mt-0.5 truncate text-[11px] leading-tight text-zinc-500 dark:text-zinc-400">
            {subtitle}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {}
          {connection === 'offline' ? (
            <span className="flex items-center gap-1.5 rounded-full border border-red-500/20 bg-red-500/10 px-2 py-1 text-[11px] font-medium text-red-600 dark:text-red-300">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
              Offline
            </span>
          ) : connection === 'checking' ? (
            <span className="flex items-center gap-1.5 rounded-full border border-overlay/[0.08] px-2 py-1 text-[11px] text-zinc-500 dark:text-zinc-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-400" />
              Checking
            </span>
          ) : null}

          <button
            type="button"
            onClick={onClear}
            disabled={isEmpty}
            title="Clear this conversation's messages"
            className="focus-ring flex h-8 items-center gap-1.5 rounded-lg px-2 text-[11.5px] font-medium text-zinc-500 transition-colors hover:bg-overlay/[0.06] hover:text-zinc-800 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-zinc-500 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            <Eraser className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        </div>
      </header>

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {isEmpty ? (
        <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto">
          <div className="flex min-h-full flex-col items-center justify-center px-6 py-10">
            {connection === 'offline' ? (
              <ConnectionPanel message={connectionMessage} onRetry={onRetryConnection} />
            ) : connection === 'checking' ? (
              <LoadingModels />
            ) : modelCount === 0 ? (
              <NoModels />
            ) : (
              <div className="w-full max-w-3xl">
                <h2 className="text-center text-[32px] font-normal leading-tight tracking-tight text-zinc-900 dark:text-zinc-50">
                  Hi, let&apos;s get into it
                </h2>

                <div className="mt-8">
                  <ChatInput
                    onSubmit={onSend}
                    onStop={onStop}
                    streaming={streaming}
                    disabled={disabled}
                    placeholder={placeholder}
                    modelLabel={model}
                    hasSystemPrompt={hasSystemPrompt}
                    onOpenSettings={onOpenSettings}
                    onNewChat={onNewChat}
                  />
                </div>

                <div className="mt-7 grid gap-2 sm:grid-cols-2">
                  {SUGGESTIONS.map(({ icon: Icon, text }) => (
                    <button
                      key={text}
                      type="button"
                      disabled={disabled}
                      onClick={() => onSend(text)}
                      className="group flex items-center gap-2.5 rounded-full border border-overlay/[0.06] bg-overlay/[0.02] px-4 py-2.5 text-left transition-all duration-200 hover:border-overlay/[0.15] hover:bg-overlay/[0.05] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0 text-zinc-500 dark:text-zinc-400" />
                      <span className="min-w-0 flex-1 truncate text-[12.5px] text-zinc-600 dark:text-zinc-300">
                        {text}
                      </span>
                      <ArrowRight
                        aria-hidden
                        className="h-3.5 w-3.5 shrink-0 -translate-x-1 text-zinc-400 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100 dark:text-zinc-500"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {}
          <div className="relative min-h-0 flex-1">
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              role="log"
              aria-busy={streaming}
              aria-label="Conversation"
              className="thin-scrollbar h-full overflow-y-auto overscroll-contain"
            >
              <div className="mx-auto max-w-3xl pb-6">
                {messages.map((message, index) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    streaming={streaming && index === lastIndex}
                    canRegenerate={
                      !streaming && index === lastIndex && message.role === 'assistant'
                    }
                    onRegenerate={onRegenerate}
                    onDecideTool={onDecideTool}
                    showJson={showJson}
                  />
                ))}
              </div>
            </div>

            {!pinned && messages.length > 0 ? (
              <button
                type="button"
                onClick={() => scrollToBottom('smooth')}
                aria-label="Scroll to latest message"
                className="glass-panel focus-ring absolute bottom-4 left-1/2 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full text-zinc-600 shadow-xl transition-all duration-200 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
              >
                <ArrowDown className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          {}
          {pendingApprovals > 0 ? (
            <div className="px-4 sm:px-6">
              <div className="mx-auto flex max-w-3xl items-center gap-2.5 rounded-xl border border-amber-500/35 bg-amber-500/[0.1] px-3.5 py-2.5">
                <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <p className="min-w-0 flex-1 text-[13px] leading-6 text-amber-800 dark:text-amber-100">
                  {pendingApprovals === 1
                    ? 'An action is waiting for your approval.'
                    : `${pendingApprovals} actions are waiting for your approval.`}{' '}
                  The agent is paused until you Allow or Deny.
                </p>
                <button
                  type="button"
                  onClick={scrollToApproval}
                  className="focus-ring shrink-0 rounded-lg border border-amber-500/40 bg-amber-500/15 px-2.5 py-1 text-[11.5px] font-medium text-amber-800 transition-colors hover:bg-amber-500/25 dark:text-amber-100"
                >
                  Review
                </button>
              </div>
            </div>
          ) : null}

          {/* A dropped connection mid-conversation is reported here rather than by
              replacing the feed, so the user keeps their transcript in view. */}
          {banner ? (
            <div className="px-4 sm:px-6">
              <div className="mx-auto flex max-w-3xl items-start gap-2.5 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] px-3.5 py-2.5">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <p className="min-w-0 flex-1 break-words text-[13px] leading-6 text-amber-700 dark:text-amber-200">
                  {banner}
                </p>
                {error ? (
                  <button
                    type="button"
                    onClick={onDismissError}
                    aria-label="Dismiss error"
                    className="focus-ring shrink-0 rounded-md p-0.5 text-amber-600 transition-colors hover:bg-amber-500/15 dark:text-amber-400"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="px-4 pb-4 pt-2 sm:px-6 sm:pb-6">
            <ChatInput
              onSubmit={onSend}
              onStop={onStop}
              streaming={streaming}
              disabled={disabled}
              placeholder={placeholder}
              modelLabel={model}
              hasSystemPrompt={hasSystemPrompt}
              onOpenSettings={onOpenSettings}
              onNewChat={onNewChat}
            />
          </div>
        </>
      )}
    </div>
  );
}

function LoadingModels() {
  return (
    <div className="px-6 py-20 text-center">
      <div
        role="status"
        aria-label="Looking for local models"
        className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-overlay/[0.12] border-t-indigo-500"
      />
      <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">Looking for local models…</p>
    </div>
  );
}

function NoModels() {
  return (
    <div className="w-full max-w-xl text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-overlay/[0.08] bg-overlay/[0.04]">
        <Terminal className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />
      </div>
      <h2 className="mt-4 text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
        No models installed yet
      </h2>
      <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
        Ollama is running, but it has nothing to chat with. Pull a model from a terminal
        and it will appear in the sidebar automatically.
      </p>
      <div className="mt-4 space-y-2 text-left">
        <CommandLine command="ollama pull llama3.2" note="Small, fast, good all-rounder" />
        <CommandLine command="ollama pull qwen2.5:7b" note="Strong at code and reasoning" />
        <CommandLine command="ollama pull deepseek-r1:7b" note="Shows its thinking step by step" />
      </div>
    </div>
  );
}

function CommandLine({ command, note }: { command: string; note: string }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-lg border border-overlay/[0.08] bg-overlay/[0.03] px-3 py-2">
      <code className="font-mono text-[12.5px] text-zinc-800 dark:text-zinc-200">{command}</code>
      <span className="text-[11px] text-zinc-500 dark:text-zinc-400">{note}</span>
    </div>
  );
}

function ConnectionPanel({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-5">
        <div className="flex items-center gap-2.5">
          <Plug className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <h2 className="text-sm font-semibold text-amber-800 dark:text-amber-200">
            Can&apos;t reach Ollama
          </h2>
        </div>
        <p className="mt-2 break-words text-[13px] leading-6 text-amber-700 dark:text-amber-200/80">
          {message}
        </p>

        <p className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300/80">
          To fix
        </p>
        <ol className="mt-2 space-y-1.5 text-[13px] leading-6 text-amber-700 dark:text-amber-200/80">
          <li>
            1. Start the Ollama service:{' '}
            <code className="font-mono text-[12.5px]">ollama serve</code>
          </li>
          <li>
            2. Confirm it responds: <code className="font-mono text-[12.5px]">ollama list</code>
          </li>
          <li>
            3. If you moved it, set{' '}
            <code className="font-mono text-[12.5px]">OLLAMA_BASE_URL</code> in{' '}
            <code className="font-mono text-[12.5px]">.env.local</code> and restart this app.
          </li>
        </ol>

        <button
          type="button"
          onClick={onRetry}
          className="focus-ring mt-4 rounded-lg border border-amber-500/30 bg-amber-500/15 px-3 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-500/25 dark:text-amber-200"
        >
          Retry connection
        </button>
      </div>
    </div>
  );
}
