import { create } from 'zustand';
import { AgentStatus, PlanBranchOption, ToolCallLogEntry } from '@/types';

type AgentStore = {
  status: AgentStatus;
  currentTask: string | null;
  responseText: string;
  toolCallLog: ToolCallLogEntry[];
  error: string | null;
  abortController: AbortController | null;
  currentBrowserUrl: string | null;
  planBranches: PlanBranchOption[];
  recommendedBranchId: string | null;
  plannerRationale: string | null;

  setStatus: (status: AgentStatus) => void;
  startTask: (task: string) => AbortController;
  startApprovedTask: () => AbortController;
  setPlanApproval: (
    branches: PlanBranchOption[],
    recommendedBranchId: string,
    rationale: string
  ) => void;
  appendResponseText: (text: string) => void;
  addToolCall: (entry: ToolCallLogEntry) => void;
  updateToolCall: (id: string, updates: Partial<ToolCallLogEntry>) => void;
  setError: (error: string | null) => void;
  abort: () => void;
  reset: () => void;
  setCurrentBrowserUrl: (url: string | null) => void;
};

export const useAgentStore = create<AgentStore>((set, get) => ({
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

  setStatus: (status) => set({ status }),

  startTask: (task) => {
    const controller = new AbortController();
    set({
      status: 'running',
      currentTask: task,
      responseText: '',
      toolCallLog: [],
      error: null,
      abortController: controller,
      planBranches: [],
      recommendedBranchId: null,
      plannerRationale: null,
    });
    return controller;
  },

  startApprovedTask: () => {
    const controller = new AbortController();
    set({
      status: 'running',
      responseText: '',
      toolCallLog: [],
      error: null,
      abortController: controller,
    });
    return controller;
  },

  setPlanApproval: (branches, recommendedBranchId, rationale) =>
    set({
      status: 'awaiting_approval',
      planBranches: branches,
      recommendedBranchId,
      plannerRationale: rationale,
      abortController: null,
    }),

  appendResponseText: (text) =>
    set((state) => ({ responseText: state.responseText + text })),

  addToolCall: (entry) =>
    set((state) => ({ toolCallLog: [...state.toolCallLog, entry] })),

  updateToolCall: (id, updates) =>
    set((state) => ({
      toolCallLog: state.toolCallLog.map((t) =>
        t.id === id ? { ...t, ...updates } : t
      ),
    })),

  setError: (error) => set({ error, status: error ? 'error' : get().status }),

  abort: () => {
    const controller = get().abortController;
    if (controller) controller.abort();
    set({ status: 'interrupted', abortController: null });
  },

  reset: () =>
    set({
      status: 'idle',
      currentTask: null,
      responseText: '',
      toolCallLog: [],
      error: null,
      abortController: null,
      planBranches: [],
      recommendedBranchId: null,
      plannerRationale: null,
    }),

  setCurrentBrowserUrl: (url) => set({ currentBrowserUrl: url }),
}));
