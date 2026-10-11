'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  Cpu,
  FolderTree,
  MessageSquare,
  Moon,
  RefreshCw,
  Settings2,
  SlidersHorizontal,
  SquarePen,
  Sun,
  Trash2,
  Wrench,
  X,
} from 'lucide-react';
import { formatBytes, formatRelativeTime, shortenModelName } from '@/lib/format';
import type { AgentMode, ChatSession, ConnectionState, OllamaModel, ThemeMode } from '@/types';

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
  systemPrompt: string;
  onSystemPromptChange: (value: string) => void;
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  connection: ConnectionState;
  newChatShortcut: string;
  mode: AgentMode;
  onModeChange: (mode: AgentMode) => void;
  workspace: string | null;
  onWorkspaceChange: (workspace: string | null) => void;
  showJson: boolean;
  onShowJsonChange: (show: boolean) => void;
  settingsOpen: boolean;
  onToggleSettings: () => void;
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
  systemPrompt,
  onSystemPromptChange,
  theme,
  onThemeChange,
  connection,
  newChatShortcut,
  mode,
  onModeChange,
  workspace,
  onWorkspaceChange,
  showJson,
  onShowJsonChange,
  settingsOpen,
  onToggleSettings,
  open,
  onClose,
}: SidebarProps) {
  return (
    <>
      {open ? (
        <div
          role="presentation"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
        />
      ) : null}

      <aside
        aria-label="Chat history and settings"
        className={`glass-panel fixed inset-y-0 left-0 z-50 flex w-[272px] shrink-0 flex-col border-r transition-transform duration-200 ease-out md:static md:z-auto md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand — metallic wordmark on the navy ground, per the brand image */}
        <div className="flex h-14 shrink-0 items-center gap-2.5 px-4">
          <div className="relative flex h-7 w-7 items-center justify-center rounded-lg border border-overlay/[0.1] bg-overlay/[0.05]">
            <span aria-hidden className="ambient-glow-sm absolute inset-0 rounded-lg opacity-70" />
            <Cpu className="relative h-3.5 w-3.5 text-indigo-500 dark:text-indigo-300" />
          </div>
          <p className="logo-metallic min-w-0 flex-1 truncate text-[17px] font-semibold tracking-tight">
            Web-LLM
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sidebar"
            className="focus-ring rounded-md p-1 text-zinc-500 transition-colors hover:bg-overlay/[0.06] hover:text-zinc-800 md:hidden dark:hover:text-zinc-200"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex flex-col gap-2.5 px-3 pb-3">
          <button
            type="button"
            onClick={onNewChat}
            className="focus-ring group flex w-full items-center gap-2.5 rounded-xl bg-overlay/[0.05] px-3 py-2.5 text-left text-[13px] font-medium text-zinc-800 transition-colors duration-200 hover:bg-overlay/[0.09] dark:text-zinc-100"
          >
            <SquarePen className="h-4 w-4 shrink-0 text-zinc-500 transition-colors group-hover:text-indigo-500 dark:text-zinc-400 dark:group-hover:text-indigo-300" />
            <span className="flex-1">New chat</span>
            <kbd className="shrink-0 rounded border border-overlay/[0.1] bg-overlay/[0.05] px-1.5 py-0.5 font-mono text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
              {newChatShortcut}
            </kbd>
          </button>

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
            <p className="px-3 py-8 text-center text-[12.5px] leading-5 text-zinc-500 dark:text-zinc-400">
              No conversations yet.
              <br />
              Your chats are saved in this browser.
            </p>
          ) : (
            groupSessionsByDate(sessions).map((group) => (
              <div key={group.label}>
                <p className="px-2.5 pb-1 pt-3 text-[10.5px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
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

        {/* Settings */}
        <div className="shrink-0 border-t border-overlay/[0.08]">
          <button
            type="button"
            onClick={onToggleSettings}
            aria-expanded={settingsOpen}
            className="focus-ring flex w-full items-center gap-2 px-4 py-2.5 text-left text-[12.5px] font-medium text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            <Settings2 className="h-3.5 w-3.5" />
            <span>Settings</span>
            {systemPrompt.trim() ? (
              <span
                title="A custom system prompt is active"
                className="h-1.5 w-1.5 rounded-full bg-indigo-500 shadow-[0_0_6px_rgb(99_102_241_/_0.8)]"
              />
            ) : null}
            <ChevronDown
              className={`ml-auto h-3.5 w-3.5 transition-transform duration-200 ${settingsOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {settingsOpen ? (
            <div className="animate-fade-in px-3 pb-3">
              <label
                htmlFor="system-prompt"
                className="px-0.5 pb-1 text-[10.5px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
              >
                System prompt
              </label>
              <textarea
                id="system-prompt"
                value={systemPrompt}
                onChange={(e) => onSystemPromptChange(e.target.value)}
                rows={4}
                placeholder="You are a helpful programming assistant…"
                className="focus-ring thin-scrollbar w-full resize-y rounded-lg border border-overlay/[0.1] bg-overlay/[0.03] px-2.5 py-2 text-[12.5px] leading-5 text-zinc-800 transition-colors placeholder:text-zinc-500 focus:border-overlay/[0.2] dark:text-zinc-200"
              />
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <p className="text-[11px] leading-4 text-zinc-500 dark:text-zinc-400">
                  Applied to every message you send.
                </p>
                {systemPrompt ? (
                  <button
                    type="button"
                    onClick={() => onSystemPromptChange('')}
                    className="focus-ring shrink-0 rounded text-[11px] text-zinc-500 underline decoration-dotted underline-offset-2 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                  >
                    Reset
                  </button>
                ) : null}
              </div>

              <div className="mt-3 border-t border-overlay/[0.08] pt-3">
                <ToggleRow
                  label="Raw JSON output"
                  description="Show JSON blocks the model emits instead of collapsing them"
                  checked={showJson}
                  onChange={onShowJsonChange}
                />
              </div>
            </div>
          ) : null}

          {/* Footer: theme + connection */}
          <div className="flex items-center justify-between gap-2 border-t border-overlay/[0.08] px-3 py-2.5">
            <ThemeToggle theme={theme} onChange={onThemeChange} />
            <ConnectionLabel state={connection} />
          </div>
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
        className={`focus-ring flex w-full items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${
          open
            ? 'border-overlay/[0.2] bg-overlay/[0.06]'
            : 'border-overlay/[0.08] bg-overlay/[0.03] hover:border-overlay/[0.15] hover:bg-overlay/[0.05]'
        }`}
      >
        <SlidersHorizontal className="h-3.5 w-3.5 shrink-0 text-zinc-500 dark:text-zinc-400" />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-mono text-[12px] font-medium text-zinc-800 dark:text-zinc-100">
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
          className={`h-3.5 w-3.5 shrink-0 text-zinc-500 transition-transform duration-200 dark:text-zinc-400 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open ? (
        <div
          role="listbox"
          className="glass-panel animate-scale-in absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl shadow-2xl shadow-black/20 dark:shadow-black/50"
        >
          <div className="thin-scrollbar max-h-56 overflow-y-auto p-1">
            {models.length === 0 ? (
              <p className="px-2.5 py-3 text-[12px] leading-5 text-zinc-500 dark:text-zinc-400">
                No models found. Run{' '}
                <code className="font-mono text-[11.5px]">ollama pull llama3.2</code> in a terminal.
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
                    className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors ${
                      active ? 'bg-overlay/[0.08]' : 'hover:bg-overlay/[0.05]'
                    }`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-mono text-[12px] text-zinc-800 dark:text-zinc-100">
                        {shortenModelName(m.name)}
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-1">
                        {m.parameterSize ? <span className="pill">{m.parameterSize}</span> : null}
                        {m.quantization ? <span className="pill">{m.quantization}</span> : null}
                        {m.size ? <span className="pill">{formatBytes(m.size)}</span> : null}
                      </span>
                    </span>
                    {active ? (
                      <Check className="h-3.5 w-3.5 shrink-0 text-indigo-500 dark:text-indigo-400" />
                    ) : null}
                  </button>
                );
              })
            )}
          </div>

          <button
            type="button"
            onClick={onRefresh}
            className="focus-ring flex w-full items-center gap-2 border-t border-overlay/[0.08] px-2.5 py-2 text-[11.5px] font-medium text-zinc-500 transition-colors hover:bg-overlay/[0.04] hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
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
        className={`group/row relative flex items-center rounded-xl transition-colors duration-200 ${
          active ? 'bg-overlay/[0.08]' : 'hover:bg-overlay/[0.05]'
        }`}
      >
        <button
          type="button"
          onClick={onSelect}
          aria-current={active ? 'true' : undefined}
          className="focus-ring flex min-w-0 flex-1 items-center gap-2 rounded-xl px-2.5 py-2 text-left"
        >
          {streaming ? (
            <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500" />
              </span>
            </span>
          ) : (
            <MessageSquare
              className={`h-3.5 w-3.5 shrink-0 ${active ? 'text-zinc-500 dark:text-zinc-300' : 'text-zinc-400 dark:text-zinc-500'}`}
            />
          )}
          <span className="min-w-0 flex-1">
            <span
              className={`block truncate text-[13px] ${
                active
                  ? 'font-medium text-zinc-900 dark:text-zinc-50'
                  : 'text-zinc-600 dark:text-zinc-400'
              }`}
            >
              {session.title}
            </span>
            <span
              className={`block truncate text-[10.5px] ${
                streaming ? 'text-indigo-600 dark:text-indigo-300' : 'text-zinc-500 dark:text-zinc-400'
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
          className="focus-ring mr-1 shrink-0 rounded-md p-1.5 text-zinc-500 opacity-0 transition-all duration-200 hover:bg-red-500/10 hover:text-red-600 focus:opacity-100 group-hover/row:opacity-100 dark:hover:text-red-400"
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
        className="flex items-center gap-0.5 rounded-xl border border-overlay/[0.08] bg-overlay/[0.03] p-0.5"
      >
        {MODES.map(({ value, label, Icon, hint }) => (
          <button
            key={value}
            type="button"
            onClick={() => onModeChange(value)}
            aria-pressed={mode === value}
            title={hint}
            className={`focus-ring flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[11.5px] font-medium transition-all duration-200 ${
              mode === value
                ? 'bg-overlay/[0.1] text-zinc-900 shadow-sm dark:text-zinc-50'
                : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
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
            className="flex items-center gap-1.5 px-0.5 pb-1 text-[10.5px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
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
            className="focus-ring w-full rounded-lg border border-overlay/[0.1] bg-overlay/[0.03] px-2.5 py-1.5 font-mono text-[11.5px] text-zinc-800 transition-colors placeholder:font-sans placeholder:text-zinc-500 focus:border-overlay/[0.2] dark:text-zinc-200"
          />
          <p className="mt-1.5 px-0.5 text-[10.5px] leading-4 text-zinc-500 dark:text-zinc-400">
            Reads run freely inside this folder. Writes and shell commands each wait for
            your approval. Paths cannot escape the workspace.
          </p>
        </div>
      ) : (
        <p className="animate-fade-in mt-2 rounded-lg border border-amber-500/25 bg-amber-500/[0.06] px-2.5 py-2 text-[10.5px] leading-4 text-amber-700 dark:text-amber-200">
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

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[12px] font-medium text-zinc-700 dark:text-zinc-200">{label}</p>
        <p className="mt-0.5 text-[10.5px] leading-4 text-zinc-500 dark:text-zinc-400">
          {description}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`focus-ring relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors duration-200 ${
          checked ? 'bg-indigo-500' : 'bg-overlay/[0.15]'
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all duration-200 ${
            checked ? 'left-[18px]' : 'left-0.5'
          }`}
        />
      </button>
    </div>
  );
}

