'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Activity,
  Check,
  Database,
  Download,
  LayoutList,
  Loader2,
  MessageSquare,
  Moon,
  Palette,
  Plug,
  RotateCcw,
  SlidersHorizontal,
  Sun,
  Trash2,
  TriangleAlert,
  Upload,
  X,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/Segmented';
import { Switch } from '@/components/ui/Switch';
import { cn } from '@/lib/cn';
import { formatBytes, shortenModelName } from '@/lib/format';
import {
  MAX_TOKENS_RANGE,
  TEMPERATURE_RANGE,
  buildExport,
  clearAllData,
  parseExport,
  storageSize,
} from '@/lib/storage';
import type {
  ChatSession,
  ConnectionState,
  Density,
  FontSize,
  OllamaModel,
  Settings,
  ThemeMode,
} from '@/types';

export interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  models: OllamaModel[];
  modelsLoading: boolean;
  connection: ConnectionState;
  connectionMessage: string;
  onTestConnection: () => Promise<boolean>;
  sessions: ChatSession[];
  activeId: string | null;
  onImportSessions: (sessions: ChatSession[]) => void;
  onClearConversation: () => void;
  onDeleteAllSessions: () => void;
  onResetSettings: () => void;
  onDataCleared: () => void;
}

export type SettingsSection = 'appearance' | 'model' | 'chat' | 'data' | 'status';

export const SECTIONS: Array<{ id: SettingsSection; label: string; Icon: typeof Palette }> = [
  { id: 'appearance', label: 'Appearance', Icon: Palette },
  { id: 'model', label: 'Model', Icon: SlidersHorizontal },
  { id: 'chat', label: 'Chat', Icon: MessageSquare },
  { id: 'data', label: 'Data', Icon: Database },
  { id: 'status', label: 'Status', Icon: Activity },
];

export default function SettingsDialog({
  open,
  onClose,
  settings,
  onChange,
  models,
  modelsLoading,
  connection,
  connectionMessage,
  onTestConnection,
  sessions,
  activeId,
  onImportSessions,
  onClearConversation,
  onDeleteAllSessions,
  onResetSettings,
  onDataCleared,
}: SettingsDialogProps) {
  const [section, setSection] = useState<SettingsSection>('appearance');
  const [confirm, setConfirm] = useState<null | 'delete-all' | 'clear-data' | 'reset'>(null);
  const onConfirmDeleteAll = () => setConfirm('delete-all');
  const onConfirmClearData = () => setConfirm('clear-data');

  return (
    <>
    <Modal
      open={open}
      onClose={onClose}
      title="Settings"
      description="Changes apply immediately and are saved in this browser."
      size="lg"
      footer={
        <>
          <ConfirmResetButton onClick={() => setConfirm('reset')} />
          <Button variant="primary" size="sm" onClick={onClose}>
            Done
          </Button>
        </>
      }
    >
      <div className="flex flex-col sm:flex-row">
        {/* Section navigation */}
        <SettingsSectionNav section={section} onSelect={setSection} />

        <div className="min-w-0 flex-1 px-5 py-4">
          {renderSection(section, {
            settings,
            onChange,
            models,
            modelsLoading,
            connection,
            connectionMessage,
            onTestConnection,
            sessions,
            activeId,
            onImportSessions,
            onClearConversation,
            onDeleteAllSessions,
            onDataCleared,
            onConfirmDeleteAll,
            onConfirmClearData,
            onConfirmReset: () => setConfirm('reset'),
            onResetSettings,
          })}
        </div>
      </div>
    </Modal>

    <Modal
      open={confirm !== null}
      onClose={() => setConfirm(null)}
      title={
        confirm === 'delete-all'
          ? 'Delete all conversations?'
          : confirm === 'clear-data'
            ? 'Clear all stored data?'
            : 'Reset all settings?'
      }
      size="sm"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={() => setConfirm(null)}>
            Cancel
          </Button>
          <Button
            variant={confirm === 'reset' ? 'primary' : 'danger'}
            size="sm"
            onClick={() => {
              const action = confirm;
              setConfirm(null);
              if (action === 'delete-all') onDeleteAllSessions();
              else if (action === 'clear-data') {
                onDataCleared();
                window.location.reload();
              } else if (action === 'reset') onResetSettings();
            }}
          >
            {confirm === 'delete-all'
              ? 'Delete all'
              : confirm === 'clear-data'
                ? 'Clear everything'
                : 'Reset'}
          </Button>
        </>
      }
    >
      <p className="px-5 py-4 text-sm leading-6 text-ink-secondary">
        {confirm === 'delete-all'
          ? 'Every saved conversation will be permanently removed from this browser. This cannot be undone — export first if you want a copy.'
          : confirm === 'clear-data'
            ? 'This permanently deletes every conversation and resets all settings to their defaults. The page will reload.'
            : 'Theme, model, sampler, and chat preferences return to their defaults. Conversations are kept.'}
      </p>
    </Modal>
    </>
  );
}

