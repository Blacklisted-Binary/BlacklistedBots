import { MagicWand, Gear, ArrowClockwise, CheckCircle, Spinner } from '@phosphor-icons/react';
import { useSwarmStore } from '../../store/useSwarmStore';
import { useProxyStore } from '../../store/useProxyStore';
import {
  PROVIDERS,
  PROVIDER_LABELS,
  type Provider,
  PROXY_PORT,
  PROXY_PROVIDERS,
  PROXY_PROVIDER_LABELS,
  PROXY_PROVIDER_COLORS,
  type ProxyProviderType,
} from '../../types';

function ProviderRow({ provider }: { provider: Provider }) {
  const status = useSwarmStore((s) => s.proxyStatus[provider]);
  const setProxyStatus = useSwarmStore((s) => s.setProxyStatus);
  const dotColor =
    status === 'auth'
      ? 'var(--color-success)'
      : status === 'pending'
        ? 'var(--color-warning)'
        : 'var(--color-text-dimmed)';

  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
      <div className="flex items-center gap-3">
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ background: dotColor }}
        />
        <div>
          <p className="text-xs font-medium text-text-primary">{PROVIDER_LABELS[provider]}</p>
          <p className="text-xs text-text-dimmed capitalize">{status}</p>
        </div>
      </div>

      {status === 'auth' ? (
        <span className="text-xs text-success font-medium">✓ Authenticated</span>
      ) : (
        <button
          onClick={() => setProxyStatus(provider, 'pending')}
          className="text-xs px-3 py-1 rounded border border-border hover:border-accent hover:text-accent text-text-dimmed transition-colors"
        >
          {status === 'pending' ? 'Connecting…' : 'Login'}
        </button>
      )}
    </div>
  );
}

function ProxyProviderRow({ providerType }: { providerType: ProxyProviderType }) {
  const { providers } = useProxyStore();
  const setSetupWizardOpen = useSwarmStore((s) => s.setSetupWizardOpen);
  const summary = providers[providerType];
  const healthy = (summary?.healthyNodes ?? 0) > 0;
  const color = PROXY_PROVIDER_COLORS[providerType];

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-border/50">
      <div className="flex items-center gap-2">
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ background: healthy ? color : '#64748B' }}
        />
        <div>
          <p className="text-xs font-medium text-text-primary truncate max-w-[130px]">
            {PROXY_PROVIDER_LABELS[providerType]}
          </p>
          {healthy ? (
            <p className="text-xs text-success">{summary!.healthyNodes} node{summary!.healthyNodes !== 1 ? 's' : ''} active</p>
          ) : (
            <p className="text-xs text-text-dimmed">not configured</p>
          )}
        </div>
      </div>
      {healthy ? (
        <CheckCircle size={14} weight="fill" className="text-success shrink-0" />
      ) : (
        <button
          onClick={() => setSetupWizardOpen(true)}
          className="text-xs px-2 py-0.5 rounded border border-border hover:border-accent hover:text-accent text-text-dimmed transition-colors shrink-0"
        >
          Setup
        </button>
      )}
    </div>
  );
}

export default function ProxyStatus() {
  const { connectionStatus, fetchProviders, providers, providersLoading } = useProxyStore();
  const setSetupWizardOpen = useSwarmStore((s) => s.setSetupWizardOpen);
  const setProxySettingsOpen = useSwarmStore((s) => s.setProxySettingsOpen);

  const totalHealthy = PROXY_PROVIDERS.reduce(
    (sum, p) => sum + (providers[p]?.healthyNodes ?? 0),
    0,
  );
  const totalNodes = PROXY_PROVIDERS.reduce(
    (sum, p) => sum + (providers[p]?.totalNodes ?? 0),
    0,
  );

  return (
    <div>
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-xs font-semibold text-text-label uppercase tracking-wider">
            BlacklistedAIProxy
          </h3>
          <div className="flex items-center gap-1">
            <button
              onClick={() => fetchProviders()}
              disabled={providersLoading}
              title="Refresh"
              className="p-1 text-text-dimmed hover:text-text-primary transition-colors"
            >
              {providersLoading ? <Spinner size={12} className="animate-spin" /> : <ArrowClockwise size={12} />}
            </button>
            <button
              onClick={() => setProxySettingsOpen(true)}
              title="Proxy Settings"
              className="p-1 text-text-dimmed hover:text-accent transition-colors"
            >
              <Gear size={12} />
            </button>
          </div>
        </div>

        {/* Connection status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full"
              style={{
                background:
                  connectionStatus === 'connected'
                    ? 'var(--color-success)'
                    : connectionStatus === 'connecting'
                    ? '#F59E0B'
                    : 'var(--color-error)',
              }}
            />
            <span className="text-xs text-text-dimmed capitalize">{connectionStatus} · port {PROXY_PORT}</span>
          </div>
          {totalNodes > 0 && (
            <span className="text-xs text-text-dimmed">
              {totalHealthy}/{totalNodes} nodes healthy
            </span>
          )}
        </div>
      </div>

      {/* Zero-Key providers */}
      <div className="border-b border-border">
        <p className="px-4 py-1.5 text-xs font-semibold text-text-dimmed uppercase tracking-wider">
          OAuth Providers
        </p>
        {connectionStatus === 'offline' ? (
          <div className="px-4 py-3">
            <p className="text-xs text-text-dimmed mb-2 leading-relaxed">
              Proxy not running. Start it or run the Setup Wizard.
            </p>
            <button
              onClick={() => setSetupWizardOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border border-border hover:border-accent hover:text-accent text-text-dimmed transition-colors"
            >
              <MagicWand size={11} /> Open Setup Wizard
            </button>
          </div>
        ) : (
          PROXY_PROVIDERS.map((p) => (
            <ProxyProviderRow key={p} providerType={p} />
          ))
        )}
      </div>

      {/* Legacy 4-provider rows */}
      <div>
        <p className="px-4 py-1.5 text-xs font-semibold text-text-dimmed uppercase tracking-wider">
          Canvas Providers
        </p>
        {PROVIDERS.map((p) => (
          <ProviderRow key={p} provider={p} />
        ))}
      </div>

      {/* Footer actions */}
      <div className="px-4 py-3 border-t border-border flex gap-2">
        <button
          onClick={() => setSetupWizardOpen(true)}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs rounded border border-border text-text-dimmed hover:border-accent hover:text-accent transition-colors"
        >
          <MagicWand size={11} /> Setup Wizard
        </button>
        <button
          onClick={() => setProxySettingsOpen(true)}
          className="flex items-center justify-center px-3 py-1.5 text-xs rounded border border-border text-text-dimmed hover:border-accent hover:text-accent transition-colors"
          title="Proxy Settings"
        >
          <Gear size={11} />
        </button>
      </div>
    </div>
  );
}

