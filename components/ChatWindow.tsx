'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  Eraser,
  Menu,
  Plug,
  Terminal,
  X,
} from 'lucide-react';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import { shortenModelName } from '@/lib/format';
import type { AgentMode, ChatSession, ConnectionState } from '@/types';

const PIN_THRESHOLD_PX = 96;

const SUGGESTIONS = [
  'Explain what this error means and how to fix it',
  'Write a Python script that renames every file in a folder',
  'Summarise the key trade-offs in three bullet points',
  'Draft a polite email asking a client to confirm a deadline',
];

interface ChatWindowProps {
  session: ChatSession | null;
  model: string | null;
  modelCount: number;
  streaming: boolean;
  error: string | null;
  connection: ConnectionState;
  connectionMessage: string;
  mode: AgentMode;
  onModeChange: (mode: AgentMode) => void;
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
  mode,
  onModeChange,
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
          : 'Select a model in Settings…'
    : 'Send a message…';

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col bg-app">
      {/* Header: current model name, Chat/Agent segmented toggle, and connection status dot */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
        {/* Left: Mobile menu & current model name */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onOpenSidebar}
            aria-label="Open sidebar"
            className="focus-ring -ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground md:hidden transition-colors"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <span className="truncate font-mono text-xs font-semibold text-foreground">
              {model ? shortenModelName(model) : 'No model selected'}
            </span>
          </div>
        </div>

        {/* Center: Chat / Agent Segmented Toggle */}
        <div
          role="group"
          aria-label="Mode"
          className="flex items-center rounded-lg border border-border bg-muted/60 p-0.5 text-xs font-medium"
        >
          <button
            type="button"
            onClick={() => onModeChange('chat')}
            aria-pressed={mode === 'chat'}
            className={`rounded-md px-3 py-1 text-xs transition-colors ${
              mode === 'chat'
                ? 'bg-panel text-foreground shadow-xs border border-border'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Chat
          </button>
          <button
            type="button"
            onClick={() => onModeChange('agent')}
            aria-pressed={mode === 'agent'}
            className={`rounded-md px-3 py-1 text-xs transition-colors ${
              mode === 'agent'
                ? 'bg-panel text-foreground shadow-xs border border-border'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Agent
          </button>
        </div>

        {/* Right: Connection status dot & Clear button */}
        <div className="flex items-center gap-3 shrink-0">
          <div
            className="flex items-center gap-1.5 text-xs text-muted-foreground"
            title={
              connection === 'online'
                ? 'Ollama online'
                : connection === 'checking'
                  ? 'Checking connection...'
                  : `Ollama offline: ${connectionMessage || 'unreachable'}`
            }
          >
            {connection === 'offline' ? (
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-red-600 dark:text-red-400">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                Offline
              </span>
            ) : connection === 'checking' ? (
              <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="h-2 w-2 animate-pulse rounded-full bg-zinc-400" />
                Checking
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-zinc-400 dark:bg-zinc-500" />
                Online
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onClear}
            disabled={isEmpty}
            title="Clear conversation"
            className="focus-ring flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <Eraser className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {/* Main Chat Canvas / Empty State */}
      {isEmpty ? (
        <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto">
          <div className="flex min-h-full flex-col items-center justify-center px-4 py-8">
            {connection === 'offline' ? (
              <ConnectionPanel message={connectionMessage} onRetry={onRetryConnection} />
            ) : connection === 'checking' ? (
              <LoadingModels />
            ) : modelCount === 0 ? (
              <NoModels />
            ) : (
              <div className="w-full max-w-2xl flex flex-col items-center">
                <h2 className="text-center text-2xl font-semibold tracking-tight text-foreground">
                  Web-LLM
                </h2>
                <p className="mt-1 text-center text-xs text-muted-foreground">
                  Private, local model inference running directly on your machine.
                </p>

                {/* Composer in empty state */}
                <div className="mt-8 w-full">
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

                {/* 3 to 4 clickable example prompts */}
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                  {SUGGESTIONS.map((text) => (
                    <button
                      key={text}
                      type="button"
                      disabled={disabled}
                      onClick={() => onSend(text)}
                      className="group flex items-center justify-between gap-2.5 rounded-lg border border-border bg-panel p-3 text-left transition-colors hover:bg-muted disabled:opacity-50"
                    >
                      <span className="text-xs text-foreground leading-relaxed">{text}</span>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Active Conversation Messages */}
          <div className="relative min-h-0 flex-1">
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              role="log"
              aria-busy={streaming}
              aria-label="Conversation"
              className="thin-scrollbar h-full overflow-y-auto"
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
                className="focus-ring absolute bottom-4 left-1/2 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border border-border bg-panel text-muted-foreground shadow-md transition-colors hover:text-foreground"
              >
                <ArrowDown className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          {/* Banner for dropped connection or error */}
          {banner ? (
            <div className="px-4 pb-2">
              <div className="mx-auto flex max-w-3xl items-start gap-2.5 rounded-lg border border-red-500/30 bg-red-500/[0.05] p-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                <p className="min-w-0 flex-1 break-words text-xs leading-relaxed text-red-600 dark:text-red-400">
                  {banner}
                </p>
                {error ? (
                  <button
                    type="button"
                    onClick={onDismissError}
                    aria-label="Dismiss error"
                    className="focus-ring rounded p-0.5 text-red-500 hover:bg-red-500/10 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* Fixed/Sticky Bottom Composer */}
          <div className="px-4 pb-4 pt-1 sm:px-6 sm:pb-5">
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
        className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-border border-t-foreground"
      />
      <p className="mt-3 text-xs text-muted-foreground">Looking for local models…</p>
    </div>
  );
}

function NoModels() {
  return (
    <div className="w-full max-w-md text-center">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted/50">
        <Terminal className="h-4 w-4 text-muted-foreground" />
      </div>
      <h2 className="mt-3 text-sm font-semibold tracking-tight text-foreground">
        No models installed yet
      </h2>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        Pull a model in your terminal and it will appear here automatically.
      </p>
      <div className="mt-4 space-y-2 text-left">
        <CommandLine command="ollama pull llama3.2" note="Small, fast, versatile" />
        <CommandLine command="ollama pull qwen2.5:7b" note="Strong at code and reasoning" />
        <CommandLine command="ollama pull deepseek-r1:8b" note="Chain-of-thought reasoning" />
      </div>
    </div>
  );
}

function CommandLine({ command, note }: { command: string; note: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
      <code className="font-mono text-xs text-foreground">{command}</code>
      <span className="text-[11px] text-muted-foreground">{note}</span>
    </div>
  );
}

function ConnectionPanel({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="mx-auto max-w-md rounded-lg border border-red-500/30 bg-red-500/[0.04] p-4 text-left">
      <div className="flex items-center gap-2">
        <Plug className="h-4 w-4 text-red-500" />
        <h2 className="text-xs font-semibold text-red-600 dark:text-red-400">
          Cannot reach Ollama
        </h2>
      </div>
      <p className="mt-1.5 break-words text-xs leading-relaxed text-red-600/90 dark:text-red-400/90">
        {message}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="focus-ring mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-500/20 dark:text-red-400 transition-colors"
      >
        Retry connection
      </button>
    </div>
  );
}