export interface SettingsFieldProps {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  models: OllamaModel[];
  modelsLoading: boolean;
  connection: ConnectionState;
  connectionMessage: string;
  onTestConnection: () => Promise<boolean>;
  sessions: ChatSession[];
  activeId: string | null;
  onImportSessions: (sessions: ChatSession[]) => void;
  onClearConversation: () => void;
  onDeleteAllSessions: () => void;
  onResetSettings: () => void;
  onDataCleared: () => void;
  /** Only the embedded dialog needs these; the standalone sheet owns confirmation. */
  onConfirmDeleteAll?: () => void;
  onConfirmClearData?: () => void;
  onConfirmReset?: () => void;
}

/**
 * Renders one settings section as plain fields — no dialog of its own — so the
 * embedded dialog and the mobile sheet share a single modal layer.
 */
export function renderSection(section: SettingsSection, props: SettingsFieldProps) {
  switch (section) {
    case 'appearance':
      return <AppearanceSection settings={props.settings} onChange={props.onChange} />;
    case 'model':
      return (
        <ModelSection settings={props.settings} onChange={props.onChange} models={props.models} />
      );
    case 'chat':
      return (
        <ChatSection
          settings={props.settings}
          onChange={props.onChange}
          sessionCount={props.sessions.length}
          hasActive={!!props.activeId}
          onClearConversation={props.onClearConversation}
        />
      );
    case 'data':
      return (
        <DataSection
          sessions={props.sessions}
          onImportSessions={props.onImportSessions}
          onDeleteAll={props.onConfirmDeleteAll ?? (() => undefined)}
          onClearData={props.onConfirmClearData ?? (() => undefined)}
        />
      );
    case 'status':
      return (
        <StatusSection
          settings={props.settings}
          models={props.models}
          modelsLoading={props.modelsLoading}
          connection={props.connection}
          connectionMessage={props.connectionMessage}
          onTestConnection={props.onTestConnection}
        />
      );
  }
}

export function SettingsSectionNav({
  section,
  onSelect,
}: {
  section: SettingsSection;
  onSelect: (section: SettingsSection) => void;
}) {
  return (
    <nav
      aria-label="Settings sections"
      className="flex shrink-0 gap-1 overflow-x-auto border-b border-line p-2 sm:w-44 sm:flex-col sm:overflow-visible sm:border-b-0 sm:border-r sm:p-3"
    >
      {SECTIONS.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onSelect(id)}
          aria-current={section === id ? 'page' : undefined}
          className={cn(
            'focus-ring flex shrink-0 items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors',
            section === id
              ? 'bg-surface-sunken font-medium text-ink'
              : 'text-ink-secondary hover:bg-surface-hover hover:text-ink',
          )}
        >
          <Icon className="h-4 w-4" aria-hidden />
          {label}
        </button>
      ))}
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* Appearance                                                          */
/* ------------------------------------------------------------------ */

const FONT_OPTIONS: ReadonlyArray<{ value: FontSize; label: string; title: string }> = [
  { value: 'sm', label: 'Small', title: '14px' },
  { value: 'default', label: 'Default', title: '15px' },
  { value: 'lg', label: 'Large', title: '17px' },
  { value: 'xl', label: 'Extra large', title: '19px' },
];

const DENSITY_OPTIONS: ReadonlyArray<{ value: Density; label: string; icon: React.ReactNode }> = [
  { value: 'compact', label: 'Compact', icon: <LayoutList className="h-3.5 w-3.5" /> },
  { value: 'comfortable', label: 'Comfortable', icon: <LayoutList className="h-3.5 w-3.5 rotate-180" /> },
];

