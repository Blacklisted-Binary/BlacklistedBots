/**
 * useProxyStore — Zustand store for all BlacklistedAIProxy state.
 *
 * Mirrors the proxy's REST API at http://localhost:3000/api/* and provides
 * typed state + actions for:
 *   - Provider pool management (CRUD on proxy nodes)
 *   - Global proxy config (config.json)
 *   - OAuth flow lifecycle (generate-auth-url → open browser → poll)
 *   - Potluck API key pool management
 *   - Provider fallback chains + model routing config
 */
import { create } from 'zustand';
import type {
  ProxyProviderType,
  ProxyProviderMap,
  ProxyPoolNode,
  ProxyGlobalConfig,
  PotluckData,
} from '../types';
import { PROXY_API_BASE } from '../types';

// ── API key used to authenticate against the proxy's management API ──────────
// Stored in localStorage so it persists across sessions.
const STORAGE_KEY_PROXY_API_KEY = 'proxy_api_key';
const STORAGE_KEY_PROXY_AUTH_TOKEN = 'proxy_auth_token';

function getStoredProxyApiKey(): string {
  return localStorage.getItem(STORAGE_KEY_PROXY_API_KEY) ?? '123456';
}
function getStoredAuthToken(): string | null {
  return localStorage.getItem(STORAGE_KEY_PROXY_AUTH_TOKEN);
}

// ── Fetch helper ─────────────────────────────────────────────────────────────

async function proxyFetch(
  path: string,
  options: RequestInit = {},
  authToken?: string | null,
): Promise<Response> {
  const token = authToken ?? getStoredAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return fetch(`${PROXY_API_BASE}${path}`, { ...options, headers });
}

// ── Types ────────────────────────────────────────────────────────────────────

export type ProxyConnectionStatus = 'connected' | 'connecting' | 'offline';

export interface OAuthPollState {
  providerType: ProxyProviderType;
  authUrl: string;
  /** Status returned by the proxy's generate-auth-url endpoint */
  status: 'pending' | 'complete' | 'error';
  message: string;
}

interface ProxyStore {
  // ── Connection ───────────────────────────���────────────────────────
  connectionStatus: ProxyConnectionStatus;
  proxyApiKey: string;
  authToken: string | null;
  setProxyApiKey: (key: string) => void;

  // ── Providers ─────────────────────────────────────────────────────
  providers: ProxyProviderMap;
  providersLoading: boolean;
  fetchProviders: () => Promise<void>;
  addProvider: (providerType: ProxyProviderType, node: Partial<ProxyPoolNode>) => Promise<void>;
  updateProvider: (providerType: ProxyProviderType, uuid: string, patch: Partial<ProxyPoolNode>) => Promise<void>;
  deleteProvider: (providerType: ProxyProviderType, uuid: string) => Promise<void>;
  toggleProvider: (providerType: ProxyProviderType, uuid: string, enabled: boolean) => Promise<void>;
  healthCheckProvider: (providerType: ProxyProviderType) => Promise<void>;

  // ── Global config ─────────────────────────────────────────────────
  config: ProxyGlobalConfig | null;
  configLoading: boolean;
  fetchConfig: () => Promise<void>;
  updateConfig: (patch: Partial<ProxyGlobalConfig>) => Promise<void>;

  // ── OAuth wizard flow ─────────────────────────────────────────────
  oauthPoll: OAuthPollState | null;
  generateAuthUrl: (providerType: ProxyProviderType) => Promise<string | null>;
  clearOAuthPoll: () => void;

  // ── Potluck ───────────────────────────────────────────────────────
  potluckData: PotluckData | null;
  potluckLoading: boolean;
  fetchPotluck: () => Promise<void>;

  // ── Login to proxy management UI ─────────────────────────────────
  loginToProxy: (password: string) => Promise<boolean>;
  checkProxyConnection: () => Promise<boolean>;

  // ── System ────────────────────────────────────────────────────────
  restartProxy: () => Promise<void>;
  reloadConfig: () => Promise<void>;
  checkForUpdate: () => Promise<{ hasUpdate: boolean; latestVersion: string; currentVersion: string } | null>;

