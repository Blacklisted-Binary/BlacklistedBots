/**
 * SetupWizard — multi-step OAuth wizard for BlacklistedAIProxy providers.
 *
 * Guides the user through authenticating each provider via the proxy's real
 * OAuth flow:
 *   1. POST /api/providers/{type}/generate-auth-url  → get the auth URL
 *   2. Open URL in system browser via Tauri open_browser command
 *   3. Poll GET /api/providers/{type} until a healthy node appears
 *   4. Mark the provider as "Connected" and move to the next step
 */
import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { X, CheckCircle, ArrowRight, ArrowLeft, Globe, Spinner, Warning, Lock, Info } from '@phosphor-icons/react';
import { useSwarmStore } from '../../store/useSwarmStore';
import { useProxyStore } from '../../store/useProxyStore';
import {
  PROXY_PROVIDERS,
  PROXY_PROVIDER_LABELS,
  PROXY_PROVIDER_COLORS,
  PROXY_PROVIDER_AUTH,
  PROXY_PROVIDER_DESCRIPTIONS,
  PROXY_PROVIDER_MODELS,
  type ProxyProviderType,
  type ProxyAuthMethod,
} from '../../types';

// ── Providers shown in the wizard (skip forward-api which needs no OAuth) ────
const WIZARD_PROVIDERS: ProxyProviderType[] = PROXY_PROVIDERS.filter(
  (p) => p !== 'forward-api',
);

type WizardStep = 'welcome' | ProxyProviderType | 'done';

interface ProviderAuthState {
  status: 'idle' | 'generating' | 'waiting' | 'connected' | 'error' | 'skipped';
  authUrl: string | null;
  errorMessage: string | null;
  accountLabel: string | null;
}

const defaultAuthState = (): ProviderAuthState => ({
  status: 'idle',
  authUrl: null,
  errorMessage: null,
  accountLabel: null,
});

// ── Auth-method-specific credential form fields ───────────────────────────────

function ApiKeyForm({
  providerType,
  onSubmit,
  loading,
}: {
  providerType: ProxyProviderType;
  onSubmit: (fields: Record<string, string>) => void;
  loading: boolean;
}) {
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState(
    providerType === 'claude-custom' ? 'https://api.anthropic.com' : 'https://api.openai.com/v1',
  );
  const [customName, setCustomName] = useState('');

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-text-label block mb-1">Custom name (optional)</label>
        <input
          className="w-full bg-bg-base border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
          placeholder="My account"
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
        />
      </div>
      <div>
        <label className="text-xs text-text-label block mb-1">API Key</label>
        <input
          type="password"
          className="w-full bg-bg-base border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent font-mono"
          placeholder="sk-..."
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
        />
      </div>
      <div>
        <label className="text-xs text-text-label block mb-1">Base URL</label>
        <input
          className="w-full bg-bg-base border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent font-mono"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
        />
      </div>
      <button
        disabled={!apiKey || loading}
        onClick={() =>
          onSubmit({
            customName: customName || `${PROXY_PROVIDER_LABELS[providerType]} node`,
            ...(providerType === 'claude-custom'
              ? { CLAUDE_API_KEY: apiKey, CLAUDE_BASE_URL: baseUrl }
              : { OPENAI_API_KEY: apiKey, OPENAI_BASE_URL: baseUrl }),
          })
        }
        className="w-full mt-1 px-4 py-2 text-sm rounded bg-accent hover:opacity-90 text-white font-medium disabled:opacity-40 transition-opacity"
      >
        {loading ? 'Saving…' : 'Add Account'}
      </button>
    </div>
  );
}

