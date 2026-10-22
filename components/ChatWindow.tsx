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
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Header } from '@/components/ui/Header';
import { Modal } from '@/components/ui/Modal';
import { modelBadgeLabel } from '@/lib/format';
import type { Attachment, ChatSession, ConnectionState } from '@/types';

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
  onSend: (text: string, attachments?: Attachment[]) => void;
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
  enterToSend: boolean;
  streamEnabled: boolean;
  showTimestamps: boolean;
  clearTarget: ChatSession | null;
  onCancelClear: () => void;
  onConfirmClear: () => void;
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
  enterToSend,
  streamEnabled,
  showTimestamps,
  clearTarget,
  onCancelClear,
  onConfirmClear,
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
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    card?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
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
  );
  const subtitle = isEmpty
    ? model
      ? modelBadgeLabel(model)
      : 'No model selected'
    : `${messages.length} ${messages.length === 1 ? 'message' : 'messages'}${
        model ? ` · ${modelBadgeLabel(model)}` : ''
      }`;

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col bg-canvas">
      <Header
        title={title}
        subtitle={subtitle}
        leading={
          <button
            type="button"
            onClick={onOpenSidebar}
            aria-label="Open sidebar"
            className="focus-ring -ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink md:hidden"
          >
            <Menu className="h-4 w-4" />
          </button>
        }
        actions={
          <>
            {connection === 'offline' ? (
              <span className="flex items-center gap-1.5 rounded-full border border-danger/25 bg-danger-soft px-2 py-1 text-2xs font-medium text-danger">
                <span className="h-1.5 w-1.5 rounded-full bg-danger" aria-hidden />
                Offline
              </span>
            ) : connection === 'checking' ? (
              <span className="flex items-center gap-1.5 rounded-full border border-line px-2 py-1 text-2xs text-ink-muted">
                <span
                  className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-muted motion-reduce:animate-none"
                  aria-hidden
                />
                Checking
              </span>
            ) : null}

            <button
              type="button"
              onClick={onClear}
              disabled={isEmpty}
              title="Clear this conversation's messages"
              className="focus-ring flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-ink-muted"
            >
              <Eraser className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Clear</span>
            </button>
          </>
        }
      />

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
                <h2 className="text-center text-2xl font-medium leading-tight tracking-tight text-ink">
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
                    enterToSend={enterToSend}
                    streamEnabled={streamEnabled}
                  />
                </div>

                <div className="mt-7 grid gap-2 sm:grid-cols-2">
                  {SUGGESTIONS.map(({ icon: Icon, text }) => (
                    <button
                      key={text}
                      type="button"
                      disabled={disabled}
                      onClick={() => onSend(text)}
                      className="group flex items-center gap-2.5 rounded-lg border border-line bg-surface px-4 py-3 text-left transition-colors duration-200 hover:border-line-strong hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0 text-ink-muted" />
                      <span className="min-w-0 flex-1 truncate text-xs text-ink-secondary">
                        {text}
                      </span>
                      <ArrowRight
                        aria-hidden
                        className="h-3.5 w-3.5 shrink-0 text-ink-muted opacity-0 transition-opacity duration-200 group-hover:opacity-100"
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
          <div className="relative min-h-0 flex-1">
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              role="log"
              aria-busy={streaming}
              aria-label="Conversation"
              className="thin-scrollbar h-full overflow-y-auto overscroll-contain"
            >
              <div
                className="mx-auto max-w-3xl"
                style={{ paddingTop: 'calc(var(--chat-density) * 0.5rem)', paddingBottom: 'calc(var(--chat-density) * 1.5rem)' }}
              >
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
                    showTimestamps={showTimestamps}
                  />
                ))}
              </div>
            </div>

            {!pinned && messages.length > 0 ? (
              <button
                type="button"
                onClick={() => scrollToBottom('smooth')}
                aria-label="Scroll to latest message"
                className="focus-ring absolute bottom-4 left-1/2 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full border border-line bg-surface text-ink-secondary shadow-calm-md transition-colors hover:text-ink"
              >
                <ArrowDown className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          {pendingApprovals > 0 ? (
            <div className="px-4 sm:px-6">
              <div className="mx-auto flex max-w-3xl items-center gap-2.5 rounded-lg border border-warning/30 bg-warning-soft px-3.5 py-2.5">
                <ShieldAlert className="h-4 w-4 shrink-0 text-warning" />
                <p className="min-w-0 flex-1 text-sm leading-6 text-warning">
                  {pendingApprovals === 1
                    ? 'An action is waiting for your approval.'
                    : `${pendingApprovals} actions are waiting for your approval.`}{' '}
                  The agent is paused until you Allow or Deny.
                </p>
                <Button variant="secondary" size="sm" onClick={scrollToApproval}>
                  Review
                </Button>
              </div>
            </div>
          ) : null}

          {/* A dropped connection mid-conversation is reported here rather than by
              replacing the feed, so the user keeps their transcript in view. */}
          {banner ? (
            <div className="px-4 sm:px-6">
              <div
                className={`mx-auto flex max-w-3xl items-start gap-2.5 rounded-lg border px-3.5 py-2.5 ${
                  error
                    ? 'border-danger/30 bg-danger-soft'
                    : 'border-warning/30 bg-warning-soft'
                }`}
              >
                <AlertTriangle
                  className={`mt-0.5 h-4 w-4 shrink-0 ${error ? 'text-danger' : 'text-warning'}`}
                />
                <p
                  className={`min-w-0 flex-1 break-words text-sm leading-6 ${
                    error ? 'text-danger' : 'text-warning'
                  }`}
                >
                  {banner}
                </p>
                {error ? (
                  <button
                    type="button"
                    onClick={onDismissError}
                    aria-label="Dismiss error"
                    className="focus-ring shrink-0 rounded-sm p-0.5 text-danger transition-colors hover:bg-danger/10"
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
              enterToSend={enterToSend}
              streamEnabled={streamEnabled}
            />
          </div>
        </>
      )}

      <Modal
        open={clearTarget !== null}
        onClose={onCancelClear}
        title="Clear this conversation?"
        size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={onCancelClear}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={onConfirmClear}>
              Clear messages
            </Button>
          </>
        }
      >
        <p className="px-5 py-4 text-sm leading-6 text-ink-secondary">
          Every message in &ldquo;{clearTarget?.title ?? 'this conversation'}&rdquo; will be removed.
          The conversation stays in your history. This cannot be undone.
        </p>
      </Modal>
    </div>
  );
}

function LoadingModels() {
  return (
    <div className="px-6 py-20 text-center">
      <div
        role="status"
        aria-label="Looking for local models"
        className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-line border-t-accent motion-reduce:animate-none"
      />
      <p className="mt-4 text-sm text-ink-muted">Looking for local models…</p>
    </div>
  );
}

function NoModels() {
  return (
    <div className="w-full max-w-xl text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg border border-line bg-surface-sunken">
        <Terminal className="h-5 w-5 text-ink-muted" />
      </div>
      <h2 className="mt-4 text-lg font-semibold tracking-tight text-ink">
        No models installed yet
      </h2>
      <p className="mt-2 text-sm leading-6 text-ink-muted">
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
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-md border border-line bg-surface-sunken px-3 py-2">
      <code className="font-mono text-xs text-ink">{command}</code>
      <span className="text-2xs text-ink-muted">{note}</span>
    </div>
  );
}

function ConnectionPanel({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card tone="warning" className="mx-auto max-w-xl p-5">
      <div className="flex items-center gap-2.5">
        <Plug className="h-4 w-4 text-warning" />
        <h2 className="text-sm font-semibold text-warning">Can&apos;t reach Ollama</h2>
      </div>
      <p className="mt-2 break-words text-sm leading-6 text-warning">{message}</p>

      <p className="mt-4 text-2xs font-semibold uppercase tracking-wider text-warning">
        To fix
      </p>
      <ol className="mt-2 space-y-1.5 text-sm leading-6 text-warning">
        <li>
          1. Start the Ollama service:{' '}
          <code className="font-mono text-xs">ollama serve</code>
        </li>
        <li>
          2. Confirm it responds: <code className="font-mono text-xs">ollama list</code>
        </li>
        <li>
          3. If you moved it, set{' '}
          <code className="font-mono text-xs">OLLAMA_BASE_URL</code> in{' '}
          <code className="font-mono text-xs">.env.local</code> and restart this app.
        </li>
      </ol>

      <Button variant="primary" size="sm" onClick={onRetry} className="mt-4">
        Retry connection
      </Button>
    </Card>
  );
}
