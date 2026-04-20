import { Lightning, Gear } from '@phosphor-icons/react';
import { useSwarmStore } from '../store/useSwarmStore';
import { useProxyStore } from '../store/useProxyStore';
import type { BackendSession } from '../hooks/useBackendSession';
import { PROVIDERS, PROVIDER_LABELS, PROVIDER_COLORS, type Provider, PROXY_PORT } from '../types';

interface Props {
  session: BackendSession;
}

function AgentPill({ provider, streaming }: { provider: Provider; streaming: boolean }) {
  const proxyStatus = useSwarmStore((s) => s.proxyStatus[provider]);
  const color = proxyStatus === 'auth' ? PROVIDER_COLORS[provider] : '#64748B';
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border border-border"
      style={{ backgroundColor: `${color}1A`, color }}
      title={`${PROVIDER_LABELS[provider]}: ${proxyStatus}`}
    >
      <span
        className={proxyStatus === 'auth' && streaming ? 'status-pulse' : ''}
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: color,
          display: 'inline-block',
        }}
      />
      {PROVIDER_LABELS[provider]}
    </span>
  );
}

export default function Header({ session }: Props) {
  const totalTokens = useSwarmStore((s) => s.totalTokens);
  const setProxySettingsOpen = useSwarmStore((s) => s.setProxySettingsOpen);
  const connectionStatus = useProxyStore((s) => s.connectionStatus);
  const swarmTeammates = session.swarmTeammates;
  const activeCount = swarmTeammates.filter((t) => t.status === 'running').length;
  const streamingProviders = new Set(
    swarmTeammates
      .filter((t) => t.status === 'running')
      .map((t) => PROVIDERS.find((p) => t.name.toLowerCase().includes(p)))
      .filter(Boolean) as Provider[],
  );

  const tokenLabel =
    totalTokens >= 1000 ? `${(totalTokens / 1000).toFixed(0)}k` : String(totalTokens);

  const proxyDot =
    connectionStatus === 'connected'
      ? { color: 'var(--color-success)', title: 'Proxy connected' }
      : connectionStatus === 'connecting'
      ? { color: '#F59E0B', title: 'Proxy connecting…' }
      : { color: 'var(--color-error)', title: 'Proxy offline' };

  return (
    <header
      className="flex items-center justify-between px-4 border-b border-border shrink-0"
      style={{ height: 48, background: 'var(--color-bg-panel)' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2">
        <Lightning size={20} weight="fill" color="var(--color-accent)" />
        <span className="font-semibold text-text-primary tracking-tight">SwarmForge</span>

        {/* Status sub-line */}
        <span className="ml-4 text-xs text-text-dimmed hidden sm:inline">
          {activeCount > 0
            ? `${activeCount} agent${activeCount > 1 ? 's' : ''} active`
            : session.ready
              ? 'ready'
              : 'connecting…'}
          {' · '}Port {PROXY_PORT}
          {totalTokens > 0 && ` · ${tokenLabel} tokens`}
        </span>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Agent pills */}
        {PROVIDERS.map((p) => (
          <AgentPill key={p} provider={p} streaming={streamingProviders.has(p)} />
        ))}

        {/* Proxy status dot + settings button */}
        <button
          onClick={() => setProxySettingsOpen(true)}
          title={proxyDot.title}
          className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-white/5 transition-colors text-text-dimmed hover:text-text-primary"
        >
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: proxyDot.color }}
          />
          <Gear size={15} />
        </button>
      </div>
    </header>
  );
}