function CookieForm({
  onSubmit,
  loading,
}: {
  onSubmit: (fields: Record<string, string>) => void;
  loading: boolean;
}) {
  const [sso, setSso] = useState('');
  const [cf, setCf] = useState('');
  const [ua, setUa] = useState('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36');
  const [customName, setCustomName] = useState('');

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 p-3 rounded-lg border border-yellow-800/40 bg-yellow-950/20">
        <Info size={14} className="text-yellow-500 mt-0.5 shrink-0" />
        <p className="text-xs text-yellow-400 leading-relaxed">
          Open <strong>grok.com</strong>, log in, then copy your <code>sso</code> and
          <code>cf_clearance</code> cookies from browser DevTools → Application → Cookies.
        </p>
      </div>
      <div>
        <label className="text-xs text-text-label block mb-1">Custom name (optional)</label>
        <input
          className="w-full bg-bg-base border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
          placeholder="Grok account"
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
        />
      </div>
      <div>
        <label className="text-xs text-text-label block mb-1">SSO Cookie</label>
        <input
          type="password"
          className="w-full bg-bg-base border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent font-mono"
          placeholder="sso=..."
          value={sso}
          onChange={(e) => setSso(e.target.value)}
        />
      </div>
      <div>
        <label className="text-xs text-text-label block mb-1">CF Clearance Cookie</label>
        <input
          type="password"
          className="w-full bg-bg-base border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent font-mono"
          placeholder="cf_clearance=..."
          value={cf}
          onChange={(e) => setCf(e.target.value)}
        />
      </div>
      <div>
        <label className="text-xs text-text-label block mb-1">User-Agent</label>
        <input
          className="w-full bg-bg-base border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent font-mono"
          value={ua}
          onChange={(e) => setUa(e.target.value)}
        />
      </div>
      <button
        disabled={!sso || loading}
        onClick={() =>
          onSubmit({
            customName: customName || 'Grok node',
            GROK_COOKIE_TOKEN: sso,
            GROK_CF_CLEARANCE: cf,
            GROK_USER_AGENT: ua,
            GROK_BASE_URL: 'https://grok.com',
          })
        }
        className="w-full mt-1 px-4 py-2 text-sm rounded bg-accent hover:opacity-90 text-white font-medium disabled:opacity-40 transition-opacity"
      >
        {loading ? 'Saving…' : 'Add Account'}
      </button>
    </div>
  );
}

// ── Provider step ─────────────────────────────────────────────────────────────

