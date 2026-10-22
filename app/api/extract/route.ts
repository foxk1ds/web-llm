import { NextResponse } from 'next/server';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

/** Load PDF.js only when a PDF is actually extracted, after installing the
 * iterator helpers it needs on Node versions below 22. */
async function loadPdf() {
  await import('es-iterator-helpers/auto');
  return import('unpdf');
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Documents are extracted here and only their text is sent back to the client. */
const MAX_BYTES = 25 * 1024 * 1024;
/** Keep a single attachment from consuming the model's whole context window. */
const MAX_EXTRACTED_CHARS = 200_000;

const DOCUMENT_EXTENSIONS = new Set(['pdf', 'docx', 'xlsx', 'xls', 'ods']);

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return errorResponse('Request must be multipart/form-data.', 400);
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return errorResponse('No file was uploaded.', 400);
  }

  if (file.size > MAX_BYTES) {
    return errorResponse(
      `“${file.name}” is larger than ${Math.round(MAX_BYTES / (1024 * 1024))} MB.`,
      413,
    );
  }

  const extension = extensionOf(file.name);
  if (!DOCUMENT_EXTENSIONS.has(extension)) {
    return errorResponse(
      `Unsupported document type “${extension || file.name}”. Use PDF, DOCX, XLSX, XLS, or ODS.`,
      415,
    );
  }

  let text: string;
  let pages: number | undefined;

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());

    if (extension === 'pdf') {
      const { extractText, getDocumentProxy } = await loadPdf();
      const pdf = await getDocumentProxy(bytes);
      const result = await extractText(pdf, { mergePages: true });
      pages = result.totalPages;
      text = result.text;
    } else if (extension === 'docx') {
      const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
      text = result.value;
    } else {
      const workbook = XLSX.read(bytes, { type: 'array' });
      text = workbook.SheetNames.map((name) => {
        const sheet = workbook.Sheets[name];
        const csv = sheet ? XLSX.utils.sheet_to_csv(sheet) : '';
        return `## Sheet: ${name}\n${csv}`;
      }).join('\n\n');
    }
  } catch (error) {
    return errorResponse(
      `Could not read “${file.name}”. ${error instanceof Error ? error.message : ''}`.trim(),
      422,
    );
  }

  const normalized = text.replace(/\r\n/g, '\n').replace(/[ \t]+\n/g, '\n').trim();

  if (!normalized) {
    return errorResponse(
      extension === 'pdf'
        ? `“${file.name}” has no selectable text — it looks like a scanned PDF. Attach page images instead.`
        : `“${file.name}” did not contain any readable text.`,
      422,
    );
  }

  const truncated = normalized.length > MAX_EXTRACTED_CHARS;

  return NextResponse.json({
    text: truncated ? normalized.slice(0, MAX_EXTRACTED_CHARS) : normalized,
    truncated,
    pages,
  });
}

function extensionOf(name: string): string {
  return name.split('.').pop()?.toLowerCase() ?? '';
}

function errorResponse(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}
