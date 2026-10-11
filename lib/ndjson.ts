export async function readNdjsonLines(
  body: ReadableStream<Uint8Array>,
  onLine: (line: string) => void,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);
        if (line) onLine(line);
      }
    }

    buffer += decoder.decode();
    const tail = buffer.trim();
    if (tail) onLine(tail);
  } finally {
    try {
      reader.releaseLock();
    } catch {
    }
  }
}
