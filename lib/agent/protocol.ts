
import type { ToolCall } from '@/types';

export interface ParsedToolCall {
  name: string;
  arguments: Record<string, unknown>;
  source: NonNullable<ToolCall['source']>;
  raw: string;
}

const ARG_KEYS = ['arguments', 'args', 'parameters', 'input', 'tool_input'] as const;

export function extractJsonObjects(text: string): Array<{ value: unknown; raw: string }> {
  const found: Array<{ value: unknown; raw: string }> = [];

  for (let i = 0; i < text.length; i += 1) {
    if (text[i] !== '{') continue;

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let j = i; j < text.length; j += 1) {
      const ch = text[j];

      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        escaped = true;
        continue;
      }
      if (ch === '"') {
        inString = !inString;
        continue;
      }
      if (inString) continue;

      if (ch === '{') depth += 1;
      else if (ch === '}') {
        depth -= 1;
        if (depth === 0) {
          const raw = text.slice(i, j + 1);
          try {
            found.push({ value: JSON.parse(raw), raw });
          } catch {
          }
          i = j;
          break;
        }
      }
    }
  }

  return found;
}

function normalize(
  value: unknown,
): { name: string; arguments: Record<string, unknown> } | null {
  if (!value || typeof value !== 'object') return null;
  const obj = value as Record<string, unknown>;

  const inner =
    obj.function && typeof obj.function === 'object'
      ? (obj.function as Record<string, unknown>)
      : obj;

  const name =
    (typeof inner.name === 'string' && inner.name) ||
    (typeof obj.tool === 'string' && obj.tool) ||
    (typeof obj.tool_name === 'string' && obj.tool_name) ||
    (typeof obj.name === 'string' && obj.name) ||
    null;
  if (!name) return null;

  let args: unknown;
  for (const key of ARG_KEYS) {
    if (inner[key] !== undefined) {
      args = inner[key];
      break;
    }
  }
  if (args === undefined) {
    for (const key of ARG_KEYS) {
      if (obj[key] !== undefined) {
        args = obj[key];
        break;
      }
    }
  }
  if (typeof args === 'string') {
    try {
      args = JSON.parse(args);
    } catch {
      args = {};
    }
  }

  let parsedArgs = (args && typeof args === 'object' ? { ...args } : {}) as Record<string, unknown>;

  // Accept alternate argument names (file_path, filename, file for path; contents, text, code for content)
  if (parsedArgs.path === undefined || parsedArgs.path === null || parsedArgs.path === '') {
    for (const alias of ['file_path', 'filepath', 'filename', 'file']) {
      if (typeof parsedArgs[alias] === 'string' && (parsedArgs[alias] as string).trim()) {
        parsedArgs.path = (parsedArgs[alias] as string).trim();
        break;
      }
    }
  }
  if (parsedArgs.content === undefined || parsedArgs.content === null) {
    for (const alias of ['contents', 'text', 'code']) {
      if (typeof parsedArgs[alias] === 'string') {
        parsedArgs.content = parsedArgs[alias];
        break;
      }
    }
  }

  return {
    name,
    arguments: parsedArgs,
  };
}

export function parseToolCalls(text: string, knownTools: ReadonlySet<string>): ParsedToolCall[] {
  const calls: ParsedToolCall[] = [];
  const claimed = new Set<string>();

  const consider = (value: unknown, raw: string, source: NonNullable<ToolCall['source']>) => {
    const normalized = normalize(value);
    if (!normalized) return;
    if (!knownTools.has(normalized.name)) return;
    const key = `${normalized.name}:${JSON.stringify(normalized.arguments)}`;
    if (claimed.has(key)) return;
    claimed.add(key);
    calls.push({ ...normalized, source, raw });
  };

  for (const match of text.matchAll(/<tool_call>([\s\S]*?)<\/tool_call>/g)) {
    const body = match[1].trim();
    try {
      consider(JSON.parse(body), match[0], 'tag');
    } catch {
      for (const { value, raw } of extractJsonObjects(body)) consider(value, match[0], 'tag');
    }
  }

  for (const match of text.matchAll(/```(?:json|tool|tool_call|tool-call)\s*\n([\s\S]*?)```/gi)) {
    for (const { value } of extractJsonObjects(match[1])) consider(value, match[0], 'fence');
  }

  for (const { value, raw } of extractJsonObjects(text)) consider(value, raw, 'bare-json');

  return calls;
}

export function stripToolSyntax(text: string, calls: ParsedToolCall[]): string {
  let out = text;
  for (const call of calls) {
    out = out.split(call.raw).join('');
  }
  return out
    .replace(/<\/?tool_call>/g, '')
    .split('\n')
    .filter((line, index, lines) => !(line.trim() === '' && lines[index - 1]?.trim() === ''))
    .join('\n')
    .trim();
}

const HARNESS_KEYS = ['result', 'data', 'file_path', 'file_content', 'tool_calls', 'arguments'];

export function looksLikeHarnessJson(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return false;

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return false;
  }

  const hasHarnessKey = (value: unknown): boolean => {
    if (!value || typeof value !== 'object') return false;
    const keys = Object.keys(value as Record<string, unknown>);
    return keys.some((key) => HARNESS_KEYS.includes(key));
  };

  if (Array.isArray(parsed)) return parsed.some(hasHarnessKey);
  return hasHarnessKey(parsed);
}
