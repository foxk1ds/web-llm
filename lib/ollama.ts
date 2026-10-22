
import type { OllamaModel, Role, MessageStats } from '@/types';
import type { OllamaChatChunk } from '@/types';
import { readNdjsonLines } from '@/lib/ndjson';

export interface StreamChatOptions {
  model: string;
  messages: Array<{ role: Role; content: string; images?: string[] }>;
  system?: string;
  options?: { temperature?: number; num_predict?: number } | null;
  signal?: AbortSignal;
  onToken: (token: string) => void;
  onThinking?: (token: string) => void;
  onDone?: (stats: MessageStats) => void;
}

export class OllamaError extends Error {
  readonly code: string;
  constructor(message: string, code = 'UPSTREAM_ERROR') {
    super(message);
    this.name = 'OllamaError';
    this.code = code;
  }
}

export async function fetchModels(): Promise<OllamaModel[]> {
  let res: Response;
  try {
    res = await fetch('/api/models', { cache: 'no-store' });
  } catch {
    throw new OllamaError('Could not reach the local server.', 'OLLAMA_UNREACHABLE');
  }

  const data = (await res.json().catch(() => null)) as
    | { models?: OllamaModel[]; error?: string; code?: string }
    | null;

  if (!res.ok) {
    throw new OllamaError(data?.error ?? `Failed to load models (HTTP ${res.status}).`, data?.code);
  }
  return data?.models ?? [];
}

export async function streamChat(options: StreamChatOptions): Promise<void> {
  const { model, messages, system, options: ollamaOptions, signal, onToken, onThinking, onDone } = options;

  let res: Response;
  try {
    res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, system, options: ollamaOptions ?? undefined }),
      signal,
    });
  } catch (error) {
    if (isAbortError(error)) throw error;
    throw new OllamaError('Could not reach the local server.', 'OLLAMA_UNREACHABLE');
  }

  if (!res.ok) {
    let message = `Request failed (HTTP ${res.status}).`;
    let code = 'UPSTREAM_ERROR';
    try {
      const body = (await res.json()) as { error?: string; code?: string };
      if (body?.error) message = body.error;
      if (body?.code) code = body.code;
    } catch {}
    throw new OllamaError(message, code);
  }

  if (!res.body) throw new OllamaError('The server returned an empty response stream.');

  const handleLine = (line: string) => {
    let chunk: OllamaChatChunk;
    try {
      chunk = JSON.parse(line) as OllamaChatChunk;
    } catch {
      return;
    }

    if (chunk.error) throw new OllamaError(chunk.error, 'UPSTREAM_ERROR');

    if (chunk.message?.thinking) onThinking?.(chunk.message.thinking);
    if (chunk.message?.content) onToken(chunk.message.content);

    if (chunk.done) {
      const evalCount = chunk.eval_count ?? 0;
      const evalDurationNs = chunk.eval_duration ?? 0;
      onDone?.({
        evalCount,
        tokensPerSecond: evalDurationNs > 0 ? evalCount / (evalDurationNs / 1e9) : undefined,
        totalDurationMs: chunk.total_duration ? chunk.total_duration / 1e6 : undefined,
      });
    }
  };

  await readNdjsonLines(res.body, handleLine);
}

export function isAbortError(error: unknown): boolean {
  return (
    !!error &&
    typeof error === 'object' &&
    'name' in error &&
    (error as { name?: string }).name === 'AbortError'
  );
}
