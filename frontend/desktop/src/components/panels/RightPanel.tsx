import { useSwarmStore } from '../../store/useSwarmStore';
import type { BackendSession } from '../../hooks/useBackendSession';
import type { RightPanelTab } from '../../types';
import Inspector from './Inspector';
import ProxyStatus from './ProxyStatus';
import ExecutionTrace from './ExecutionTrace';

interface Props {
  session: BackendSession;
}

const TABS: { id: RightPanelTab; label: string }[] = [
  { id: 'inspector', label: 'Inspector' },
  { id: 'proxy', label: 'Proxy' },
  { id: 'trace', label: 'Trace' },
  { id: 'output', label: 'Output' },
];

export default function RightPanel({ session }: Props) {
  const { rightPanelTab, setRightPanelTab } = useSwarmStore();

  return (
    <aside
      className="shrink-0 flex flex-col border-l border-border overflow-hidden"
      style={{ width: 300, background: 'var(--color-bg-panel)' }}
    >
      {/* Tab bar */}
      <div className="flex border-b border-border shrink-0">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setRightPanelTab(t.id)}
            className={[
              'flex-1 py-2.5 text-xs font-medium border-b-2 transition-colors',
              rightPanelTab === t.id
                ? 'border-accent text-accent'
                : 'border-transparent text-text-dimmed hover:text-text-label',
            ].join(' ')}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {rightPanelTab === 'inspector' && <Inspector session={session} />}
        {rightPanelTab === 'proxy' && <ProxyStatus />}
        {rightPanelTab === 'trace' && <ExecutionTrace />}
        {rightPanelTab === 'output' && <OutputPanel session={session} />}
      </div>
    </aside>
  );
}

function OutputPanel({ session }: { session: BackendSession }) {
  return (
    <div
      className="p-3 space-y-2 overflow-y-auto h-full"
      style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}
    >
      {session.transcript.length === 0 && (
        <p className="text-text-dimmed italic text-xs">No output yet.</p>
      )}
      {session.transcript.map((item, i) => (
        <div
          key={i}
          className={[
            'leading-relaxed whitespace-pre-wrap break-words',
            item.role === 'assistant' ? 'text-text-primary' : '',
            item.role === 'user' ? 'text-cyan' : '',
            item.role === 'system' ? 'text-warning' : '',
            item.role === 'tool' ? 'text-accent' : '',
            item.role === 'tool_result' ? 'text-text-dimmed' : '',
            item.role === 'log' ? 'text-text-dimmed text-xs' : '',
          ].join(' ')}
        >
          {item.role !== 'log' && (
            <span className="text-text-dimmed mr-2">[{item.role}]</span>
          )}
          {item.text}
        </div>
      ))}
    </div>
  );
}
