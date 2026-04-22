/**
 * useBackendSession — Tauri-adapted version of the terminal frontend hook.
 *
 * Key differences from the Ink/Node.js version:
 *  - Process spawning is delegated to the Rust backend via `invoke('spawn_backend')`
 *  - Stdout lines arrive as Tauri events (`backend-line`)
 *  - Stdin writes go via `invoke('send_to_backend', { payload })`
 *
 * The JSON-lines protocol (prefix `OHJSON:`) is identical to the terminal frontend.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

import { useSwarmStore } from '../store/useSwarmStore';
import type {
  BackendEvent,
  BridgeSessionSnapshot,
  McpServerSnapshot,
  SelectOptionPayload,
  SwarmNotificationSnapshot,
  SwarmTeammateSnapshot,
  TaskSnapshot,
  TraceEvent,
  TranscriptItem,
} from '../types';
import { PROVIDERS } from '../types';

const PROTOCOL_PREFIX = 'OHJSON:';
const ASSISTANT_DELTA_FLUSH_MS = 33;
const ASSISTANT_DELTA_FLUSH_CHARS = 256;

/** Default backend command.  Users can override via Settings in a future version. */
const DEFAULT_BACKEND_COMMAND = ['oh'];

export interface BackendSession {
  transcript: TranscriptItem[];
  assistantBuffer: string;
  status: Record<string, unknown>;
  tasks: TaskSnapshot[];
  commands: string[];
  mcpServers: McpServerSnapshot[];
  bridgeSessions: BridgeSessionSnapshot[];
  modal: Record<string, unknown> | null;
  selectRequest: { title: string; command: string; options: SelectOptionPayload[] } | null;
  busy: boolean;
  ready: boolean;
  todoMarkdown: string;
  swarmTeammates: SwarmTeammateSnapshot[];
  swarmNotifications: SwarmNotificationSnapshot[];
  setModal: (modal: Record<string, unknown> | null) => void;
  setSelectRequest: (req: { title: string; command: string; options: SelectOptionPayload[] } | null) => void;
  setBusy: (busy: boolean) => void;
  sendRequest: (payload: Record<string, unknown>) => void;
}

