import { useEffect, useState } from 'react';
import { Circle } from '@phosphor-icons/react';
import type { BackendSession } from '../hooks/useBackendSession';
import { useSwarmStore } from '../store/useSwarmStore';
import { PROXY_PORT } from '../types';

interface Props {
  session: BackendSession;
}

function useElapsed(startedAt: number | null) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (startedAt == null) return;
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  return elapsed;
}

function formatElapsed(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}m ${sec.toString().padStart(2, '0')}s`;
}

export default function Footer({ session }: Props) {
  const { startedAt, totalTokens } = useSwarmStore();
  const elapsed = useElapsed(startedAt);
  const agentCount = session.swarmTeammates.length;
  const tokenLabel = totalTokens >= 1000 ? `${(totalTokens / 1000).toFixed(0)}k` : String(totalTokens);

  return (
    <footer
      className="shrink-0 flex items-center gap-4 px-4 border-t border-border text-xs text-text-dimmed"
      style={{ height: 32, background: 'var(--color-bg-panel)' }}
    >
      <div className="flex items-center gap-1.5">
        <Circle
          size={8}
          weight="fill"
          color={session.ready ? 'var(--color-success)' : 'var(--color-text-dimmed)'}
          className={!session.ready ? 'status-pulse' : ''}
        />
        <span>Backend: {session.ready ? 'connected' : 'connecting…'}</span>
      </div>

      <span className="text-border">│</span>
      <span>Port: {PROXY_PORT}</span>

      <span className="text-border">│</span>
      <span>{agentCount} agent{agentCount !== 1 ? 's' : ''}</span>

      {totalTokens > 0 && (
        <>
          <span className="text-border">│</span>
          <span>{tokenLabel} tokens</span>
        </>
      )}

      {startedAt != null && (
        <>
          <span className="text-border">│</span>
          <span>{formatElapsed(elapsed)} elapsed</span>
        </>
      )}

      <div className="flex-1" />

      {session.busy && (
        <span className="text-accent text-xs animate-pulse">processing…</span>
      )}

      {Object.values(session.status).length > 0 &&
        session.status['permission_mode'] === 'plan' && (
          <span className="px-1.5 py-0.5 rounded text-xs bg-accent/20 text-accent">PLAN</span>
        )}
    </footer>
  );
}
