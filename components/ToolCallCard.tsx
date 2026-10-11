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
      return { Icon: LoaderCircle, label: 'Running', spin: true, tone: 'text-indigo-500 dark:text-indigo-300' };
    case 'awaiting_approval':
      return { Icon: ShieldAlert, label: 'Needs approval', spin: false, tone: 'text-amber-600 dark:text-amber-400' };
    case 'ok':
      return { Icon: Check, label: 'Done', spin: false, tone: 'text-emerald-600 dark:text-emerald-400' };
    case 'error':
      return { Icon: Ban, label: 'Failed', spin: false, tone: 'text-red-600 dark:text-red-400' };
    case 'denied':
      return { Icon: CircleSlash, label: 'Denied', spin: false, tone: 'text-zinc-500 dark:text-zinc-400' };
    default:
      return { Icon: LoaderCircle, label: 'Queued', spin: false, tone: 'text-zinc-500 dark:text-zinc-400' };
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
      className={`my-1.5 overflow-hidden rounded-xl border transition-colors duration-200 ${
        awaiting
          ? risky
            ? 'border-red-500/40 bg-red-500/[0.06]'
            : 'border-amber-500/35 bg-amber-500/[0.05]'
          : failed
            ? 'border-red-500/25 bg-red-500/[0.04]'
            : 'border-overlay/[0.08] bg-overlay/[0.03] hover:border-overlay/[0.15]'
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={expanded}
        className="focus-ring flex w-full items-center gap-2.5 px-3 py-2 text-left"
      >
        <ToolIcon className="h-3.5 w-3.5 shrink-0 text-zinc-500 dark:text-zinc-400" />

        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span className="shrink-0 font-mono text-[11.5px] font-medium text-zinc-700 dark:text-zinc-200">
              {call.name}
            </span>
            <span className="min-w-0 truncate font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
              {primaryArg(call)}
            </span>
          </span>
          <span className="mt-0.5 flex items-center gap-1.5">
            <StatusIcon className={`h-3 w-3 ${tone} ${spin ? 'animate-spin' : ''}`} aria-hidden />
            <span className={`text-[10.5px] ${tone}`}>{label}</span>
            {typeof call.durationMs === 'number' && call.durationMs > 0 ? (
              <span className="text-[10.5px] text-zinc-500 dark:text-zinc-400">
                · {call.durationMs}ms
              </span>
            ) : null}
            {call.source && call.source !== 'native' ? (
              <span
                title={`Recovered from ${call.source} output — this model does not emit native tool calls`}
                className="text-[10.5px] text-zinc-500 dark:text-zinc-400"
              >
                · text protocol
              </span>
            ) : null}
          </span>
        </span>

        {!awaiting && (call.result || call.error) ? (
          <ChevronRight
            className={`h-3.5 w-3.5 shrink-0 text-zinc-500 transition-transform duration-200 dark:text-zinc-400 ${
              open ? 'rotate-90' : ''
            }`}
          />
        ) : null}
      </button>

      {/* Approval body: the exact command or diff, then the decision. */}
      {awaiting ? (
        <div className="border-t border-overlay/[0.08] px-3 py-2.5">
          {risky ? (
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-medium text-red-600 dark:text-red-400">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              Looks destructive: {call.approval?.reason}
            </p>
          ) : null}

          <pre className="thin-scrollbar max-h-52 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-overlay/[0.08] bg-overlay/[0.03] px-2.5 py-2 font-mono text-[11px] leading-relaxed text-zinc-700 dark:text-zinc-200">
            {call.approval?.preview ?? JSON.stringify(call.arguments, null, 2)}
          </pre>

          <div className="mt-2.5 flex items-center gap-2">
            <button
              type="button"
              onClick={() => onDecide?.(true)}
              disabled={!onDecide}
              className="focus-ring flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-1.5 text-[11.5px] font-medium text-emerald-700 transition-colors hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-50 dark:text-emerald-300"
            >
              <Check className="h-3.5 w-3.5" />
              Allow
            </button>
            <button
              type="button"
              onClick={() => onDecide?.(false)}
              disabled={!onDecide}
              className="focus-ring flex items-center gap-1.5 rounded-lg border border-overlay/[0.12] bg-overlay/[0.04] px-2.5 py-1.5 text-[11.5px] font-medium text-zinc-600 transition-colors hover:bg-overlay/[0.08] disabled:cursor-not-allowed disabled:opacity-50 dark:text-zinc-300"
            >
              <Ban className="h-3.5 w-3.5" />
              Deny
            </button>
            <span className="text-[10.5px] text-zinc-500 dark:text-zinc-400">
              Nothing runs until you choose. Denying tells the model to stop.
            </span>
          </div>
        </div>
      ) : null}

      {!awaiting && open && (call.result || call.error) ? (
        <div className="thin-scrollbar max-h-80 overflow-auto border-t border-overlay/[0.08] px-3 py-2">
          <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-300">
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