export function useBackendSession(onExit: () => void): BackendSession {
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [assistantBuffer, setAssistantBuffer] = useState('');
  const [status, setStatus] = useState<Record<string, unknown>>({});
  const [tasks, setTasks] = useState<TaskSnapshot[]>([]);
  const [commands, setCommands] = useState<string[]>([]);
  const [mcpServers, setMcpServers] = useState<McpServerSnapshot[]>([]);
  const [bridgeSessions, setBridgeSessions] = useState<BridgeSessionSnapshot[]>([]);
  const [modal, setModal] = useState<Record<string, unknown> | null>(null);
  const [selectRequest, setSelectRequest] = useState<BackendSession['selectRequest']>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [todoMarkdown, setTodoMarkdown] = useState('');
  const [swarmTeammates, setSwarmTeammates] = useState<SwarmTeammateSnapshot[]>([]);
  const [swarmNotifications, setSwarmNotifications] = useState<SwarmNotificationSnapshot[]>([]);

  // ── Streaming delta buffer ──────────────────────────────────────────
  const assistantBufferRef = useRef('');
  const pendingAssistantDeltaRef = useRef('');
  const assistantFlushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushAssistantDelta = useCallback((): void => {
    const pending = pendingAssistantDeltaRef.current;
    if (!pending) return;
    pendingAssistantDeltaRef.current = '';
    assistantBufferRef.current += pending;
    setAssistantBuffer(assistantBufferRef.current);
  }, []);

  const clearAssistantDelta = useCallback((): void => {
    pendingAssistantDeltaRef.current = '';
    assistantBufferRef.current = '';
    if (assistantFlushTimerRef.current) {
      clearTimeout(assistantFlushTimerRef.current);
      assistantFlushTimerRef.current = null;
    }
    setAssistantBuffer('');
  }, []);

  // ── IPC send ────────────────────────────────────────────────────────
  const sendRequest = useCallback((payload: Record<string, unknown>): void => {
    invoke('send_to_backend', { payload: JSON.stringify(payload) + '\n' }).catch(
      (err) => console.error('[SwarmForge] send_to_backend error:', err),
    );
  }, []);

  // ── Store integration ───────────────────────────────────────────────
  const { updateAgent, pushTraceEvent, addTokens, setStartedAt } = useSwarmStore();

  // ── Event handler ───────────────────────────────────────────────────
  const handleEvent = useCallback(
    (event: BackendEvent): void => {
      if (event.type === 'ready') {
        setReady(true);
        setStatus(event.state ?? {});
        setTasks(event.tasks ?? []);
        setCommands(event.commands ?? []);
        setMcpServers(event.mcp_servers ?? []);
        setBridgeSessions(event.bridge_sessions ?? []);
        setStartedAt(Date.now());
        return;
      }

      if (event.type === 'state_snapshot') {
        setStatus(event.state ?? {});
        setMcpServers(event.mcp_servers ?? []);
        setBridgeSessions(event.bridge_sessions ?? []);
        return;
      }

      if (event.type === 'tasks_snapshot') {
        setTasks(event.tasks ?? []);
        return;
      }

      if (event.type === 'transcript_item' && event.item) {
        setTranscript((items) => [...items, event.item as TranscriptItem]);
        return;
      }

      if (event.type === 'assistant_delta') {
        const delta = event.message ?? '';
        if (!delta) return;
        pendingAssistantDeltaRef.current += delta;
        if (pendingAssistantDeltaRef.current.length >= ASSISTANT_DELTA_FLUSH_CHARS) {
          flushAssistantDelta();
          return;
        }
        if (!assistantFlushTimerRef.current) {
          assistantFlushTimerRef.current = setTimeout(() => {
            assistantFlushTimerRef.current = null;
            flushAssistantDelta();
          }, ASSISTANT_DELTA_FLUSH_MS);
        }
        return;
      }

      if (event.type === 'assistant_complete') {
        if (assistantFlushTimerRef.current) {
          clearTimeout(assistantFlushTimerRef.current);
          assistantFlushTimerRef.current = null;
        }
        flushAssistantDelta();
        const text = event.message ?? assistantBufferRef.current;
        setTranscript((items) => [...items, { role: 'assistant', text }]);
        clearAssistantDelta();
        setBusy(false);
        return;
      }

      if (event.type === 'line_complete') {
        clearAssistantDelta();
        setBusy(false);
        return;
      }

      if ((event.type === 'tool_started' || event.type === 'tool_completed') && event.item) {
        const enrichedItem: TranscriptItem = {
          ...event.item,
          tool_name: event.item.tool_name ?? event.tool_name ?? undefined,
          tool_input: event.item.tool_input ?? undefined,
          is_error: event.item.is_error ?? event.is_error ?? undefined,
        };
        setTranscript((items) => [...items, enrichedItem]);
        return;
      }

      if (event.type === 'clear_transcript') {
        setTranscript([]);
        clearAssistantDelta();
        return;
      }

      if (event.type === 'select_request') {
        const m = event.modal ?? {};
        setSelectRequest({
          title: String(m['title'] ?? 'Select'),
          command: String(m['command'] ?? ''),
          options: event.select_options ?? [],
        });
        return;
      }

      if (event.type === 'modal_request') {
        setModal(event.modal ?? null);
        return;
      }

      if (event.type === 'error') {
        setTranscript((items) => [
          ...items,
          { role: 'system', text: `error: ${event.message ?? 'unknown error'}` },
        ]);
        clearAssistantDelta();
        setBusy(false);
        return;
      }

      if (event.type === 'todo_update' && event.todo_markdown != null) {
        setTodoMarkdown(event.todo_markdown);
        return;
      }

      if (event.type === 'swarm_status') {
        if (event.swarm_teammates != null) {
          setSwarmTeammates(event.swarm_teammates);
          // Sync agent statuses into the store
          for (const tm of event.swarm_teammates) {
            // Derive provider from agent name heuristic
            const provider =
              PROVIDERS.find((p) => tm.name.toLowerCase().includes(p)) ?? 'gemini';
            updateAgent(tm.name, { status: tm.status, task: tm.task });
            const traceEv: TraceEvent = {
              timestamp: Date.now(),
              agentName: tm.name,
              provider,
              type: tm.status === 'error' ? 'error' : tm.status === 'done' ? 'complete' : 'start',
              text: tm.task ?? tm.status,
            };
            pushTraceEvent(traceEv);
          }
        }
        if (event.swarm_notifications != null) {
          setSwarmNotifications((prev) =>
            [...prev, ...event.swarm_notifications!].slice(-20),
          );
          for (const n of event.swarm_notifications) {
            const provider =
              PROVIDERS.find((p) => n.from.toLowerCase().includes(p)) ?? 'gemini';
            pushTraceEvent({
              timestamp: n.timestamp,
              agentName: n.from,
              provider,
              type: 'delta',
              text: n.message,
            });
          }
        }
        return;
      }

      if (event.type === 'plan_mode_change' && event.plan_mode != null) {
        setStatus((s) => ({ ...s, permission_mode: event.plan_mode }));
        return;
      }

      if (event.type === 'shutdown') {
        onExit();
      }

      // Token accounting — extract from state snapshot if present
      if (event.state?.total_tokens != null) {
        const n = Number(event.state.total_tokens);
        if (!isNaN(n)) addTokens(n);
      }
    },
    [flushAssistantDelta, clearAssistantDelta, onExit, updateAgent, pushTraceEvent, addTokens, setStartedAt],
  );

  // ── Lifecycle: spawn + listen ────────────────────────────────────────
  useEffect(() => {
    let unlistenLine: (() => void) | undefined;
    let unlistenExit: (() => void) | undefined;

    const setup = async (): Promise<void> => {
      const [unLine, unExit] = await Promise.all([
        listen<string>('backend-line', (ev) => {
          const line = ev.payload;
          if (!line.startsWith(PROTOCOL_PREFIX)) {
            setTranscript((items) => [...items, { role: 'log', text: line }]);
            return;
          }
          try {
            const parsed = JSON.parse(line.slice(PROTOCOL_PREFIX.length)) as BackendEvent;
            handleEvent(parsed);
          } catch (e) {
            console.error('[SwarmForge] failed to parse backend event:', e, line);
          }
        }),
        listen('backend-exit', () => {
          setTranscript((items) => [
            ...items,
            { role: 'system', text: 'backend process exited' },
          ]);
          onExit();
        }),
      ]);
      unlistenLine = unLine;
      unlistenExit = unExit;

      await invoke('spawn_backend', { backendCommand: DEFAULT_BACKEND_COMMAND });
    };

    setup().catch((err) => {
      setTranscript([{ role: 'system', text: `Failed to start backend: ${String(err)}` }]);
    });

    return () => {
      unlistenLine?.();
      unlistenExit?.();
      invoke('kill_backend').catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return useMemo(
    () => ({
      transcript,
      assistantBuffer,
      status,
      tasks,
      commands,
      mcpServers,
      bridgeSessions,
      modal,
      selectRequest,
      busy,
      ready,
      todoMarkdown,
      swarmTeammates,
      swarmNotifications,
      setModal,
      setSelectRequest,
      setBusy,
      sendRequest,
    }),
    [
      assistantBuffer,
      bridgeSessions,
      busy,
      commands,
      mcpServers,
      modal,
      ready,
      selectRequest,
      sendRequest,
      status,
      swarmNotifications,
      swarmTeammates,
      tasks,
      todoMarkdown,
      transcript,
    ],
  );
}
