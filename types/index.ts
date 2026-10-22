
export type Role = 'system' | 'user' | 'assistant';

export type MessageStatus = 'streaming' | 'complete' | 'stopped' | 'error';

export interface MessageStats {
  evalCount?: number;
  tokensPerSecond?: number;
  totalDurationMs?: number;
}

export interface Attachment {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  kind: 'image' | 'text';
  /** Data URL for images. May be omitted after storage compaction. */
  dataUrl?: string;
  /** Extracted UTF-8 contents for text attachments. */
  text?: string;
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  createdAt: number;
  thinking?: string;
  model?: string;
  status?: MessageStatus;
  error?: string;
  stats?: MessageStats;
  toolCalls?: ToolCall[];
  attachments?: Attachment[];
}

export interface ChatSession {
  id: string;
  title: string;
  model: string;
  systemPrompt: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

export interface OllamaModel {
  name: string;
  size: number;
  modifiedAt?: string;
  family?: string;
  parameterSize?: string;
  quantization?: string;
}

export type ThemeMode = 'light' | 'dark';

export type ConnectionState = 'checking' | 'online' | 'offline';

/** Presets applied as `--chat-font-size` on <html>. */
export type FontSize = 'sm' | 'default' | 'lg' | 'xl';

export type Density = 'compact' | 'comfortable';

export interface Settings {
  selectedModel: string | null;
  systemPrompt: string;
  theme: ThemeMode;
  mode?: AgentMode;
  workspace?: string | null;
  showJson?: boolean;
  fontSize: FontSize;
  density: Density;
  temperature: number;
  maxTokens: number;
  enterToSend: boolean;
  streaming: boolean;
  showTimestamps: boolean;
}

export type AgentMode = 'chat' | 'agent';

export type ToolCallStatus =
  | 'pending'
  | 'awaiting_approval'
  | 'running'
  | 'ok'
  | 'error'
  | 'denied';

export interface ApprovalRequest {
  preview: string;
  risky: boolean;
  reason?: string;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  source?: 'native' | 'tag' | 'bare-json' | 'fence';
  status: ToolCallStatus;
  result?: string;
  error?: string;
  durationMs?: number;
  mutating?: boolean;
  approval?: ApprovalRequest;
}

export type AgentDoneReason = 'complete' | 'max_steps' | 'stopped' | 'error';

export type AgentEvent =
  | { type: 'run'; runId: string }
  | { type: 'step'; index: number }
  | { type: 'token'; value: string }
  | { type: 'thinking'; value: string }
  | { type: 'retract'; text: string }
  | { type: 'tool_call'; call: ToolCall }
  | { type: 'tool_result'; id: string; result: string; ok: boolean; durationMs: number }
  | { type: 'done'; reason: AgentDoneReason; stats?: MessageStats }
  | { type: 'error'; message: string };

export interface WireMessage {
  role: 'user' | 'assistant';
  content: string;
  /** Base64-encoded images (no data-URL prefix), as Ollama expects. */
  images?: string[];
}

export interface AgentRequestBody {
  model: string;
  messages: WireMessage[];
  system?: string;
  workspace?: string;
  maxSteps?: number;
  options?: OllamaOptions;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  mutating: boolean;
}

export type ApiErrorCode = 'OLLAMA_UNREACHABLE' | 'MODEL_REQUIRED' | 'BAD_REQUEST' | 'UPSTREAM_ERROR';

export interface ApiErrorBody {
  error: string;
  code: ApiErrorCode;
}

export interface OllamaTagsResponse {
  models?: Array<{
    name: string;
    model?: string;
    modified_at?: string;
    size?: number;
    digest?: string;
    details?: {
      family?: string;
      parameter_size?: string;
      quantization_level?: string;
      format?: string;
    };
  }>;
}

export interface OllamaChatChunk {
  model?: string;
  created_at?: string;
  message?: {
    role?: Role;
    content?: string;
    thinking?: string;
  };
  done?: boolean;
  done_reason?: string;
  error?: string;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

/** Ollama sampling options. Keys use Ollama's snake_case names. */
export interface OllamaOptions {
  temperature?: number;
  num_predict?: number;
}

export interface ChatRequestBody {
  model: string;
  messages: WireMessage[];
  system?: string;
  options?: OllamaOptions;
  numCtx?: number;
}
