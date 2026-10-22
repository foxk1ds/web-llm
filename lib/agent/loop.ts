import { TOOLS, TOOL_NAMES, buildApprovalPreview, isMutating, runTool, toolPromptSection, cleanWorkspacePath } from './tools';
import { parseToolCalls, stripToolSyntax, type ParsedToolCall } from './protocol';
import { readNdjsonLines } from '@/lib/ndjson';
import type { AgentEvent, MessageStats, ToolCall } from '@/types';

const DEFAULT_MAX_STEPS = 6;
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434';

interface WireMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_name?: string;
  tool_calls?: Array<{
    id?: string;
    type?: string;
    function: {
      name: string;
      arguments: Record<string, unknown>;
    };
  }>;
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
      id?: string;
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

  const cleanWorkspace = cleanWorkspacePath(workspace);
  const systemPrompt = [system?.trim(), toolPromptSection()].filter(Boolean).join('\n\n');
  const history: WireMessage[] = [{ role: 'system', content: systemPrompt }, ...messages];

  const alreadyRun = new Map<string, Awaited<ReturnType<typeof runTool>>>();
  const toolRetries = new Map<string, number>();

  let doneEmitted = false;
  const safeEmit = (event: AgentEvent) => {
    if (event.type === 'done') doneEmitted = true;
    emit(event);
  };

  try {
    for (let step = 0; step < maxSteps; step += 1) {
      if (signal?.aborted) {
        safeEmit({ type: 'done', reason: 'stopped' });
        return;
      }
      safeEmit({ type: 'step', index: step });

      let content = '';
      let thinking = '';
      const nativeCalls: Array<{ id?: string; name: string; arguments: Record<string, unknown> }> = [];
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
              safeEmit({ type: 'thinking', value: chunk.message.thinking });
            }
            if (chunk.message?.content) {
              content += chunk.message.content;
              safeEmit({ type: 'token', value: chunk.message.content });
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
              const parsedArgs = (args && typeof args === 'object' ? { ...args } : {}) as Record<string, unknown>;
              // Normalize alternate argument names
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

              nativeCalls.push({
                id: raw.id,
                name,
                arguments: parsedArgs,
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
          safeEmit({ type: 'done', reason: 'stopped' });
          return;
        }
        safeEmit({
          type: 'error',
          message: error instanceof Error ? error.message : 'The model request failed.',
        });
        safeEmit({ type: 'done', reason: 'error' });
        return;
      }

      if (upstreamError) {
        safeEmit({ type: 'error', message: upstreamError });
        safeEmit({ type: 'done', reason: 'error' });
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
          safeEmit({ type: 'retract', text: content });
          safeEmit({
            type: 'token',
            value:
              'The model started a tool call but the output was cut off before it was complete. Send the request again.',
          });
        }
        safeEmit({ type: 'done', reason: 'complete', stats });
        return;
      }

      if (native && /^\s*\{/.test(content)) {
        safeEmit({ type: 'retract', text: content });
      } else if (!native) {
        for (const call of parsed) {
          if (call.raw) safeEmit({ type: 'retract', text: call.raw });
        }
      }

      const visible = stripToolSyntax(content, parsed);
      if (native) {
        history.push({
          role: 'assistant',
          content: visible || content || '',
          tool_calls: nativeCalls.map((c, i) => ({
            id: c.id ?? `call_${step}_${i}`,
            type: 'function',
            function: {
              name: c.name,
              arguments: c.arguments,
            },
          })),
        });
      } else if (visible.trim()) {
        history.push({ role: 'assistant', content: visible.trim() });
      } else if (content.trim()) {
        history.push({ role: 'assistant', content: content.trim() });
      }

      for (const call of usable) {
        if (signal?.aborted) {
          safeEmit({ type: 'done', reason: 'stopped' });
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
        safeEmit({ type: 'tool_call', call: toolCall });

        if (mutating) {
          const approved = requestApproval ? await requestApproval(toolCall) : false;
          if (!approved) {
            const denial = `The user denied the ${call.name} call. Do not retry it or attempt the same change another way. Explain what you wanted to do and stop, or propose an alternative that needs no approval.`;
            safeEmit({ type: 'tool_result', id, result: denial, ok: false, durationMs: 0 });
            history.push({ role: 'user', content: denial });
            continue;
          }
          safeEmit({ type: 'tool_call', call: { ...toolCall, status: 'running' } });
        }

        const key = `${call.name}:${JSON.stringify(call.arguments)}`;
        const cached = alreadyRun.get(key);
        if (cached && cached.ok) {
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
        const outcome = await runTool(call.name, call.arguments, { workspace: cleanWorkspace, signal });
        const durationMs = Date.now() - started;

        safeEmit({ type: 'tool_result', id, result: outcome.display, ok: outcome.ok, durationMs });

        let forModel = outcome.prompt;

        if (outcome.ok) {
          alreadyRun.set(key, outcome);
          toolRetries.delete(call.name);
        } else {
          const retries = (toolRetries.get(call.name) ?? 0) + 1;
          toolRetries.set(call.name, retries);
          if (retries > 2) {
            forModel += `\n\n[Tool "${call.name}" has failed ${retries} times. Stop retrying this tool and explain the error to the user.]`;
          }
        }

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

    safeEmit({ type: 'done', reason: 'max_steps' });
  } finally {
    if (!doneEmitted) {
      safeEmit({ type: 'done', reason: signal?.aborted ? 'stopped' : 'error' });
    }
  }
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

  const NO_RESPONSE_TIMEOUT_MS = 90_000;
  const timeoutController = new AbortController();
  let timer: NodeJS.Timeout | null = null;

  const resetTimer = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timeoutController.abort(new Error('Model response timed out (no response received for 90 seconds).'));
    }, NO_RESPONSE_TIMEOUT_MS);
  };

  resetTimer();

  const combinedSignal = signal
    ? AbortSignal.any([signal, timeoutController.signal])
    : timeoutController.signal;

  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, stream: true, tools: declaredTools }),
      signal: combinedSignal,
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
      resetTimer();
      try {
        onChunk(JSON.parse(line) as UpstreamChunk);
      } catch {}
    };

    await readNdjsonLines(response.body, handleLine);
  } catch (error) {
    if (timeoutController.signal.aborted) {
      throw new Error('Model response timed out (no response received for 90 seconds).');
    }
    throw error;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