  // ── Error state ───────────────────────────────────────────────────
  lastError: string | null;
  clearError: () => void;
}

// ── Default config ───────────────────────────────────────────────────────────

const DEFAULT_CONFIG: ProxyGlobalConfig = {
  REQUIRED_API_KEY: '123456',
  SERVER_PORT: 3000,
  HOST: '0.0.0.0',
  MODEL_PROVIDER: 'gemini-cli-oauth',
  REQUEST_MAX_RETRIES: 3,
  REQUEST_BASE_DELAY: 1000,
  CRON_REFRESH_TOKEN: false,
  CRON_NEAR_MINUTES: 15,
  MAX_ERROR_COUNT: 10,
  PROXY_URL: null,
  PROXY_ENABLED_PROVIDERS: [],
  LOG_ENABLED: true,
  LOG_LEVEL: 'info',
  LOG_OUTPUT_MODE: 'all',
  LOG_DIR: 'logs',
  TLS_SIDECAR_ENABLED: false,
  TLS_SIDECAR_PORT: 9090,
  HYBRID_GATEWAY_ENABLED: false,
  HYBRID_GATEWAY_URL: '',
  HYBRID_GATEWAY_CANARY_PERCENT: 100,
  providerFallbackChain: {},
  modelFallbackMapping: {},
  SYSTEM_PROMPT_MODE: 'append',
};

// ── Store ────────────────────────────────────────────────────────────────────

