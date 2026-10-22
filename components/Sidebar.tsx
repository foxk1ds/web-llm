'use client';

import { MessageSquare, Settings2, SquarePen, Trash2, X } from 'lucide-react';
import { formatRelativeTime } from '@/lib/format';
import type { ChatSession } from '@/types';

interface SidebarProps {
  sessions: ChatSession[];
  activeId: string | null;
  streaming: boolean;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
  newChatShortcut: string;
  onOpenSettings: () => void;
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({
  sessions,
  activeId,
  streaming,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  newChatShortcut,
  onOpenSettings,
  open,
  onClose,
}: SidebarProps) {
  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {open ? (
        <div
          role="presentation"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
        />
      ) : null}

      <aside
        aria-label="Chat history"
        className={`fixed inset-y-0 left-0 z-50 flex w-[260px] shrink-0 flex-col border-r border-border bg-panel transition-transform duration-200 ease-out md:static md:z-auto md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top: Web-LLM Brand Header */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm tracking-tight text-foreground font-sans">
              Web-LLM
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sidebar"
            className="focus-ring rounded-md p-1 text-muted-foreground hover:text-foreground md:hidden transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 1. New Chat Button on Top */}
        <div className="p-3">
          <button
            type="button"
            onClick={onNewChat}
            className="focus-ring group flex w-full items-center justify-between rounded-lg border border-border bg-muted/50 px-3 py-2 text-left text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
            <div className="flex items-center gap-2">
              <SquarePen className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
              <span>New chat</span>
            </div>
            <kbd className="rounded border border-border bg-panel px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              {newChatShortcut}
            </kbd>
          </button>
        </div>

        {/* 2. Conversation List in the Middle */}
        <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto px-2 pb-2">
          {sessions.length === 0 ? (
            <div className="px-3 py-8 text-center text-xs text-muted-foreground leading-relaxed">
              No conversations yet.
              <br />
              Start chatting or open Settings.
            </div>
          ) : (
            <ul className="space-y-0.5">
              {sessions.map((session) => {
                const active = session.id === activeId;
                const isGenerating = streaming && active;

                return (
                  <li key={session.id}>
                    <div
                      className={`group/row relative flex items-center rounded-lg border transition-colors ${
                        active
                          ? 'border-border bg-muted text-foreground'
                          : 'border-transparent text-muted-foreground hover:border-border hover:bg-muted/40 hover:text-foreground'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => onSelectSession(session.id)}
                        aria-current={active ? 'true' : undefined}
                        className="focus-ring flex min-w-0 flex-1 items-center gap-2 px-2.5 py-2 text-left"
                      >
                        {isGenerating ? (
                          <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                            <span className="h-1.5 w-1.5 rounded-full bg-foreground animate-pulse" />
                          </span>
                        ) : (
                          <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-medium">
                            {session.title}
                          </span>
                          <span className="block truncate text-[10px] text-muted-foreground">
                            {isGenerating ? 'Generating…' : formatRelativeTime(session.updatedAt)}
                          </span>
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSession(session.id);
                        }}
                        aria-label={`Delete "${session.title}"`}
                        title="Delete chat"
                        className="focus-ring mr-1 shrink-0 rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:text-red-500 focus:opacity-100 group-hover/row:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* 3. Settings Button Pinned at the Bottom */}
        <div className="shrink-0 border-t border-border p-2 bg-panel">
          <button
            type="button"
            onClick={onOpenSettings}
            className="focus-ring flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Settings2 className="h-4 w-4" />
            <span>Settings</span>
          </button>
        </div>
      </aside>
    </>
  );
}