function AppearanceSection({
  settings,
  onChange,
}: {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
}) {
  return (
    <div className="space-y-6">
      <Field label="Theme" htmlFor="theme">
        <Segmented<ThemeMode>
          label="Theme"
          value={settings.theme}
          onChange={(theme) => onChange({ theme })}
          options={[
            { value: 'light', label: 'Light', icon: <Sun className="h-3.5 w-3.5" /> },
            { value: 'dark', label: 'Dark', icon: <Moon className="h-3.5 w-3.5" /> },
          ]}
        />
      </Field>

      <Field label="Font size" htmlFor="font-size" hint="Applies to the conversation text.">
        <Segmented<FontSize>
          label="Font size"
          value={settings.fontSize}
          onChange={(fontSize) => onChange({ fontSize })}
          options={FONT_OPTIONS}
        />
      </Field>

      <Field label="Chat layout" htmlFor="density" hint="Compact tightens spacing between messages.">
        <Segmented<Density>
          label="Chat layout"
          value={settings.density}
          onChange={(density) => onChange({ density })}
          options={DENSITY_OPTIONS}
        />
      </Field>

      <Field label="Show timestamps" hint="Display the time next to each reply's metadata.">
        <Switch
          label="Show timestamps"
          checked={settings.showTimestamps}
          onChange={(showTimestamps) => onChange({ showTimestamps })}
        />
      </Field>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Model                                                               */
/* ------------------------------------------------------------------ */

function ModelSection({
  settings,
  onChange,
  models,
}: {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  models: OllamaModel[];
}) {
  return (
    <div className="space-y-6">
      <Field
        label="Model"
        htmlFor="model"
        hint={
          models.length === 0
            ? 'No models found yet. Run `ollama pull <model>` in a terminal.'
            : undefined
        }
      >
        <select
          id="model"
          value={settings.selectedModel ?? ''}
          onChange={(e) => onChange({ selectedModel: e.target.value || null })}
          className="field h-9 cursor-pointer py-0 font-mono text-xs"
        >
          {settings.selectedModel && !models.some((m) => m.name === settings.selectedModel) ? (
            <option value={settings.selectedModel}>
              {settings.selectedModel} (not installed)
            </option>
          ) : null}
          {!settings.selectedModel ? <option value="">Select a model…</option> : null}
          {models.map((m) => (
            <option key={m.name} value={m.name}>
              {m.name}
              {m.parameterSize ? ` · ${m.parameterSize}` : ''}
            </option>
          ))}
        </select>
      </Field>

      <SliderField
        label="Temperature"
        hint="Lower is focused and deterministic; higher is more varied."
        value={settings.temperature}
        min={TEMPERATURE_RANGE.min}
        max={TEMPERATURE_RANGE.max}
        step={TEMPERATURE_RANGE.step}
        format={(v) => v.toFixed(2)}
        onChange={(temperature) => onChange({ temperature })}
      />

      <SliderField
        label="Maximum output tokens"
        hint="Upper bound on the length of each reply."
        value={settings.maxTokens}
        min={MAX_TOKENS_RANGE.min}
        max={MAX_TOKENS_RANGE.max}
        step={MAX_TOKENS_RANGE.step}
        format={(v) => v.toLocaleString()}
        onChange={(maxTokens) => onChange({ maxTokens })}
      />

      <Field
        label="System prompt"
        htmlFor="system-prompt"
        hint="Sent at the start of every conversation."
        action={
          settings.systemPrompt ? (
            <button
              type="button"
              onClick={() => onChange({ systemPrompt: '' })}
              className="focus-ring rounded-sm text-xs text-ink-muted underline decoration-line-strong underline-offset-2 hover:text-ink"
            >
              Reset
            </button>
          ) : null
        }
      >
        <textarea
          id="system-prompt"
          value={settings.systemPrompt}
          onChange={(e) => onChange({ systemPrompt: e.target.value })}
          rows={5}
          placeholder="You are a helpful assistant…"
          className="field thin-scrollbar resize-y text-sm leading-6"
        />
        <p className="mt-1.5 text-2xs tabular-nums text-ink-muted">
          {settings.systemPrompt.length.toLocaleString()} characters
        </p>
      </Field>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Chat                                                                */
/* ------------------------------------------------------------------ */

function ChatSection({
  settings,
  onChange,
  sessionCount,
  hasActive,
  onClearConversation,
}: {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  sessionCount: number;
  hasActive: boolean;
  onClearConversation: () => void;
}) {
  const enterLabel = settings.enterToSend ? 'Enter' : 'Shift + Enter';
  const newlineLabel = settings.enterToSend ? 'Shift + Enter' : 'Enter';

  return (
    <div className="space-y-6">
      <Field label="Send with Enter" hint={`${enterLabel} sends · ${newlineLabel} adds a new line.`}>
        <Switch
          label="Send with Enter"
          checked={settings.enterToSend}
          onChange={(enterToSend) => onChange({ enterToSend })}
        />
      </Field>

      <Field
        label="Stream responses"
        hint="Show tokens as they arrive. Turning this off waits for the full reply."
      >
        <Switch
          label="Stream responses"
          checked={settings.streaming}
          onChange={(streaming) => onChange({ streaming })}
        />
      </Field>

      <Field label="Raw JSON output" hint="Show JSON blocks the model emits instead of collapsing them.">
        <Switch
          label="Raw JSON output"
          checked={settings.showJson === true}
          onChange={(showJson) => onChange({ showJson })}
        />
      </Field>

      <div className="space-y-2 border-t border-line pt-4">
        <p className="text-sm font-medium text-ink">Conversation</p>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-ink-muted">
            {hasActive
              ? 'Remove every message from the open conversation.'
              : 'Open a conversation to clear its messages.'}
          </p>
          <Button variant="secondary" size="sm" onClick={onClearConversation} disabled={!hasActive}>
            <X className="h-3.5 w-3.5" />
            Clear conversation
          </Button>
        </div>
        <p className="text-2xs text-ink-muted">
          {sessionCount} {sessionCount === 1 ? 'conversation' : 'conversations'} saved
          {hasActive ? ' · history lives in the sidebar' : ''}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Data                                                                */
/* ------------------------------------------------------------------ */

function DataSection({
  sessions,
  onImportSessions,
  onDeleteAll,
  onClearData,
}: {
  sessions: ChatSession[];
  onImportSessions: (sessions: ChatSession[]) => void;
  onDeleteAll: () => void;
  onClearData: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [size, setSize] = useState(0);

  useEffect(() => {
    setSize(storageSize());
  }, [sessions]);

  const exportAll = () => {
    if (sessions.length === 0) return;
    const blob = new Blob([JSON.stringify(buildExport(sessions), null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `web-llm-conversations-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    setStatus({
      tone: 'ok',
      text: `Exported ${sessions.length} ${sessions.length === 1 ? 'conversation' : 'conversations'}.`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium text-ink">Export conversations</p>
          <p className="mt-0.5 text-xs leading-5 text-ink-muted">
            Download all {sessions.length} {sessions.length === 1 ? 'conversation' : 'conversations'}{' '}
            as a JSON file. Attachments are included.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={exportAll} disabled={sessions.length === 0}>
            <Download className="h-3.5 w-3.5" />
            Export JSON
          </Button>
          <Button size="sm" onClick={() => fileRef.current?.click()}>
            <Upload className="h-3.5 w-3.5" />
            Import
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (!file) return;
              const parsed = parseExport(await file.text());
              if (!parsed) {
                setStatus({ tone: 'error', text: 'That file does not contain any conversations.' });
                return;
              }
              onImportSessions(parsed);
              setStatus({
                tone: 'ok',
                text: `Imported ${parsed.length} ${parsed.length === 1 ? 'conversation' : 'conversations'}.`,
              });
            }}
          />
        </div>
        {status ? (
          <p role="status" className="flex items-center gap-1.5 text-xs text-ink-secondary">
            {status.tone === 'error' ? (
              <TriangleAlert className="h-3.5 w-3.5" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            {status.text}
          </p>
        ) : null}
      </div>

      <div className="space-y-3 border-t border-line pt-4">
        <div>
          <p className="text-sm font-medium text-ink">Stored data</p>
          <p className="mt-0.5 text-xs leading-5 text-ink-muted">
            About {formatBytes(size)} in this browser&apos;s local storage. Nothing leaves your
            machine.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-medium text-ink">Delete all conversations</p>
            <p className="mt-0.5 text-2xs leading-4 text-ink-muted">
              Removes every saved chat. Preferences are kept.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={onDeleteAll}
            disabled={sessions.length === 0}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-medium text-ink">Clear all stored data</p>
            <p className="mt-0.5 text-2xs leading-4 text-ink-muted">
              Deletes conversations, preferences, and the remembered model.
            </p>
          </div>
          <Button variant="danger" size="sm" onClick={onClearData}>
            <Trash2 className="h-3.5 w-3.5" />
            Clear data
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Status                                                              */
/* ------------------------------------------------------------------ */

function StatusSection({
  settings,
  models,
  modelsLoading,
  connection,
  connectionMessage,
  onTestConnection,
}: {
  settings: Settings;
  models: OllamaModel[];
  modelsLoading: boolean;
  connection: ConnectionState;
  connectionMessage: string;
  onTestConnection: () => Promise<boolean>;
}) {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; at: number } | null>(null);

  const test = async () => {
    setTesting(true);
    const ok = await onTestConnection();
    setTesting(false);
    setResult({ ok, at: Date.now() });
  };

  const selected = models.find((m) => m.name === settings.selectedModel);

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-line p-4">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'h-2 w-2 rounded-full',
              connection === 'online'
                ? 'bg-ink'
                : connection === 'offline'
                  ? 'bg-transparent ring-2 ring-ink'
                  : 'animate-pulse bg-ink-muted motion-reduce:animate-none',
            )}
            aria-hidden
          />
          <p className="text-sm font-medium text-ink">
            {connection === 'online'
              ? 'Connected to Ollama'
              : connection === 'offline'
                ? 'Ollama is not reachable'
                : 'Checking connection…'}
          </p>
        </div>
        {connectionMessage ? (
          <p className="mt-1.5 break-words text-xs leading-5 text-ink-secondary">
            {connectionMessage}
          </p>
        ) : null}
        <Button variant="secondary" size="sm" className="mt-3" onClick={test} disabled={testing}>
          {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plug className="h-3.5 w-3.5" />}
          {testing ? 'Testing…' : 'Test connection'}
        </Button>
        {result ? (
          <p
            role="status"
            className="mt-2 flex items-center gap-1.5 text-xs text-ink-secondary"
          >
            {result.ok ? <Check className="h-3.5 w-3.5" /> : <TriangleAlert className="h-3.5 w-3.5" />}
            {result.ok
              ? `Connection successful · ${new Date(result.at).toLocaleTimeString()}`
              : `Connection failed · ${new Date(result.at).toLocaleTimeString()}`}
          </p>
        ) : null}
      </div>

      <dl className="divide-y divide-line rounded-lg border border-line text-sm">
        <StatusRow label="Selected model">
          {settings.selectedModel ? (
            <span className="font-mono text-xs">{shortenModelName(settings.selectedModel)}</span>
          ) : (
            <span className="text-ink-muted">None</span>
          )}
        </StatusRow>
        <StatusRow label="Installed models">
          {modelsLoading ? (
            <span className="flex items-center gap-1.5 text-ink-muted">
              <Loader2 className="h-3 w-3 animate-spin" /> Loading
            </span>
          ) : (
            <span className="tabular-nums">{models.length}</span>
          )}
        </StatusRow>
        {selected ? (
          <>
            <StatusRow label="Parameters">{selected.parameterSize ?? '—'}</StatusRow>
            <StatusRow label="Quantization">{selected.quantization ?? '—'}</StatusRow>
            <StatusRow label="Size on disk">{formatBytes(selected.size)}</StatusRow>
          </>
        ) : null}
        <StatusRow label="Temperature">{settings.temperature.toFixed(2)}</StatusRow>
        <StatusRow label="Max tokens">{settings.maxTokens.toLocaleString()}</StatusRow>
      </dl>
    </div>
  );
}

function StatusRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5">
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="min-w-0 truncate text-right text-xs text-ink">{children}</dd>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Primitives in this file                                             */
/* ------------------------------------------------------------------ */

function Field({
  label,
  htmlFor,
  hint,
  action,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <label htmlFor={htmlFor} className="text-sm font-medium text-ink">
          {label}
        </label>
        {action}
      </div>
      {children}
      {hint ? <p className="mt-1.5 text-xs leading-5 text-ink-muted">{hint}</p> : null}
    </div>
  );
}

function SliderField({
  label,
  hint,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (value: number) => string;
  onChange: (value: number) => void;
}) {
  const id = label.toLowerCase().replace(/\s+/g, '-');
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {label}
        </label>
        <output
          htmlFor={id}
          className="rounded-sm border border-line px-1.5 py-0.5 font-mono text-2xs tabular-nums text-ink"
        >
          {format(value)}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ ['--fill' as string]: `${((value - min) / (max - min)) * 100}%` }}
        className="slider focus-ring w-full"
      />
      <p className="mt-1.5 text-xs leading-5 text-ink-muted">{hint}</p>
    </div>
  );
}

/** Footer button that asks for confirmation through the parent's dialog state. */
export function ConfirmResetButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="ghost" size="sm" className="mr-auto" onClick={onClick}>
      <RotateCcw className="h-3.5 w-3.5" />
      Reset settings
    </Button>
  );
}
