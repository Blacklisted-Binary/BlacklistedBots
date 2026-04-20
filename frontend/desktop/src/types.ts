/* ------------------------------------------------------------------ *
 *  Shared type definitions — mirrors frontend/terminal/src/types.ts  *
 *  and extends them with SwarmForge + BlacklistedAIProxy integration. *
 * ------------------------------------------------------------------ */

// ── BlacklistedAIProxy server defaults ──────────────────────────────────────

/** Default port the BlacklistedAIProxy worker process listens on. */
export const PROXY_PORT = 3000;

/** Default port the BlacklistedAIProxy master management process listens on. */
export const PROXY_MASTER_PORT = 3100;

/** Base URL for all proxy management REST API calls. */
export const PROXY_API_BASE = `http://localhost:${PROXY_PORT}`;

// ── Simplified provider type (SwarmForge agent canvas) ──────────────────────

export type Provider = 'gemini' | 'claude' | 'grok' | 'chatgpt';

export const PROVIDERS: Provider[] = ['gemini', 'claude', 'grok', 'chatgpt'];

export const PROVIDER_LABELS: Record<Provider, string> = {
  gemini: 'Gemini',
  claude: 'Claude',
  grok: 'Grok',
  chatgpt: 'ChatGPT',
};

export const PROVIDER_MODELS: Record<Provider, string[]> = {
  gemini: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-3-pro-preview'],
  claude: ['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5'],
  grok: ['grok-4.20', 'grok-4.20-fast', 'grok-4.1-mini'],
  chatgpt: ['gpt-5', 'gpt-5-codex', 'gpt-5.1-codex'],
};

export const PROVIDER_COLORS: Record<Provider, string> = {
  gemini: '#4285F4',
  claude: '#CC785C',
  grok: '#1DA1F2',
  chatgpt: '#10A37F',
};

export type ProxyStatus = 'auth' | 'pending' | 'offline';

// ── BlacklistedAIProxy — real provider types ─────────────────────────────────
// These keys match the actual providerType identifiers used in the proxy's
// config system (config.json MODEL_PROVIDER, provider_pools.json keys, etc.).

export type ProxyProviderType =
  | 'gemini-cli-oauth'
  | 'gemini-antigravity'
  | 'claude-kiro-oauth'
  | 'claude-custom'
  | 'openai-codex-oauth'
  | 'openai-qwen-oauth'
  | 'openai-iflow'
  | 'grok-custom'
  | 'forward-api';

export const PROXY_PROVIDERS: ProxyProviderType[] = [
  'gemini-cli-oauth',
  'gemini-antigravity',
  'claude-kiro-oauth',
  'claude-custom',
  'openai-codex-oauth',
  'openai-qwen-oauth',
  'openai-iflow',
  'grok-custom',
  'forward-api',
];

export const PROXY_PROVIDER_LABELS: Record<ProxyProviderType, string> = {
  'gemini-cli-oauth': 'Gemini CLI (OAuth)',
  'gemini-antigravity': 'Antigravity (Gemini)',
  'claude-kiro-oauth': 'Claude Kiro (OAuth)',
  'claude-custom': 'Claude (API Key)',
  'openai-codex-oauth': 'Codex (OAuth)',
  'openai-qwen-oauth': 'Qwen (OAuth)',
  'openai-iflow': 'iFlow',
  'grok-custom': 'Grok (Cookies/SSO)',
  'forward-api': 'Forward API',
};

export const PROXY_PROVIDER_COLORS: Record<ProxyProviderType, string> = {
  'gemini-cli-oauth': '#4285F4',
  'gemini-antigravity': '#1A73E8',
  'claude-kiro-oauth': '#CC785C',
  'claude-custom': '#B06040',
  'openai-codex-oauth': '#10A37F',
  'openai-qwen-oauth': '#FF6A00',
  'openai-iflow': '#7C3AED',
  'grok-custom': '#1DA1F2',
  'forward-api': '#64748B',
};

/** Authentication method required for each provider type. */
export type ProxyAuthMethod = 'oauth-browser' | 'api-key' | 'cookie' | 'file-upload' | 'none';

export const PROXY_PROVIDER_AUTH: Record<ProxyProviderType, ProxyAuthMethod> = {
  'gemini-cli-oauth': 'oauth-browser',
  'gemini-antigravity': 'oauth-browser',
  'claude-kiro-oauth': 'oauth-browser',
  'claude-custom': 'api-key',
  'openai-codex-oauth': 'oauth-browser',
  'openai-qwen-oauth': 'oauth-browser',
  'openai-iflow': 'oauth-browser',
  'grok-custom': 'cookie',
  'forward-api': 'none',
};

