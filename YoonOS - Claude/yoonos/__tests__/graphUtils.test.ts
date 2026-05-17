import { buildGraphData, getNodeColor, getNodeLabel, STATUS_COLORS } from '../components/agent/graphUtils';
import type { Node, Edge } from 'reactflow';
import type { GraphNodeData } from '../types';

function makeStoreNode(
  id: string,
  toolName: string,
  status: GraphNodeData['status'] = 'done'
): Node<GraphNodeData> {
  return {
    id,
    type: 'agentNode',
    position: { x: 0, y: 0 },
    data: {
      label: toolName,
      toolName,
      status,
      input: {},
      output: null,
      timestamp: new Date().toISOString(),
    },
  };
}

function makeStoreEdge(source: string, target: string): Edge {
  return { id: `${source}->${target}`, source, target, animated: true };
}

describe('graphUtils', () => {
  describe('buildGraphData', () => {
    it('converts store nodes/edges to force graph format', () => {
      const nodes = [
        makeStoreNode('a', 'open_app'),
        makeStoreNode('b', 'navigate_browser'),
      ];
      const edges = [makeStoreEdge('a', 'b')];
      const data = buildGraphData(nodes, edges);

      expect(data.nodes).toHaveLength(2);
      expect(data.links).toHaveLength(1);
      expect(data.nodes[0].id).toBe('a');
      expect(data.nodes[0].toolName).toBe('open_app');
    });

    it('builds neighbor references', () => {
      const nodes = [
        makeStoreNode('a', 'task'),
        makeStoreNode('b', 'task'),
        makeStoreNode('c', 'task'),
      ];
      const edges = [makeStoreEdge('a', 'b'), makeStoreEdge('b', 'c')];
      const data = buildGraphData(nodes, edges);

      const nodeB = data.nodes.find((n) => n.id === 'b')!;
      expect(nodeB.neighbors).toHaveLength(2);
      expect(nodeB.links).toHaveLength(2);
    });

    it('in_progress nodes have higher val', () => {
      const nodes = [
        makeStoreNode('a', 'task', 'done'),
        makeStoreNode('b', 'task', 'in_progress'),
      ];
      const data = buildGraphData(nodes, []);
      expect(data.nodes[0].val).toBe(1);
      expect(data.nodes[1].val).toBe(1.4);
    });

    it('handles empty input', () => {
      const data = buildGraphData([], []);
      expect(data.nodes).toHaveLength(0);
      expect(data.links).toHaveLength(0);
    });
  });

  describe('getNodeColor', () => {
    it('returns correct status colors', () => {
      const node = { status: 'done' } as any;
      expect(getNodeColor(node)).toBe(STATUS_COLORS.done);
    });

    it('returns default for unknown status', () => {
      const node = { status: 'unknown' } as any;
      expect(getNodeColor(node)).toBe('#483699');
    });
  });

  describe('getNodeLabel', () => {
    it('formats tool name', () => {
      expect(getNodeLabel({ toolName: 'navigate_browser' } as any)).toBe('navigate browser');
    });

    it('falls back to label', () => {
      expect(getNodeLabel({ toolName: '', label: 'My Label' } as any)).toBe('My Label');
    });

    it('falls back to id', () => {
      expect(getNodeLabel({ toolName: '', label: '', id: 'node-123' } as any)).toBe('node-123');
    });
  });
});
