import { NextResponse } from 'next/server';
import type { ApiErrorBody, ChatRequestBody } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434';

const CONNECT_TIMEOUT_MS = 10_000;

export async function POST(req: Request) {
  let body: ChatRequestBody;
  try {
    body = (await req.json()) as ChatRequestBody;
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

  const history = body.messages
    .filter((m) => m && typeof m.content === 'string' && m.content.trim().length > 0)
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({ role: m.role, content: m.content }));

  if (history.length === 0) {
    return errorResponse('No usable messages in request.', 'BAD_REQUEST', 400);
  }

  const system = typeof body.system === 'string' ? body.system.trim() : '';
  const messages = system ? [{ role: 'system' as const, content: system }, ...history] : history;

  const controller = new AbortController();
  const abortUpstream = () => controller.abort();
  req.signal.addEventListener('abort', abortUpstream);

  let upstream: Response;
  const connectTimer = setTimeout(() => controller.abort(), CONNECT_TIMEOUT_MS);
  try {
    upstream = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        ...(body.options && typeof body.options === 'object' ? { options: body.options } : {}),
      }),
      signal: controller.signal,
      cache: 'no-store',
    });
  } catch (error) {
    if (req.signal.aborted) {
      return new Response(null, { status: 499 });
    }
    const timedOut = error instanceof Error && error.name === 'AbortError';
    return errorResponse(
      timedOut
        ? `Ollama at ${OLLAMA_BASE_URL} did not accept the request within ${CONNECT_TIMEOUT_MS / 1000}s. Is the model loaded?`
        : `Could not connect to Ollama at ${OLLAMA_BASE_URL}. Is \`ollama serve\` running?`,
      'OLLAMA_UNREACHABLE',
      503,
    );
  } finally {
    clearTimeout(connectTimer);
  }

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => '');
    let message = `Ollama returned HTTP ${upstream.status}.`;
    try {
      const parsed = JSON.parse(detail) as { error?: string };
      if (parsed?.error) message = parsed.error;
    } catch {
      if (detail) message = `${message} ${detail.slice(0, 300)}`;
    }
    return errorResponse(message, 'UPSTREAM_ERROR', upstream.status === 404 ? 404 : 502);
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

function errorResponse(error: string, code: ApiErrorBody['code'], status: number) {
  return NextResponse.json<ApiErrorBody>({ error, code }, { status });
}
