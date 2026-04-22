import { useState } from 'react';
import { X } from '@phosphor-icons/react';
import { useSwarmStore } from '../../store/useSwarmStore';
import {
  PROVIDERS,
  PROVIDER_LABELS,
  PROVIDER_COLORS,
  PROVIDER_MODELS,
  type Provider,
  type AgentDef,
} from '../../types';

const ROLE_TEMPLATES: Record<string, string> = {
  Researcher:
    'You are a research specialist. Gather information, verify facts, and provide comprehensive summaries with citations.',
  Coder:
    'You are an expert software engineer. Write clean, well-tested code. Prefer existing idioms and libraries.',
  Reviewer:
    'You are a code reviewer. Identify bugs, security issues, and style problems. Suggest concrete improvements.',
  Planner:
    'You are a project planner. Break down complex goals into actionable steps with clear dependencies.',
  Critic:
    'You are a critical analyst. Challenge assumptions, identify weaknesses, and propose alternative viewpoints.',
};

const ALL_TOOLS = [
  'file_read',
  'file_write',
  'bash',
  'browser',
  'mcp_servers',
  'web_search',
];

const STEPS = ['Provider', 'Model & Context', 'Role & Prompt', 'Tools & Permissions'];

export default function AgentBuilder() {
  const { setAgentBuilderOpen, addAgent } = useSwarmStore();

  const [step, setStep] = useState(0);
  const [provider, setProvider] = useState<Provider>('gemini');
  const [model, setModel] = useState(PROVIDER_MODELS['gemini'][0]);
  const [maxTokens, setMaxTokens] = useState(8192);
  const [temperature, setTemperature] = useState(0.7);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [selectedTools, setSelectedTools] = useState<Set<string>>(new Set(['file_read', 'file_write', 'bash']));

  const toggleTool = (tool: string) => {
    setSelectedTools((prev) => {
      const next = new Set(prev);
      if (next.has(tool)) next.delete(tool);
      else next.add(tool);
      return next;
    });
  };

  const handleFinish = () => {
    const id = `${provider}-${Date.now()}`;
    const agent: AgentDef = {
      id,
      name: `${provider}-${Math.floor(Math.random() * 9) + 1}`,
      provider,
      model,
      systemPrompt,
      maxTokens,
      temperature,
      tools: [...selectedTools],
      status: 'idle',
      tokens: 0,
      turns: 0,
      maxTurns: 200,
    };
    addAgent(agent);
    setAgentBuilderOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className="relative flex flex-col rounded-xl border border-border shadow-2xl"
        style={{ width: 560, maxHeight: '85vh', background: 'var(--color-bg-panel)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="font-semibold text-text-primary">New Agent</h2>
            <p className="text-xs text-text-dimmed mt-0.5">
              Step {step + 1} of {STEPS.length}: {STEPS[step]}
            </p>
          </div>
          <button
            onClick={() => setAgentBuilderOpen(false)}
            className="p-1 text-text-dimmed hover:text-text-primary transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex px-6 pt-4 gap-2">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className="flex-1 h-1 rounded-full"
              style={{
                background:
                  i <= step ? 'var(--color-accent)' : 'var(--color-border)',
              }}
            />
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {step === 0 && (
            <StepProvider
              selected={provider}
              onChange={(p) => {
                setProvider(p);
                setModel(PROVIDER_MODELS[p][0]);
              }}
            />
          )}
          {step === 1 && (
            <StepModel
              provider={provider}
              model={model}
              setModel={setModel}
              maxTokens={maxTokens}
              setMaxTokens={setMaxTokens}
              temperature={temperature}
              setTemperature={setTemperature}
            />
          )}
          {step === 2 && (
            <StepPrompt
              systemPrompt={systemPrompt}
              setSystemPrompt={setSystemPrompt}
            />
          )}
          {step === 3 && (
            <StepTools selectedTools={selectedTools} toggleTool={toggleTool} />
          )}
        </div>

        {/* Footer buttons */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="px-4 py-2 text-sm text-text-dimmed hover:text-text-primary disabled:opacity-30 transition-colors"
          >
            Back
          </button>
          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              className="px-5 py-2 text-sm rounded bg-accent hover:bg-accent-dim text-white font-medium transition-colors"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleFinish}
              className="px-5 py-2 text-sm rounded bg-success hover:opacity-90 text-white font-medium transition-colors"
            >
              Create Agent
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Step 1: Provider ────────────────────────────────────────────────────────

function StepProvider({
  selected,
  onChange,
}: {
  selected: Provider;
  onChange: (p: Provider) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-text-label mb-4">
        Choose an AI provider. All highlighted providers are available for free via the proxy.
      </p>
      <div className="grid grid-cols-2 gap-3">
        {PROVIDERS.map((p) => {
          const color = PROVIDER_COLORS[p];
          const isSelected = selected === p;
          return (
            <button
              key={p}
              onClick={() => onChange(p)}
              className="flex flex-col items-start p-4 rounded-lg border text-left transition-colors"
              style={{
                borderColor: isSelected ? color : 'var(--color-border)',
                background: isSelected ? `${color}18` : 'var(--color-bg-base)',
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ background: color }}
                />
                <span className="font-medium text-sm text-text-primary">
                  {PROVIDER_LABELS[p]}
                </span>
              </div>
              <span className="text-xs text-success">✓ Free via proxy</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Step 2: Model & Context ─────────────────────────────────────────────────

function StepModel({
  provider,
  model,
  setModel,
  maxTokens,
  setMaxTokens,
  temperature,
  setTemperature,
}: {
  provider: Provider;
  model: string;
  setModel: (m: string) => void;
  maxTokens: number;
  setMaxTokens: (n: number) => void;
  temperature: number;
  setTemperature: (n: number) => void;
}) {
  const models = PROVIDER_MODELS[provider];
  return (
    <div className="space-y-5">
      <div>
        <label className="text-xs text-text-label block mb-2">Model</label>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="w-full bg-bg-base border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
        >
          {models.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs text-text-label block mb-2">
          Max tokens: <span className="text-text-primary">{maxTokens.toLocaleString()}</span>
        </label>
        <input
          type="range"
          min={1024}
          max={128000}
          step={1024}
          value={maxTokens}
          onChange={(e) => setMaxTokens(Number(e.target.value))}
          className="w-full accent-accent"
        />
      </div>

      <div>
        <label className="text-xs text-text-label block mb-2">
          Temperature: <span className="text-text-primary">{temperature.toFixed(2)}</span>
        </label>
        <input
          type="range"
          min={0}
          max={2}
          step={0.05}
          value={temperature}
          onChange={(e) => setTemperature(Number(e.target.value))}
          className="w-full accent-accent"
        />
      </div>
    </div>
  );
}

// ── Step 3: Role & Prompt ───────────────────────────────────────────────────

function StepPrompt({
  systemPrompt,
  setSystemPrompt,
}: {
  systemPrompt: string;
  setSystemPrompt: (s: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs text-text-label block mb-2">Role template</label>
        <div className="flex flex-wrap gap-2">
          {Object.keys(ROLE_TEMPLATES).map((role) => (
            <button
              key={role}
              onClick={() => setSystemPrompt(ROLE_TEMPLATES[role])}
              className="px-3 py-1.5 text-xs rounded border border-border hover:border-accent hover:text-accent text-text-dimmed transition-colors"
            >
              {role}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs text-text-label block mb-2">System prompt</label>
        <textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          placeholder="Describe the agent's role, expertise, and behaviour…"
          rows={8}
          className="w-full bg-bg-base border border-border rounded px-3 py-2 text-sm text-text-primary resize-none focus:outline-none focus:border-accent placeholder:text-text-dimmed"
          style={{ fontFamily: 'var(--font-mono)' }}
        />
      </div>
    </div>
  );
}

// ── Step 4: Tools & Permissions ─────────────────────────────────────────────

function StepTools({
  selectedTools,
  toggleTool,
}: {
  selectedTools: Set<string>;
  toggleTool: (t: string) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-text-label">
        Select which tools this agent is allowed to use.
      </p>
      <div className="space-y-2">
        {ALL_TOOLS.map((tool) => {
          const checked = selectedTools.has(tool);
          return (
            <label
              key={tool}
              className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-bg-hover cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggleTool(tool)}
                className="accent-accent w-4 h-4"
              />
              <span className="text-sm text-text-primary" style={{ fontFamily: 'var(--font-mono)' }}>
                {tool}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
