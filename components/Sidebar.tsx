'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  FolderTree,
  MessageSquare,
  RefreshCw,
  Settings,
  SlidersHorizontal,
  SquarePen,
  Trash2,
  Wrench,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatBytes, formatRelativeTime, shortenModelName } from '@/lib/format';
import type { AgentMode, ChatSession, ConnectionState, OllamaModel } from '@/types';

interface SidebarProps {
  models: OllamaModel[];
  modelsLoading: boolean;
  selectedModel: string | null;
  onSelectModel: (name: string) => void;
  onRefreshModels: () => void;
  sessions: ChatSession[];
  activeId: string | null;
  streaming: boolean;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
  connection: ConnectionState;
  newChatShortcut: string;
  mode: AgentMode;
  onModeChange: (mode: AgentMode) => void;
  workspace: string | null;
  onWorkspaceChange: (workspace: string | null) => void;
  onOpenSettings: () => void;
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({
  models,
  modelsLoading,
  selectedModel,
  onSelectModel,
  onRefreshModels,
  sessions,
  activeId,
  streaming,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  connection,
  newChatShortcut,
  mode,
  onModeChange,
  workspace,
  onWorkspaceChange,
  onOpenSettings,
  open,
  onClose,
}: SidebarProps) {
  return (
    <>
      {open ? (
        <div
          role="presentation"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-ink/40 md:hidden"
        />
      ) : null}

      <aside
        aria-label="Chat history and settings"
        className={`fixed inset-y-0 left-0 z-50 flex w-[272px] shrink-0 flex-col border-r border-line bg-surface transition-transform duration-200 ease-out md:static md:z-auto md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand: a quiet mark and a solid wordmark. No metallic gradient. */}
        <div className="flex h-14 shrink-0 items-center gap-2 px-3 pl-4">
          <p className="min-w-0 flex-1 truncate text-[15px] font-semibold tracking-tight text-ink">
            Web-LLM
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sidebar"
            className="focus-ring rounded-md p-1 text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink md:hidden"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex flex-col gap-2.5 px-3 pb-3">
          <Button
            variant="secondary"
            onClick={onNewChat}
            className="h-auto w-full justify-start gap-2.5 px-3 py-2.5"
          >
            <SquarePen className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden />
            <span className="flex-1">New chat</span>
            <kbd className="shrink-0 rounded-sm border border-line bg-surface-sunken px-1.5 py-0.5 font-mono text-2xs font-medium text-ink-muted">
              {newChatShortcut}
            </kbd>
          </Button>

          <ModelSelector
            models={models}
            loading={modelsLoading}
            selected={selectedModel}
            onSelect={onSelectModel}
            onRefresh={onRefreshModels}
            disabled={connection === 'offline'}
          />

          <ModeSelector
            mode={mode}
            onModeChange={onModeChange}
            workspace={workspace}
            onWorkspaceChange={onWorkspaceChange}
          />
        </div>

        {/* Conversation list, bucketed by recency so a long history stays scannable */}
        <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto px-2 pb-2">
          {sessions.length === 0 ? (
            <p className="px-3 py-8 text-center text-xs leading-5 text-ink-muted">
              No conversations yet.
              <br />
              Your chats are saved in this browser.
            </p>
          ) : (
            groupSessionsByDate(sessions).map((group) => (
              <div key={group.label}>
                <p className="px-2.5 pb-1 pt-3 text-2xs font-semibold uppercase tracking-wider text-ink-muted">
                  {group.label}
                </p>
                <ul className="space-y-0.5">
                  {group.sessions.map((session) => (
                    <ConversationRow
                      key={session.id}
                      session={session}
                      active={session.id === activeId}
                      streaming={streaming && session.id === activeId}
                      onSelect={() => onSelectSession(session.id)}
                      onDelete={() => onDeleteSession(session.id)}
                    />
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>

        {/* Footer: settings + connection */}
        <div className="flex shrink-0 items-center gap-2 border-t border-line px-2 py-2">
          <button
            type="button"
            onClick={onOpenSettings}
            aria-haspopup="dialog"
            className="focus-ring flex h-8 min-w-0 flex-1 items-center gap-2 rounded-md px-2 text-left text-xs font-medium text-ink-secondary transition-colors hover:bg-surface-hover hover:text-ink"
          >
            <Settings className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>Settings</span>
          </button>
          <ConnectionLabel state={connection} />
        </div>
      </aside>
    </>
  );
}

function ModelSelector({
  models,
  loading,
  selected,
  onSelect,
  onRefresh,
  disabled,
}: {
  models: OllamaModel[];
  loading: boolean;
  selected: string | null;
  onSelect: (name: string) => void;
  onRefresh: () => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const current = useMemo(() => models.find((m) => m.name === selected), [models, selected]);

  const label = loading
    ? 'Loading models…'
    : models.length === 0
      ? 'No models installed'
      : (current?.name ?? selected ?? 'Select a model');

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled || loading}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`focus-ring flex w-full items-center gap-2.5 rounded-md border px-2.5 py-2 text-left transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${
          open
            ? 'border-accent bg-surface'
            : 'border-line-strong bg-surface hover:bg-surface-hover'
        }`}
      >
        <SlidersHorizontal className="h-3.5 w-3.5 shrink-0 text-ink-muted" />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-mono text-xs font-medium text-ink">
            {shortenModelName(label)}
          </span>
          {current ? (
            <span className="mt-1 flex flex-wrap items-center gap-1">
              {current.parameterSize ? <span className="pill">{current.parameterSize}</span> : null}
              {current.quantization ? <span className="pill">{current.quantization}</span> : null}
              {current.size ? <span className="pill">{formatBytes(current.size)}</span> : null}
            </span>
          ) : null}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-ink-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open ? (
        <div
          role="listbox"
          className="animate-scale-in absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-lg border border-line bg-surface-raised shadow-calm-md"
        >
          <div className="thin-scrollbar max-h-56 overflow-y-auto p-1">
            {models.length === 0 ? (
              <p className="px-2.5 py-3 text-xs leading-5 text-ink-muted">
                No models found. Run{' '}
                <code className="font-mono text-2xs">ollama pull llama3.2</code> in a terminal.
              </p>
            ) : (
              models.map((m) => {
                const active = m.name === selected;
                return (
                  <button
                    key={m.name}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      onSelect(m.name);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center gap-2 rounded-sm px-2.5 py-2 text-left transition-colors ${
                      active ? 'bg-accent-soft' : 'hover:bg-surface-hover'
                    }`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-mono text-xs text-ink">
                        {shortenModelName(m.name)}
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-1">
                        {m.parameterSize ? <span className="pill">{m.parameterSize}</span> : null}
                        {m.quantization ? <span className="pill">{m.quantization}</span> : null}
                        {m.size ? <span className="pill">{formatBytes(m.size)}</span> : null}
                      </span>
                    </span>
                    {active ? <Check className="h-3.5 w-3.5 shrink-0 text-accent" /> : null}
                  </button>
                );
              })
            )}
          </div>

          <button
            type="button"
            onClick={onRefresh}
            className="focus-ring flex w-full items-center gap-2 border-t border-line px-2.5 py-2 text-2xs font-medium text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            Refresh model list
          </button>
        </div>
      ) : null}
    </div>
  );
}

