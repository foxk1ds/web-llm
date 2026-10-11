
import { readNdjsonLines } from '@/lib/ndjson';
import type { AgentEvent } from '@/types';

export interface RunAgentOptions {
  model: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  system?: string;
  workspace?: string;
  maxSteps?: number;
  signal?: AbortSignal;
  onEvent: (event: AgentEvent) => void;
}

export class AgentError extends Error {
  readonly code: string;
  constructor(message: string, code = 'UPSTREAM_ERROR') {
    super(message);
    this.name = 'AgentError';
    this.code = code;
  }
}

export async function runAgent(options: RunAgentOptions): Promise<void> {
  const { model, messages, system, workspace, maxSteps, signal, onEvent } = options;

  let response: Response;
  try {
    response = await fetch('/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, system, workspace, maxSteps }),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new AgentError('Could not reach the local server.', 'OLLAMA_UNREACHABLE');
  }

  if (!response.ok) {
    let message = `Request failed (HTTP ${response.status}).`;
    let code = 'UPSTREAM_ERROR';
    try {
      const body = (await response.json()) as { error?: string; code?: string };
      if (body?.error) message = body.error;
      if (body?.code) code = body.code;
    } catch {}
    throw new AgentError(message, code);
  }

  if (!response.body) throw new AgentError('The server returned an empty event stream.');

  await readNdjsonLines(response.body, (line) => {
    let event: AgentEvent;
    try {
      event = JSON.parse(line) as AgentEvent;
    } catch {
      return;
    }
    onEvent(event);
  });
}

export async function respondToApproval(
  runId: string,
  callId: string,
  approved: boolean,
): Promise<boolean> {
  try {
    const response = await fetch('/api/agent/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ runId, callId, approved }),
    });
    if (response.status === 409) return false;
    if (!response.ok) return false;
    const body = (await response.json()) as { resolved?: boolean };
    return Boolean(body.resolved);
  } catch {
    return false;
  }
}
