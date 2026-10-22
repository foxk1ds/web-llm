import { NextResponse } from 'next/server';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { runAgentLoop } from '@/lib/agent/loop';
import { cancelRunApprovals, waitForApproval } from '@/lib/agent/approvals';
import type { AgentEvent, AgentRequestBody, ApiErrorBody } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(req: Request) {
  let body: AgentRequestBody;
  try {
    body = (await req.json()) as AgentRequestBody;
  } catch {
    return errorResponse('Request body must be valid JSON.', 'BAD_REQUEST', 400);
  }

  const model = typeof body?.model === 'string' ? body.model.trim() : '';
  if (!model) {
    return errorResponse('No model selected. Pick a model in the sidebar first.', 'MODEL_REQUIRED', 400);
  }

  if (!Array.isArray(body?.messages) || body.messages.length === 0) {
    return errorResponse('Request must include at least one message.', 'BAD_REQUEST', 400);
  }

  const requestedWorkspace =
    typeof body.workspace === 'string' && body.workspace.trim()
      ? body.workspace.trim()
      : (process.env.AGENT_WORKSPACE ?? process.cwd());

  const workspace = path.resolve(requestedWorkspace);
  const info = await stat(workspace).catch(() => null);
  if (!info?.isDirectory()) {
    return errorResponse(`Workspace is not a readable directory: ${workspace}`, 'BAD_REQUEST', 400);
  }

  const history = body.messages
    .filter((m) => m && typeof m.content === 'string')
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content, images: sanitizeImages(m.images) }))
    .filter((m) => m.content.trim() || (m.images?.length ?? 0) > 0)
    .map((m) => ({
      role: m.role,
      content: m.content,
      ...(m.images?.length ? { images: m.images } : {}),
    }));

  if (history.length === 0) {
    return errorResponse('No usable messages in request.', 'BAD_REQUEST', 400);
  }

  const controller = new AbortController();
  req.signal.addEventListener('abort', () => controller.abort());

  const runId = crypto.randomUUID();

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(streamController) {
      const emit = (event: AgentEvent) => {
        try {
          streamController.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {}
      };

      emit({ type: 'run', runId });

      try {
        await runAgentLoop({
          model,
          messages: history,
          system: subjectOf(body.system),
          workspace,
          maxSteps: typeof body.maxSteps === 'number' ? body.maxSteps : undefined,
          options: sanitizeOptions(body.options),
          signal: controller.signal,
          emit,
          requestApproval: (call) => waitForApproval(runId, call.id),
        });
      } catch (error) {
        emit({
          type: 'error',
          message: error instanceof Error ? error.message : 'The agent run failed.',
        });
        emit({ type: 'done', reason: 'error' });
      } finally {
        cancelRunApprovals(runId);
        try {
          streamController.close();
        } catch {}
      }
    },
    cancel() {
      controller.abort();
      cancelRunApprovals(runId);
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

function sanitizeOptions(value: unknown): { temperature?: number; num_predict?: number } | null {
  if (!value || typeof value !== 'object') return null;
  const source = value as { temperature?: unknown; num_predict?: unknown };
  const options: { temperature?: number; num_predict?: number } = {};

  if (typeof source.temperature === 'number' && Number.isFinite(source.temperature)) {
    options.temperature = Math.min(2, Math.max(0, source.temperature));
  }
  if (typeof source.num_predict === 'number' && Number.isFinite(source.num_predict)) {
    options.num_predict = Math.min(32768, Math.max(1, Math.round(source.num_predict)));
  }

  return options.temperature === undefined && options.num_predict === undefined ? null : options;
}

function subjectOf(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function sanitizeImages(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const images = value
    .filter((image): image is string => typeof image === 'string' && image.length > 0)
    .map((image) => {
      const comma = image.indexOf(',');
      return image.startsWith('data:') && comma >= 0 ? image.slice(comma + 1) : image;
    })
    .filter((image) => image.length < 20_000_000)
    .slice(0, 8);
  return images.length > 0 ? images : undefined;
}

function errorResponse(error: string, code: ApiErrorBody['code'], status: number) {
  return NextResponse.json<ApiErrorBody>({ error, code }, { status });
}
