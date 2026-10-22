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
    .filter((m) => m && typeof m.content === 'string')
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({ role: m.role, content: m.content, images: sanitizeImages(m.images) }))
    .filter((m) => m.content.trim().length > 0 || (m.images?.length ?? 0) > 0)
    .map((m) => ({
      role: m.role,
      content: m.content,
      ...(m.images?.length ? { images: m.images } : {}),
    }));

  if (history.length === 0) {
    return errorResponse('No usable messages in request.', 'BAD_REQUEST', 400);
  }

  const options = sanitizeOptions(body.options);
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
        ...(options ? { options } : {}),
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

/** Keeps only the sampling options this UI exposes, clamped to sane ranges. */
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