export const useProxyStore = create<ProxyStore>((set, get) => ({
  // ── Connection ────────────────────────────────────────────────────
  connectionStatus: 'offline',
  proxyApiKey: getStoredProxyApiKey(),
  authToken: getStoredAuthToken(),

  setProxyApiKey: (key) => {
    localStorage.setItem(STORAGE_KEY_PROXY_API_KEY, key);
    set({ proxyApiKey: key });
  },

  // ── Providers ─────────────────────────────────────────────────────
  providers: {},
  providersLoading: false,

  fetchProviders: async () => {
    set({ providersLoading: true, lastError: null });
    try {
      const res = await proxyFetch('/api/providers', {}, get().authToken);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { providers?: ProxyProviderMap } | ProxyProviderMap;
      // The proxy returns either {providers: {...}} or the map directly
      const map = (data as { providers?: ProxyProviderMap }).providers ?? (data as ProxyProviderMap);
      set({ providers: map, connectionStatus: 'connected' });
    } catch (err) {
      set({ lastError: String(err), connectionStatus: 'offline' });
    } finally {
      set({ providersLoading: false });
    }
  },

  addProvider: async (providerType, node) => {
    set({ lastError: null });
    try {
      const res = await proxyFetch('/api/providers', {
        method: 'POST',
        body: JSON.stringify({ providerType, ...node }),
      }, get().authToken);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }));
        throw new Error((err as { error?: { message?: string } }).error?.message ?? `HTTP ${res.status}`);
      }
      await get().fetchProviders();
    } catch (err) {
      set({ lastError: String(err) });
      throw err;
    }
  },

  updateProvider: async (providerType, uuid, patch) => {
    set({ lastError: null });
    try {
      const res = await proxyFetch(
        `/api/providers/${encodeURIComponent(providerType)}/${uuid}`,
        { method: 'PUT', body: JSON.stringify(patch) },
        get().authToken,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await get().fetchProviders();
    } catch (err) {
      set({ lastError: String(err) });
      throw err;
    }
  },

  deleteProvider: async (providerType, uuid) => {
    set({ lastError: null });
    try {
      const res = await proxyFetch(
        `/api/providers/${encodeURIComponent(providerType)}/${uuid}`,
        { method: 'DELETE' },
        get().authToken,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await get().fetchProviders();
    } catch (err) {
      set({ lastError: String(err) });
      throw err;
    }
  },

  toggleProvider: async (providerType, uuid, enabled) => {
    const action = enabled ? 'enable' : 'disable';
    const res = await proxyFetch(
      `/api/providers/${encodeURIComponent(providerType)}/${uuid}/${action}`,
      { method: 'POST' },
      get().authToken,
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await get().fetchProviders();
  },

  healthCheckProvider: async (providerType) => {
    await proxyFetch(
      `/api/providers/${encodeURIComponent(providerType)}/health-check`,
      { method: 'POST' },
      get().authToken,
    );
    await get().fetchProviders();
  },

  // ── Global config ─────────────────────────────────────────────────
  config: null,
  configLoading: false,

  fetchConfig: async () => {
    set({ configLoading: true, lastError: null });
    try {
      const res = await proxyFetch('/api/config', {}, get().authToken);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as ProxyGlobalConfig;
      set({ config: { ...DEFAULT_CONFIG, ...data } });
    } catch (err) {
      set({ lastError: String(err) });
    } finally {
      set({ configLoading: false });
    }
  },

  updateConfig: async (patch) => {
    set({ lastError: null });
    const current = get().config ?? DEFAULT_CONFIG;
    const next = { ...current, ...patch };
    try {
      const res = await proxyFetch('/api/config', {
        method: 'POST',
        body: JSON.stringify(next),
      }, get().authToken);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      set({ config: next });
    } catch (err) {
      set({ lastError: String(err) });
      throw err;
    }
  },

  // ── OAuth wizard flow ─────────────────────────────────────────────
  oauthPoll: null,

  generateAuthUrl: async (providerType) => {
    set({ lastError: null, oauthPoll: null });
    try {
      const res = await proxyFetch(
        `/api/providers/${encodeURIComponent(providerType)}/generate-auth-url`,
        { method: 'POST' },
        get().authToken,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { authUrl?: string; url?: string; message?: string };
      const authUrl = data.authUrl ?? data.url ?? null;
      if (!authUrl) throw new Error(data.message ?? 'No auth URL returned');
      set({
        oauthPoll: {
          providerType,
          authUrl,
          status: 'pending',
          message: 'Waiting for browser authentication…',
        },
      });
      return authUrl;
    } catch (err) {
      set({ lastError: String(err) });
      return null;
    }
  },

  clearOAuthPoll: () => set({ oauthPoll: null }),

  // ── Potluck ───────────────────────────────────────────────────────
  potluckData: null,
  potluckLoading: false,

  fetchPotluck: async () => {
    set({ potluckLoading: true, lastError: null });
    try {
      // Potluck data is served as part of the usage API
      const res = await proxyFetch('/api/usage', {}, get().authToken);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as PotluckData | { potluck?: PotluckData };
      const potluck = (data as { potluck?: PotluckData }).potluck ?? (data as PotluckData);
      set({ potluckData: potluck });
    } catch (err) {
      set({ lastError: String(err) });
    } finally {
      set({ potluckLoading: false });
    }
  },

  // ── Login ─────────────────────────────────────────────────────────
  loginToProxy: async (password) => {
    set({ lastError: null });
    try {
      const res = await fetch(`${PROXY_API_BASE}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) return false;
      const data = await res.json() as { token?: string; success?: boolean };
      if (data.token) {
        localStorage.setItem(STORAGE_KEY_PROXY_AUTH_TOKEN, data.token);
        set({ authToken: data.token, connectionStatus: 'connected' });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  checkProxyConnection: async () => {
    set({ connectionStatus: 'connecting' });
    try {
      const res = await fetch(`${PROXY_API_BASE}/api/health`, { signal: AbortSignal.timeout(3000) });
      const ok = res.ok;
      set({ connectionStatus: ok ? 'connected' : 'offline' });
      return ok;
    } catch {
      set({ connectionStatus: 'offline' });
      return false;
    }
  },

  // ── System ────────────────────────────────────────────────────────
  restartProxy: async () => {
    await proxyFetch('/api/restart-service', { method: 'POST' }, get().authToken);
  },

  reloadConfig: async () => {
    await proxyFetch('/api/reload-config', { method: 'POST' }, get().authToken);
    await get().fetchConfig();
  },

  checkForUpdate: async () => {
    try {
      const res = await proxyFetch('/api/check-update', {}, get().authToken);
      if (!res.ok) return null;
      return res.json() as Promise<{ hasUpdate: boolean; latestVersion: string; currentVersion: string }>;
    } catch {
      return null;
    }
  },

  // ── Error state ───────────────────────────────────────────────────
  lastError: null,
  clearError: () => set({ lastError: null }),
}));