/** Human-readable description of what each provider offers. */
export const PROXY_PROVIDER_DESCRIPTIONS: Record<ProxyProviderType, string> = {
  'gemini-cli-oauth': 'Sign in with Google to access Gemini 2.5/3.x models for free via the Gemini CLI OAuth flow.',
  'gemini-antigravity': 'OAuth-based Antigravity Gemini endpoint. Supports cross-provider models including Claude via Gemini.',
  'claude-kiro-oauth': 'Sign in with Kiro (AWS SSO) to access Claude Opus/Sonnet/Haiku 4.x models at no cost.',
  'claude-custom': 'Use a standard Anthropic API key. Supports custom base URLs for compatible endpoints.',
  'openai-codex-oauth': 'Sign in with your OpenAI account to access Codex / GPT-5 models via OAuth — no paid plan required.',
  'openai-qwen-oauth': 'Sign in with Alibaba Cloud to access Qwen3 coder and vision models for free.',
  'openai-iflow': 'iFlow OAuth token. Access Qwen, Kimi K2, DeepSeek, GLM models through the iFlow gateway.',
  'grok-custom': 'Provide Grok SSO cookie + Cloudflare clearance to bypass bot detection and access Grok 4.x.',
  'forward-api': 'Generic OpenAI-compatible forwarding proxy. Point to any compatible API endpoint.',
};

/**
 * Models per proxy provider — mirrors provider-models.js from BlacklistedAIProxy.
 * Empty array = models are dynamically fetched from the provider at runtime.
 */
export const PROXY_PROVIDER_MODELS: Record<ProxyProviderType, string[]> = {
  'gemini-cli-oauth': [
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-2.5-pro',
    'gemini-2.5-pro-preview-06-05',
    'gemini-2.5-flash-preview-09-2025',
    'gemini-3-pro-preview',
    'gemini-3-flash-preview',
    'gemini-3.1-pro-preview',
    'gemini-3.1-flash-lite-preview',
  ],
  'gemini-antigravity': [
    'gemini-3-flash',
    'gemini-3.1-pro-high',
    'gemini-3.1-pro-low',
    'gemini-3.1-flash-image',
    'gemini-3-flash-agent',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-2.5-flash-thinking',
    'gemini-claude-sonnet-4-6',
    'gemini-claude-opus-4-6-thinking',
  ],
  'claude-kiro-oauth': [
    'claude-haiku-4-5',
    'claude-opus-4-6',
    'claude-sonnet-4-6',
    'claude-opus-4-5',
    'claude-opus-4-5-20251101',
    'claude-sonnet-4-5',
    'claude-sonnet-4-5-20250929',
    'claude-sonnet-4-20250514',
    'claude-3-7-sonnet-20250219',
  ],
  'claude-custom': [],
  'openai-codex-oauth': [
    'gpt-5',
    'gpt-5-codex',
    'gpt-5-codex-mini',
    'gpt-5.1',
    'gpt-5.1-codex',
    'gpt-5.1-codex-mini',
    'gpt-5.1-codex-max',
    'gpt-5.2',
    'gpt-5.2-codex',
    'gpt-5.3-codex',
    'gpt-5.3-codex-spark',
  ],
  'openai-qwen-oauth': [
    'coder-model',
    'vision-model',
    'qwen3-coder-plus',
    'qwen3-coder-flash',
  ],
  'openai-iflow': [
    'qwen3-coder-plus',
    'qwen3-max',
    'qwen3-vl-plus',
    'qwen3-max-preview',
    'qwen3-235b',
    'kimi-k2',
    'kimi-k2-0905',
    'deepseek-v3',
    'deepseek-r1',
    'glm-4.6',
  ],
  'grok-custom': [
    'grok-4.1-mini',
    'grok-4.1-thinking',
    'grok-4.20',
    'grok-4.20-auto',
    'grok-4.20-fast',
    'grok-4.20-expert',
    'grok-4.20-heavy',
  ],
  'forward-api': [],
};

// ── Provider pool node shape (mirrors provider_pools.json) ──────────────────

