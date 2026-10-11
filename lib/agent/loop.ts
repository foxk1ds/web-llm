
import { TOOLS, TOOL_NAMES, buildApprovalPreview, isMutating, runTool, toolPromptSection } from './tools';
import { parseToolCalls, stripToolSyntax, type ParsedToolCall } from './protocol';
import { readNdjsonLines } from '@/lib/ndjson';
import type { AgentEvent, MessageStats, ToolCall } from '@/types';

const DEFAULT_MAX_STEPS = 6;

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434';

interface WireMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_name?: string;
}

export interface AgentLoopOptions {
  model: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  system?: string;
  workspace: string;
  maxSteps?: number;
  signal?: AbortSignal;
  emit: (event: AgentEvent) => void;
  requestApproval?: (call: ToolCall) => Promise<boolean>;
}

interface UpstreamChunk {
  message?: {
    role?: string;
    content?: string;
    thinking?: string;
    tool_calls?: Array<{
      function?: { name?: string; arguments?: unknown };
      name?: string;
      arguments?: unknown;
    }>;
  };
  done?: boolean;
  done_reason?: string;
  error?: string;
  eval_count?: number;
  eval_duration?: number;
  total_duration?: number;
}

export async function runAgentLoop(options: AgentLoopOptions): Promise<void> {
  const { model, messages, system, workspace, signal, emit, requestApproval } = options;
  const maxSteps = Math.min(options.maxSteps ?? DEFAULT_MAX_STEPS, 12);

  const systemPrompt = [system?.trim(), toolPromptSection()].filter(Boolean).join('\n\n');
  const history: WireMessage[] = [{ role: 'system', content: systemPrompt }, ...messages];

  const alreadyRun = new Map<string, Awaited<ReturnType<typeof runTool>>>();

  for (let step = 0; step < maxSteps; step += 1) {
    if (signal?.aborted) {
      emit({ type: 'done', reason: 'stopped' });
      return;
    }
    emit({ type: 'step', index: step });

    let content = '';
    let thinking = '';
    const nativeCalls: Array<{ name: string; arguments: Record<string, unknown> }> = [];
    let stats: MessageStats | undefined;
    let upstreamError: string | null = null;

    try {
      await streamCompletion({
        model,
        messages: history,
        signal,
        onChunk: (chunk) => {
          if (chunk.error) upstreamError = chunk.error;
          if (chunk.message?.thinking) {
            thinking += chunk.message.thinking;
            emit({ type: 'thinking', value: chunk.message.thinking });
          }
          if (chunk.message?.content) {
            content += chunk.message.content;
            emit({ type: 'token', value: chunk.message.content });
          }
          for (const raw of chunk.message?.tool_calls ?? []) {
            const fn = raw.function ?? raw;
            const name = typeof fn.name === 'string' ? fn.name : undefined;
            if (!name) continue;
            let args = (fn as { arguments?: unknown }).arguments;
            if (typeof args === 'string') {
              try {
                args = JSON.parse(args);
              } catch {
                args = {};
              }
            }
            nativeCalls.push({
              name,
              arguments: (args && typeof args === 'object' ? args : {}) as Record<string, unknown>,
            });
          }
          if (chunk.done) {
            const evalCount = chunk.eval_count ?? 0;
            const evalNs = chunk.eval_duration ?? 0;
            stats = {
              evalCount,
              tokensPerSecond: evalNs > 0 ? evalCount / (evalNs / 1e9) : undefined,
              totalDurationMs: chunk.total_duration ? chunk.total_duration / 1e6 : undefined,
            };
          }
        },
      });
    } catch (error) {
      if (signal?.aborted) {
        emit({ type: 'done', reason: 'stopped' });
        return;
      }
      emit({
        type: 'error',
        message: error instanceof Error ? error.message : 'The model request failed.',
      });
      emit({ type: 'done', reason: 'error' });
      return;
    }

    if (upstreamError) {
      emit({ type: 'error', message: upstreamError });
      emit({ type: 'done', reason: 'error' });
      return;
    }

    const native = nativeCalls.length > 0;
    const parsed: ParsedToolCall[] = native
      ? nativeCalls.map((call) => ({
          name: call.name,
          arguments: call.arguments,
          source: 'native' as const,
          raw: '',
        }))
      : parseToolCalls(content, TOOL_NAMES);

    const seenCalls = new Set<string>();
    const usable = parsed.filter((call) => {
      if (!TOOL_NAMES.has(call.name)) return false;
      const key = `${call.name}:${JSON.stringify(call.arguments)}`;
      if (seenCalls.has(key)) return false;
      seenCalls.add(key);
      return true;
    });

    if (usable.length === 0) {
      if (/^\s*\{/.test(content) && /"name"|"arguments"|"command"/.test(content)) {
        emit({ type: 'retract', text: content });
        emit({
          type: 'token',
          value:
            'The model started a tool call but the output was cut off before it was complete. Send the request again.',
        });
      }
      emit({ type: 'done', reason: 'complete', stats });
      return;
    }

    if (native && /^\s*\{/.test(content)) {
      emit({ type: 'retract', text: content });
    } else if (!native) {
      for (const call of parsed) {
        if (call.raw) emit({ type: 'retract', text: call.raw });
      }
    }

    const visible = stripToolSyntax(content, parsed) || (thinking ? '' : '');
    if (visible.trim()) {
      history.push({ role: 'assistant', content: visible.trim() });
    } else if (content.trim()) {
      history.push({ role: 'assistant', content: content.trim() });
    }

    for (const call of usable) {
      if (signal?.aborted) {
        emit({ type: 'done', reason: 'stopped' });
        return;
      }

      const id = `call_${step}_${Math.random().toString(36).slice(2, 8)}`;
      const mutating = isMutating(call.name);

      const toolCall: ToolCall = {
        id,
        name: call.name,
        arguments: call.arguments,
        source: call.source,
        status: mutating ? 'awaiting_approval' : 'running',
        mutating,
        approval: mutating ? buildApprovalPreview(call.name, call.arguments) : undefined,
      };
      emit({ type: 'tool_call', call: toolCall });

      if (mutating) {
        const approved = requestApproval ? await requestApproval(toolCall) : false;
        if (!approved) {
          const denial = `The user denied the ${call.name} call. Do not retry it or attempt the same change another way. Explain what you wanted to do and stop, or propose an alternative that needs no approval.`;
          emit({ type: 'tool_result', id, result: denial, ok: false, durationMs: 0 });
          history.push({ role: 'user', content: denial });
          continue;
        }
        emit({ type: 'tool_call', call: { ...toolCall, status: 'running' } });
      }

      const key = `${call.name}:${JSON.stringify(call.arguments)}`;
      const cached = alreadyRun.get(key);
      if (cached) {
        const repeatNote =
          '\n\n[You already made this exact call earlier in the run — this is the same result. Do not call it again; use this information or try different arguments.]';
        const forModel = `${cached.prompt}${repeatNote}`;
        if (call.source === 'native') {
          history.push({ role: 'tool', content: forModel, tool_name: call.name });
        } else {
          history.push({
            role: 'user',
            content: `Result of ${call.name}(${JSON.stringify(call.arguments)}):\n${forModel}`,
          });
        }
        continue;
      }

      const started = Date.now();
      const outcome = await runTool(call.name, call.arguments, { workspace, signal });
      alreadyRun.set(key, outcome);
      const durationMs = Date.now() - started;

      emit({ type: 'tool_result', id, result: outcome.display, ok: outcome.ok, durationMs });

      const forModel = outcome.prompt;

      if (call.source === 'native') {
        history.push({ role: 'tool', content: forModel, tool_name: call.name });
      } else {
        history.push({
          role: 'user',
          content: `Result of ${call.name}(${JSON.stringify(call.arguments)}):\n${forModel}`,
        });
      }
    }
  }

  emit({ type: 'done', reason: 'max_steps' });
}

async function streamCompletion(args: {
  model: string;
  messages: WireMessage[];
  signal?: AbortSignal;
  onChunk: (chunk: UpstreamChunk) => void;
}): Promise<void> {
  const { model, messages, signal, onChunk } = args;

  const declaredTools = TOOLS.map((tool) => ({
    type: 'function',
    function: {
      name: tool.definition.name,
      description: tool.definition.description,
      parameters: tool.definition.parameters,
    },
  }));

  const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, stream: true, tools: declaredTools }),
    signal,
    cache: 'no-store',
  });

  if (!response.ok || !response.body) {
    const detail = await response.text().catch(() => '');
    throw new Error(
      detail
        ? `Ollama returned ${response.status}: ${detail.slice(0, 200)}`
        : `Ollama returned HTTP ${response.status}.`,
    );
  }

  const handleLine = (line: string) => {
    try {
      onChunk(JSON.parse(line) as UpstreamChunk);
    } catch {}
  };

  await readNdjsonLines(response.body, handleLine);
}
