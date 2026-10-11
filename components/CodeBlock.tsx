'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import oneDark from 'react-syntax-highlighter/dist/esm/styles/prism/one-dark';
import { writeToClipboard } from '@/lib/clipboard';

import markup from 'react-syntax-highlighter/dist/esm/languages/prism/markup';
import clike from 'react-syntax-highlighter/dist/esm/languages/prism/clike';
import javascript from 'react-syntax-highlighter/dist/esm/languages/prism/javascript';
import typescript from 'react-syntax-highlighter/dist/esm/languages/prism/typescript';
import jsx from 'react-syntax-highlighter/dist/esm/languages/prism/jsx';
import tsx from 'react-syntax-highlighter/dist/esm/languages/prism/tsx';
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json';
import bash from 'react-syntax-highlighter/dist/esm/languages/prism/bash';
import python from 'react-syntax-highlighter/dist/esm/languages/prism/python';
import css from 'react-syntax-highlighter/dist/esm/languages/prism/css';
import scss from 'react-syntax-highlighter/dist/esm/languages/prism/scss';
import markdown from 'react-syntax-highlighter/dist/esm/languages/prism/markdown';
import sql from 'react-syntax-highlighter/dist/esm/languages/prism/sql';
import yaml from 'react-syntax-highlighter/dist/esm/languages/prism/yaml';
import rust from 'react-syntax-highlighter/dist/esm/languages/prism/rust';
import go from 'react-syntax-highlighter/dist/esm/languages/prism/go';
import java from 'react-syntax-highlighter/dist/esm/languages/prism/java';
import c from 'react-syntax-highlighter/dist/esm/languages/prism/c';
import cpp from 'react-syntax-highlighter/dist/esm/languages/prism/cpp';
import csharp from 'react-syntax-highlighter/dist/esm/languages/prism/csharp';
import php from 'react-syntax-highlighter/dist/esm/languages/prism/php';
import ruby from 'react-syntax-highlighter/dist/esm/languages/prism/ruby';
import kotlin from 'react-syntax-highlighter/dist/esm/languages/prism/kotlin';
import swift from 'react-syntax-highlighter/dist/esm/languages/prism/swift';
import lua from 'react-syntax-highlighter/dist/esm/languages/prism/lua';
import r from 'react-syntax-highlighter/dist/esm/languages/prism/r';
import scala from 'react-syntax-highlighter/dist/esm/languages/prism/scala';
import dart from 'react-syntax-highlighter/dist/esm/languages/prism/dart';
import elixir from 'react-syntax-highlighter/dist/esm/languages/prism/elixir';
import haskell from 'react-syntax-highlighter/dist/esm/languages/prism/haskell';
import diff from 'react-syntax-highlighter/dist/esm/languages/prism/diff';
import docker from 'react-syntax-highlighter/dist/esm/languages/prism/docker';
import powershell from 'react-syntax-highlighter/dist/esm/languages/prism/powershell';
import toml from 'react-syntax-highlighter/dist/esm/languages/prism/toml';
import ini from 'react-syntax-highlighter/dist/esm/languages/prism/ini';
import graphql from 'react-syntax-highlighter/dist/esm/languages/prism/graphql';
import makefile from 'react-syntax-highlighter/dist/esm/languages/prism/makefile';
import nginx from 'react-syntax-highlighter/dist/esm/languages/prism/nginx';

const LANGUAGES: Record<string, unknown> = {
  markup,
  clike,
  javascript,
  typescript,
  jsx,
  tsx,
  json,
  bash,
  python,
  css,
  scss,
  markdown,
  sql,
  yaml,
  rust,
  go,
  java,
  c,
  cpp,
  csharp,
  php,
  ruby,
  kotlin,
  swift,
  lua,
  r,
  scala,
  dart,
  elixir,
  haskell,
  diff,
  docker,
  powershell,
  toml,
  ini,
  graphql,
  makefile,
  nginx,
};

