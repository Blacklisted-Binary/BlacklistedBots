/* ------------------------------------------------------------------ *
 *  Shared type definitions — mirrors frontend/terminal/src/types.ts  *
 *  and extends them with SwarmForge-specific additions.               *
 * ------------------------------------------------------------------ */

/** Default port for the AIClient-2-API proxy sidecar. */
export const PROXY_PORT = 3141;

export type Provider = 'gemini' | 'claude' | 'grok' | 'chatgpt';

export const PROVIDERS: Provider[] = ['gemini', 'claude', 'grok', 'chatgpt'];

export const PROVIDER_LABELS: Record<Provider, string> = {
  gemini: 'Gemini',
  claude: 'Claude',
  grok: 'Grok',
  chatgpt: 'ChatGPT',
};

export const PROVIDER_MODELS: Record<Provider, string[]> = {
  gemini: ['gemini-2.0-flash', 'gemini-2.0-pro', 'gemini-1.5-pro'],
  claude: ['claude-sonnet-4-5', 'claude-opus-4', 'claude-haiku-4-5'],
  grok: ['grok-3', 'grok-3-mini'],
  chatgpt: ['gpt-5', 'gpt-4o', 'o3'],
};

export const PROVIDER_COLORS: Record<Provider, string> = {
  gemini: '#4285F4',
  claude: '#CC785C',
  grok: '#1DA1F2',
  chatgpt: '#10A37F',
};

export type ProxyStatus = 'auth' | 'pending' | 'offline';

export type AgentStatus = 'running' | 'idle' | 'done' | 'error';

export interface AgentDef {
  id: string;
  name: string;
  provider: Provider;
  model: string;
  systemPrompt: string;
  maxTokens: number;
  temperature: number;
  tools: string[];
  status: AgentStatus;
  tokens: number;
  turns: number;
  maxTurns: number;
  task?: string;
}

export interface CrewDef {
  id: string;
  name: string;
  description: string;
  topology: 'sequential' | 'parallel' | 'hierarchical' | 'debate';
  agentIds: string[];
}

export type ConductorStrategy = 'independent' | 'chain' | 'debate';

export type CanvasMode = 'graph' | 'chat';

export type RightPanelTab = 'inspector' | 'proxy' | 'trace' | 'output';

// ── Backend protocol types (identical to terminal frontend) ─────────

export interface TranscriptItem {
  role: 'system' | 'user' | 'assistant' | 'tool' | 'tool_result' | 'log';
  text: string;
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  is_error?: boolean;
}

export interface TaskSnapshot {
  id: string;
  type: string;
  status: string;
  description: string;
  metadata: Record<string, string>;
}

export interface McpServerSnapshot {
  name: string;
  state: string;
  detail?: string;
  transport?: string;
  auth_configured?: boolean;
  tool_count?: number;
  resource_count?: number;
}

export interface BridgeSessionSnapshot {
  session_id: string;
  command: string;
  cwd: string;
  pid: number;
  status: string;
  started_at: number;
  output_path: string;
}

export interface SelectOptionPayload {
  value: string;
  label: string;
  description?: string;
  active?: boolean;
}

export interface SwarmTeammateSnapshot {
  name: string;
  status: AgentStatus;
  duration?: number;
  task?: string;
}

export interface SwarmNotificationSnapshot {
  from: string;
  message: string;
  timestamp: number;
}

export interface BackendEvent {
  type: string;
  message?: string | null;
  item?: TranscriptItem | null;
  state?: Record<string, unknown> | null;
  tasks?: TaskSnapshot[] | null;
  mcp_servers?: McpServerSnapshot[] | null;
  bridge_sessions?: BridgeSessionSnapshot[] | null;
  commands?: string[] | null;
  modal?: Record<string, unknown> | null;
  select_options?: SelectOptionPayload[] | null;
  tool_name?: string | null;
  output?: string | null;
  is_error?: boolean | null;
  todo_items?: Array<{ text: string; checked: boolean }> | null;
  todo_markdown?: string | null;
  plan_mode?: string | null;
  swarm_teammates?: SwarmTeammateSnapshot[] | null;
  swarm_notifications?: SwarmNotificationSnapshot[] | null;
}

export interface TraceEvent {
  timestamp: number;
  agentName: string;
  provider: Provider;
  type: 'start' | 'delta' | 'complete' | 'tool' | 'error';
  text: string;
}
