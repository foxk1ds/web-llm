'use client';

import { memo, useState } from 'react';
import {
  AlertTriangle,
  Ban,
  Check,
  ChevronRight,
  CircleSlash,
  FilePen,
  FileText,
  FolderTree,
  Globe,
  LoaderCircle,
  Search,
  ShieldAlert,
  Terminal,
  Wrench,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { ToolCall } from '@/types';

const ICONS: Record<string, typeof Wrench> = {
  list_files: FolderTree,
  read_file: FileText,
  grep_files: Search,
  fetch_url: Globe,
  write_file: FilePen,
  edit_file: FilePen,
  run_command: Terminal,
};

const REQUIRED_MAP: Record<string, { name: string; alternates: string[] }[]> = {
  read_file: [
    { name: 'path', alternates: ['path', 'file_path', 'filepath', 'filename', 'file', 'target', 'dest'] },
  ],
  write_file: [
    { name: 'path', alternates: ['path', 'file_path', 'filepath', 'filename', 'file', 'target', 'dest'] },
    { name: 'content', alternates: ['content', 'contents', 'text', 'code', 'body', 'data'] },
  ],
  edit_file: [
    { name: 'path', alternates: ['path', 'file_path', 'filepath', 'filename', 'file', 'target', 'dest'] },
    { name: 'find', alternates: ['find', 'target', 'old_string', 'search'] },
    { name: 'replace', alternates: ['replace', 'replacement', 'new_string'] },
  ],
  grep_files: [
    { name: 'pattern', alternates: ['pattern', 'query', 'regex'] },
  ],
  fetch_url: [
    { name: 'url', alternates: ['url', 'link', 'href'] },
  ],
  run_command: [
    { name: 'command', alternates: ['command', 'cmd'] },
  ],
};

function getMissingRequired(toolName: string, args: Record<string, unknown>): string[] {
  const reqDefs = REQUIRED_MAP[toolName] ?? [];
  return reqDefs
    .filter((def) => !def.alternates.some((alt) => {
      const v = args[alt];
      return v !== undefined && v !== null && String(v).trim() !== '';
    }))
    .map((def) => def.name);
}

function primaryArg(call: ToolCall): string {
  for (const key of ['path', 'pattern', 'url', 'query', 'command']) {
    const value = call.arguments[key];
    if (typeof value === 'string' && value) return value;
  }
  const first = Object.values(call.arguments)[0];
  if (typeof first === 'string') return first;
  return JSON.stringify(call.arguments).slice(0, 70);
}

function statusOf(call: ToolCall) {
  switch (call.status) {
    case 'running':
<<<<<<< HEAD
      return { Icon: LoaderCircle, label: 'Running', spin: true, tone: 'text-muted-foreground' };
    case 'awaiting_approval':
      return { Icon: ShieldAlert, label: 'Needs approval', spin: false, tone: 'text-foreground' };
    case 'ok':
      return { Icon: Check, label: 'Done', spin: false, tone: 'text-foreground' };
=======
      return { Icon: LoaderCircle, label: 'Running', spin: true, tone: 'text-accent' };
    case 'awaiting_approval':
      return { Icon: ShieldAlert, label: 'Needs approval', spin: false, tone: 'text-warning' };
    case 'ok':
      return { Icon: Check, label: 'Done', spin: false, tone: 'text-success' };
>>>>>>> origin/main
    case 'error':
      return { Icon: Ban, label: 'Failed', spin: false, tone: 'text-danger' };
    case 'denied':
<<<<<<< HEAD
      return { Icon: CircleSlash, label: 'Denied', spin: false, tone: 'text-red-600 dark:text-red-400' };
    default:
      return { Icon: LoaderCircle, label: 'Queued', spin: false, tone: 'text-muted-foreground' };
=======
      return { Icon: CircleSlash, label: 'Denied', spin: false, tone: 'text-ink-muted' };
    default:
      return { Icon: LoaderCircle, label: 'Queued', spin: false, tone: 'text-ink-muted' };
>>>>>>> origin/main
  }
}

function ToolCallCardBase({
  call,
  onDecide,
}: {
  call: ToolCall;
  onDecide?: (approved: boolean) => void;
}) {
  const awaiting = call.status === 'awaiting_approval';
  const missingRequired = getMissingRequired(call.name, call.arguments);
  const [open, setOpen] = useState(missingRequired.length > 0);
  const { Icon: StatusIcon, label, spin, tone } = statusOf(call);
  const ToolIcon = ICONS[call.name] ?? Wrench;
  const failed = call.status === 'error' || call.status === 'denied';
  const expanded = awaiting || open;
  const risky = Boolean(call.approval?.risky);

  return (
    <div
      data-awaiting-approval={awaiting ? 'true' : undefined}
<<<<<<< HEAD
      className={`my-2 overflow-hidden rounded-lg border transition-colors ${
        awaiting
          ? risky
            ? 'border-red-500/40 bg-red-500/[0.04]'
            : 'border-foreground/30 bg-muted/40'
          : failed
            ? 'border-red-500/25 bg-red-500/[0.03]'
            : 'border-border bg-panel hover:border-foreground/20'
=======
      className={`my-1.5 overflow-hidden rounded-lg border transition-colors duration-200 ${
        awaiting
          ? risky
            ? 'border-danger/40 bg-danger-soft'
            : 'border-warning/35 bg-warning-soft'
          : failed
            ? 'border-danger/25 bg-danger-soft'
            : 'border-line bg-surface hover:border-line-strong'
>>>>>>> origin/main
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={expanded}
        className="focus-ring flex w-full items-center gap-2.5 px-3 py-2 text-left"
      >
<<<<<<< HEAD
        <ToolIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />

        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2 flex-wrap">
            <span className="shrink-0 font-mono text-xs font-semibold text-foreground">
              {call.name}
            </span>
            {missingRequired.length > 0 ? (
              <span className="rounded bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 text-[11px] font-mono font-semibold text-red-600 dark:text-red-400">
                missing: {missingRequired.join(', ')}
              </span>
            ) : (
              <span className="min-w-0 truncate font-mono text-[11px] text-muted-foreground">
                {primaryArg(call)}
              </span>
            )}
          </span>
          <span className="mt-0.5 flex items-center gap-1.5 text-[11px]">
            <StatusIcon className={`h-3 w-3 ${tone} ${spin ? 'animate-spin' : ''}`} aria-hidden />
            <span className={tone}>{label}</span>
            {typeof call.durationMs === 'number' && call.durationMs > 0 ? (
              <span className="text-muted-foreground">· {call.durationMs}ms</span>
            ) : null}
            {call.source && call.source !== 'native' ? (
              <span className="text-muted-foreground">· text protocol</span>
=======
        <ToolIcon className="h-3.5 w-3.5 shrink-0 text-ink-muted" />

        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span className="shrink-0 font-mono text-2xs font-medium text-ink">
              {call.name}
            </span>
            <span className="min-w-0 truncate font-mono text-2xs text-ink-muted">
              {primaryArg(call)}
            </span>
          </span>
          <span className="mt-0.5 flex items-center gap-1.5">
            <StatusIcon
              className={`h-3 w-3 ${tone} ${spin ? 'animate-spin motion-reduce:animate-none' : ''}`}
              aria-hidden
            />
            <span className={`text-2xs ${tone}`}>{label}</span>
            {typeof call.durationMs === 'number' && call.durationMs > 0 ? (
              <span className="text-2xs text-ink-muted">· {call.durationMs}ms</span>
            ) : null}
            {call.source && call.source !== 'native' ? (
              <span
                title={`Recovered from ${call.source} output — this model does not emit native tool calls`}
                className="text-2xs text-ink-muted"
              >
                · text protocol
              </span>
>>>>>>> origin/main
            ) : null}
          </span>
        </span>

        {!awaiting ? (
          <ChevronRight
<<<<<<< HEAD
            className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-150 ${
=======
            className={`h-3.5 w-3.5 shrink-0 text-ink-muted transition-transform duration-200 ${
>>>>>>> origin/main
              open ? 'rotate-90' : ''
            }`}
          />
        ) : null}
      </button>

      {/* Awaiting approval review block */}
      {awaiting ? (
<<<<<<< HEAD
        <div className="border-t border-border px-3 py-2.5 bg-muted/20">
          {risky ? (
            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400">
=======
        <div className="border-t border-line/60 px-3 py-2.5">
          {risky ? (
            <p className="mb-2 flex items-center gap-1.5 text-2xs font-medium text-danger">
>>>>>>> origin/main
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              Destructive action: {call.approval?.reason}
            </p>
          ) : null}

<<<<<<< HEAD
          {/* Show arguments & missing required ones */}
          <div className="mb-2 rounded-md border border-border bg-muted/40 p-2 font-mono text-[11px] space-y-1">
            <div className="text-[10px] uppercase font-sans font-semibold text-muted-foreground tracking-wider mb-1">
              Arguments
            </div>
            {Object.entries(call.arguments).map(([key, val]) => (
              <div key={key} className="flex flex-col sm:flex-row sm:items-start gap-1">
                <span className="text-muted-foreground shrink-0 font-medium">{key}:</span>
                <span className="text-foreground break-all whitespace-pre-wrap line-clamp-4">
                  {typeof val === 'string' ? val : JSON.stringify(val)}
                </span>
              </div>
            ))}
            {missingRequired.map((arg) => (
              <div key={arg} className="flex items-center gap-1.5 text-red-600 dark:text-red-400 font-medium">
                <span>{arg}:</span>
                <span className="italic font-sans text-[10px] px-1 py-0.5 rounded bg-red-500/10 border border-red-500/20">
                  missing required argument
                </span>
              </div>
            ))}
          </div>

          <pre className="thin-scrollbar max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-md border border-border bg-muted/40 p-2 font-mono text-[11px] text-foreground leading-relaxed">
=======
          <pre className="thin-scrollbar max-h-52 overflow-auto whitespace-pre-wrap break-words rounded-md border border-line bg-surface/60 px-2.5 py-2 font-mono text-2xs leading-relaxed text-ink">
>>>>>>> origin/main
            {call.approval?.preview ?? JSON.stringify(call.arguments, null, 2)}
          </pre>

          {/* Clear Allow / Deny buttons */}
          <div className="mt-2.5 flex items-center gap-2">
<<<<<<< HEAD
            <button
              type="button"
              onClick={() => onDecide?.(true)}
              disabled={!onDecide}
              className="focus-ring flex items-center gap-1.5 rounded-lg border border-foreground bg-foreground px-3 py-1.5 text-xs font-medium text-app hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
=======
            <Button variant="primary" size="sm" onClick={() => onDecide?.(true)} disabled={!onDecide}>
>>>>>>> origin/main
              <Check className="h-3.5 w-3.5" />
              Allow
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onDecide?.(false)}
              disabled={!onDecide}
<<<<<<< HEAD
              className="focus-ring flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-500/20 disabled:opacity-50 dark:text-red-400 transition-colors"
            >
              <Ban className="h-3.5 w-3.5" />
              Deny
            </button>
            <span className="text-[11px] text-muted-foreground ml-1">
              Pauses until allowed or denied.
=======
            >
              <Ban className="h-3.5 w-3.5" />
              Deny
            </Button>
            <span className="text-2xs text-ink-muted">
              Nothing runs until you choose. Denying tells the model to stop.
>>>>>>> origin/main
            </span>
          </div>
        </div>
      ) : null}

<<<<<<< HEAD
      {!awaiting && open ? (
        <div className="border-t border-border">
          {/* Arguments section with argument names and values, highlighting missing required ones */}
          <div className="px-3 py-2 bg-muted/15 border-b border-border/60">
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Arguments
            </div>
            <div className="space-y-1 font-mono text-[11px]">
              {Object.entries(call.arguments).map(([key, val]) => (
                <div key={key} className="flex flex-col sm:flex-row sm:items-start gap-1">
                  <span className="text-muted-foreground shrink-0 font-medium">{key}:</span>
                  <span className="text-foreground break-all whitespace-pre-wrap line-clamp-6">
                    {typeof val === 'string' ? val : JSON.stringify(val)}
                  </span>
                </div>
              ))}
              {missingRequired.map((arg) => (
                <div key={arg} className="flex items-center gap-1.5 text-red-600 dark:text-red-400 font-semibold">
                  <span>{arg}:</span>
                  <span className="italic font-sans text-[10px] px-1 py-0.5 rounded bg-red-500/10 border border-red-500/20">
                    missing required argument
                  </span>
                </div>
              ))}
              {Object.keys(call.arguments).length === 0 && missingRequired.length === 0 && (
                <span className="text-muted-foreground italic">(none)</span>
              )}
            </div>
          </div>

          {/* Result or Error section if present */}
          {(call.result || call.error) ? (
            <div className="thin-scrollbar max-h-72 overflow-auto p-3 bg-muted/10">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                {call.error ? 'Error' : 'Output'}
              </div>
              <pre
                className={`whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed ${
                  call.error ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'
                }`}
              >
                {call.error ?? call.result}
              </pre>
            </div>
          ) : null}
=======
      {!awaiting && open && (call.result || call.error) ? (
        <div className="thin-scrollbar max-h-80 overflow-auto border-t border-line px-3 py-2">
          <pre className="whitespace-pre-wrap break-words font-mono text-2xs leading-relaxed text-ink-secondary">
            {call.error ?? call.result}
          </pre>
>>>>>>> origin/main
        </div>
      ) : null}
    </div>
  );
}

const ToolCallCard = memo(
  ToolCallCardBase,
  (prev, next) => prev.call === next.call && prev.onDecide === next.onDecide,
);

export default ToolCallCard;
