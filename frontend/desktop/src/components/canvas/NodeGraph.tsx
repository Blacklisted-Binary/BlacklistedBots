import { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Node,
  type Edge,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { BackendSession } from '../../hooks/useBackendSession';
import { useSwarmStore } from '../../store/useSwarmStore';
import AgentNode from '../nodes/AgentNode';
import { PROVIDERS, PROVIDER_COLORS } from '../../types';

const nodeTypes = { agentNode: AgentNode };

interface Props {
  session: BackendSession;
}

function buildInitialNodes(session: BackendSession): Node[] {
  const { swarmTeammates } = session;
  if (swarmTeammates.length > 0) {
    return swarmTeammates.map((tm, i) => {
      const provider =
        PROVIDERS.find((p) => tm.name.toLowerCase().includes(p)) ?? 'gemini';
      return {
        id: tm.name,
        type: 'agentNode',
        position: { x: 160 + (i % 2) * 240, y: 100 + Math.floor(i / 2) * 200 },
        data: {
          name: tm.name,
          provider,
          status: tm.status,
          task: tm.task ?? '',
          model: '',
          tokens: 0,
        },
      };
    });
  }
  // Default scaffold: one node per provider
  return PROVIDERS.map((provider, i) => ({
    id: provider,
    type: 'agentNode',
    position: { x: 160 + (i % 2) * 240, y: 100 + Math.floor(i / 2) * 200 },
    data: {
      name: `${provider}-1`,
      provider,
      status: 'idle' as const,
      task: '',
      model: '',
      tokens: 0,
    },
  }));
}

function buildInitialEdges(): Edge[] {
  return [
    {
      id: 'gemini-claude',
      source: 'gemini',
      target: 'claude',
      animated: true,
      style: { stroke: PROVIDER_COLORS['gemini'], strokeWidth: 2 },
    },
    {
      id: 'claude-chatgpt',
      source: 'claude',
      target: 'chatgpt',
      animated: true,
      style: { stroke: PROVIDER_COLORS['claude'], strokeWidth: 2 },
    },
    {
      id: 'gemini-grok',
      source: 'gemini',
      target: 'grok',
      animated: true,
      style: { stroke: PROVIDER_COLORS['gemini'], strokeWidth: 2 },
    },
  ];
}

export default function NodeGraph({ session }: Props) {
  const { setSelectedAgent, setRightPanelTab } = useSwarmStore();

  const initialNodes = useMemo(() => buildInitialNodes(session), []);
  const initialEdges = useMemo(() => buildInitialEdges(), []);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) => {
        const source = params.source as keyof typeof PROVIDER_COLORS;
        return addEdge(
          {
            ...params,
            animated: true,
            style: {
              stroke: PROVIDER_COLORS[source] ?? '#6366F1',
              strokeWidth: 2,
            },
          },
          eds,
        );
      }),
    [setEdges],
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelectedAgent(node.id);
      setRightPanelTab('inspector');
    },
    [setSelectedAgent, setRightPanelTab],
  );

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        colorMode="dark"
        defaultEdgeOptions={{
          animated: true,
          style: { stroke: '#6366F1', strokeWidth: 2 },
        }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#1E2334"
        />
        <Controls />
        <MiniMap
          nodeColor={(n) => {
            const provider = (n.data as { provider: string }).provider;
            return PROVIDER_COLORS[provider as keyof typeof PROVIDER_COLORS] ?? '#6366F1';
          }}
          maskColor="rgba(13,15,20,0.7)"
        />
      </ReactFlow>
    </div>
  );
}