function ConversationRow({
  session,
  active,
  streaming,
  onSelect,
  onDelete,
}: {
  session: ChatSession;
  active: boolean;
  streaming: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <li>
      <div
        className={`group/row relative flex items-center rounded-md transition-colors duration-200 ${
          active ? 'bg-accent-soft' : 'hover:bg-surface-hover'
        }`}
      >
        <button
          type="button"
          onClick={onSelect}
          aria-current={active ? 'true' : undefined}
          className="focus-ring flex min-w-0 flex-1 items-center gap-2 rounded-md px-2.5 py-2 text-left"
        >
          {streaming ? (
            <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center">
              <span
                className="h-2 w-2 animate-pulse rounded-full bg-accent motion-reduce:animate-none"
                aria-hidden
              />
            </span>
          ) : (
            <MessageSquare
              className={`h-3.5 w-3.5 shrink-0 ${active ? 'text-accent' : 'text-ink-muted'}`}
            />
          )}
          <span className="min-w-0 flex-1">
            <span
              className={`block truncate text-sm ${
                active ? 'font-medium text-ink' : 'text-ink-secondary'
              }`}
            >
              {session.title}
            </span>
            <span
              className={`block truncate text-2xs ${
                streaming ? 'text-accent' : 'text-ink-muted'
              }`}
            >
              {streaming
                ? 'Generating…'
                : `${formatRelativeTime(session.updatedAt)} · ${session.messages.length} messages`}
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
          aria-label={`Delete "${session.title}"`}
          title="Delete conversation"
          className="focus-ring mr-1 shrink-0 rounded-sm p-1.5 text-ink-muted opacity-0 transition-opacity duration-200 hover:bg-danger-soft hover:text-danger focus:opacity-100 group-hover/row:opacity-100"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </li>
  );
}