/** A single credential node in a provider pool. */
export interface ProxyPoolNode {
  uuid: string;
  customName: string;
  isHealthy: boolean;
  isDisabled: boolean;
  lastUsed: string | null;
  usageCount: number;
  errorCount: number;
  lastErrorTime: string | null;
  checkModelName: string | null;
  checkHealth: boolean;
  // Gemini CLI
  GEMINI_OAUTH_CREDS_FILE_PATH?: string;
  PROJECT_ID?: string;
  // Antigravity
  ANTIGRAVITY_OAUTH_CREDS_FILE_PATH?: string;
  // Kiro (Claude)
  KIRO_OAUTH_CREDS_FILE_PATH?: string;
  // Qwen
  QWEN_OAUTH_CREDS_FILE_PATH?: string;
  // iFlow
  IFLOW_TOKEN_FILE_PATH?: string;
  IFLOW_BASE_URL?: string;
  // Claude custom
  CLAUDE_API_KEY?: string;
  CLAUDE_BASE_URL?: string;
  // OpenAI / forward
  OPENAI_API_KEY?: string;
  OPENAI_BASE_URL?: string;
  // Grok
  GROK_COOKIE_TOKEN?: string;
  GROK_CF_CLEARANCE?: string;
  GROK_USER_AGENT?: string;
  GROK_BASE_URL?: string;
}

/** Summary returned by GET /api/providers/{type}. */
export interface ProxyProviderSummary {
  providerType: ProxyProviderType;
  totalNodes: number;
  healthyNodes: number;
  disabledNodes: number;
  nodes: ProxyPoolNode[];
}

/** All providers summary returned by GET /api/providers. */
export type ProxyProviderMap = Partial<Record<ProxyProviderType, ProxyProviderSummary>>;

// ── Global proxy config (mirrors config.json.example) ───────────────────────

export interface ModelFallbackTarget {
  targetProviderType: string;
  targetModel: string;
}

export interface ProxyGlobalConfig {
  REQUIRED_API_KEY: string;
  SERVER_PORT: number;
  HOST: string;
  MODEL_PROVIDER: string;
  DEFAULT_MODEL_PROVIDERS?: string[];
  REQUEST_MAX_RETRIES: number;
  REQUEST_BASE_DELAY: number;
  CRON_REFRESH_TOKEN: boolean;
  CRON_NEAR_MINUTES: number;
  MAX_ERROR_COUNT: number;
  PROXY_URL: string | null;
  PROXY_ENABLED_PROVIDERS: string[];
  LOG_ENABLED: boolean;
  LOG_LEVEL: string;
  LOG_OUTPUT_MODE: string;
  LOG_DIR: string;
  TLS_SIDECAR_ENABLED: boolean;
  TLS_SIDECAR_PORT: number;
  HYBRID_GATEWAY_ENABLED: boolean;
  HYBRID_GATEWAY_URL: string;
  HYBRID_GATEWAY_CANARY_PERCENT: number;
  providerFallbackChain: Record<string, string[]>;
  modelFallbackMapping: Record<string, ModelFallbackTarget>;
  SYSTEM_PROMPT_MODE: string;
  SYSTEM_PROMPT_CONTENT?: string | null;
  GROK_COOKIE_TOKEN?: string;
  GROK_CF_CLEARANCE?: string;
  GROK_USER_AGENT?: string;
  GROK_BASE_URL?: string;
}

// ── Potluck API types (mirrors api-potluck-*.json) ──────────────────────────

export interface PotluckCredential {
  id: string;
  path: string;
  provider: string;
  authMethod: string;
  addedAt: string;
}

export interface PotluckBonus {
  credentialId: string;
  grantedAt: string;
  usedCount: number;
}

export interface PotluckUser {
  credentials: PotluckCredential[];
  credentialBonuses: PotluckBonus[];
  createdAt: string;
}

export interface PotluckPoolConfig {
  defaultDailyLimit: number;
  bonusPerCredential: number;
  bonusValidityDays: number;
  persistInterval: number;
}

export interface PotluckData {
  config: PotluckPoolConfig;
  users: Record<string, PotluckUser>;
}

export interface PotluckKey {
  id: string;
  name: string;
  createdAt: string;
  dailyLimit: number;
  todayUsage: number;
  totalUsage: number;
  lastResetDate: string;
  lastUsedAt: string | null;
  enabled: boolean;
  bonusRemaining: number;
}

// ── Agent types (existing) ───────────────────────────────────────────────────

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

// ── Backend protocol types (identical to terminal frontend) ─────────────────

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
