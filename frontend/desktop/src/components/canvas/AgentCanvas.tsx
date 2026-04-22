import { GitBranch, ChatCircle } from '@phosphor-icons/react';
import { useSwarmStore } from '../../store/useSwarmStore';
import type { BackendSession } from '../../hooks/useBackendSession';
import NodeGraph from './NodeGraph';
import LiveChat from './LiveChat';
import ConductorBar from './ConductorBar';

interface Props {
  session: BackendSession;
}

export default function AgentCanvas({ session }: Props) {
  const { canvasMode, setCanvasMode } = useSwarmStore();

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Tab bar */}
      <div
        className="flex items-center gap-0 border-b border-border shrink-0"
        style={{ background: 'var(--color-bg-panel)' }}
      >
        <TabButton
          icon={<GitBranch size={14} />}
          label="Node Graph"
          active={canvasMode === 'graph'}
          onClick={() => setCanvasMode('graph')}
        />
        <TabButton
          icon={<ChatCircle size={14} />}
          label="Live Chat"
          active={canvasMode === 'chat'}
          onClick={() => setCanvasMode('chat')}
        />
      </div>

      {/* Canvas body */}
      <div className="flex-1 overflow-hidden relative">
        {canvasMode === 'graph' ? (
          <NodeGraph session={session} />
        ) : (
          <LiveChat session={session} />
        )}
      </div>

      {/* Conductor bar always visible */}
      <ConductorBar session={session} />
    </div>
  );
}

function TabButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors',
        active
          ? 'border-accent text-accent'
          : 'border-transparent text-text-dimmed hover:text-text-label',
      ].join(' ')}
    >
      {icon}
      {label}
    </button>
  );
}