const MODES: Array<{ value: AgentMode; label: string; Icon: typeof Wrench; hint: string }> = [
  { value: 'chat', label: 'Chat', Icon: MessageSquare, hint: 'Plain conversation' },
  {
    value: 'agent',
    label: 'Agent',
    Icon: Wrench,
    hint: 'The model may read files in the workspace to answer',
  },
];

function ModeSelector({
  mode,
  onModeChange,
  workspace,
  onWorkspaceChange,
}: {
  mode: AgentMode;
  onModeChange: (mode: AgentMode) => void;
  workspace: string | null;
  onWorkspaceChange: (workspace: string | null) => void;
}) {
  return (
    <div>
      <div
        role="group"
        aria-label="Mode"
        className="flex items-center gap-0.5 rounded-md border border-line bg-surface-sunken p-0.5"
      >
        {MODES.map(({ value, label, Icon, hint }) => (
          <button
            key={value}
            type="button"
            onClick={() => onModeChange(value)}
            aria-pressed={mode === value}
            title={hint}
            className={`focus-ring flex flex-1 items-center justify-center gap-1.5 rounded-sm px-2 py-1.5 text-2xs font-medium transition-colors duration-200 ${
              mode === value
                ? 'bg-surface text-ink shadow-calm'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {mode === 'agent' ? (
        <div className="animate-fade-in mt-2">
          <label
            htmlFor="workspace"
            className="flex items-center gap-1.5 px-0.5 pb-1 text-2xs font-semibold uppercase tracking-wider text-ink-muted"
          >
            <FolderTree className="h-3 w-3" />
            Workspace
          </label>
          <input
            id="workspace"
            value={workspace ?? ''}
            onChange={(e) => onWorkspaceChange(e.target.value || null)}
            spellCheck={false}
            placeholder="Defaults to the project folder"
            className="field px-2.5 py-1.5 font-mono text-2xs placeholder:font-sans"
          />
          <p className="mt-1.5 px-0.5 text-2xs leading-4 text-ink-muted">
            Reads run freely inside this folder. Writes and shell commands each wait for
            your approval. Paths cannot escape the workspace.
          </p>
        </div>
      ) : (
        <p className="animate-fade-in mt-2 rounded-md border border-warning/25 bg-warning-soft px-2.5 py-2 text-2xs leading-4 text-warning">
          Chat cannot touch files. Switch to <strong className="font-semibold">Agent</strong> to
          read your project, write code, and run commands.
        </p>
      )}
    </div>
  );
}

interface SessionGroup {
  label: string;
  sessions: ChatSession[];
}
function groupSessionsByDate(sessions: ChatSession[]): SessionGroup[] {
  const startOfDay = (daysAgo: number) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - daysAgo);
    return d.getTime();
  };

  const today = startOfDay(0);
  const yesterday = startOfDay(1);
  const weekAgo = startOfDay(7);

  const groups: SessionGroup[] = [
    { label: 'Today', sessions: [] },
    { label: 'Yesterday', sessions: [] },
    { label: 'Previous 7 days', sessions: [] },
    { label: 'Older', sessions: [] },
  ];

  for (const session of sessions) {
    const t = session.updatedAt;
    if (t >= today) groups[0].sessions.push(session);
    else if (t >= yesterday) groups[1].sessions.push(session);
    else if (t >= weekAgo) groups[2].sessions.push(session);
    else groups[3].sessions.push(session);
  }

  return groups.filter((group) => group.sessions.length > 0);
}

function ConnectionLabel({ state }: { state: ConnectionState }) {
  const config = {
    checking: {
      dot: 'bg-ink-muted',
      pulse: true,
      text: 'Checking…',
      tone: 'text-ink-muted',
    },
    online: {
      dot: 'bg-success',
      pulse: false,
      text: 'Ollama online',
      tone: 'text-ink-secondary',
    },
    offline: {
      dot: 'bg-danger',
      pulse: false,
      text: 'Ollama offline',
      tone: 'text-danger',
    },
  }[state];

  return (
    <span className="flex items-center gap-2 text-2xs font-medium">
      <span
        className={`h-2 w-2 rounded-full ${config.dot} ${
          config.pulse ? 'animate-pulse motion-reduce:animate-none' : ''
        }`}
        aria-hidden
      />
      <span className={config.tone}>{config.text}</span>
    </span>
  );
}
