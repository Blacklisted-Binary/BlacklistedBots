import { useSwarmStore } from '../../store/useSwarmStore';
import type { BackendSession } from '../../hooks/useBackendSession';
import { PROVIDERS, PROVIDER_LABELS, PROVIDER_COLORS, PROXY_PORT } from '../../types';

interface Props {
  session: BackendSession;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-text-label">{label}</span>
      <span className="text-xs text-text-primary font-medium">{value}</span>
    </div>
  );
}

export default function Inspector({ session }: Props) {
  const { selectedAgentId, agents } = useSwarmStore();

  const agent = agents.find((a) => a.id === selectedAgentId);
  const teammate = session.swarmTeammates.find(
    (t) => t.name === selectedAgentId || t.name === agent?.name,
  );

  if (!selectedAgentId && !teammate) {
    return (
      <div className="p-4 text-xs text-text-dimmed italic">
        Click an agent node or select an agent from the left rail to inspect it.
      </div>
    );
  }

  const name = agent?.name ?? selectedAgentId ?? '';
  const provider =
    agent?.provider ?? PROVIDERS.find((p) => name.toLowerCase().includes(p)) ?? 'gemini';
  const model = agent?.model ?? '—';
  const status = teammate?.status ?? agent?.status ?? 'idle';
  const tokens = agent?.tokens ?? 0;
  const turns = agent?.turns ?? 0;
  const maxTurns = agent?.maxTurns ?? 200;
  const task = teammate?.task ?? agent?.task ?? '—';
  const color = PROVIDER_COLORS[provider];

  const statusColor =
    status === 'running'
      ? 'var(--color-success)'
      : status === 'error'
        ? 'var(--color-error)'
        : status === 'done'
          ? 'var(--color-accent)'
          : 'var(--color-text-dimmed)';

  return (
    <div className="p-4 space-y-4">
      {/* Agent identity */}
      <div className="flex items-center gap-2">
        <span
          className="w-3 h-3 rounded-full shrink-0"
          style={{ background: color }}
        />
        <span className="font-semibold text-text-primary text-sm">{name}</span>
      </div>

      <div className="space-y-3">
        <Field label="Provider" value={PROVIDER_LABELS[provider]} />
        <Field label="Model" value={model || 'default'} />
        <Field
          label="Proxy Route"
          value={`:${PROXY_PORT}/${provider}`}
        />
        <Field
          label="Status"
          value={
            <span className="flex items-center gap-1.5">
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
              {status}
            </span>
          }
        />
        {tokens > 0 && <Field label="Tokens" value={tokens.toLocaleString()} />}
        <Field
          label="Turns"
          value={
            <span>
              {turns} / {maxTurns}
            </span>
          }
        />
        {task && task !== '—' && (
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-text-label">Current task</span>
            <span
              className="text-xs text-text-primary bg-bg-base rounded p-2 leading-relaxed border border-border"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {task}
            </span>
          </div>
        )}
      </div>

      {/* System prompt (if agent is defined) */}
      {agent?.systemPrompt && (
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-text-label">System prompt</span>
          <textarea
            readOnly
            value={agent.systemPrompt}
            rows={5}
            className="text-xs text-text-dimmed bg-bg-base rounded p-2 border border-border resize-none focus:outline-none"
            style={{ fontFamily: 'var(--font-mono)' }}
          />
        </div>
      )}
    </div>
  );
}
