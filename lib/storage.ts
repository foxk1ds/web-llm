
import type { AgentMode, ChatSession, Density, FontSize, Settings, ThemeMode } from '@/types';

const SESSIONS_KEY = 'web-llm:sessions:v1';
const SETTINGS_KEY = 'web-llm:settings:v1';
const ACTIVE_KEY = 'web-llm:active:v1';

const MAX_PERSISTED_MESSAGES = 400;

export const TEMPERATURE_RANGE = { min: 0, max: 2, step: 0.05 } as const;
export const MAX_TOKENS_RANGE = { min: 64, max: 32768, step: 64 } as const;
const DEFAULT_MAX_TOKENS = 2048;

function available(): boolean {
  return typeof window !== 'undefined' && !!window.localStorage;
}

export function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function read<T>(key: string, fallback: T): T {
  if (!available()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): boolean {
  if (!available()) return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function loadSessions(): ChatSession[] {
  const raw = read<ChatSession[]>(SESSIONS_KEY, []);
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((s): s is ChatSession => !!s && typeof s.id === 'string' && Array.isArray(s.messages))
    .map((s) => ({ ...s, messages: s.messages.filter((m) => !!m && typeof m.content === 'string') }));
}

export function saveSessions(sessions: ChatSession[]): boolean {
  const trimmed = sessions.map((s) =>
    s.messages.length <= MAX_PERSISTED_MESSAGES
      ? s
      : { ...s, messages: trimToWholeTurns(s.messages) },
  );
  if (write(SESSIONS_KEY, trimmed)) return true;

  // Attachment payloads dominate the quota. If the full write fails, keep the
  // conversation (and attachment metadata) by dropping the inline data rather
  // than losing every session. Previews are unavailable after a reload, but
  // the transcript survives.
  const compact = trimmed.map((session) => ({
    ...session,
    messages: session.messages.map((message) =>
      message.attachments?.length
        ? {
            ...message,
            attachments: message.attachments.map((attachment) => ({
              id: attachment.id,
              name: attachment.name,
              mimeType: attachment.mimeType,
              size: attachment.size,
              kind: attachment.kind,
            })),
          }
        : message,
    ),
  }));
  return write(SESSIONS_KEY, compact);
}

function trimToWholeTurns(messages: ChatSession['messages']): ChatSession['messages'] {
  const retained = messages.slice(-MAX_PERSISTED_MESSAGES);
  while (retained[0]?.role === 'assistant') retained.shift();
  return retained;
}

export function loadActiveId(): string | null {
  if (!available()) return null;
  try {
    return window.localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

export function saveActiveId(id: string | null): void {
  if (!available()) return;
  try {
    if (id) window.localStorage.setItem(ACTIVE_KEY, id);
    else window.localStorage.removeItem(ACTIVE_KEY);
  } catch {}
}

/** Removes every Web-LLM key from localStorage. Returns true when all writes succeeded. */
export function clearAllData(): boolean {
  if (!available()) return false;
  try {
    for (const key of [SESSIONS_KEY, SETTINGS_KEY, ACTIVE_KEY]) {
      window.localStorage.removeItem(key);
    }
    return true;
  } catch {
    return false;
  }
}

/** Approximate size of the app's stored data, in characters. */
export function storageSize(): number {
  if (!available()) return 0;
  let total = 0;
  try {
    for (const key of [SESSIONS_KEY, SETTINGS_KEY, ACTIVE_KEY]) {
      total += (window.localStorage.getItem(key) ?? '').length + key.length;
    }
  } catch {}
  return total;
}

export interface SessionsExport {
  app: 'web-llm';
  version: 1;
  exportedAt: string;
  sessions: ChatSession[];
}

export function buildExport(sessions: ChatSession[]): SessionsExport {
  return {
    app: 'web-llm',
    version: 1,
    exportedAt: new Date().toISOString(),
    sessions,
  };
}

/**
 * Validates an imported file. Accepts either a full export (`{ sessions: [...] }`)
 * or a bare array of sessions. Returns null when nothing usable is present.
 */
export function parseExport(raw: string): ChatSession[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  const list = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object' && Array.isArray((parsed as { sessions?: unknown }).sessions)
      ? (parsed as { sessions: unknown[] }).sessions
      : null;
  if (!list) return null;

  const sessions = list
    .filter(
      (s): s is ChatSession =>
        !!s &&
        typeof s === 'object' &&
        typeof (s as ChatSession).id === 'string' &&
        Array.isArray((s as ChatSession).messages),
    )
    .map((s) => ({
      ...s,
      title: typeof s.title === 'string' && s.title ? s.title : 'Imported chat',
      model: typeof s.model === 'string' ? s.model : '',
      systemPrompt: typeof s.systemPrompt === 'string' ? s.systemPrompt : '',
      createdAt: typeof s.createdAt === 'number' ? s.createdAt : Date.now(),
      updatedAt: typeof s.updatedAt === 'number' ? s.updatedAt : Date.now(),
      messages: s.messages.filter((m) => !!m && typeof m.content === 'string'),
    }));

  return sessions.length > 0 ? sessions : null;
}

export const DEFAULT_SETTINGS: Settings = {
  selectedModel: null,
  systemPrompt: '',
  theme: 'dark',
  mode: 'agent',
  workspace: null,
  showJson: false,
  fontSize: 'default',
  density: 'comfortable',
  temperature: 0.8,
  maxTokens: DEFAULT_MAX_TOKENS,
  enterToSend: true,
  streaming: true,
  showTimestamps: true,
};

const FONT_SIZES: FontSize[] = ['sm', 'default', 'lg', 'xl'];
const DENSITIES: Density[] = ['compact', 'comfortable'];

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}

/** Reads preferences and repairs anything that is missing or out of range. */
export function loadSettings(): Settings {
  const raw = read<Partial<Settings>>(SETTINGS_KEY, {});
  const theme: ThemeMode = raw.theme === 'light' ? 'light' : raw.theme === 'dark' ? 'dark' : guessTheme();
  const fontSize = FONT_SIZES.includes(raw.fontSize as FontSize)
    ? (raw.fontSize as FontSize)
    : DEFAULT_SETTINGS.fontSize;
  const density = DENSITIES.includes(raw.density as Density)
    ? (raw.density as Density)
    : DEFAULT_SETTINGS.density;
  const maxTokens = Math.round(
    clampNumber(raw.maxTokens, MAX_TOKENS_RANGE.min, MAX_TOKENS_RANGE.max, DEFAULT_MAX_TOKENS),
  );

  return {
    selectedModel: typeof raw.selectedModel === 'string' ? raw.selectedModel : null,
    systemPrompt: typeof raw.systemPrompt === 'string' ? raw.systemPrompt : '',
    theme,
    mode: (raw.mode === 'chat' ? 'chat' : 'agent') as AgentMode,
    workspace: typeof raw.workspace === 'string' && raw.workspace ? raw.workspace : null,
    showJson: raw.showJson === true,
    fontSize,
    density,
    temperature: clampNumber(
      raw.temperature,
      TEMPERATURE_RANGE.min,
      TEMPERATURE_RANGE.max,
      DEFAULT_SETTINGS.temperature,
    ),
    maxTokens,
    enterToSend: raw.enterToSend !== false,
    streaming: raw.streaming !== false,
    showTimestamps: raw.showTimestamps !== false,
  };
}

export function saveSettings(settings: Settings): void {
  write(SETTINGS_KEY, settings);
}

function guessTheme(): ThemeMode {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'dark';
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}
