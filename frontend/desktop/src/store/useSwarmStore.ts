import { create } from 'zustand';
import {
  type AgentDef,
  type CanvasMode,
  type ConductorStrategy,
  type CrewDef,
  type Provider,
  type ProxyStatus,
  type RightPanelTab,
  type TraceEvent,
  PROVIDERS,
} from '../types';

interface AgentOutputs {
  [agentId: string]: string[];
}

interface SwarmStore {
  // ── Canvas ────────────────────────────────────────────────────────
  canvasMode: CanvasMode;
  setCanvasMode: (mode: CanvasMode) => void;

  // ── Agents ────────────────────────────────────────────────────────
  agents: AgentDef[];
  selectedAgentId: string | null;
  setSelectedAgent: (id: string | null) => void;
  addAgent: (agent: AgentDef) => void;
  updateAgent: (id: string, patch: Partial<AgentDef>) => void;
  removeAgent: (id: string) => void;

  // ── Crews ─────────────────────────────────────────────────────────
  crews: CrewDef[];
  addCrew: (crew: CrewDef) => void;
  removeCrew: (id: string) => void;

  // ── Conductor ─────────────────────────────────────────────────────
  conductorTask: string;
  setConductorTask: (task: string) => void;
  conductorStrategy: ConductorStrategy;
  setConductorStrategy: (strategy: ConductorStrategy) => void;
  selectedProviders: Set<Provider>;
  toggleProvider: (provider: Provider) => void;

  // ── Right panel ───────────────────────────────────────────────────
  rightPanelTab: RightPanelTab;
  setRightPanelTab: (tab: RightPanelTab) => void;

  // ── Proxy status ──────────────────────────────────────────────────
  proxyStatus: Record<Provider, ProxyStatus>;
  setProxyStatus: (provider: Provider, status: ProxyStatus) => void;

  // ── Per-agent streaming output ────────────────────────────────────
  agentOutputs: AgentOutputs;
  appendAgentOutput: (agentId: string, chunk: string) => void;
  clearAgentOutput: (agentId: string) => void;

  // ── Execution trace ───────────────────────────────────────────────
  traceEvents: TraceEvent[];
  pushTraceEvent: (event: TraceEvent) => void;
  clearTrace: () => void;

  // ── Modals ────────────────────────────────────────────────────────
  agentBuilderOpen: boolean;
  setAgentBuilderOpen: (open: boolean) => void;
  crewBuilderOpen: boolean;
  setCrewBuilderOpen: (open: boolean) => void;

  // ── Left rail collapse state ──────────────────────────────────────
  railSections: Record<string, boolean>;
  toggleRailSection: (section: string) => void;

  // ── Token totals ──────────────────────────────────────────────────
  totalTokens: number;
  addTokens: (n: number) => void;

  // ── Elapsed time ──────────────────────────────────────────────────
  startedAt: number | null;
  setStartedAt: (ts: number | null) => void;
}

const defaultProxyStatus: Record<Provider, ProxyStatus> = {
  gemini: 'offline',
  claude: 'offline',
  grok: 'offline',
  chatgpt: 'offline',
  antigravity: 'offline',
  kilo: 'offline',
};

export const useSwarmStore = create<SwarmStore>((set) => ({
  // ── Canvas ────────────────────────────────────────────────────────
  canvasMode: 'chat',
  setCanvasMode: (mode) => set({ canvasMode: mode }),

  // ── Agents ────────────────────────────────────────────────────────
  agents: [],
  selectedAgentId: null,
  setSelectedAgent: (id) => set({ selectedAgentId: id }),
  addAgent: (agent) => set((s) => ({ agents: [...s.agents, agent] })),
  updateAgent: (id, patch) =>
    set((s) => ({
      agents: s.agents.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    })),
  removeAgent: (id) =>
    set((s) => ({ agents: s.agents.filter((a) => a.id !== id) })),

  // ── Crews ─────────────────────────────────────────────────────────
  crews: [],
  addCrew: (crew) => set((s) => ({ crews: [...s.crews, crew] })),
  removeCrew: (id) =>
    set((s) => ({ crews: s.crews.filter((c) => c.id !== id) })),

  // ── Conductor ─────────────────────────────────────────────────────
  conductorTask: '',
  setConductorTask: (task) => set({ conductorTask: task }),
  conductorStrategy: 'independent',
  setConductorStrategy: (strategy) => set({ conductorStrategy: strategy }),
  selectedProviders: new Set<Provider>(PROVIDERS),
  toggleProvider: (provider) =>
    set((s) => {
      const next = new Set(s.selectedProviders);
      if (next.has(provider)) next.delete(provider);
      else next.add(provider);
      return { selectedProviders: next };
    }),

  // ── Right panel ───────────────────────────────────────────────────
  rightPanelTab: 'inspector',
  setRightPanelTab: (tab) => set({ rightPanelTab: tab }),

  // ── Proxy status ──────────────────────────────────────────────────
  proxyStatus: defaultProxyStatus,
  setProxyStatus: (provider, status) =>
    set((s) => ({
      proxyStatus: { ...s.proxyStatus, [provider]: status },
    })),

  // ── Per-agent streaming output ────────────────────────────────────
  agentOutputs: {},
  appendAgentOutput: (agentId, chunk) =>
    set((s) => ({
      agentOutputs: {
        ...s.agentOutputs,
        [agentId]: [...(s.agentOutputs[agentId] ?? []), chunk],
      },
    })),
  clearAgentOutput: (agentId) =>
    set((s) => ({
      agentOutputs: { ...s.agentOutputs, [agentId]: [] },
    })),

  // ── Execution trace ───────────────────────────────────────────────
  traceEvents: [],
  pushTraceEvent: (event) =>
    set((s) => ({ traceEvents: [...s.traceEvents.slice(-499), event] })),
  clearTrace: () => set({ traceEvents: [] }),

  // ── Modals ────────────────────────────────────────────────────────
  agentBuilderOpen: false,
  setAgentBuilderOpen: (open) => set({ agentBuilderOpen: open }),
  crewBuilderOpen: false,
  setCrewBuilderOpen: (open) => set({ crewBuilderOpen: open }),

  // ── Left rail collapse state ──────────────────────────────────────
  railSections: {
    agents: true,
    teams: true,
    crews: true,
    proxy: true,
  },
  toggleRailSection: (section) =>
    set((s) => ({
      railSections: {
        ...s.railSections,
        [section]: !s.railSections[section],
      },
    })),

  // ── Token totals ──────────────────────────────────────────────────
  totalTokens: 0,
  addTokens: (n) => set((s) => ({ totalTokens: s.totalTokens + n })),

  // ── Elapsed time ──────────────────────────────────────────────────
  startedAt: null,
  setStartedAt: (ts) => set({ startedAt: ts }),
}));
