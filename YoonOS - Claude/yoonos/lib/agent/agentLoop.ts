import { useAgentStore } from '@/stores/agentStore';
import { useGraphStore } from '@/stores/graphStore';
import { handleToolOnClient } from './toolHandlers';
import { AgentStreamEvent, PlanBranchOption } from '@/types';

type RunAgentTaskOptions = {
  approvedPlan?: PlanBranchOption;
};

export async function runAgentTask(task: string, options: RunAgentTaskOptions = {}) {
  const agentStore = useAgentStore.getState();
  const graphStore = useGraphStore.getState();

  if (!options.approvedPlan) {
    graphStore.clearGraph();
  }
  const controller = options.approvedPlan
    ? agentStore.startApprovedTask()
    : agentStore.startTask(task);

  let lastNodeId: string | null = null;

  try {
    const response = await fetch('/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        task,
        conversationHistory: [],
        currentBrowserUrl: agentStore.currentBrowserUrl,
        approvedPlan: options.approvedPlan,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Agent API returned ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response stream');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const jsonStr = line.slice(6).trim();
        if (!jsonStr) continue;

        let event: AgentStreamEvent;
        try {
          event = JSON.parse(jsonStr);
        } catch {
          continue;
        }

        const store = useAgentStore.getState();
        if (store.status === 'interrupted') break;

        switch (event.type) {
          case 'graph_node': {
            useGraphStore.getState().addGraphNode(
              event.nodeId,
              event.label,
              event.toolName,
              event.input,
              event.status,
              event.output
            );
            break;
          }

          case 'planner_ready': {
            useAgentStore.getState().setPlanApproval(
              event.branches,
              event.recommendedBranchId,
              event.rationale
            );
            break;
          }

          case 'graph_edge': {
            useGraphStore.getState().addEdge(event.sourceId, event.targetId);
            break;
          }

          case 'tool_start': {
            const nodeId = event.toolCallId;

            handleToolOnClient(event.toolName, event.input);

            useAgentStore.getState().addToolCall({
              id: nodeId,
              toolName: event.toolName,
              input: event.input,
              output: null,
              status: 'in_progress',
              startedAt: new Date().toISOString(),
              completedAt: null,
            });

            useGraphStore.getState().addNode(nodeId, event.toolName, event.input);
            const parentNodeId = event.parentNodeId ?? lastNodeId;
            if (parentNodeId) {
              useGraphStore.getState().addEdge(parentNodeId, nodeId);
            }
            lastNodeId = nodeId;
            break;
          }

          case 'tool_done': {
            useAgentStore.getState().updateToolCall(event.toolCallId, {
              status: 'done',
              output: event.output,
              completedAt: new Date().toISOString(),
            });
            useGraphStore.getState().updateNodeStatus(event.toolCallId, 'done', event.output);
            break;
          }

          case 'tool_error': {
            useAgentStore.getState().updateToolCall(event.toolCallId, {
              status: 'error',
              output: event.error,
              completedAt: new Date().toISOString(),
            });
            useGraphStore.getState().updateNodeStatus(event.toolCallId, 'error', event.error);
            break;
          }

          case 'text': {
            useAgentStore.getState().appendResponseText(event.content);
            break;
          }

          case 'done': {
            useAgentStore.getState().setStatus('done');
            break;
          }

          case 'error': {
            useAgentStore.getState().setError(event.message);
            break;
          }
        }
      }
    }
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      useAgentStore.getState().setStatus('interrupted');
    } else {
      useAgentStore.getState().setError((err as Error).message);
    }
  }
}
