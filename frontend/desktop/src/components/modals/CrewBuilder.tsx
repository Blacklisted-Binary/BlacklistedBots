import { useState } from 'react';
import { X } from '@phosphor-icons/react';
import { useSwarmStore } from '../../store/useSwarmStore';
import type { CrewDef } from '../../types';

type Topology = CrewDef['topology'];

const TOPOLOGIES: { value: Topology; label: string; description: string }[] = [
  {
    value: 'sequential',
    label: 'Sequential Chain',
    description: 'Agents run one after another, each building on the previous output.',
  },
  {
    value: 'parallel',
    label: 'Parallel',
    description: 'All agents run simultaneously on the same task.',
  },
  {
    value: 'hierarchical',
    label: 'Hierarchical',
    description: 'One lead agent delegates subtasks to worker agents.',
  },
  {
    value: 'debate',
    label: 'Debate',
    description: 'Agents critique each other in round-robin until consensus is reached.',
  },
];

export default function CrewBuilder() {
  const { agents, addCrew, setCrewBuilderOpen } = useSwarmStore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [topology, setTopology] = useState<Topology>('parallel');
  const [selectedAgentIds, setSelectedAgentIds] = useState<Set<string>>(new Set());

  const toggleAgent = (id: string) =>
    setSelectedAgentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleCreate = () => {
    if (!name.trim()) return;
    const crew: CrewDef = {
      id: `crew-${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      topology,
      agentIds: [...selectedAgentIds],
    };
    addCrew(crew);
    setCrewBuilderOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className="relative flex flex-col rounded-xl border border-border shadow-2xl"
        style={{ width: 520, maxHeight: '85vh', background: 'var(--color-bg-panel)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="font-semibold text-text-primary">New Crew</h2>
            <p className="text-xs text-text-dimmed mt-0.5">
              Group agents into a named crew with a shared topology.
            </p>
          </div>
          <button
            onClick={() => setCrewBuilderOpen(false)}
            className="p-1 text-text-dimmed hover:text-text-primary transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Name + description */}
          <div className="space-y-3">
            <div>
              <label className="text-xs text-text-label block mb-1.5">Crew name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. research-crew"
                className="w-full bg-bg-base border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent placeholder:text-text-dimmed"
              />
            </div>
            <div>
              <label className="text-xs text-text-label block mb-1.5">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does this crew do?"
                className="w-full bg-bg-base border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent placeholder:text-text-dimmed"
              />
            </div>
          </div>

          {/* Topology picker */}
          <div>
            <label className="text-xs text-text-label block mb-2">Topology</label>
            <div className="grid grid-cols-2 gap-2">
              {TOPOLOGIES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTopology(t.value)}
                  className="flex flex-col items-start p-3 rounded-lg border text-left transition-colors"
                  style={{
                    borderColor:
                      topology === t.value
                        ? 'var(--color-accent)'
                        : 'var(--color-border)',
                    background:
                      topology === t.value
                        ? 'rgba(99,102,241,0.1)'
                        : 'var(--color-bg-base)',
                  }}
                >
                  <span
                    className="text-xs font-semibold mb-0.5"
                    style={{
                      color:
                        topology === t.value
                          ? 'var(--color-accent)'
                          : 'var(--color-text-primary)',
                    }}
                  >
                    {t.label}
                  </span>
                  <span className="text-xs text-text-dimmed leading-relaxed">
                    {t.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Agent assignment */}
          <div>
            <label className="text-xs text-text-label block mb-2">
              Agents ({selectedAgentIds.size} selected)
            </label>
            {agents.length === 0 ? (
              <p className="text-xs text-text-dimmed italic">
                No agents defined yet. Create agents first via the left rail.
              </p>
            ) : (
              <div className="space-y-1.5">
                {agents.map((a) => (
                  <label
                    key={a.id}
                    className="flex items-center gap-3 p-2.5 rounded-lg border border-border hover:bg-bg-hover cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedAgentIds.has(a.id)}
                      onChange={() => toggleAgent(a.id)}
                      className="accent-accent w-4 h-4"
                    />
                    <span className="text-sm text-text-primary">{a.name}</span>
                    <span className="text-xs text-text-dimmed ml-auto">{a.provider}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border">
          <button
            onClick={() => setCrewBuilderOpen(false)}
            className="px-4 py-2 text-sm text-text-dimmed hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim()}
            className="px-5 py-2 text-sm rounded bg-accent hover:bg-accent-dim text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Create Crew
          </button>
        </div>
      </div>
    </div>
  );
}
