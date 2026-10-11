import { NextResponse } from 'next/server';
import type { ApiErrorBody, OllamaModel, OllamaTagsResponse } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434';

export async function GET() {
  let res: Response;
  try {
    res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === 'TimeoutError';
    return NextResponse.json<ApiErrorBody>(
      {
        code: 'OLLAMA_UNREACHABLE',
        error: isTimeout
          ? `Ollama at ${OLLAMA_BASE_URL} did not respond in time.`
          : `Could not connect to Ollama at ${OLLAMA_BASE_URL}. Is \`ollama serve\` running?`,
      },
      { status: 503 },
    );
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    return NextResponse.json<ApiErrorBody>(
      {
        code: 'UPSTREAM_ERROR',
        error: `Ollama returned HTTP ${res.status}${detail ? `: ${detail.slice(0, 300)}` : ''}`,
      },
      { status: 502 },
    );
  }

  let payload: OllamaTagsResponse;
  try {
    payload = (await res.json()) as OllamaTagsResponse;
  } catch {
    return NextResponse.json<ApiErrorBody>(
      { code: 'UPSTREAM_ERROR', error: 'Ollama returned a malformed model list.' },
      { status: 502 },
    );
  }

  const models: OllamaModel[] = (payload.models ?? [])
    .filter((m) => typeof m?.name === 'string' && m.name.length > 0)
    .map((m) => ({
      name: m.name,
      size: m.size ?? 0,
      modifiedAt: m.modified_at,
      family: m.details?.family,
      parameterSize: m.details?.parameter_size,
      quantization: m.details?.quantization_level,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json({ models });
}
