import { useSwarmStore } from '../../store/useSwarmStore';
import { PROVIDER_COLORS } from '../../types';
import type { TraceEvent } from '../../types';

function TraceRow({ event }: { event: TraceEvent }) {
  const color = PROVIDER_COLORS[event.provider] ?? '#94A3B8';
  const timeStr = new Date(event.timestamp).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const typeIcon =
    event.type === 'complete'
      ? '✓'
      : event.type === 'error'
        ? '✗'
        : event.type === 'tool'
          ? '⚙'
          : '→';

  return (
    <div className="flex items-start gap-2 px-3 py-2 border-b border-border hover:bg-bg-hover text-xs">
      <span className="text-text-dimmed shrink-0 tabular-nums">{timeStr}</span>
      <span className="shrink-0 font-medium" style={{ color }}>
        {event.agentName.length > 8 ? event.agentName.slice(0, 8) : event.agentName}
      </span>
      <span
        className={
          event.type === 'complete'
            ? 'text-success'
            : event.type === 'error'
              ? 'text-error'
              : event.type === 'tool'
                ? 'text-accent'
                : 'text-text-dimmed'
        }
      >
        {typeIcon}
      </span>
      <span className="text-text-primary truncate flex-1">{event.text.slice(0, 60)}</span>
    </div>
  );
}

export default function ExecutionTrace() {
  const { traceEvents, clearTrace } = useSwarmStore();

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border shrink-0">
        <span className="text-xs font-semibold text-text-label uppercase tracking-wider">
          Execution Trace
        </span>
        {traceEvents.length > 0 && (
          <button
            onClick={clearTrace}
            className="text-xs text-text-dimmed hover:text-error transition-colors"
          >
            Clear
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto">
        {traceEvents.length === 0 && (
          <p className="px-4 py-3 text-xs text-text-dimmed italic">
            No events yet. Run a task to see the execution trace.
          </p>
        )}
        {traceEvents.map((ev, i) => (
          <TraceRow key={i} event={ev} />
        ))}
      </div>
    </div>
  );
}
