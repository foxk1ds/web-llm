import { createId } from '@/lib/storage';
import type { Attachment, Message, WireMessage } from '@/types';

export const MAX_ATTACHMENTS = 6;

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const MAX_TEXT_BYTES = 5 * 1024 * 1024;
const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;
/** Extracted text is capped so one file cannot swallow the whole context window. */
const MAX_TEXT_CHARS = 200_000;
const MAX_IMAGE_EDGE = 1024;
const IMAGE_QUALITY = 0.82;
/** Images at or below this size are sent as-is to avoid re-encoding loss. */
const KEEP_ORIGINAL_BYTES = 400 * 1024;

const TRUNCATION_NOTE =
  '\n\n[The rest of this attachment was truncated to keep it within the context window.]';

const RASTER_IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/avif',
]);

const DOCUMENT_EXTENSIONS = new Set(['pdf', 'docx', 'xlsx', 'xls', 'ods']);

const TEXT_EXTENSIONS = new Set([
  'txt',
  'md',
  'markdown',
  'log',
  'json',
  'ndjson',
  'yaml',
  'yml',
  'xml',
  'html',
  'htm',
  'css',
  'scss',
  'sass',
  'less',
  'js',
  'jsx',
  'mjs',
  'cjs',
  'ts',
  'tsx',
  'vue',
  'svelte',
  'astro',
  'py',
  'ipynb',
  'rb',
  'go',
  'rs',
  'java',
  'kt',
  'kts',
  'scala',
  'clj',
  'cljs',
  'ex',
  'exs',
  'erl',
  'hs',
  'ml',
  'lua',
  'pl',
  'r',
  'dart',
  'nim',
  'zig',
  'c',
  'h',
  'cpp',
  'hpp',
  'cc',
  'cs',
  'php',
  'swift',
  'm',
  'mm',
  'asm',
  'sh',
  'bash',
  'zsh',
  'fish',
  'bat',
  'cmd',
  'ps1',
  'sql',
  'graphql',
  'gql',
  'proto',
  'csv',
  'tsv',
  'tex',
  'bib',
  'rst',
  'adoc',
  'org',
  'diff',
  'patch',
  'toml',
  'ini',
  'conf',
  'cfg',
  'properties',
  'gradle',
  'cmake',
  'mk',
  'env',
  'lock',
  'svg',
  'gitignore',
  'gitattributes',
  'editorconfig',
  'dockerignore',
]);

/** Extensionless files that are almost always plain text. */
const TEXT_FILENAMES = new Set([
  'dockerfile',
  'containerfile',
  'makefile',
  'readme',
  'license',
  'licence',
  'changelog',
  'procfile',
  'justfile',
  'rakefile',
  'gemfile',
  'podfile',
  'brewfile',
  'cmakelists.txt',
]);

/** `accept` attribute for the hidden file input. */
export const ATTACHMENT_ACCEPT = [
  ...RASTER_IMAGE_TYPES,
  ...[...DOCUMENT_EXTENSIONS].map((ext) => `.${ext}`),
  ...[...TEXT_EXTENSIONS].map((ext) => `.${ext}`),
].join(',');

function baseName(name: string): string {
  return (name.split(/[\\/]/).pop() ?? name).toLowerCase();
}

function extensionOf(name: string): string {
  const base = baseName(name);
  if (!base.includes('.')) return base;
  return base.split('.').pop() ?? '';
}

export function isImageFile(file: File): boolean {
  return RASTER_IMAGE_TYPES.has(file.type.toLowerCase());
}

export function isDocumentFile(file: File): boolean {
  return DOCUMENT_EXTENSIONS.has(extensionOf(file.name));
}

export function isTextFile(file: File): boolean {
  if (TEXT_FILENAMES.has(baseName(file.name))) return true;
  if (file.type.startsWith('text/')) return true;
  if (file.type === 'application/json' || file.type === 'application/xml') return true;
  return TEXT_EXTENSIONS.has(extensionOf(file.name));
}

/**
 * Reads a File into an Attachment. Images are downscaled so conversations still
 * fit inside the localStorage budget; documents are converted to text by the
 * server, and unknown files are accepted when they look like text.
 */
export async function readAttachment(file: File): Promise<Attachment> {
  if (isImageFile(file)) {
    if (file.size > MAX_IMAGE_BYTES) {
      throw new Error(`“${file.name}” is larger than ${formatLimit(MAX_IMAGE_BYTES)}.`);
    }
    const dataUrl = await toImageDataUrl(file);
    const mimeMatch = /^data:([^;,]+)/.exec(dataUrl);
    return {
      id: createId(),
      name: file.name || 'image',
      mimeType: mimeMatch?.[1] ?? 'image/jpeg',
      size: estimateDataUrlBytes(dataUrl),
      kind: 'image',
      dataUrl,
    };
  }

  if (isDocumentFile(file)) return readDocument(file);

  if (isTextFile(file)) return readTextFile(file);

  // Many code and config files reach the browser with an empty MIME type and an
  // extension we do not list, so fall back to sniffing the bytes.
  if (file.size <= MAX_TEXT_BYTES && (await looksLikeText(file))) {
    return readTextFile(file);
  }

  throw new Error(
    `“${file.name}” is not supported. Attach images, PDF, DOCX, XLSX/ODS, CSV, SQL, or text/code files.`,
  );
}

