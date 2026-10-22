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
      return { Icon: LoaderCircle, label: 'Running', spin: true, tone: 'text-accent' };
    case 'awaiting_approval':
      return { Icon: ShieldAlert, label: 'Needs approval', spin: false, tone: 'text-warning' };
    case 'ok':
      return { Icon: Check, label: 'Done', spin: false, tone: 'text-success' };
    case 'error':
      return { Icon: Ban, label: 'Failed', spin: false, tone: 'text-danger' };
    case 'denied':
      return { Icon: CircleSlash, label: 'Denied', spin: false, tone: 'text-ink-muted' };
    default:
      return { Icon: LoaderCircle, label: 'Queued', spin: false, tone: 'text-ink-muted' };
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
  const [open, setOpen] = useState(false);
  const { Icon: StatusIcon, label, spin, tone } = statusOf(call);
  const ToolIcon = ICONS[call.name] ?? Wrench;
  const failed = call.status === 'error' || call.status === 'denied';
  const expanded = awaiting || open;
  const risky = Boolean(call.approval?.risky);

  return (
    <div
      data-awaiting-approval={awaiting ? 'true' : undefined}
      className={`my-1.5 overflow-hidden rounded-lg border transition-colors duration-200 ${
        awaiting
          ? risky
            ? 'border-danger/40 bg-danger-soft'
            : 'border-warning/35 bg-warning-soft'
          : failed
            ? 'border-danger/25 bg-danger-soft'
            : 'border-line bg-surface hover:border-line-strong'
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={expanded}
        className="focus-ring flex w-full items-center gap-2.5 px-3 py-2 text-left"
      >
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
            ) : null}
          </span>
        </span>

        {!awaiting && (call.result || call.error) ? (
          <ChevronRight
            className={`h-3.5 w-3.5 shrink-0 text-ink-muted transition-transform duration-200 ${
              open ? 'rotate-90' : ''
            }`}
          />
        ) : null}
      </button>

      {/* Approval body: the exact command or diff, then the decision. */}
      {awaiting ? (
        <div className="border-t border-line/60 px-3 py-2.5">
          {risky ? (
            <p className="mb-2 flex items-center gap-1.5 text-2xs font-medium text-danger">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              Looks destructive: {call.approval?.reason}
            </p>
          ) : null}

          <pre className="thin-scrollbar max-h-52 overflow-auto whitespace-pre-wrap break-words rounded-md border border-line bg-surface/60 px-2.5 py-2 font-mono text-2xs leading-relaxed text-ink">
            {call.approval?.preview ?? JSON.stringify(call.arguments, null, 2)}
          </pre>

          <div className="mt-2.5 flex items-center gap-2">
            <Button variant="primary" size="sm" onClick={() => onDecide?.(true)} disabled={!onDecide}>
              <Check className="h-3.5 w-3.5" />
              Allow
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onDecide?.(false)}
              disabled={!onDecide}
            >
              <Ban className="h-3.5 w-3.5" />
              Deny
            </Button>
            <span className="text-2xs text-ink-muted">
              Nothing runs until you choose. Denying tells the model to stop.
            </span>
          </div>
        </div>
      ) : null}

      {!awaiting && open && (call.result || call.error) ? (
        <div className="thin-scrollbar max-h-80 overflow-auto border-t border-line px-3 py-2">
          <pre className="whitespace-pre-wrap break-words font-mono text-2xs leading-relaxed text-ink-secondary">
            {call.error ?? call.result}
          </pre>
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
