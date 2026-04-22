import { useState, useCallback } from 'react';
import { Play, Pause, Stop } from '@phosphor-icons/react';
import { useSwarmStore } from '../../store/useSwarmStore';
import type { BackendSession } from '../../hooks/useBackendSession';
import { PROVIDERS, PROVIDER_LABELS, PROVIDER_COLORS, type Provider, type ConductorStrategy } from '../../types';

interface Props {
  session: BackendSession;
}

const STRATEGIES: { value: ConductorStrategy; label: string }[] = [
  { value: 'independent', label: 'Independent' },
  { value: 'chain', label: 'Chain' },
  { value: 'debate', label: 'Debate' },
];

export default function ConductorBar({ session }: Props) {
  const {
    conductorTask,
    setConductorTask,
    conductorStrategy,
    setConductorStrategy,
    selectedProviders,
    toggleProvider,
  } = useSwarmStore();

  const [isRunning, setIsRunning] = useState(false);

  const handleRun = useCallback(() => {
    if (!conductorTask.trim() || !session.ready) return;

    setIsRunning(true);
    session.setBusy(true);

    // Send one request per selected provider
    for (const provider of selectedProviders) {
      session.sendRequest({
        type: 'submit_line',
        line: conductorTask,
        agent: provider,
        strategy: conductorStrategy,
      });
    }
  }, [conductorTask, session, selectedProviders, conductorStrategy]);

  const handleStop = useCallback(() => {
    session.sendRequest({ type: 'shutdown' });
    setIsRunning(false);
    session.setBusy(false);
  }, [session]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleRun();
    }
  };

  return (
    <div
      className="shrink-0 border-t border-border p-3 space-y-2"
      style={{ background: 'var(--color-bg-panel)' }}
    >
      {/* Provider selector + strategy picker */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          {PROVIDERS.map((p) => (
            <ProviderToggle
              key={p}
              provider={p}
              selected={selectedProviders.has(p)}
              onToggle={() => toggleProvider(p)}
            />
          ))}
        </div>

        <div className="flex items-center gap-1 ml-auto">
          <span className="text-xs text-text-dimmed">Strategy:</span>
          <div className="flex rounded overflow-hidden border border-border">
            {STRATEGIES.map((s) => (
              <button
                key={s.value}
                onClick={() => setConductorStrategy(s.value)}
                className={[
                  'px-2.5 py-1 text-xs transition-colors',
                  conductorStrategy === s.value
                    ? 'bg-accent text-white'
                    : 'text-text-dimmed hover:text-text-primary hover:bg-bg-hover',
                ].join(' ')}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Task input + action buttons */}
      <div className="flex gap-2 items-end">
        <textarea
          value={conductorTask}
          onChange={(e) => setConductorTask(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Send this task to all active agents… (⌘↵ to run)"
          rows={2}
          disabled={session.busy}
          className={[
            'flex-1 resize-none rounded border border-border bg-bg-base text-text-primary text-sm px-3 py-2',
            'placeholder:text-text-dimmed focus:outline-none focus:border-accent transition-colors',
            session.busy ? 'opacity-50 cursor-not-allowed' : '',
          ].join(' ')}
          style={{ fontFamily: 'var(--font-ui)' }}
        />

        <div className="flex flex-col gap-1.5">
          <button
            onClick={handleRun}
            disabled={!conductorTask.trim() || session.busy || !session.ready}
            className={[
              'flex items-center gap-1.5 px-4 py-2 rounded text-sm font-medium transition-colors',
              !conductorTask.trim() || session.busy || !session.ready
                ? 'bg-border text-text-dimmed cursor-not-allowed'
                : 'bg-accent hover:bg-accent-dim text-white',
            ].join(' ')}
          >
            <Play size={14} weight="fill" />
            Run All
          </button>

          <div className="flex gap-1">
            <button
              onClick={() => session.sendRequest({ type: 'pause' })}
              disabled={!session.busy}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded border border-border text-xs text-text-dimmed hover:text-warning hover:border-warning disabled:opacity-40 transition-colors"
              title="Pause all agents"
            >
              <Pause size={12} />
            </button>
            <button
              onClick={handleStop}
              disabled={!session.busy && !isRunning}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded border border-border text-xs text-text-dimmed hover:text-error hover:border-error disabled:opacity-40 transition-colors"
              title="Stop all agents"
            >
              <Stop size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProviderToggle({
  provider,
  selected,
  onToggle,
}: {
  provider: Provider;
  selected: boolean;
  onToggle: () => void;
}) {
  const color = PROVIDER_COLORS[provider];
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border transition-colors"
      style={{
        borderColor: selected ? color : 'var(--color-border)',
        background: selected ? `${color}22` : 'transparent',
        color: selected ? color : 'var(--color-text-dimmed)',
      }}
      title={`${selected ? 'Deselect' : 'Select'} ${PROVIDER_LABELS[provider]}`}
    >
      <span
        className="w-2 h-2 rounded-full"
        style={{ background: selected ? color : 'var(--color-text-dimmed)' }}
      />
      {PROVIDER_LABELS[provider]}
    </button>
  );
}
