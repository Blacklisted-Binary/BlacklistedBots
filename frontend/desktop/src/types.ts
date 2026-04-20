/* ------------------------------------------------------------------ *
 *  Shared type definitions — mirrors frontend/terminal/src/types.ts  *
 *  and extends them with SwarmForge-specific additions.               *
 * ------------------------------------------------------------------ */

/** Default port for the AIClient-2-API proxy sidecar. */
export const PROXY_PORT = 3141;

export type Provider = 'gemini' | 'claude' | 'grok' | 'chatgpt' | 'antigravity' | 'kilo';

export const PROVIDERS: Provider[] = ['gemini', 'claude', 'grok', 'chatgpt', 'antigravity', 'kilo'];

export const PROVIDER_LABELS: Record<Provider, string> = {
  gemini: 'Gemini',
  claude: 'Claude',
  grok: 'Grok',
  chatgpt: 'ChatGPT',
  antigravity: 'Antigravity',
  kilo: 'Kilo',
};

export const PROVIDER_MODELS: Record<Provider, string[]> = {
  gemini: ['gemini-2.0-flash', 'gemini-2.0-pro', 'gemini-1.5-pro'],
  claude: ['claude-sonnet-4-5', 'claude-opus-4', 'claude-haiku-4-5'],
  grok: ['grok-3', 'grok-3-mini'],
  chatgpt: ['gpt-5', 'gpt-4o', 'o3'],
  antigravity: ['antigravity-pro', 'antigravity-flash'],
  kilo: ['kilo-1', 'kilo-fast'],
};

export const PROVIDER_COLORS: Record<Provider, string> = {
  gemini: '#4285F4',
  claude: '#CC785C',
  grok: '#1DA1F2',
  chatgpt: '#10A37F',
  antigravity: '#7C3AED',
  kilo: '#F59E0B',
};

/** OAuth entry-point URLs and proxy route info per provider. */
export const PROVIDER_OAUTH_INFO: Record<Provider, { authUrl: string; proxyPath: string; description: string }> = {
  gemini: {
    authUrl: 'http://localhost:3141/auth/start/gemini',
    proxyPath: `http://localhost:${PROXY_PORT}/gemini/v1beta`,
    description: 'Sign in with your Google account to access Gemini CLI for free.',
  },
  claude: {
    authUrl: 'http://localhost:3141/auth/start/claude',
    proxyPath: `http://localhost:${PROXY_PORT}/claude/v1`,
    description: 'Sign in with Anthropic to use Claude without an API key.',
  },
  grok: {
    authUrl: 'http://localhost:3141/auth/start/grok',
    proxyPath: `http://localhost:${PROXY_PORT}/grok/v1`,
    description: 'Sign in with X (Twitter) to access Grok AI.',
  },
  chatgpt: {
    authUrl: 'http://localhost:3141/auth/start/chatgpt',
    proxyPath: `http://localhost:${PROXY_PORT}/openai/v1`,
    description: 'Sign in with OpenAI to use ChatGPT via the proxy.',
  },
  antigravity: {
    authUrl: 'http://localhost:3141/auth/start/antigravity',
    proxyPath: `http://localhost:${PROXY_PORT}/antigravity/v1`,
    description: 'Antigravity is a free Claude-compatible proxy. No account required.',
  },
  kilo: {
    authUrl: 'http://localhost:3141/auth/start/kilo',
    proxyPath: `http://localhost:${PROXY_PORT}/kilo/v1`,
    description: 'Sign in with Kilo to access AI models through the BlacklistedAPIProxy.',
  },
};

export type ProxyStatus = 'auth' | 'pending' | 'offline';

// ── OAuth & Proxy configuration types ───────────────────────────────────────

export interface OAuthSession {
  provider: Provider;
  /** Display name or email of the authenticated account. */
  accountLabel: string;
  /** Opaque token stored by the proxy — never exposed to the UI. */
  tokenRef: string;
  expiresAt: number | null;
  authenticatedAt: number;
}

export interface ProxyConfig {
  provider: Provider;
  proxyUrl: string;
  enabled: boolean;
  /** Route all AI traffic for this provider through the proxy. */
  useAsDefault: boolean;
}

export interface MultiAccountEntry {
  id: string;
  provider: Provider;
  accountLabel: string;
  tokenRef: string;
  active: boolean;
  addedAt: number;
}

export interface PotluckSettings {
  enabled: boolean;
  poolName: string;
  autoRotate: boolean;
  /** Max requests per account per day before rotating. 0 = unlimited. */
  dailyRotateLimit: number;
  contributeToPool: boolean;
}

export type RoutingStrategy = 'manual' | 'cheapest' | 'fastest' | 'round-robin' | 'task-based';

export interface AIRoutingRule {
  /** Keyword or task category that triggers this rule. */
  taskPattern: string;
  preferredProvider: Provider;
  fallbackProvider: Provider | null;
}

export interface AIRoutingSettings {
  enabled: boolean;
  strategy: RoutingStrategy;
  rules: AIRoutingRule[];
  /** Provider priority order for fallback. */
  fallbackOrder: Provider[];
}

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