for (const [name, grammar] of Object.entries(LANGUAGES)) {
  SyntaxHighlighter.registerLanguage(name, grammar as never);
}

const ALIASES: Record<string, string> = {
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  ts: 'typescript',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  console: 'bash',
  py: 'python',
  yml: 'yaml',
  rs: 'rust',
  golang: 'go',
  'c++': 'cpp',
  cs: 'csharp',
  rb: 'ruby',
  kt: 'kotlin',
  md: 'markdown',
  dockerfile: 'docker',
  ps1: 'powershell',
  gql: 'graphql',
  text: 'markup',
  txt: 'markup',
  plaintext: 'markup',
  html: 'markup',
  xml: 'markup',
  svg: 'markup',
  vue: 'markup',
  svelte: 'markup',
  objc: 'clike',
  'objective-c': 'clike',
};

function resolveLanguage(raw?: string): string {
  const key = raw?.toLowerCase().trim();
  if (!key) return 'markup';
  if (LANGUAGES[key]) return key;
  return ALIASES[key] ?? 'markup';
}

const HIGHLIGHT_THROTTLE_MS = 120;

function useThrottledValue<T>(value: T, intervalMs: number): T {
  const [throttled, setThrottled] = useState(value);
  const lastRun = useRef(0);
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(value);
  latest.current = value;

  useEffect(() => {
    const elapsed = Date.now() - lastRun.current;

    if (elapsed >= intervalMs) {
      lastRun.current = Date.now();
      setThrottled(value);
      return;
    }

    if (pending.current) return;
    pending.current = setTimeout(() => {
      pending.current = null;
      lastRun.current = Date.now();
      setThrottled(latest.current);
    }, intervalMs - elapsed);
  }, [value, intervalMs]);

  useEffect(
    () => () => {
      if (pending.current) clearTimeout(pending.current);
    },
    [],
  );

  return throttled;
}

interface CodeBlockProps {
  code: string;
  language?: string;
}

export default function CodeBlock({ code, language }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const highlighted = useThrottledValue(code, HIGHLIGHT_THROTTLE_MS);

  useEffect(() => {
    return () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    };
  }, []);

  const copy = useCallback(async () => {
    const ok = await writeToClipboard(code);
    if (!ok) return;

    setCopied(true);
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setCopied(false), 1800);
  }, [code]);

  const resolved = resolveLanguage(language);
  const label = language?.trim() || resolved;
  const lineCount = code.split('\n').length;

  return (
    <div className="not-prose group/code my-4 overflow-hidden rounded-xl border border-white/[0.08] bg-[#0B0C10] shadow-lg shadow-black/20 ring-1 ring-inset ring-white/[0.02]">
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] bg-white/[0.02] px-3 py-1.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate font-mono text-[11px] font-medium uppercase tracking-wider text-zinc-400">
            {label}
          </span>
          <span className="shrink-0 rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-zinc-500">
            {lineCount} {lineCount === 1 ? 'line' : 'lines'}
          </span>
        </div>
        <button
          type="button"
          onClick={copy}
          aria-label={copied ? 'Code copied to clipboard' : 'Copy code to clipboard'}
          className={`focus-ring flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium transition-all duration-200 ${
            copied
              ? 'bg-emerald-500/10 text-emerald-400'
              : 'text-zinc-400 hover:bg-white/[0.08] hover:text-zinc-100'
          }`}
        >
          {copied ? (
            <span key="copied" className="animate-scale-in flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5" />
              <span>Copied!</span>
            </span>
          ) : (
            <span key="copy" className="flex items-center gap-1.5">
              <Copy className="h-3.5 w-3.5" />
              <span>Copy</span>
            </span>
          )}
        </button>
      </div>

      <div className="overflow-x-auto">
        <SyntaxHighlighter
          language={resolved}
          style={oneDark}
          PreTag="div"
          customStyle={{
            margin: 0,
            padding: '0.9rem 1rem',
            background: 'transparent',
            fontSize: '12.5px',
            lineHeight: '1.65',
          }}
        >
          {highlighted}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