async function readTextFile(file: File): Promise<Attachment> {
  if (file.size > MAX_TEXT_BYTES) {
    throw new Error(`“${file.name}” is larger than ${formatLimit(MAX_TEXT_BYTES)}.`);
  }

  const raw = await file.text();
  const text =
    raw.length > MAX_TEXT_CHARS ? raw.slice(0, MAX_TEXT_CHARS) + TRUNCATION_NOTE : raw;

  return {
    id: createId(),
    name: file.name || 'file.txt',
    mimeType: file.type || 'text/plain',
    size: file.size,
    kind: 'text',
    text,
  };
}

async function readDocument(file: File): Promise<Attachment> {
  if (file.size > MAX_DOCUMENT_BYTES) {
    throw new Error(`“${file.name}” is larger than ${formatLimit(MAX_DOCUMENT_BYTES)}.`);
  }

  const form = new FormData();
  form.append('file', file);

  let response: Response;
  try {
    response = await fetch('/api/extract', { method: 'POST', body: form });
  } catch {
    throw new Error(`Could not reach the server to read “${file.name}”.`);
  }

  const data = (await response.json().catch(() => null)) as
    | { text?: string; truncated?: boolean; error?: string }
    | null;

  if (!response.ok || !data?.text) {
    throw new Error(data?.error ?? `Could not read “${file.name}”.`);
  }

  return {
    id: createId(),
    name: file.name,
    mimeType: file.type || 'application/octet-stream',
    size: file.size,
    kind: 'text',
    text: data.truncated ? data.text + TRUNCATION_NOTE : data.text,
  };
}

async function looksLikeText(file: File): Promise<boolean> {
  const buffer = new Uint8Array(await file.slice(0, 4096).arrayBuffer());
  if (buffer.length === 0) return true;

  let control = 0;
  for (const byte of buffer) {
    if (byte === 0) return false;
    if (byte < 9 || (byte > 13 && byte < 32)) control += 1;
  }
  return control / buffer.length < 0.02;
}

/** Base64 payload without the `data:…,` prefix, or null when unavailable. */
export function imagePayload(attachment: Attachment): string | null {
  if (attachment.kind !== 'image' || !attachment.dataUrl) return null;
  const comma = attachment.dataUrl.indexOf(',');
  return comma >= 0 ? attachment.dataUrl.slice(comma + 1) : attachment.dataUrl;
}

export function hasAttachments(message: Message): boolean {
  return (message.attachments?.length ?? 0) > 0;
}

/**
 * Converts a stored message into the shape Ollama's API expects. Text files are
 * inlined into the prompt; images travel in a separate `images` array.
 */
export function toWireMessage(message: Message): WireMessage | null {
  const attachments = message.attachments ?? [];

  const images = attachments
    .map(imagePayload)
    .filter((value): value is string => typeof value === 'string' && value.length > 0);

  const blocks = attachments
    .filter((attachment) => attachment.kind === 'text' && attachment.text?.trim())
    .map(
      (attachment) =>
        `--- attached file: ${attachment.name} ---\n${attachment.text}\n--- end of ${attachment.name} ---`,
    );

  const content = [message.content.trim(), ...blocks].filter(Boolean).join('\n\n');
  if (!content && images.length === 0) return null;

  return {
    role: message.role === 'assistant' ? 'assistant' : 'user',
    content,
    ...(images.length > 0 ? { images } : {}),
  };
}

/** A short title for a conversation whose first message was attachment-only. */
export function titleFromAttachments(attachments: Attachment[]): string {
  if (attachments.length === 0) return 'New chat';
  const [first] = attachments;
  return attachments.length === 1 ? first.name : `${first.name} +${attachments.length - 1}`;
}

async function toImageDataUrl(file: File): Promise<string> {
  if (file.size <= KEEP_ORIGINAL_BYTES) return readAsDataUrl(file);

  const image = await loadImage(file);
  const longestEdge = Math.max(image.naturalWidth, image.naturalHeight);

  if (longestEdge <= MAX_IMAGE_EDGE && file.size <= KEEP_ORIGINAL_BYTES * 2) {
    return readAsDataUrl(file);
  }

  const scale = Math.min(1, MAX_IMAGE_EDGE / longestEdge);
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) return readAsDataUrl(file);

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  return canvas.toDataURL('image/jpeg', IMAGE_QUALITY);
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error(`Could not read “${file.name}”.`));
    reader.readAsDataURL(file);
  });
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`“${file.name}” could not be decoded as an image.`));
    };
    image.src = url;
  });
}

function estimateDataUrlBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(',');
  if (comma < 0) return dataUrl.length;
  return Math.round((dataUrl.length - comma - 1) * 0.75);
}

function formatLimit(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}
