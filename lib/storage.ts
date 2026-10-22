
import type { ChatSession, Settings, ThemeMode } from '@/types';

const SESSIONS_KEY = 'web-llm:sessions:v1';
const SETTINGS_KEY = 'web-llm:settings:v1';
const ACTIVE_KEY = 'web-llm:active:v1';

const MAX_PERSISTED_MESSAGES = 400;

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
  return write(SESSIONS_KEY, trimmed);
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

export const DEFAULT_SETTINGS: Settings = {
  selectedModel: null,
  systemPrompt: '',
  theme: 'system',
  mode: 'chat',
  workspace: null,
  showJson: false,
};

export function loadSettings(): Settings {
  try {
    const raw = read<Partial<Settings>>(SETTINGS_KEY, {});
    const theme: ThemeMode =
      raw.theme === 'light' || raw.theme === 'dark' || raw.theme === 'system'
        ? raw.theme
        : DEFAULT_SETTINGS.theme;

    return {
      selectedModel: typeof raw.selectedModel === 'string' ? raw.selectedModel : DEFAULT_SETTINGS.selectedModel,
      systemPrompt: typeof raw.systemPrompt === 'string' ? raw.systemPrompt : DEFAULT_SETTINGS.systemPrompt,
      theme,
      mode: raw.mode === 'agent' ? 'agent' : 'chat',
      workspace: typeof raw.workspace === 'string' && raw.workspace ? raw.workspace : DEFAULT_SETTINGS.workspace,
      showJson: raw.showJson === true,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings): void {
  try {
    write(SETTINGS_KEY, settings);
  } catch {
    // Fail silently if localStorage quota exceeded or unavailable
  }
}
