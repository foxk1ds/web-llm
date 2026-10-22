'use client';

import { useEffect, useRef } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { shortenModelName } from '@/lib/format';
import type { OllamaModel, ThemeMode } from '@/types';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  models: OllamaModel[];
  modelsLoading: boolean;
  selectedModel: string | null;
  onSelectModel: (name: string) => void;
  onRefreshModels: () => void;
  workspace: string | null;
  onWorkspaceChange: (workspace: string | null) => void;
  systemPrompt: string;
  onSystemPromptChange: (prompt: string) => void;
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  showJson?: boolean;
  onShowJsonChange?: (show: boolean) => void;
}

export default function SettingsModal({
  open,
  onClose,
  models,
  modelsLoading,
  selectedModel,
  onSelectModel,
  onRefreshModels,
  workspace,
  onWorkspaceChange,
  systemPrompt,
  onSystemPromptChange,
  theme,
  onThemeChange,
  showJson,
  onShowJsonChange,
}: SettingsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg rounded-lg border border-border bg-panel shadow-lg animate-scale-in overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 id="settings-title" className="text-sm font-semibold tracking-tight text-foreground">
              Settings
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Preferences are saved automatically in your browser.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="focus-ring rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="max-h-[75vh] overflow-y-auto thin-scrollbar p-5 space-y-5">
          {/* 1. Model dropdown */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="settings-model" className="text-xs font-medium text-foreground">
                Model
              </label>
              <button
                type="button"
                onClick={onRefreshModels}
                disabled={modelsLoading}
                aria-label="Refresh model list"
                className="focus-ring flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-3 w-3 ${modelsLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
            <select
              id="settings-model"
              value={selectedModel ?? ''}
              onChange={(e) => onSelectModel(e.target.value)}
              disabled={modelsLoading || models.length === 0}
              className="focus-ring w-full rounded-lg border border-border bg-app px-3 py-2 text-xs font-mono text-foreground transition-colors disabled:opacity-50"
            >
              {models.length === 0 ? (
                <option value="">No models installed</option>
              ) : (
                models.map((m) => (
                  <option key={m.name} value={m.name}>
                    {shortenModelName(m.name)}
                    {m.parameterSize ? ` (${m.parameterSize})` : ''}
                  </option>
                ))
              )}
            </select>
            <p className="text-[11px] text-muted-foreground">
              Available models loaded from Ollama via /api/models.
            </p>
          </div>

          {/* 2. Workspace folder */}
          <div className="space-y-1.5">
            <label htmlFor="settings-workspace" className="text-xs font-medium text-foreground">
              Workspace folder
            </label>
            <input
              id="settings-workspace"
              type="text"
              value={workspace ?? ''}
              onChange={(e) => onWorkspaceChange(e.target.value.trim() ? e.target.value : null)}
              placeholder="Defaults to the server's folder"
              spellCheck={false}
              className="focus-ring w-full rounded-lg border border-border bg-app px-3 py-2 text-xs font-mono text-foreground placeholder:font-sans placeholder:text-muted-foreground transition-colors"
            />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Path used by Agent mode for read/write and file inspection. Blank means the server&apos;s folder.
            </p>
          </div>

          {/* 3. System prompt */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="settings-system-prompt" className="text-xs font-medium text-foreground">
                System prompt
              </label>
              {systemPrompt ? (
                <button
                  type="button"
                  onClick={() => onSystemPromptChange('')}
                  className="focus-ring text-[11px] text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
                >
                  Reset
                </button>
              ) : null}
            </div>
            <textarea
              id="settings-system-prompt"
              rows={4}
              value={systemPrompt}
              onChange={(e) => onSystemPromptChange(e.target.value)}
              placeholder="You are a helpful assistant..."
              className="focus-ring w-full rounded-lg border border-border bg-app px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground transition-colors resize-y thin-scrollbar leading-relaxed"
            />
            <p className="text-[11px] text-muted-foreground">
              Custom instructions prepended to every message in your conversations.
            </p>
          </div>

          {/* 4. Theme */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Theme</label>
            <div
              role="group"
              aria-label="Color theme"
              className="grid grid-cols-3 gap-1 rounded-lg border border-border bg-muted/60 p-1 text-xs"
            >
              {(['light', 'dark', 'system'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => onThemeChange(t)}
                  aria-pressed={theme === t}
                  className={`rounded-md py-1.5 text-xs font-medium capitalize transition-colors ${
                    theme === t
                      ? 'bg-panel text-foreground shadow-xs border border-border'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* 5. Optional Raw JSON Toggle */}
          {onShowJsonChange && typeof showJson === 'boolean' ? (
            <div className="pt-2 border-t border-border flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-foreground">Raw JSON output</p>
                <p className="text-[11px] text-muted-foreground">
                  Show raw JSON blocks emitted by models without formatting
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={showJson}
                onClick={() => onShowJsonChange(!showJson)}
                className={`focus-ring relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                  showJson ? 'bg-foreground' : 'bg-muted border border-border'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-panel shadow-xs transition-transform ${
                    showJson ? 'right-0.5 translate-x-0' : 'left-0.5 translate-x-0'
                  }`}
                />
              </button>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-border px-5 py-3 bg-muted/30">
          <button
            type="button"
            onClick={onClose}
            className="focus-ring rounded-lg border border-border bg-panel px-4 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
