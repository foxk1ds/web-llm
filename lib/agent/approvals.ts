
interface Pending {
  resolve: (approved: boolean, why: string) => void;
  timer: ReturnType<typeof setTimeout>;
}

const APPROVAL_TIMEOUT_MS = 5 * 60_000;

const registry: Map<string, Pending> = (() => {
  const key = Symbol.for('web-llm.pending-approvals');
  const g = globalThis as unknown as Record<symbol, Map<string, Pending> | undefined>;
  g[key] ??= new Map<string, Pending>();
  return g[key];
})();

function keyOf(runId: string, callId: string): string {
  return `${runId}:${callId}`;
}

export function waitForApproval(runId: string, callId: string): Promise<boolean> {
  return new Promise((resolve) => {
    const key = keyOf(runId, callId);

    const finish = (approved: boolean, why: string) => {
      const entry = registry.get(key);
      if (entry) clearTimeout(entry.timer);
      registry.delete(key);
      resolve(approved);
    };

    const timer = setTimeout(() => finish(false, 'timeout'), APPROVAL_TIMEOUT_MS);
    registry.set(key, { resolve: finish, timer });
  });
}

export function resolveApproval(runId: string, callId: string, approved: boolean): boolean {
  const key = keyOf(runId, callId);
  const entry = registry.get(key);
  if (!entry) return false;
  entry.resolve(approved, 'client decision');
  return true;
}

export function cancelRunApprovals(runId: string): void {
  const prefix = `${runId}:`;
  for (const [key, entry] of [...registry.entries()]) {
    if (key.startsWith(prefix)) entry.resolve(false, 'cancelRunApprovals');
  }
}

export function pendingCount(): number {
  return registry.size;
}
