import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { PROVIDER_COLORS, PROVIDER_LABELS, type Provider, type AgentStatus } from '../../types';

export interface AgentNodeData {
  name: string;
  provider: Provider;
  status: AgentStatus;
  task: string;
  model: string;
  tokens: number;
  [key: string]: unknown;
}

const STATUS_COLORS: Record<AgentStatus, string> = {
  running: '#34D399',
  idle: '#64748B',
  done: '#6366F1',
  error: '#F87171',
};

const AgentNode = memo(({ data, selected }: NodeProps) => {
  const d = data as AgentNodeData;
  const providerColor = PROVIDER_COLORS[d.provider] ?? '#6366F1';
  const statusColor = STATUS_COLORS[d.status] ?? '#64748B';

  return (
    <div
      style={{
        background: 'var(--color-bg-panel)',
        border: `2px solid ${selected ? providerColor : 'var(--color-border)'}`,
        borderRadius: 10,
        minWidth: 160,
        boxShadow: selected
          ? `0 0 0 1px ${providerColor}44, 0 4px 20px ${providerColor}22`
          : '0 2px 8px rgba(0,0,0,0.4)',
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}
    >
      {/* Provider stripe */}
      <div
        style={{
          height: 3,
          background: providerColor,
          borderRadius: '8px 8px 0 0',
        }}
      />

      <div style={{ padding: '10px 12px 12px' }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span
            className={d.status === 'running' ? 'status-pulse' : ''}
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: statusColor,
              display: 'inline-block',
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              flex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {d.name}
          </span>
        </div>

        {/* Provider + model */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span
            style={{
              fontSize: 11,
              color: providerColor,
              fontWeight: 500,
            }}
          >
            {PROVIDER_LABELS[d.provider]}
          </span>
          {d.model && (
            <span
              style={{
                fontSize: 10,
                color: 'var(--color-text-dimmed)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {d.model}
            </span>
          )}
          {d.task && (
            <span
              style={{
                fontSize: 10,
                color: 'var(--color-text-label)',
                marginTop: 4,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: 136,
              }}
              title={d.task}
            >
              {d.task}
            </span>
          )}
        </div>

        {d.tokens > 0 && (
          <div
            style={{
              marginTop: 6,
              fontSize: 10,
              color: 'var(--color-text-dimmed)',
              textAlign: 'right',
            }}
          >
            {d.tokens.toLocaleString()} tok
          </div>
        )}
      </div>

      {/* ReactFlow handles */}
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: providerColor, borderColor: 'var(--color-bg-panel)', width: 10, height: 10 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: providerColor, borderColor: 'var(--color-bg-panel)', width: 10, height: 10 }}
      />
    </div>
  );
});

AgentNode.displayName = 'AgentNode';

export default AgentNode;
