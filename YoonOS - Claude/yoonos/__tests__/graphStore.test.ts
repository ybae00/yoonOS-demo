import { useGraphStore } from '../stores/graphStore';

beforeEach(() => {
  useGraphStore.setState({ nodes: [], edges: [] });
});

describe('graphStore', () => {
  it('starts with empty nodes and edges', () => {
    const state = useGraphStore.getState();
    expect(state.nodes).toHaveLength(0);
    expect(state.edges).toHaveLength(0);
  });

  it('addGraphNode creates a node', () => {
    useGraphStore.getState().addGraphNode(
      'n1', 'Navigate', 'navigate_browser',
      { url: 'https://example.com' }, 'in_progress', null
    );
    const { nodes } = useGraphStore.getState();
    expect(nodes).toHaveLength(1);
    expect(nodes[0].id).toBe('n1');
    expect(nodes[0].data.label).toBe('Navigate');
    expect(nodes[0].data.toolName).toBe('navigate_browser');
    expect(nodes[0].data.status).toBe('in_progress');
  });

  it('addGraphNode upserts by id', () => {
    useGraphStore.getState().addGraphNode(
      'n1', 'Step 1', 'open_app', { app_name: 'browser' }, 'in_progress'
    );
    useGraphStore.getState().addGraphNode(
      'n1', 'Step 1 updated', 'open_app', { app_name: 'browser' }, 'done', 'Opened'
    );
    const { nodes } = useGraphStore.getState();
    expect(nodes).toHaveLength(1);
    expect(nodes[0].data.label).toBe('Step 1 updated');
    expect(nodes[0].data.status).toBe('done');
    expect(nodes[0].data.output).toBe('Opened');
  });

  it('addNode creates from toolName and input', () => {
    useGraphStore.getState().addNode('n2', 'capture_photo', {});
    const { nodes } = useGraphStore.getState();
    expect(nodes).toHaveLength(1);
    expect(nodes[0].id).toBe('n2');
    expect(nodes[0].data.toolName).toBe('capture_photo');
    expect(nodes[0].data.status).toBe('in_progress');
  });

  it('addNode upserts by id', () => {
    useGraphStore.getState().addNode('n2', 'navigate_browser', { url: 'a' });
    useGraphStore.getState().addNode('n2', 'navigate_browser', { url: 'b' });
    expect(useGraphStore.getState().nodes).toHaveLength(1);
  });

  it('updateNodeStatus changes status and optionally output', () => {
    useGraphStore.getState().addGraphNode(
      'n1', 'Task', 'open_app', {}, 'in_progress'
    );
    useGraphStore.getState().updateNodeStatus('n1', 'done', 'Completed');
    const node = useGraphStore.getState().nodes[0];
    expect(node.data.status).toBe('done');
    expect(node.data.output).toBe('Completed');
  });

  it('updateNodeStatus preserves output when not provided', () => {
    useGraphStore.getState().addGraphNode(
      'n1', 'Task', 'open_app', {}, 'in_progress', 'initial output'
    );
    useGraphStore.getState().updateNodeStatus('n1', 'done');
    const node = useGraphStore.getState().nodes[0];
    expect(node.data.status).toBe('done');
    expect(node.data.output).toBe('initial output');
  });

  it('addEdge creates edge', () => {
    useGraphStore.getState().addGraphNode('n1', 'A', 'task', {});
    useGraphStore.getState().addGraphNode('n2', 'B', 'task', {});
    useGraphStore.getState().addEdge('n1', 'n2');
    const { edges } = useGraphStore.getState();
    expect(edges).toHaveLength(1);
    expect(edges[0].source).toBe('n1');
    expect(edges[0].target).toBe('n2');
    expect(edges[0].animated).toBe(true);
  });

  it('addEdge deduplicates', () => {
    useGraphStore.getState().addGraphNode('n1', 'A', 'task', {});
    useGraphStore.getState().addGraphNode('n2', 'B', 'task', {});
    useGraphStore.getState().addEdge('n1', 'n2');
    useGraphStore.getState().addEdge('n1', 'n2');
    expect(useGraphStore.getState().edges).toHaveLength(1);
  });

  it('clearGraph empties everything', () => {
    useGraphStore.getState().addGraphNode('n1', 'A', 'task', {});
    useGraphStore.getState().addGraphNode('n2', 'B', 'task', {});
    useGraphStore.getState().addEdge('n1', 'n2');
    useGraphStore.getState().clearGraph();
    const state = useGraphStore.getState();
    expect(state.nodes).toHaveLength(0);
    expect(state.edges).toHaveLength(0);
  });

  it('handles multiple nodes and edges', () => {
    useGraphStore.getState().addGraphNode('a', 'Step 1', 'open_app', {});
    useGraphStore.getState().addGraphNode('b', 'Step 2', 'navigate_browser', {});
    useGraphStore.getState().addGraphNode('c', 'Step 3', 'get_browser_content', {});
    useGraphStore.getState().addEdge('a', 'b');
    useGraphStore.getState().addEdge('b', 'c');

    const { nodes, edges } = useGraphStore.getState();
    expect(nodes).toHaveLength(3);
    expect(edges).toHaveLength(2);
  });
});
