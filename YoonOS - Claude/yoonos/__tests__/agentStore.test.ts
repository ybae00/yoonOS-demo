import { useAgentStore } from '../stores/agentStore';

beforeEach(() => {
  useAgentStore.setState({
    status: 'idle',
    currentTask: null,
    responseText: '',
    toolCallLog: [],
    error: null,
    abortController: null,
    currentBrowserUrl: null,
    planBranches: [],
    recommendedBranchId: null,
    plannerRationale: null,
  });
});

describe('agentStore', () => {
  it('starts idle', () => {
    expect(useAgentStore.getState().status).toBe('idle');
    expect(useAgentStore.getState().currentTask).toBeNull();
  });

  it('startTask sets running state and returns AbortController', () => {
    const controller = useAgentStore.getState().startTask('test task');
    const state = useAgentStore.getState();
    expect(state.status).toBe('running');
    expect(state.currentTask).toBe('test task');
    expect(state.responseText).toBe('');
    expect(state.toolCallLog).toHaveLength(0);
    expect(state.error).toBeNull();
    expect(controller).toBeInstanceOf(AbortController);
  });

  it('startTask clears previous plan branches', () => {
    useAgentStore.getState().setPlanApproval(
      [{ id: '1', title: 'Plan A', summary: 'Do A', tradeoff: 'fast' }],
      '1',
      'because'
    );
    expect(useAgentStore.getState().planBranches).toHaveLength(1);
    useAgentStore.getState().startTask('new task');
    expect(useAgentStore.getState().planBranches).toHaveLength(0);
    expect(useAgentStore.getState().recommendedBranchId).toBeNull();
  });

  it('appendResponseText accumulates text', () => {
    useAgentStore.getState().startTask('task');
    useAgentStore.getState().appendResponseText('Hello ');
    useAgentStore.getState().appendResponseText('world');
    expect(useAgentStore.getState().responseText).toBe('Hello world');
  });

  it('addToolCall and updateToolCall manage tool call log', () => {
    useAgentStore.getState().addToolCall({
      id: 'tc1',
      toolName: 'navigate_browser',
      input: { url: 'https://example.com' },
      output: null,
      status: 'in_progress',
      startedAt: '2025-01-01',
      completedAt: null,
    });
    expect(useAgentStore.getState().toolCallLog).toHaveLength(1);
    expect(useAgentStore.getState().toolCallLog[0].status).toBe('in_progress');

    useAgentStore.getState().updateToolCall('tc1', {
      status: 'done',
      output: 'OK',
      completedAt: '2025-01-01',
    });
    const updated = useAgentStore.getState().toolCallLog[0];
    expect(updated.status).toBe('done');
    expect(updated.output).toBe('OK');
  });

  it('abort sets interrupted and nulls controller', () => {
    const controller = useAgentStore.getState().startTask('task');
    expect(controller.signal.aborted).toBe(false);
    useAgentStore.getState().abort();
    expect(useAgentStore.getState().status).toBe('interrupted');
    expect(useAgentStore.getState().abortController).toBeNull();
    expect(controller.signal.aborted).toBe(true);
  });

  it('setPlanApproval transitions to awaiting_approval', () => {
    useAgentStore.getState().startTask('task');
    useAgentStore.getState().setPlanApproval(
      [
        { id: 'b1', title: 'Fast', summary: 'Go fast', tradeoff: 'risky' },
        { id: 'b2', title: 'Safe', summary: 'Go safe', tradeoff: 'slow' },
      ],
      'b1',
      'Fast is best'
    );
    const state = useAgentStore.getState();
    expect(state.status).toBe('awaiting_approval');
    expect(state.planBranches).toHaveLength(2);
    expect(state.recommendedBranchId).toBe('b1');
    expect(state.plannerRationale).toBe('Fast is best');
  });

  it('startApprovedTask keeps currentTask but resets other state', () => {
    useAgentStore.getState().startTask('original task');
    useAgentStore.getState().appendResponseText('old response');
    const controller = useAgentStore.getState().startApprovedTask();
    const state = useAgentStore.getState();
    expect(state.status).toBe('running');
    expect(state.responseText).toBe('');
    expect(state.toolCallLog).toHaveLength(0);
    expect(controller).toBeInstanceOf(AbortController);
  });

  it('setError sets error status', () => {
    useAgentStore.getState().startTask('task');
    useAgentStore.getState().setError('Something broke');
    const state = useAgentStore.getState();
    expect(state.status).toBe('error');
    expect(state.error).toBe('Something broke');
  });

  it('reset returns to idle state', () => {
    useAgentStore.getState().startTask('task');
    useAgentStore.getState().appendResponseText('stuff');
    useAgentStore.getState().reset();
    const state = useAgentStore.getState();
    expect(state.status).toBe('idle');
    expect(state.currentTask).toBeNull();
    expect(state.responseText).toBe('');
    expect(state.error).toBeNull();
  });

  it('setCurrentBrowserUrl tracks url', () => {
    useAgentStore.getState().setCurrentBrowserUrl('https://example.com');
    expect(useAgentStore.getState().currentBrowserUrl).toBe('https://example.com');
    useAgentStore.getState().setCurrentBrowserUrl(null);
    expect(useAgentStore.getState().currentBrowserUrl).toBeNull();
  });
});
