import { CaretDown, CaretRight, Plus, Robot, UsersThree, Cpu } from '@phosphor-icons/react';
import { useSwarmStore } from '../store/useSwarmStore';
import type { BackendSession } from '../hooks/useBackendSession';
import { PROVIDERS, PROVIDER_LABELS, PROVIDER_COLORS, type Provider } from '../types';

interface Props {
  session: BackendSession;
}

function SectionHeader({
  label,
  sectionKey,
  onAdd,
}: {
  label: string;
  sectionKey: string;
  onAdd?: () => void;
}) {
  const open = useSwarmStore((s) => s.railSections[sectionKey]);
  const toggle = useSwarmStore((s) => s.toggleRailSection);
  return (
    <div
      className="flex items-center justify-between px-3 py-1.5 cursor-pointer select-none hover:bg-bg-hover group"
      onClick={() => toggle(sectionKey)}
    >
      <div className="flex items-center gap-1.5 text-text-label text-xs font-semibold tracking-wider uppercase">
        {open ? <CaretDown size={10} /> : <CaretRight size={10} />}
        {label}
      </div>
      {onAdd && (
        <button
          className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:text-accent text-text-dimmed"
          onClick={(e) => {
            e.stopPropagation();
            onAdd();
          }}
          title={`New ${label}`}
        >
          <Plus size={12} />
        </button>
      )}
    </div>
  );
}

function ProxyRow({ provider }: { provider: Provider }) {
  const status = useSwarmStore((s) => s.proxyStatus[provider]);
  const color =
    status === 'auth'
      ? PROVIDER_COLORS[provider]
      : status === 'pending'
        ? '#FBBF24'
        : '#64748B';

  return (
    <div className="flex items-center justify-between px-4 py-1 text-xs hover:bg-bg-hover">
      <div className="flex items-center gap-2" style={{ color }}>
        <span
          className={status === 'pending' ? 'status-pulse' : ''}
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: color,
            display: 'inline-block',
            flexShrink: 0,
          }}
        />
        {PROVIDER_LABELS[provider]}
      </div>
      {status !== 'auth' && (
        <button
          className="text-xs px-2 py-0.5 rounded border border-border hover:border-accent hover:text-accent text-text-dimmed transition-colors"
          title={`Login to ${PROVIDER_LABELS[provider]}`}
        >
          Login
        </button>
      )}
      {status === 'auth' && <span className="text-success text-xs">auth'd</span>}
    </div>
  );
}

export default function LeftRail({ session }: Props) {
  const { agents, crews, railSections, setAgentBuilderOpen, setCrewBuilderOpen } =
    useSwarmStore();
  const { swarmTeammates } = session;

  // Merge live teammates with defined agents for the agent list
  const liveNames = new Set(swarmTeammates.map((t) => t.name));
  const allAgentNames = [
    ...swarmTeammates.map((t) => t.name),
    ...agents.map((a) => a.name).filter((n) => !liveNames.has(n)),
  ];

  const getStatusColor = (name: string) => {
    const tm = swarmTeammates.find((t) => t.name === name);
    if (!tm) return '#64748B';
    return tm.status === 'running'
      ? '#34D399'
      : tm.status === 'done'
        ? '#6366F1'
        : tm.status === 'error'
          ? '#F87171'
          : '#64748B';
  };

  const getProviderColor = (name: string): string => {
    const p = PROVIDERS.find((pr) => name.toLowerCase().includes(pr));
    return p ? PROVIDER_COLORS[p] : '#94A3B8';
  };

  return (
    <aside
      className="shrink-0 flex flex-col overflow-y-auto border-r border-border"
      style={{ width: 220, background: 'var(--color-bg-panel)' }}
    >
      {/* ── AGENTS ──────────────────────────────────────────────── */}
      <SectionHeader
        label="Agents"
        sectionKey="agents"
        onAdd={() => setAgentBuilderOpen(true)}
      />
      {railSections['agents'] && (
        <div className="pb-1">
          {allAgentNames.length === 0 && (
            <p className="px-4 py-1 text-xs text-text-dimmed italic">No agents yet</p>
          )}
          {allAgentNames.map((name) => (
            <div
              key={name}
              className="flex items-center gap-2 px-4 py-1 text-xs hover:bg-bg-hover cursor-pointer"
            >
              <Robot size={12} color={getProviderColor(name)} />
              <span className="flex-1 truncate text-text-primary">{name}</span>
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: getStatusColor(name) }}
              />
            </div>
          ))}
        </div>
      )}

      {/* ── TEAMS ───────────────────────────────────────────────── */}
      <SectionHeader label="Teams" sectionKey="teams" />
      {railSections['teams'] && (
        <div className="pb-1">
          <p className="px-4 py-1 text-xs text-text-dimmed italic">No teams loaded</p>
        </div>
      )}

      {/* ── CREWS ───────────────────────────────────────────────── */}
      <SectionHeader
        label="Crews"
        sectionKey="crews"
        onAdd={() => setCrewBuilderOpen(true)}
      />
      {railSections['crews'] && (
        <div className="pb-1">
          {crews.length === 0 && (
            <p className="px-4 py-1 text-xs text-text-dimmed italic">No crews saved</p>
          )}
          {crews.map((crew) => (
            <div
              key={crew.id}
              className="flex items-center gap-2 px-4 py-1 text-xs hover:bg-bg-hover cursor-pointer"
            >
              <UsersThree size={12} color="var(--color-accent)" />
              <span className="flex-1 truncate text-text-primary">{crew.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── PROXY ───────────────────────────────────────────────── */}
      <SectionHeader label="Proxy" sectionKey="proxy" />
      {railSections['proxy'] && (
        <div className="pb-1">
          {PROVIDERS.map((p) => (
            <ProxyRow key={p} provider={p} />
          ))}
        </div>
      )}

      <div className="flex-1" />

      {/* MCP Servers count */}
      {session.mcpServers.length > 0 && (
        <div className="px-3 py-2 border-t border-border">
          <div className="flex items-center gap-1.5 text-xs text-text-dimmed">
            <Cpu size={12} />
            <span>{session.mcpServers.length} MCP server{session.mcpServers.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      )}
    </aside>
  );
}
