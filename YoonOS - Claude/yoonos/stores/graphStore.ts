import { create } from 'zustand';
import { Node, Edge } from 'reactflow';
import { GraphNodeData, GraphNodeStatus } from '@/types';

type GraphStore = {
  nodes: Node<GraphNodeData>[];
  edges: Edge[];
  addGraphNode: (
    id: string,
    label: string,
    toolName: string,
    input: Record<string, unknown>,
    status?: GraphNodeStatus,
    output?: string | null
  ) => void;
  addNode: (id: string, toolName: string, input: Record<string, unknown>) => void;
  updateNodeStatus: (id: string, status: GraphNodeStatus, output?: string) => void;
  addEdge: (sourceId: string, targetId: string) => void;
  clearGraph: () => void;
};

function createGraphNode(
  id: string,
  label: string,
  toolName: string,
  input: Record<string, unknown>,
  status: GraphNodeStatus = 'in_progress',
  output: string | null = null
): Node<GraphNodeData> {
  return {
    id,
    type: 'agentNode',
    position: { x: 0, y: 0 },
    data: {
      label,
      toolName,
      status,
      input,
      output,
      timestamp: new Date().toISOString(),
    },
  };
}

export const useGraphStore = create<GraphStore>((set) => ({
  nodes: [],
  edges: [],

  addGraphNode: (id, label, toolName, input, status = 'in_progress', output = null) => {
    const newNode = createGraphNode(id, label, toolName, input, status, output);
    set((state) => ({
      nodes: state.nodes.some((node) => node.id === id)
        ? state.nodes.map((node) => (node.id === id ? newNode : node))
        : [...state.nodes, newNode],
    }));
  },

  addNode: (id, toolName, input) => {
    const label = (Object.values(input)[0] as string) || toolName;
    const newNode = createGraphNode(id, label, toolName, input);
    set((state) => ({
      nodes: state.nodes.some((node) => node.id === id)
        ? state.nodes.map((node) => (node.id === id ? newNode : node))
        : [...state.nodes, newNode],
    }));
  },

  updateNodeStatus: (id, status, output) =>
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === id
          ? { ...n, data: { ...n.data, status, output: output ?? n.data.output } }
          : n
      ),
    })),

  addEdge: (sourceId, targetId) => {
    const edgeId = `${sourceId}->${targetId}`;
    set((state) => ({
      edges: state.edges.some((edge) => edge.id === edgeId)
        ? state.edges
        : [
            ...state.edges,
            { id: edgeId, source: sourceId, target: targetId, animated: true },
          ],
    }));
  },

  clearGraph: () => set({ nodes: [], edges: [] }),
}));
