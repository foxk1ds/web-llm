import { NextResponse } from 'next/server';
import { mkdir, stat } from 'node:fs/promises';
import { runAgentLoop } from '@/lib/agent/loop';
import { cleanWorkspacePath } from '@/lib/agent/tools';
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

  const workspace = cleanWorkspacePath(requestedWorkspace);
  await mkdir(workspace, { recursive: true }).catch(() => {});
  const info = await stat(workspace).catch(() => null);
  if (!info?.isDirectory()) {
    return errorResponse(`Workspace is not a readable directory: ${workspace}`, 'BAD_REQUEST', 400);
  }

  const history = body.messages
    .filter((m) => m && typeof m.content === 'string' && m.content.trim())
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

  if (history.length === 0) {
    return errorResponse('No usable messages in request.', 'BAD_REQUEST', 400);
  }

  const controller = new AbortController();
  req.signal.addEventListener('abort', () => controller.abort());

  const runId = crypto.randomUUID();

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(streamController) {
      let isDone = false;
      const emit = (event: AgentEvent) => {
        if (event.type === 'done') isDone = true;
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
        if (!isDone) {
          emit({ type: 'done', reason: 'error' });
        }
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

function subjectOf(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function errorResponse(error: string, code: ApiErrorBody['code'], status: number) {
  return NextResponse.json<ApiErrorBody>({ error, code }, { status });
}
