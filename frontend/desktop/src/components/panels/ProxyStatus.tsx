import { useSwarmStore } from '../../store/useSwarmStore';
import { PROVIDERS, PROVIDER_LABELS, type Provider } from '../../types';

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
    <div className="flex items-center justify-between px-4 py-3 border-b border-border">
      <div className="flex items-center gap-3">
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0"
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
          className="text-xs px-3 py-1.5 rounded border border-border hover:border-accent hover:text-accent text-text-dimmed transition-colors"
        >
          {status === 'pending' ? 'Connecting…' : 'Login'}
        </button>
      )}
    </div>
  );
}

export default function ProxyStatus() {
  return (
    <div>
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-xs font-semibold text-text-label uppercase tracking-wider">
          Provider Auth Status
        </h3>
        <p className="text-xs text-text-dimmed mt-0.5">
          Free proxy routes via AIClient-2-API on port 3141
        </p>
      </div>
      {PROVIDERS.map((p) => (
        <ProviderRow key={p} provider={p} />
      ))}
    </div>
  );
}