function ThemeToggle({ theme, onChange }: { theme: ThemeMode; onChange: (t: ThemeMode) => void }) {
  const options: Array<{ value: ThemeMode; label: string; Icon: typeof Sun }> = [
    { value: 'light', label: 'Light theme', Icon: Sun },
    { value: 'dark', label: 'Dark theme', Icon: Moon },
  ];

  return (
    <div
      role="group"
      aria-label="Colour theme"
      className="flex items-center gap-0.5 rounded-lg border border-overlay/[0.08] bg-overlay/[0.03] p-0.5"
    >
      {options.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange(value)}
          aria-label={label}
          aria-pressed={theme === value}
          title={label}
          className={`focus-ring flex h-6 w-6 items-center justify-center rounded-md transition-all duration-200 ${
            theme === value
              ? 'bg-overlay/[0.1] text-zinc-900 shadow-sm dark:text-zinc-50'
              : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
          }`}
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
}

function ConnectionLabel({ state }: { state: ConnectionState }) {
  const config = {
    checking: { dot: 'bg-zinc-400', ping: false, text: 'Checking…', tone: 'text-zinc-500 dark:text-zinc-400' },
    online: {
      dot: 'bg-emerald-400',
      ping: true,
      text: 'Ollama online',
      tone: 'text-zinc-600 dark:text-zinc-300',
    },
    offline: { dot: 'bg-red-500', ping: false, text: 'Ollama offline', tone: 'text-red-600 dark:text-red-400' },
  }[state];

  return (
    <span className="flex items-center gap-2 text-[11px] font-medium">
      <span className="relative flex h-2 w-2">
        {config.ping ? (
          <span
            className={`absolute inline-flex h-full w-full animate-ping rounded-full ${config.dot} opacity-60`}
          />
        ) : null}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${config.dot}`} />
      </span>
      <span className={config.tone}>{config.text}</span>
    </span>
  );
}
