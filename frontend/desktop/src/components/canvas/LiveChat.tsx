import { useEffect, useRef } from 'react';
import { useSwarmStore } from '../../store/useSwarmStore';
import type { BackendSession } from '../../hooks/useBackendSession';
import { PROVIDERS, PROVIDER_LABELS, PROVIDER_COLORS, type Provider } from '../../types';
import { Copy } from '@phosphor-icons/react';

interface Props {
  session: BackendSession;
}

interface AgentColumnProps {
  provider: Provider;
  session: BackendSession;
}

function AgentColumn({ provider, session }: AgentColumnProps) {
  const agentOutputs = useSwarmStore((s) => s.agentOutputs);
  const swarmNotifications = session.swarmNotifications;
  const swarmTeammates = session.swarmTeammates;

  // Find the teammate for this provider
  const teammate = swarmTeammates.find((t) => t.name.toLowerCase().includes(provider));

  // Gather messages from notifications from this provider
  const messages = swarmNotifications.filter((n) =>
    n.from.toLowerCase().includes(provider),
  );

  // Per-agent output chunks
  const agentId = teammate?.name ?? provider;
  const chunks = agentOutputs[agentId] ?? [];

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, chunks.length]);

  const color = PROVIDER_COLORS[provider];
  const status = teammate?.status ?? 'idle';
  const statusColor =
    status === 'running'
      ? 'var(--color-success)'
      : status === 'error'
        ? 'var(--color-error)'
        : 'var(--color-text-dimmed)';

  const handleCopy = () => {
    const text = [
      ...messages.map((m) => m.message),
      ...chunks,
    ].join('\n');
    navigator.clipboard.writeText(text).catch(() => {});
  };

  return (
    <div
      className="flex flex-col flex-1 min-w-0 overflow-hidden border-r border-border last:border-r-0"
      style={{ borderLeftWidth: 2, borderLeftColor: color, borderLeftStyle: 'solid' }}
    >
      {/* Column header */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0"
        style={{ background: 'var(--color-bg-panel)' }}
      >
        <div className="flex items-center gap-2">
          <span
            className={status === 'running' ? 'status-pulse' : ''}
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: statusColor,
              display: 'inline-block',
            }}
          />
          <span className="text-xs font-semibold" style={{ color }}>
            {PROVIDER_LABELS[provider]}
          </span>
          {teammate?.task && (
            <span className="text-xs text-text-dimmed truncate max-w-[120px]" title={teammate.task}>
              {teammate.task.slice(0, 30)}…
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            className="p-1 text-text-dimmed hover:text-text-primary transition-colors"
            title="Copy output"
            onClick={handleCopy}
          >
            <Copy size={12} />
          </button>
        </div>
      </div>

      {/* Scrollable output */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 space-y-2"
        style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
      >
        {messages.length === 0 && chunks.length === 0 && (
          <p className="text-text-dimmed italic text-xs">
            {status === 'idle' ? 'Waiting for task…' : `${PROVIDER_LABELS[provider]} starting…`}
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className="text-text-primary leading-relaxed whitespace-pre-wrap break-words">
            {m.message}
          </div>
        ))}
        {chunks.map((chunk, i) => (
          <span key={`chunk-${i}`} className="text-cyan break-words">
            {chunk}
          </span>
        ))}
        {/* Live buffer indicator */}
        {status === 'running' && (
          <span className="inline-block w-2 h-4 bg-accent animate-pulse" />
        )}
      </div>
    </div>
  );
}

export default function LiveChat({ session }: Props) {
  return (
    <div className="flex h-full">
      {PROVIDERS.map((provider) => (
        <AgentColumn key={provider} provider={provider} session={session} />
      ))}
    </div>
  );
}