function ProviderStep({
  providerType,
  authState,
  onStartOAuth,
  onAddApiKey,
  onSkip,
}: {
  providerType: ProxyProviderType;
  authState: ProviderAuthState;
  onStartOAuth: () => void;
  onAddApiKey: (fields: Record<string, string>) => void;
  onSkip: () => void;
}) {
  const color = PROXY_PROVIDER_COLORS[providerType];
  const label = PROXY_PROVIDER_LABELS[providerType];
  const description = PROXY_PROVIDER_DESCRIPTIONS[providerType];
  const authMethod: ProxyAuthMethod = PROXY_PROVIDER_AUTH[providerType];
  const models = PROXY_PROVIDER_MODELS[providerType].slice(0, 4);
  const [addingKey, setAddingKey] = useState(false);

  const isConnected = authState.status === 'connected';
  const isWaiting = authState.status === 'waiting';
  const isGenerating = authState.status === 'generating';

  const handleAddApiKey = async (fields: Record<string, string>) => {
    setAddingKey(true);
    try {
      await onAddApiKey(fields);
    } finally {
      setAddingKey(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Provider header */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${color}22`, border: `1.5px solid ${color}44` }}
        >
          <span className="w-4 h-4 rounded-full" style={{ background: color }} />
        </div>
        <div>
          <h3 className="font-semibold text-text-primary text-sm">{label}</h3>
          <p className="text-xs text-text-dimmed">
            {authMethod === 'oauth-browser'
              ? 'Free via OAuth — no API key needed'
              : authMethod === 'api-key'
              ? 'Requires your own API key'
              : 'Requires browser cookies'}
          </p>
        </div>
        {isConnected && (
          <div className="ml-auto flex items-center gap-1.5 text-xs text-success font-medium">
            <CheckCircle size={14} weight="fill" />
            Connected
          </div>
        )}
      </div>

      <p className="text-sm text-text-label leading-relaxed">{description}</p>

      {/* Model previews */}
      {models.length > 0 && (
        <div>
          <p className="text-xs text-text-dimmed mb-1.5">Available models:</p>
          <div className="flex flex-wrap gap-1.5">
            {models.map((m) => (
              <span
                key={m}
                className="text-xs px-2 py-0.5 rounded-full border"
                style={{ borderColor: `${color}44`, color }}
              >
                {m}
              </span>
            ))}
            {PROXY_PROVIDER_MODELS[providerType].length > 4 && (
              <span className="text-xs px-2 py-0.5 text-text-dimmed">
                +{PROXY_PROVIDER_MODELS[providerType].length - 4} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Action area */}
      {isConnected ? (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/30">
          <CheckCircle size={16} weight="fill" className="text-success shrink-0" />
          <span className="text-sm text-success font-medium">
            {authState.accountLabel ?? label} is authenticated and ready.
          </span>
        </div>
      ) : authMethod === 'oauth-browser' ? (
        <div className="space-y-3">
          {isWaiting && authState.authUrl && (
            <div className="p-3 rounded-lg border border-border bg-bg-base space-y-2">
              <p className="text-xs text-text-label">
                A browser window should have opened. Complete the OAuth login, then come back here.
              </p>
              <p className="text-xs text-text-dimmed truncate font-mono">{authState.authUrl}</p>
              <button
                onClick={() => invoke('open_browser', { url: authState.authUrl! }).catch(console.warn)}
                className="text-xs text-accent hover:underline"
              >
                Re-open browser window →
              </button>
            </div>
          )}
          {authState.errorMessage && (
            <div className="flex items-start gap-2 p-3 rounded-lg border border-error/30 bg-error/10">
              <Warning size={14} className="text-error mt-0.5 shrink-0" />
              <span className="text-xs text-error">{authState.errorMessage}</span>
            </div>
          )}
          <button
            disabled={isGenerating || isWaiting}
            onClick={onStartOAuth}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm rounded font-medium transition-opacity disabled:opacity-60"
            style={{ background: color, color: '#fff' }}
          >
            {isGenerating ? (
              <><Spinner size={14} className="animate-spin" /> Generating auth URL…</>
            ) : isWaiting ? (
              <><Spinner size={14} className="animate-spin" /> Waiting for authentication…</>
            ) : (
              <><Globe size={14} /> Authenticate with {label.split(' ')[0]}</>
            )}
          </button>
        </div>
      ) : authMethod === 'api-key' ? (
        <ApiKeyForm
          providerType={providerType}
          onSubmit={handleAddApiKey}
          loading={addingKey}
        />
      ) : authMethod === 'cookie' ? (
        <CookieForm onSubmit={handleAddApiKey} loading={addingKey} />
      ) : null}

      <button
        onClick={onSkip}
        disabled={isConnected}
        className="text-xs text-text-dimmed hover:text-text-primary transition-colors disabled:opacity-0"
      >
        Skip for now →
      </button>
    </div>
  );
}

// ── Main wizard ───────────────────────────────────────────────────────────────

export default function SetupWizard() {
  const { setSetupWizardOpen } = useSwarmStore();
  const {
    generateAuthUrl,
    addProvider,
    fetchProviders,
    providers,
    checkProxyConnection,
    loginToProxy,
    proxyApiKey,
  } = useProxyStore();

  const [currentStep, setCurrentStep] = useState<WizardStep>('welcome');
  const [authStates, setAuthStates] = useState<Record<string, ProviderAuthState>>(() =>
    Object.fromEntries(WIZARD_PROVIDERS.map((p) => [p, defaultAuthState()])),
  );
  const [proxyPassword, setProxyPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [proxyOk, setProxyOk] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Check proxy connection on mount
  useEffect(() => {
    checkProxyConnection().then(setProxyOk);
  }, [checkProxyConnection]);

  // Poll for provider auth completion when waiting
  useEffect(() => {
    const waitingEntry = Object.entries(authStates).find(
      ([, s]) => s.status === 'waiting',
    );
    if (!waitingEntry) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    const [providerType] = waitingEntry;

    if (pollRef.current) return; // already polling

    pollRef.current = setInterval(async () => {
      try {
        await fetchProviders();
        const summary = providers[providerType as ProxyProviderType];
        if (summary && summary.healthyNodes > 0) {
          const firstNode = summary.nodes.find((n) => n.isHealthy && !n.isDisabled);
          setAuthStates((prev) => ({
            ...prev,
            [providerType]: {
              ...prev[providerType],
              status: 'connected',
              accountLabel: firstNode?.customName ?? PROXY_PROVIDER_LABELS[providerType as ProxyProviderType],
            },
          }));
          clearInterval(pollRef.current!);
          pollRef.current = null;
          // Auto-advance after a short pause
          setTimeout(() => advanceStep(), 800);
        }
      } catch {
        // ignore transient errors during polling
      }
    }, 2500);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authStates, providers]);

  const steps: WizardStep[] = ['welcome', ...WIZARD_PROVIDERS, 'done'];
  const currentIndex = steps.indexOf(currentStep);

  function advanceStep() {
    const next = steps[currentIndex + 1];
    if (next) setCurrentStep(next);
  }

  function goBack() {
    const prev = steps[currentIndex - 1];
    if (prev) setCurrentStep(prev);
  }

  async function handleLogin() {
    setLoginLoading(true);
    try {
      const ok = await loginToProxy(proxyPassword || proxyApiKey);
      if (ok) {
        setProxyOk(true);
        await fetchProviders();
        // Reflect existing connected providers
        setAuthStates((prev) => {
          const next = { ...prev };
          for (const pType of WIZARD_PROVIDERS) {
            const summary = providers[pType];
            if (summary && summary.healthyNodes > 0) {
              const node = summary.nodes.find((n) => n.isHealthy);
              next[pType] = {
                ...next[pType],
                status: 'connected',
                accountLabel: node?.customName ?? PROXY_PROVIDER_LABELS[pType],
              };
            }
          }
          return next;
        });
      }
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleStartOAuth(providerType: ProxyProviderType) {
    setAuthStates((prev) => ({ ...prev, [providerType]: { ...prev[providerType], status: 'generating', errorMessage: null } }));
    const url = await generateAuthUrl(providerType);
    if (!url) {
      setAuthStates((prev) => ({
        ...prev,
        [providerType]: { ...prev[providerType], status: 'error', errorMessage: 'Failed to get auth URL from proxy. Is the proxy running?' },
      }));
      return;
    }
    setAuthStates((prev) => ({ ...prev, [providerType]: { ...prev[providerType], status: 'waiting', authUrl: url } }));
    try {
      await invoke('open_browser', { url });
    } catch (e) {
      console.warn('open_browser failed:', e);
    }
  }

  async function handleAddApiKey(providerType: ProxyProviderType, fields: Record<string, string>) {
    try {
      await addProvider(providerType, fields);
      const summary = providers[providerType];
      const node = summary?.nodes?.slice(-1)[0];
      setAuthStates((prev) => ({
        ...prev,
        [providerType]: {
          status: 'connected',
          authUrl: null,
          errorMessage: null,
          accountLabel: node?.customName ?? fields['customName'] ?? PROXY_PROVIDER_LABELS[providerType],
        },
      }));
      setTimeout(() => advanceStep(), 600);
    } catch (err) {
      setAuthStates((prev) => ({
        ...prev,
        [providerType]: { ...prev[providerType], status: 'error', errorMessage: String(err) },
      }));
    }
  }

  const connectedCount = Object.values(authStates).filter((s) => s.status === 'connected').length;
  const isProviderStep = currentStep !== 'welcome' && currentStep !== 'done';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div
        className="relative flex flex-col rounded-xl border border-border shadow-2xl"
        style={{ width: 540, maxHeight: '88vh', background: 'var(--color-bg-panel)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="font-semibold text-text-primary">Zero-API-Key Setup</h2>
            <p className="text-xs text-text-dimmed mt-0.5">
              {currentStep === 'welcome'
                ? 'Powered by BlacklistedAIProxy'
                : currentStep === 'done'
                ? `${connectedCount} of ${WIZARD_PROVIDERS.length} providers connected`
                : `Step ${currentIndex} of ${WIZARD_PROVIDERS.length}: ${PROXY_PROVIDER_LABELS[currentStep as ProxyProviderType]}`}
            </p>
          </div>
          <button
            onClick={() => setSetupWizardOpen(false)}
            className="p-1 text-text-dimmed hover:text-text-primary transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Progress bar */}
        {isProviderStep && (
          <div className="flex px-6 pt-4 gap-1.5">
            {WIZARD_PROVIDERS.map((p, i) => {
              const s = authStates[p].status;
              const isCurrent = p === currentStep;
              const isDone = s === 'connected' || s === 'skipped' || i < WIZARD_PROVIDERS.indexOf(currentStep as ProxyProviderType);
              return (
                <div
                  key={p}
                  className="flex-1 h-1 rounded-full transition-all"
                  style={{
                    background: s === 'connected'
                      ? 'var(--color-success)'
                      : isCurrent
                      ? PROXY_PROVIDER_COLORS[p]
                      : isDone
                      ? 'var(--color-border)'
                      : 'var(--color-border)',
                    opacity: isDone || isCurrent ? 1 : 0.3,
                  }}
                />
              );
            })}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Welcome step */}
          {currentStep === 'welcome' && (
            <div className="space-y-5">
              <div className="flex items-start gap-3 p-4 rounded-xl border border-accent/30 bg-accent/5">
                <Lock size={20} className="text-accent mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-text-primary">No API keys required</p>
                  <p className="text-xs text-text-label mt-1 leading-relaxed">
                    SwarmForge routes all AI traffic through the local BlacklistedAIProxy, which
                    authenticates with providers via OAuth — just like their official apps do.
                    You get access to premium models for free, within each provider's own usage limits.
                  </p>
                </div>
              </div>

              {!proxyOk ? (
                <div className="space-y-3">
                  <div className="flex items-start gap-2 p-3 rounded-lg border border-yellow-800/40 bg-yellow-950/20">
                    <Warning size={14} className="text-yellow-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-yellow-400 leading-relaxed">
                      The BlacklistedAIProxy server isn't running or isn't reachable on port 3000.
                      Make sure you've run <code className="bg-black/30 px-1 rounded">npm install</code> and{' '}
                      <code className="bg-black/30 px-1 rounded">npm start</code> in the{' '}
                      <code className="bg-black/30 px-1 rounded">proxy/</code> directory, or let
                      SwarmForge auto-start it.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs text-text-label">Proxy admin password (default: changeme)</p>
                    <input
                      type="password"
                      className="w-full bg-bg-base border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                      placeholder="changeme"
                      value={proxyPassword}
                      onChange={(e) => setProxyPassword(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                    />
                    <button
                      onClick={handleLogin}
                      disabled={loginLoading}
                      className="w-full px-4 py-2 text-sm rounded bg-accent hover:opacity-90 text-white font-medium disabled:opacity-50 transition-opacity"
                    >
                      {loginLoading ? 'Connecting…' : 'Connect to Proxy'}
                    </button>
                    <button
                      onClick={() => checkProxyConnection().then(setProxyOk)}
                      className="w-full px-4 py-2 text-sm rounded border border-border text-text-label hover:text-text-primary hover:border-accent transition-colors"
                    >
                      Retry Connection
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-3 rounded-lg border border-success/30 bg-success/10">
                    <CheckCircle size={14} weight="fill" className="text-success shrink-0" />
                    <span className="text-xs text-success font-medium">Proxy is running and connected</span>
                  </div>
                  <p className="text-sm text-text-label">
                    This wizard will connect you to{' '}
                    <strong className="text-text-primary">{WIZARD_PROVIDERS.length} AI providers</strong>.
                    You can skip any provider and come back later from Settings.
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {WIZARD_PROVIDERS.slice(0, 6).map((p) => (
                      <div
                        key={p}
                        className="flex items-center gap-1.5 p-2 rounded-lg border border-border"
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ background: PROXY_PROVIDER_COLORS[p] }}
                        />
                        <span className="text-xs text-text-label truncate">
                          {PROXY_PROVIDER_LABELS[p].split(' ')[0]}
                        </span>
                        {authStates[p]?.status === 'connected' && (
                          <CheckCircle size={10} weight="fill" className="text-success ml-auto shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Provider steps */}
          {isProviderStep && (
            <ProviderStep
              providerType={currentStep as ProxyProviderType}
              authState={authStates[currentStep]}
              onStartOAuth={() => handleStartOAuth(currentStep as ProxyProviderType)}
              onAddApiKey={(fields) => handleAddApiKey(currentStep as ProxyProviderType, fields)}
              onSkip={() => {
                setAuthStates((prev) => ({
                  ...prev,
                  [currentStep]: { ...prev[currentStep as ProxyProviderType], status: 'skipped' },
                }));
                advanceStep();
              }}
            />
          )}

          {/* Done step */}
          {currentStep === 'done' && (
            <div className="space-y-4">
              <div className="text-center py-2">
                <CheckCircle size={40} weight="fill" className="text-success mx-auto mb-3" />
                <h3 className="font-semibold text-text-primary mb-1">
                  {connectedCount > 0 ? `${connectedCount} Provider${connectedCount > 1 ? 's' : ''} Connected!` : 'Setup Complete'}
                </h3>
                <p className="text-sm text-text-label">
                  {connectedCount > 0
                    ? 'All connected providers are now routed through the local proxy. You can manage them anytime from the Proxy Settings panel.'
                    : 'No providers were connected. You can set them up anytime from the Proxy Settings panel.'}
                </p>
              </div>
              <div className="space-y-1.5">
                {WIZARD_PROVIDERS.map((p) => {
                  const s = authStates[p];
                  return (
                    <div
                      key={p}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-border"
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ background: PROXY_PROVIDER_COLORS[p] }}
                      />
                      <span className="text-sm text-text-primary flex-1">{PROXY_PROVIDER_LABELS[p]}</span>
                      {s.status === 'connected' ? (
                        <span className="text-xs text-success font-medium flex items-center gap-1">
                          <CheckCircle size={11} weight="fill" /> Connected
                        </span>
                      ) : (
                        <span className="text-xs text-text-dimmed">Skipped</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border">
          <button
            onClick={goBack}
            disabled={currentIndex === 0}
            className="flex items-center gap-1 px-3 py-2 text-sm text-text-dimmed hover:text-text-primary disabled:opacity-0 transition-colors"
          >
            <ArrowLeft size={14} /> Back
          </button>

          {currentStep === 'done' ? (
            <button
              onClick={() => setSetupWizardOpen(false)}
              className="px-5 py-2 text-sm rounded bg-accent hover:opacity-90 text-white font-medium transition-opacity"
            >
              Start Building
            </button>
          ) : currentStep === 'welcome' ? (
            <button
              onClick={advanceStep}
              disabled={!proxyOk}
              className="flex items-center gap-1.5 px-5 py-2 text-sm rounded bg-accent hover:opacity-90 text-white font-medium disabled:opacity-40 transition-opacity"
            >
              Begin Setup <ArrowRight size={14} />
            </button>
          ) : (
            <button
              onClick={advanceStep}
              className="flex items-center gap-1.5 px-5 py-2 text-sm rounded bg-accent hover:opacity-90 text-white font-medium transition-opacity"
            >
              {authStates[currentStep]?.status === 'connected' ? 'Next' : 'Skip'}{' '}
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
