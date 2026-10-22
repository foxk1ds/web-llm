'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import ChatWindow from '@/components/ChatWindow';
import SettingsModal from '@/components/SettingsModal';
import { OllamaError, fetchModels, isAbortError, streamChat } from '@/lib/ollama';
import { AgentError, respondToApproval, runAgent } from '@/lib/agentClient';
import {
  createId,
  loadActiveId,
  loadSessions,
  loadSettings,
  saveActiveId,
  saveSessions,
  saveSettings,
} from '@/lib/storage';
import type {
  AgentDoneReason,
  AgentMode,
  ChatSession,
  ConnectionState,
  Message,
  MessageStats,
  OllamaModel,
  ThemeMode,
  ToolCall,
} from '@/types';

const PERSIST_INTERVAL_MS = 1000;

const MAX_TITLE_LENGTH = 60;

type WireMessage = { role: 'user' | 'assistant'; content: string };

export default function Page() {
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [connection, setConnection] = useState<ConnectionState>('checking');
  const [connectionMessage, setConnectionMessage] = useState('');

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [mode, setMode] = useState<AgentMode>('chat');
  const [workspace, setWorkspace] = useState<string | null>(null);
  const [showJson, setShowJson] = useState(false);

  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [newChatShortcut, setNewChatShortcut] = useState('Ctrl+N');

  const abortRef = useRef<AbortController | null>(null);

  const activeRunRef = useRef<{
    runId: string | null;
    sessionId: string;
    messageId: string;
  } | null>(null);

  const refreshModels = useCallback(async () => {
    setModelsLoading(true);
    try {
      const list = await fetchModels();
      setModels(list);
      setConnection('online');
      setConnectionMessage('');
      setSelectedModel((prev) =>
        prev && list.some((m) => m.name === prev) ? prev : (list[0]?.name ?? null),
      );
    } catch (err) {
      const unreachable = err instanceof OllamaError && err.code === 'OLLAMA_UNREACHABLE';
      setConnection(unreachable ? 'offline' : 'online');
      setConnectionMessage(err instanceof Error ? err.message : 'Could not load models.');
      if (unreachable) setModels([]);
    } finally {
      setModelsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshModels();
  }, [refreshModels]);

  useEffect(() => {
    const storedSessions = loadSessions();
    const settings = loadSettings();

    setSessions(storedSessions);
    setSelectedModel(settings.selectedModel);
    setSystemPrompt(settings.systemPrompt);
    setTheme(settings.theme);
    setMode(settings.mode ?? 'chat');
    setWorkspace(settings.workspace ?? null);
    setShowJson(settings.showJson ?? false);

    const storedActive = loadActiveId();
    setActiveId(
      storedActive && storedSessions.some((s) => s.id === storedActive) ? storedActive : null,
    );
    setHydrated(true);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const applyTheme = (isDark: boolean) => {
      root.classList.toggle('dark', isDark);
      root.style.colorScheme = isDark ? 'dark' : 'light';
    };

    if (theme === 'system') {
      if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
        const media = window.matchMedia('(prefers-color-scheme: dark)');
        applyTheme(media.matches);
        const listener = (e: MediaQueryListEvent) => applyTheme(e.matches);
        media.addEventListener('change', listener);
        return () => media.removeEventListener('change', listener);
      }
    } else {
      applyTheme(theme === 'dark');
    }
  }, [theme]);

  const sessionsRef = useRef(sessions);
  sessionsRef.current = sessions;

  const lastPersistRef = useRef(0);
  useEffect(() => {
    if (!hydrated) return;

    const persist = () => {
      lastPersistRef.current = Date.now();
      saveSessions(sessions);
    };

    const elapsed = Date.now() - lastPersistRef.current;
    if (elapsed >= PERSIST_INTERVAL_MS) {
      persist();
      return;
    }

    const timer = setTimeout(persist, PERSIST_INTERVAL_MS - elapsed);
    return () => clearTimeout(timer);
  }, [sessions, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    const flush = () => saveSessions(sessionsRef.current);
    window.addEventListener('beforeunload', flush);
    return () => window.removeEventListener('beforeunload', flush);
  }, [hydrated]);

  useEffect(() => {
    if (hydrated) saveSettings({ selectedModel, systemPrompt, theme, mode, workspace, showJson });
  }, [selectedModel, systemPrompt, theme, mode, workspace, showJson, hydrated]);

  useEffect(() => {
    if (hydrated) saveActiveId(activeId);
  }, [activeId, hydrated]);

  const patchMessage = useCallback(
    (sessionId: string, messageId: string, patch: (message: Message) => Message) => {
      setSessions((prev) =>
        prev.map((session) =>
          session.id !== sessionId
            ? session
            : {
                ...session,
                updatedAt: Date.now(),
                messages: session.messages.map((m) => (m.id === messageId ? patch(m) : m)),
              },
        ),
      );
    },
    [],
  );

  const runCompletion = useCallback(
    async (
      sessionId: string,
      assistantId: string,
      history: WireMessage[],
      model: string,
      prompt: string,
    ) => {
      const controller = new AbortController();
      abortRef.current = controller;
      setStreaming(true);
      setError(null);

      let pendingContent = '';
      let pendingThinking = '';
      let frameHandle = 0;
      let dirty = false;
      let stats: MessageStats | undefined;

      const flush = () => {
        frameHandle = 0;
        if (!dirty) return;
        dirty = false;

        const contentChunk = pendingContent;
        const thinkingChunk = pendingThinking;
        pendingContent = '';
        pendingThinking = '';

        patchMessage(sessionId, assistantId, (m) => ({
          ...m,
          content: m.content + contentChunk,
          thinking: thinkingChunk ? (m.thinking ?? '') + thinkingChunk : m.thinking,
        }));
      };

      const schedule = () => {
        if (dirty) return;
        dirty = true;
        frameHandle = requestAnimationFrame(flush);
      };

      const flushNow = () => {
        if (frameHandle) {
          cancelAnimationFrame(frameHandle);
          frameHandle = 0;
        }
        flush();
      };

      try {
        await streamChat({
          model,
          messages: history,
          system: prompt,
          signal: controller.signal,
          onToken: (token) => {
            pendingContent += token;
            schedule();
          },
          onThinking: (token) => {
            pendingThinking += token;
            schedule();
          },
          onDone: (received) => {
            stats = received;
          },
        });

        flushNow();
        patchMessage(sessionId, assistantId, (m) =>
          m.content.trim().length === 0
            ? {
                ...m,
                status: 'error',
                content:
                  'The model returned an empty response. Try sending the message again, or switch to a different model.',
              }
            : { ...m, status: 'complete', stats },
        );
      } catch (err) {
        flushNow();

        if (isAbortError(err)) {
          patchMessage(sessionId, assistantId, (m) => ({ ...m, status: 'stopped' }));
        } else {
          const message = err instanceof Error ? err.message : 'Generation failed.';
          patchMessage(sessionId, assistantId, (m) => ({
            ...m,
            status: 'error',
            content: m.content.trim().length > 0 ? m.content : '',
            error: message,
          }));
          if (err instanceof OllamaError && err.code === 'OLLAMA_UNREACHABLE') {
            setConnection('offline');
            setConnectionMessage(message);
          }
        }
      } finally {
        if (frameHandle) cancelAnimationFrame(frameHandle);
        abortRef.current = null;
        setStreaming(false);
      }
    },
    [patchMessage],
  );

  const runAgentTurn = useCallback(
    async (
      sessionId: string,
      assistantId: string,
      history: WireMessage[],
      model: string,
      prompt: string,
      workspacePath: string | null,
    ) => {
      const controller = new AbortController();
      abortRef.current = controller;
      setStreaming(true);
      setError(null);

      activeRunRef.current = { runId: null, sessionId, messageId: assistantId };

      let pendingContent = '';
      let pendingThinking = '';
      let frameHandle = 0;
      let dirty = false;

      const outcome: {
        reason: AgentDoneReason;
        stats?: MessageStats;
        error: string | null;
      } = { reason: 'complete', error: null };

      let calls: ToolCall[] = [];

      const flush = () => {
        frameHandle = 0;
        if (!dirty) return;
        dirty = false;

        const contentChunk = pendingContent;
        const thinkingChunk = pendingThinking;
        pendingContent = '';
        pendingThinking = '';

        patchMessage(sessionId, assistantId, (m) => ({
          ...m,
          content: m.content + contentChunk,
          thinking: thinkingChunk ? (m.thinking ?? '') + thinkingChunk : m.thinking,
        }));
      };

      const schedule = () => {
        if (dirty) return;
        dirty = true;
        frameHandle = requestAnimationFrame(flush);
      };

      const flushNow = () => {
        if (frameHandle) {
          cancelAnimationFrame(frameHandle);
          frameHandle = 0;
        }
        flush();
      };

      try {
        await runAgent({
          model,
          messages: history,
          system: prompt,
          workspace: workspacePath ?? undefined,
          signal: controller.signal,
          onEvent: (event) => {
            switch (event.type) {
              case 'run':
                if (activeRunRef.current) activeRunRef.current.runId = event.runId;
                break;
              case 'token':
                pendingContent += event.value;
                schedule();
                break;
              case 'thinking':
                pendingThinking += event.value;
                schedule();
                break;
              case 'tool_call': {
                flushNow();
                const existingIndex = calls.findIndex((c) => c.id === event.call.id);
                calls =
                  existingIndex >= 0
                    ? calls.map((c, i) => (i === existingIndex ? event.call : c))
                    : [...calls, event.call];
                patchMessage(sessionId, assistantId, (m) => ({ ...m, toolCalls: calls }));
                break;
              }
              case 'retract':
                flushNow();
                patchMessage(sessionId, assistantId, (m) => ({
                  ...m,
                  content: m.content.split(event.text).join('').trim(),
                }));
                break;
              case 'tool_result':
                calls = calls.map((call) =>
                  call.id === event.id
                    ? {
                        ...call,
                        status: event.ok ? 'ok' : 'error',
                        result: event.result,
                        durationMs: event.durationMs,
                      }
                    : call,
                );
                patchMessage(sessionId, assistantId, (m) => ({ ...m, toolCalls: calls }));
                break;
              case 'done':
                outcome.stats = event.stats;
                outcome.reason = event.reason;
                break;
              case 'error':
                outcome.error = event.message;
                break;
              case 'step':
                break;
            }
          },
        });

        flushNow();

        if (outcome.error) {
          patchMessage(sessionId, assistantId, (m) => ({
            ...m,
            status: 'error',
            error: outcome.error ?? 'The agent run failed.',
          }));
        } else if (outcome.reason === 'stopped') {
          patchMessage(sessionId, assistantId, (m) => ({ ...m, status: 'stopped' }));
        } else if (outcome.reason === 'max_steps') {
          patchMessage(sessionId, assistantId, (m) => ({
            ...m,
            status: 'complete',
            stats: outcome.stats,
            error: `Stopped after the step limit. The model kept requesting tools without answering — try narrowing the request.`,
          }));
        } else {
          patchMessage(sessionId, assistantId, (m) =>
            m.content.trim().length === 0 && !m.toolCalls?.length
              ? {
                  ...m,
                  status: 'error',
                  error:
                    'The model returned nothing. In agent mode the model must be able to follow the tool protocol — try a larger model.',
                }
              : { ...m, status: 'complete', stats: outcome.stats },
          );
        }
      } catch (err) {
        flushNow();
        if (isAbortError(err)) {
          patchMessage(sessionId, assistantId, (m) => ({ ...m, status: 'stopped' }));
        } else {
          const message = err instanceof Error ? err.message : 'The agent run failed.';
          patchMessage(sessionId, assistantId, (m) => ({
            ...m,
            status: 'error',
            error: message,
          }));
          if (err instanceof AgentError && err.code === 'OLLAMA_UNREACHABLE') {
            setConnection('offline');
            setConnectionMessage(message);
          }
        }
      } finally {
        if (frameHandle) cancelAnimationFrame(frameHandle);
        abortRef.current = null;
        setStreaming(false);
      }
    },
    [patchMessage],
  );

  const handleSend = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || streaming || !selectedModel) return;

      const existing = activeId ? (sessions.find((s) => s.id === activeId) ?? null) : null;
      const sessionId = existing?.id ?? createId();

      const userMessage: Message = {
        id: createId(),
        role: 'user',
        content: trimmed,
        createdAt: Date.now(),
        status: 'complete',
      };
      const assistantMessage: Message = {
        id: createId(),
        role: 'assistant',
        content: '',
        createdAt: Date.now(),
        model: selectedModel,
        status: 'streaming',
      };

      const history: WireMessage[] = [...(existing?.messages ?? []), userMessage]
        .filter((m) => m.status !== 'error' && m.content.trim().length > 0)
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

      if (existing) {
        setSessions((prev) =>
          prev.map((s) =>
            s.id !== sessionId
              ? s
              : {
                  ...s,
                  model: selectedModel,
                  systemPrompt,
                  updatedAt: Date.now(),
                  messages: [...s.messages, userMessage, assistantMessage],
                },
          ),
        );
      } else {
        const session: ChatSession = {
          id: sessionId,
          title: buildTitle(trimmed),
          model: selectedModel,
          systemPrompt,
          messages: [userMessage, assistantMessage],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        setSessions((prev) => [session, ...prev]);
        setActiveId(sessionId);
      }

      if (mode === 'agent') {
        void runAgentTurn(
          sessionId,
          assistantMessage.id,
          history,
          selectedModel,
          systemPrompt,
          workspace,
        );
      } else {
        void runCompletion(sessionId, assistantMessage.id, history, selectedModel, systemPrompt);
      }
    },
    [activeId, sessions, streaming, selectedModel, systemPrompt, mode, workspace, runCompletion, runAgentTurn],
  );
  const handleRegenerate = useCallback(() => {
    if (!activeId || streaming || !selectedModel) return;

    const session = sessions.find((s) => s.id === activeId);
    if (!session) return;

    const kept = [...session.messages];
    while (kept.length > 0 && kept[kept.length - 1].role === 'assistant') kept.pop();
    if (kept.length === 0) return;

    const assistantMessage: Message = {
      id: createId(),
      role: 'assistant',
      content: '',
      createdAt: Date.now(),
      model: selectedModel,
      status: 'streaming',
    };

    const history: WireMessage[] = kept
      .filter((m) => m.content.trim().length > 0)
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    setSessions((prev) =>
      prev.map((s) =>
        s.id !== activeId
          ? s
          : {
              ...s,
              model: selectedModel,
              updatedAt: Date.now(),
              messages: [...kept, assistantMessage],
            },
      ),
    );

    if (mode === 'agent') {
      void runAgentTurn(activeId, assistantMessage.id, history, selectedModel, systemPrompt, workspace);
    } else {
      void runCompletion(activeId, assistantMessage.id, history, selectedModel, systemPrompt);
    }
  }, [activeId, sessions, streaming, selectedModel, systemPrompt, mode, workspace, runCompletion, runAgentTurn]);

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const handleDecideTool = useCallback(
    async (callId: string, approved: boolean) => {
      const active = activeRunRef.current;
      if (!active?.runId) return;

      const resolved = await respondToApproval(active.runId, callId, approved);
      if (resolved) return;

      patchMessage(active.sessionId, active.messageId, (m) => ({
        ...m,
        toolCalls: (m.toolCalls ?? []).map((call) =>
          call.id === callId
            ? {
                ...call,
                status: approved ? 'denied' : 'denied',
                error:
                  'This approval prompt is no longer active — the run was stopped, timed out, or the server restarted. Send the message again to retry.',
              }
            : call,
        ),
      }));
    },
    [patchMessage],
  );

  const handleNewChat = useCallback(() => {
    abortRef.current?.abort();
    setActiveId(null);
    setError(null);
    setSidebarOpen(false);
  }, []);

  useEffect(() => {
    setNewChatShortcut(
      /mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent) ? '⌘N' : 'Ctrl+N',
    );

    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      const plainN = !event.shiftKey && event.key.toLowerCase() === 'n';
      const shiftedO = event.shiftKey && event.key.toLowerCase() === 'o';
      if (!plainN && !shiftedO) return;
      event.preventDefault();
      handleNewChat();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleNewChat]);

  const handleOpenSettings = useCallback(() => {
    setSettingsOpen(true);
    setSidebarOpen(true);
  }, []);

  const handleSelectSession = useCallback(
    (id: string) => {
      abortRef.current?.abort();
      setActiveId(id);
      setError(null);
      setSidebarOpen(false);

      const session = sessions.find((s) => s.id === id);
      if (session?.model && models.some((m) => m.name === session.model)) {
        setSelectedModel(session.model);
      }
      setSystemPrompt(session?.systemPrompt ?? '');
    },
    [sessions, models],
  );

  const handleDeleteSession = useCallback(
    (id: string) => {
      if (id === activeId) abortRef.current?.abort();
      setSessions((prev) => prev.filter((s) => s.id !== id));
      setActiveId((prev) => (prev === id ? null : prev));
    },
    [activeId],
  );

  const handleClear = useCallback(() => {
    if (!activeId || streaming) return;
    if (!window.confirm('Clear every message in this conversation? This cannot be undone.')) return;
    setSessions((prev) =>
      prev.map((s) => (s.id === activeId ? { ...s, messages: [], updatedAt: Date.now() } : s)),
    );
  }, [activeId, streaming]);

  const handleSystemPromptChange = useCallback(
    (value: string) => {
      setSystemPrompt(value);
      setSessions((prev) =>
        prev.map((s) => (s.id === activeId ? { ...s, systemPrompt: value } : s)),
      );
    },
    [activeId],
  );

  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeId) ?? null,
    [sessions, activeId],
  );

  const sortedSessions = useMemo(
    () => [...sessions].sort((a, b) => b.updatedAt - a.updatedAt),
    [sessions],
  );

  return (
    <div className="flex h-full overflow-hidden">
      <Sidebar
        sessions={sortedSessions}
        activeId={activeId}
        streaming={streaming}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        onDeleteSession={handleDeleteSession}
        newChatShortcut={newChatShortcut}
        onOpenSettings={() => setSettingsOpen(true)}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <ChatWindow
        session={activeSession}
        model={selectedModel}
        modelCount={models.length}
        streaming={streaming}
        error={error}
        connection={connection}
        connectionMessage={connectionMessage}
        mode={mode}
        onModeChange={setMode}
        onSend={handleSend}
        onStop={handleStop}
        onRegenerate={handleRegenerate}
        onClear={handleClear}
        onRetryConnection={() => void refreshModels()}
        onDismissError={() => setError(null)}
        onOpenSidebar={() => setSidebarOpen(true)}
        hasSystemPrompt={systemPrompt.trim().length > 0}
        onOpenSettings={handleOpenSettings}
        onDecideTool={handleDecideTool}
        onNewChat={handleNewChat}
        showJson={showJson}
      />

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        models={models}
        modelsLoading={modelsLoading}
        selectedModel={selectedModel}
        onSelectModel={setSelectedModel}
        onRefreshModels={() => void refreshModels()}
        workspace={workspace}
        onWorkspaceChange={setWorkspace}
        systemPrompt={systemPrompt}
        onSystemPromptChange={handleSystemPromptChange}
        theme={theme}
        onThemeChange={setTheme}
        showJson={showJson}
        onShowJsonChange={setShowJson}
      />
    </div>
  );
}

function buildTitle(text: string): string {
  const singleLine = text.replace(/\s+/g, ' ').trim();
  if (singleLine.length <= MAX_TITLE_LENGTH) return singleLine;
  return `${singleLine.slice(0, MAX_TITLE_LENGTH).trimEnd()}…`;
}
