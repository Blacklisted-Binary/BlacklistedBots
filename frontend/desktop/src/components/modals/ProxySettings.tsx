/**
 * ProxySettings — full management panel for the BlacklistedAIProxy sidecar.
 *
 * Tabs:
 *  1. Providers  — CRUD on provider pool nodes, enable/disable, health-check
 *  2. Config     — global proxy config (API key, server port, log settings, TLS sidecar, hybrid gateway)
 *  3. Routing    — providerFallbackChain + modelFallbackMapping
 *  4. Potluck    — shared API key pool management
 *  5. System     — proxy status, restart, update check, log viewer
 */
import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  X,
  CheckCircle,
  XCircle,
  Plus,
  Trash,
  ArrowClockwise,
  Globe,
  Heartbeat,
  Gear,
  Tree,
  UsersThree,
  Desktop,
  Warning,
  ArrowRight,
  ToggleLeft,
  ToggleRight,
  Power,
  Spinner,
} from '@phosphor-icons/react';
import { useSwarmStore } from '../../store/useSwarmStore';
import { useProxyStore } from '../../store/useProxyStore';
import {
  PROXY_PROVIDERS,
  PROXY_PROVIDER_LABELS,
  PROXY_PROVIDER_COLORS,
  PROXY_PROVIDER_AUTH,
  PROXY_PROVIDER_MODELS,
  type ProxyProviderType,
  type ProxyPoolNode,
  type ProxyGlobalConfig,
} from '../../types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatusDot({ healthy }: { healthy: boolean }) {
  return (
    <span
      className="w-2 h-2 rounded-full shrink-0"
      style={{ background: healthy ? 'var(--color-success)' : 'var(--color-error)' }}
    />
  );
}

function TabButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 px-3 py-2 text-xs rounded-lg transition-colors ${
        active
          ? 'bg-accent/15 text-accent'
          : 'text-text-dimmed hover:text-text-primary hover:bg-white/5'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

// ── Providers tab ─────────────────────────────────────────────────────────────

function ProviderCard({
  providerType,
  onRefresh,
}: {
  providerType: ProxyProviderType;
  onRefresh: () => void;
}) {
  const color = PROXY_PROVIDER_COLORS[providerType];
  const label = PROXY_PROVIDER_LABELS[providerType];
  const { providers, addProvider, deleteProvider, toggleProvider, healthCheckProvider, generateAuthUrl } =
    useProxyStore();
  const summary = providers[providerType];
  const nodes = summary?.nodes ?? [];
  const [expanded, setExpanded] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [addFields, setAddFields] = useState<Record<string, string>>({ customName: '' });
  const [adding, setAdding] = useState(false);
  const [checking, setChecking] = useState(false);
  const authMethod = PROXY_PROVIDER_AUTH[providerType];

  async function handleAdd() {
    setAdding(true);
    try {
      await addProvider(providerType, { ...addFields, customName: addFields['customName'] || `${label} node` });
      setAddFields({ customName: '' });
      setShowAdd(false);
      onRefresh();
    } finally {
      setAdding(false);
    }
  }

  async function handleHealthCheck() {
    setChecking(true);
    try {
      await healthCheckProvider(providerType);
    } finally {
      setChecking(false);
    }
  }

  async function handleOAuth() {
    const url = await generateAuthUrl(providerType);
    if (url) {
      await invoke('open_browser', { url }).catch(console.warn);
    }
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/3 transition-colors text-left"
      >
        <span
          className="w-3 h-3 rounded-full shrink-0"
          style={{ background: color }}
        />
        <span className="text-sm font-medium text-text-primary flex-1">{label}</span>
        <span className="text-xs text-text-dimmed">
          {nodes.filter((n) => !n.isDisabled).length} active / {nodes.length} total
        </span>
        {summary && summary.healthyNodes > 0 ? (
          <CheckCircle size={14} weight="fill" className="text-success shrink-0" />
        ) : nodes.length > 0 ? (
          <XCircle size={14} weight="fill" className="text-error shrink-0" />
        ) : (
          <span className="text-xs text-text-dimmed">No accounts</span>
        )}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-border px-4 pb-4 space-y-3">
          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-3">
            {authMethod === 'oauth-browser' && (
              <button
                onClick={handleOAuth}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border border-border text-text-label hover:border-accent hover:text-accent transition-colors"
              >
                <Globe size={12} /> Add via OAuth
              </button>
            )}
            {(authMethod === 'api-key' || authMethod === 'cookie') && (
              <button
                onClick={() => setShowAdd(!showAdd)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border border-border text-text-label hover:border-accent hover:text-accent transition-colors"
              >
                <Plus size={12} /> Add Account
              </button>
            )}
            <button
              onClick={handleHealthCheck}
              disabled={checking || nodes.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border border-border text-text-label hover:border-accent hover:text-accent transition-colors disabled:opacity-40"
            >
              {checking ? <Spinner size={12} className="animate-spin" /> : <Heartbeat size={12} />} Health Check
            </button>
          </div>

          {/* Inline add form */}
          {showAdd && (
            <div className="p-3 rounded-lg border border-border bg-bg-base space-y-2">
              <input
                className="w-full bg-bg-panel border border-border rounded px-2 py-1.5 text-xs focus:outline-none focus:border-accent"
                placeholder="Custom name"
                value={addFields['customName'] ?? ''}
                onChange={(e) => setAddFields((f) => ({ ...f, customName: e.target.value }))}
              />
              {authMethod === 'api-key' && (
                <>
                  <input
                    type="password"
                    className="w-full bg-bg-panel border border-border rounded px-2 py-1.5 text-xs focus:outline-none focus:border-accent font-mono"
                    placeholder={providerType === 'claude-custom' ? 'CLAUDE_API_KEY' : 'OPENAI_API_KEY'}
                    value={addFields[providerType === 'claude-custom' ? 'CLAUDE_API_KEY' : 'OPENAI_API_KEY'] ?? ''}
                    onChange={(e) =>
                      setAddFields((f) => ({
                        ...f,
                        [providerType === 'claude-custom' ? 'CLAUDE_API_KEY' : 'OPENAI_API_KEY']: e.target.value,
                      }))
                    }
                  />
                  <input
                    className="w-full bg-bg-panel border border-border rounded px-2 py-1.5 text-xs focus:outline-none focus:border-accent font-mono"
                    placeholder={providerType === 'claude-custom' ? 'CLAUDE_BASE_URL' : 'OPENAI_BASE_URL'}
                    value={
                      addFields[providerType === 'claude-custom' ? 'CLAUDE_BASE_URL' : 'OPENAI_BASE_URL'] ??
                      (providerType === 'claude-custom' ? 'https://api.anthropic.com' : 'https://api.openai.com/v1')
                    }
                    onChange={(e) =>
                      setAddFields((f) => ({
                        ...f,
                        [providerType === 'claude-custom' ? 'CLAUDE_BASE_URL' : 'OPENAI_BASE_URL']: e.target.value,
                      }))
                    }
                  />
                </>
              )}
              {authMethod === 'cookie' && (
                <>
                  <input
                    type="password"
                    className="w-full bg-bg-panel border border-border rounded px-2 py-1.5 text-xs focus:outline-none focus:border-accent font-mono"
                    placeholder="GROK_COOKIE_TOKEN (sso=...)"
                    value={addFields['GROK_COOKIE_TOKEN'] ?? ''}
                    onChange={(e) => setAddFields((f) => ({ ...f, GROK_COOKIE_TOKEN: e.target.value }))}
                  />
                  <input
                    type="password"
                    className="w-full bg-bg-panel border border-border rounded px-2 py-1.5 text-xs focus:outline-none focus:border-accent font-mono"
                    placeholder="GROK_CF_CLEARANCE (cf_clearance=...)"
                    value={addFields['GROK_CF_CLEARANCE'] ?? ''}
                    onChange={(e) => setAddFields((f) => ({ ...f, GROK_CF_CLEARANCE: e.target.value }))}
                  />
                </>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleAdd}
                  disabled={adding}
                  className="flex-1 px-3 py-1.5 text-xs rounded bg-accent text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {adding ? 'Adding…' : 'Add'}
                </button>
                <button
                  onClick={() => setShowAdd(false)}
                  className="px-3 py-1.5 text-xs rounded border border-border text-text-label hover:text-text-primary transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Node list */}
          {nodes.length === 0 ? (
            <p className="text-xs text-text-dimmed py-2">No accounts configured.</p>
          ) : (
            <div className="space-y-1.5">
              {nodes.map((node) => (
                <NodeRow
                  key={node.uuid}
                  providerType={providerType}
                  node={node}
                  onDelete={() => deleteProvider(providerType, node.uuid).then(onRefresh)}
                  onToggle={(enabled) => toggleProvider(providerType, node.uuid, enabled).then(onRefresh)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NodeRow({
  node,
  onDelete,
  onToggle,
}: {
  providerType: ProxyProviderType;
  node: ProxyPoolNode;
  onDelete: () => void;
  onToggle: (enabled: boolean) => void;
}) {
  const [deleting, setDeleting] = useState(false);

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-bg-base/50">
      <StatusDot healthy={node.isHealthy && !node.isDisabled} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-text-primary truncate">{node.customName}</p>
        <p className="text-xs text-text-dimmed">
          {node.usageCount} requests · {node.errorCount} errors
          {node.lastUsed ? ` · last used ${new Date(node.lastUsed).toLocaleDateString()}` : ''}
        </p>
      </div>
      <button
        onClick={() => onToggle(node.isDisabled)}
        title={node.isDisabled ? 'Enable' : 'Disable'}
        className="text-text-dimmed hover:text-accent transition-colors"
      >
        {node.isDisabled ? <ToggleLeft size={16} /> : <ToggleRight size={16} className="text-success" />}
      </button>
      <button
        onClick={async () => { setDeleting(true); await onDelete(); setDeleting(false); }}
        disabled={deleting}
        className="text-text-dimmed hover:text-error transition-colors disabled:opacity-40"
      >
        {deleting ? <Spinner size={12} className="animate-spin" /> : <Trash size={12} />}
      </button>
    </div>
  );
}

// ── Config tab ────────────────────────────────────────────────────────────────

function ConfigTab() {
  const { config, updateConfig, configLoading, lastError } = useProxyStore();
  const [draft, setDraft] = useState<Partial<ProxyGlobalConfig>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (config) setDraft(config);
  }, [config]);

  const c = { ...config, ...draft } as ProxyGlobalConfig;

  function field(key: keyof ProxyGlobalConfig) {
    return {
      value: String((draft[key] ?? config?.[key]) ?? ''),
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setDraft((d) => ({ ...d, [key]: e.target.value })),
    };
  }

  function boolField(key: keyof ProxyGlobalConfig) {
    const v = (draft[key] ?? config?.[key]) as boolean | undefined;
    return {
      checked: !!v,
      onChange: () => setDraft((d) => ({ ...d, [key]: !v })),
    };
  }

  async function save() {
    setSaving(true);
    try {
      await updateConfig(draft);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  if (configLoading && !config) {
    return <div className="flex items-center justify-center py-12"><Spinner size={20} className="animate-spin text-text-dimmed" /></div>;
  }

  return (
    <div className="space-y-5">
      {lastError && (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-error/30 bg-error/10 text-xs text-error">
          <Warning size={12} className="shrink-0" /> {lastError}
        </div>
      )}

      {/* Server */}
      <Section title="Server">
        <Row label="API Key (required for proxy access)">
          <input type="password" className={input()} {...field('REQUIRED_API_KEY')} />
        </Row>
        <Row label="Server Port">
          <input type="number" className={input()} {...field('SERVER_PORT')} />
        </Row>
        <Row label="Host">
          <input className={input()} {...field('HOST')} />
        </Row>
        <Row label="Default Model Provider">
          <select className={input()}>
            {PROXY_PROVIDERS.map((p) => (
              <option key={p} value={p}>{PROXY_PROVIDER_LABELS[p]}</option>
            ))}
          </select>
        </Row>
      </Section>

      {/* Requests */}
      <Section title="Request Handling">
        <Row label="Max Retries">
          <input type="number" className={input()} {...field('REQUEST_MAX_RETRIES')} />
        </Row>
        <Row label="Base Retry Delay (ms)">
          <input type="number" className={input()} {...field('REQUEST_BASE_DELAY')} />
        </Row>
        <Row label="Max Error Count per Node">
          <input type="number" className={input()} {...field('MAX_ERROR_COUNT')} />
        </Row>
        <Row label="Cron Refresh Token">
          <Toggle {...boolField('CRON_REFRESH_TOKEN')} />
        </Row>
        <Row label="Cron Interval (minutes)">
          <input type="number" className={input()} {...field('CRON_NEAR_MINUTES')} />
        </Row>
      </Section>

      {/* Upstream proxy */}
      <Section title="Upstream Proxy (optional)">
        <Row label="Proxy URL (http:// or socks5://)">
          <input className={input()} {...field('PROXY_URL')} placeholder="http://127.0.0.1:1089" />
        </Row>
        <Row label="Enable for Providers">
          <div className="flex flex-wrap gap-1.5 mt-1">
            {PROXY_PROVIDERS.filter((p) => p !== 'forward-api').map((p) => {
              const enabled = (c.PROXY_ENABLED_PROVIDERS ?? []).includes(p);
              return (
                <button
                  key={p}
                  onClick={() => {
                    const cur = c.PROXY_ENABLED_PROVIDERS ?? [];
                    setDraft((d) => ({
                      ...d,
                      PROXY_ENABLED_PROVIDERS: enabled ? cur.filter((x) => x !== p) : [...cur, p],
                    }));
                  }}
                  className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                    enabled
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-border text-text-dimmed hover:border-accent/40'
                  }`}
                >
                  {PROXY_PROVIDER_LABELS[p].split(' ')[0]}
                </button>
              );
            })}
          </div>
        </Row>
      </Section>

      {/* Logging */}
      <Section title="Logging">
        <Row label="Enabled">
          <Toggle {...boolField('LOG_ENABLED')} />
        </Row>
        <Row label="Level">
          <select className={input()} {...field('LOG_LEVEL')}>
            {['debug', 'info', 'warn', 'error'].map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </Row>
        <Row label="Output Mode">
          <select className={input()} {...field('LOG_OUTPUT_MODE')}>
            {['all', 'console', 'file'].map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </Row>
      </Section>

      {/* TLS Sidecar */}
      <Section title="TLS Sidecar (Grok / Cloudflare bypass)">
        <Row label="Enabled">
          <Toggle {...boolField('TLS_SIDECAR_ENABLED')} />
        </Row>
        <Row label="Sidecar Port">
          <input type="number" className={input()} {...field('TLS_SIDECAR_PORT')} />
        </Row>
      </Section>

      {/* Hybrid Gateway */}
      <Section title="Hybrid Gateway">
        <Row label="Enabled">
          <Toggle {...boolField('HYBRID_GATEWAY_ENABLED')} />
        </Row>
        <Row label="Gateway URL">
          <input className={input()} {...field('HYBRID_GATEWAY_URL')} placeholder="http://127.0.0.1:9091" />
        </Row>
        <Row label="Canary %">
          <input type="number" min={0} max={100} className={input()} {...field('HYBRID_GATEWAY_CANARY_PERCENT')} />
        </Row>
      </Section>

      <button
        onClick={save}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm rounded bg-accent text-white font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {saving ? <><Spinner size={13} className="animate-spin" /> Saving…</> : saved ? <><CheckCircle size={13} weight="fill" /> Saved!</> : 'Save Configuration'}
      </button>
    </div>
  );
}

// ── Routing tab ───────────────────────────────────────────────────────────────

function RoutingTab() {
  const { config, updateConfig } = useProxyStore();
  const [fallbackChain, setFallbackChain] = useState<Record<string, string[]>>(
    config?.providerFallbackChain ?? {},
  );
  const [modelMap, setModelMap] = useState<Record<string, { targetProviderType: string; targetModel: string }>>(
    config?.modelFallbackMapping ?? {},
  );
  const [saving, setSaving] = useState(false);
  const [newModel, setNewModel] = useState('');
  const [newTargetProvider, setNewTargetProvider] = useState<ProxyProviderType>('claude-kiro-oauth');
  const [newTargetModel, setNewTargetModel] = useState('');

  async function save() {
    setSaving(true);
    try {
      await updateConfig({ providerFallbackChain: fallbackChain, modelFallbackMapping: modelMap });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Provider fallback chain */}
      <Section title="Provider Fallback Chain">
        <p className="text-xs text-text-dimmed mb-3 leading-relaxed">
          When a provider fails or is rate-limited, the proxy automatically tries the next one in the chain.
        </p>
        <div className="space-y-2">
          {PROXY_PROVIDERS.filter((p) => p !== 'forward-api').map((providerType) => {
            const chain = fallbackChain[providerType] ?? [];
            return (
              <div key={providerType} className="flex items-center gap-2 py-1.5">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: PROXY_PROVIDER_COLORS[providerType] }}
                />
                <span className="text-xs font-medium text-text-primary w-40 shrink-0 truncate">
                  {PROXY_PROVIDER_LABELS[providerType]}
                </span>
                <ArrowRight size={12} className="text-text-dimmed shrink-0" />
                <select
                  className="flex-1 bg-bg-base border border-border rounded px-2 py-1 text-xs focus:outline-none focus:border-accent"
                  value={chain[0] ?? ''}
                  onChange={(e) =>
                    setFallbackChain((c) => ({ ...c, [providerType]: e.target.value ? [e.target.value] : [] }))
                  }
                >
                  <option value="">— None —</option>
                  {PROXY_PROVIDERS.filter((p) => p !== providerType).map((p) => (
                    <option key={p} value={p}>{PROXY_PROVIDER_LABELS[p]}</option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Model fallback mapping */}
      <Section title="Model Fallback Mapping">
        <p className="text-xs text-text-dimmed mb-3 leading-relaxed">
          Reroute specific model names to a different provider/model. Useful for cross-provider models
          (e.g. route <code>gemini-claude-sonnet-4-6</code> → Claude Kiro).
        </p>
        <div className="space-y-1.5">
          {Object.entries(modelMap).map(([src, target]) => (
            <div key={src} className="flex items-center gap-2 py-1">
              <span className="text-xs font-mono text-text-primary truncate flex-1">{src}</span>
              <ArrowRight size={12} className="text-text-dimmed shrink-0" />
              <span className="text-xs text-text-label truncate w-32 shrink-0">
                {PROXY_PROVIDER_LABELS[target.targetProviderType as ProxyProviderType] ?? target.targetProviderType}
              </span>
              <span className="text-xs font-mono text-accent truncate w-32 shrink-0">{target.targetModel}</span>
              <button
                onClick={() => setModelMap((m) => { const n = { ...m }; delete n[src]; return n; })}
                className="text-text-dimmed hover:text-error transition-colors shrink-0"
              >
                <Trash size={11} />
              </button>
            </div>
          ))}
        </div>

        {/* Add rule */}
        <div className="mt-3 p-3 rounded-lg border border-border bg-bg-base/50 space-y-2">
          <p className="text-xs text-text-dimmed">Add mapping rule:</p>
          <input
            className="w-full bg-bg-panel border border-border rounded px-2 py-1.5 text-xs focus:outline-none focus:border-accent font-mono"
            placeholder="Source model (e.g. gemini-claude-sonnet-4-6)"
            value={newModel}
            onChange={(e) => setNewModel(e.target.value)}
          />
          <div className="flex gap-2">
            <select
              className="flex-1 bg-bg-panel border border-border rounded px-2 py-1.5 text-xs focus:outline-none focus:border-accent"
              value={newTargetProvider}
              onChange={(e) => setNewTargetProvider(e.target.value as ProxyProviderType)}
            >
              {PROXY_PROVIDERS.map((p) => (
                <option key={p} value={p}>{PROXY_PROVIDER_LABELS[p]}</option>
              ))}
            </select>
            <select
              className="flex-1 bg-bg-panel border border-border rounded px-2 py-1.5 text-xs focus:outline-none focus:border-accent font-mono"
              value={newTargetModel}
              onChange={(e) => setNewTargetModel(e.target.value)}
            >
              <option value="">— model —</option>
              {PROXY_PROVIDER_MODELS[newTargetProvider].map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <button
            disabled={!newModel || !newTargetModel}
            onClick={() => {
              if (!newModel || !newTargetModel) return;
              setModelMap((m) => ({
                ...m,
                [newModel]: { targetProviderType: newTargetProvider, targetModel: newTargetModel },
              }));
              setNewModel('');
              setNewTargetModel('');
            }}
            className="w-full px-3 py-1.5 text-xs rounded bg-accent/15 text-accent hover:bg-accent/25 disabled:opacity-40 transition-colors"
          >
            <Plus size={11} className="inline mr-1" />Add Rule
          </button>
        </div>
      </Section>

      <button
        onClick={save}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm rounded bg-accent text-white font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {saving ? <><Spinner size={13} className="animate-spin" /> Saving…</> : 'Save Routing Rules'}
      </button>
    </div>
  );
}

// ── Potluck tab ───────────────────────────────────────────────────────────────

function PotluckTab() {
  const { potluckData, fetchPotluck, potluckLoading } = useProxyStore();

  useEffect(() => {
    fetchPotluck();
  }, [fetchPotluck]);

  if (potluckLoading && !potluckData) {
    return <div className="flex justify-center py-12"><Spinner size={20} className="animate-spin text-text-dimmed" /></div>;
  }

  const cfg = potluckData?.config;
  const users = Object.entries(potluckData?.users ?? {});

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 p-4 rounded-xl border border-accent/20 bg-accent/5">
        <UsersThree size={18} className="text-accent mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-text-primary">API Potluck</p>
          <p className="text-xs text-text-label mt-1 leading-relaxed">
            Contribute your spare OAuth credentials to a shared community pool. Everyone contributes
            something, everyone gets more capacity. Each credential earns {cfg?.bonusPerCredential ?? 300} bonus
            requests valid for {cfg?.bonusValidityDays ?? 30} days.
          </p>
        </div>
      </div>

      {cfg && (
        <Section title="Pool Configuration">
          <Row label="Default Daily Limit">
            <span className="text-xs text-text-primary font-mono">{cfg.defaultDailyLimit} req/day</span>
          </Row>
          <Row label="Bonus per Credential">
            <span className="text-xs text-text-primary font-mono">+{cfg.bonusPerCredential} requests</span>
          </Row>
          <Row label="Bonus Validity">
            <span className="text-xs text-text-primary font-mono">{cfg.bonusValidityDays} days</span>
          </Row>
          <Row label="Persist Interval">
            <span className="text-xs text-text-primary font-mono">{cfg.persistInterval}ms</span>
          </Row>
        </Section>
      )}

      <Section title={`Pool Members (${users.length})`}>
        {users.length === 0 ? (
          <p className="text-xs text-text-dimmed py-2">No users in the pool yet.</p>
        ) : (
          <div className="space-y-2">
            {users.map(([userId, user]) => (
              <div key={userId} className="px-3 py-2.5 rounded-lg border border-border bg-bg-base/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono text-text-primary truncate max-w-[60%]">{userId}</span>
                  <span className="text-xs text-text-dimmed">
                    {user.credentials.length} credential{user.credentials.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {user.credentials.map((cred) => (
                    <span
                      key={cred.id}
                      className="text-xs px-1.5 py-0.5 rounded border border-border text-text-dimmed"
                    >
                      {PROXY_PROVIDER_LABELS[cred.provider as ProxyProviderType] ?? cred.provider}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

// ── System tab ────────────────────────────────────────────────────────────────

function SystemTab() {
  const { connectionStatus, restartProxy, reloadConfig, checkForUpdate, checkProxyConnection } =
    useProxyStore();
  const [restarting, setRestarting] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<{
    hasUpdate: boolean;
    latestVersion: string;
    currentVersion: string;
  } | null>(null);
  const [checking, setChecking] = useState(false);
  const [proxyRunning, setProxyRunning] = useState(connectionStatus === 'connected');

  async function handleSpawnProxy() {
    try {
      await invoke('spawn_proxy', { configArgs: [] });
      setProxyRunning(true);
      setTimeout(() => checkProxyConnection(), 2000);
    } catch (e) {
      console.error('spawn_proxy failed:', e);
    }
  }

  async function handleStopProxy() {
    try {
      await invoke('kill_proxy');
      setProxyRunning(false);
    } catch (e) {
      console.error('kill_proxy failed:', e);
    }
  }

  return (
    <div className="space-y-5">
      {/* Status */}
      <Section title="Proxy Status">
        <Row label="Connection">
          <span
            className={`text-xs font-medium ${
              connectionStatus === 'connected'
                ? 'text-success'
                : connectionStatus === 'connecting'
                ? 'text-yellow-400'
                : 'text-error'
            }`}
          >
            {connectionStatus === 'connected' ? '● Connected' : connectionStatus === 'connecting' ? '● Connecting…' : '● Offline'}
          </span>
        </Row>
        <Row label="Port">
          <span className="text-xs font-mono text-text-primary">3000 (worker) · 3100 (master)</span>
        </Row>
      </Section>

      {/* Controls */}
      <Section title="Controls">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleSpawnProxy}
            disabled={proxyRunning}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border border-border text-text-label hover:border-success hover:text-success disabled:opacity-40 transition-colors"
          >
            <Power size={12} /> Start Proxy
          </button>
          <button
            onClick={handleStopProxy}
            disabled={!proxyRunning}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border border-border text-text-label hover:border-error hover:text-error disabled:opacity-40 transition-colors"
          >
            <Power size={12} /> Stop Proxy
          </button>
          <button
            onClick={async () => { setRestarting(true); await restartProxy(); setRestarting(false); }}
            disabled={restarting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border border-border text-text-label hover:border-accent hover:text-accent disabled:opacity-40 transition-colors"
          >
            {restarting ? <Spinner size={12} className="animate-spin" /> : <ArrowClockwise size={12} />} Restart
          </button>
          <button
            onClick={async () => { setReloading(true); await reloadConfig(); setReloading(false); }}
            disabled={reloading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border border-border text-text-label hover:border-accent hover:text-accent disabled:opacity-40 transition-colors"
          >
            {reloading ? <Spinner size={12} className="animate-spin" /> : <ArrowClockwise size={12} />} Reload Config
          </button>
        </div>
      </Section>

      {/* Update */}
      <Section title="Updates">
        <div className="flex items-center gap-3">
          <button
            onClick={async () => {
              setChecking(true);
              const info = await checkForUpdate();
              setUpdateInfo(info);
              setChecking(false);
            }}
            disabled={checking}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border border-border text-text-label hover:border-accent hover:text-accent disabled:opacity-40 transition-colors"
          >
            {checking ? <Spinner size={12} className="animate-spin" /> : <ArrowClockwise size={12} />}
            Check for Updates
          </button>
          {updateInfo && (
            <div className="text-xs">
              {updateInfo.hasUpdate ? (
                <span className="text-accent font-medium">
                  v{updateInfo.latestVersion} available (current: v{updateInfo.currentVersion})
                </span>
              ) : (
                <span className="text-text-dimmed">
                  Up to date (v{updateInfo.currentVersion})
                </span>
              )}
            </div>
          )}
        </div>
        <p className="text-xs text-text-dimmed mt-2">
          Source: <a href="#" className="text-accent hover:underline">github.com/crazyrob425/BlacklistedAIProxy</a>
        </p>
      </Section>

      {/* Setup instructions */}
      <Section title="First-Time Setup">
        <div className="p-3 rounded-lg border border-border bg-bg-base/50 space-y-1.5">
          <p className="text-xs font-medium text-text-primary">Install the proxy source:</p>
          <code className="block text-xs font-mono text-accent bg-bg-base px-3 py-2 rounded border border-border">
            cd frontend/desktop/proxy && sh install-proxy.sh
          </code>
          <p className="text-xs text-text-dimmed leading-relaxed">
            This downloads the BlacklistedAIProxy source from GitHub, installs npm dependencies,
            and copies example configs. After installation, SwarmForge auto-starts the proxy on launch.
          </p>
        </div>
      </Section>
    </div>
  );
}

// ── Small layout helpers ──────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-text-dimmed uppercase tracking-wider mb-2">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-text-label w-44 shrink-0">{label}</span>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange} className="text-text-dimmed hover:text-accent transition-colors">
      {checked ? <ToggleRight size={18} className="text-success" /> : <ToggleLeft size={18} />}
    </button>
  );
}

const input = () =>
  'w-full bg-bg-base border border-border rounded px-2.5 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent';

// ── Main modal ────────────────────────────────────────────────────────────────

type Tab = 'providers' | 'config' | 'routing' | 'potluck' | 'system';

export default function ProxySettings() {
  const { setProxySettingsOpen } = useSwarmStore();
  const { fetchProviders, fetchConfig, connectionStatus, checkProxyConnection } = useProxyStore();
  const [activeTab, setActiveTab] = useState<Tab>('providers');

  useEffect(() => {
    checkProxyConnection();
    fetchProviders();
    fetchConfig();
  }, [checkProxyConnection, fetchProviders, fetchConfig]);

  const TABS: { id: Tab; icon: React.ReactNode; label: string }[] = [
    { id: 'providers', icon: <Tree size={16} />, label: 'Providers' },
    { id: 'config', icon: <Gear size={16} />, label: 'Config' },
    { id: 'routing', icon: <ArrowRight size={16} />, label: 'Routing' },
    { id: 'potluck', icon: <UsersThree size={16} />, label: 'Potluck' },
    { id: 'system', icon: <Desktop size={16} />, label: 'System' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div
        className="relative flex flex-col rounded-xl border border-border shadow-2xl"
        style={{ width: 640, maxHeight: '90vh', background: 'var(--color-bg-panel)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <Gear size={18} className="text-accent" />
            <h2 className="font-semibold text-text-primary">Proxy Settings</h2>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                connectionStatus === 'connected'
                  ? 'bg-success/15 text-success'
                  : connectionStatus === 'connecting'
                  ? 'bg-yellow-900/30 text-yellow-400'
                  : 'bg-error/15 text-error'
              }`}
            >
              {connectionStatus}
            </span>
          </div>
          <button
            onClick={() => setProxySettingsOpen(false)}
            className="p-1 text-text-dimmed hover:text-text-primary transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-1 px-4 py-2.5 border-b border-border">
          {TABS.map((t) => (
            <TabButton
              key={t.id}
              active={activeTab === t.id}
              icon={t.icon}
              label={t.label}
              onClick={() => setActiveTab(t.id)}
            />
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {activeTab === 'providers' && (
            <div className="space-y-3">
              {PROXY_PROVIDERS.map((p) => (
                <ProviderCard key={p} providerType={p} onRefresh={fetchProviders} />
              ))}
            </div>
          )}
          {activeTab === 'config' && <ConfigTab />}
          {activeTab === 'routing' && <RoutingTab />}
          {activeTab === 'potluck' && <PotluckTab />}
          {activeTab === 'system' && <SystemTab />}
        </div>
      </div>
    </div>
  );
}
