import { NextResponse } from 'next/server';
import { resolveApproval } from '@/lib/agent/approvals';
import type { ApiErrorBody } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let body: { runId?: unknown; callId?: unknown; approved?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return errorResponse('Request body must be valid JSON.', 'BAD_REQUEST', 400);
  }

  const runId = typeof body.runId === 'string' ? body.runId : '';
  const callId = typeof body.callId === 'string' ? body.callId : '';
  if (!runId || !callId) {
    return errorResponse('`runId` and `callId` are required.', 'BAD_REQUEST', 400);
  }
  if (typeof body.approved !== 'boolean') {
    return errorResponse('`approved` must be true or false.', 'BAD_REQUEST', 400);
  }

  const resolved = resolveApproval(runId, callId, body.approved);

  return NextResponse.json({ resolved }, { status: resolved ? 200 : 409 });
}

function errorResponse(error: string, code: ApiErrorBody['code'], status: number) {
  return NextResponse.json<ApiErrorBody>({ error, code }, { status });
}
