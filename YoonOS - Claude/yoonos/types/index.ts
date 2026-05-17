export type AppName = 'finder' | 'browser' | 'calendar' | 'photobooth' | 'textedit' | 'systemsettings';

export type WindowState = {
  id: string;
  app: AppName;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  minimized: boolean;
  maximized: boolean;
  previousBounds?: { x: number; y: number; width: number; height: number };
};

export type CalendarEvent = {
  id: string;
  date: string;
  title: string;
  notes?: string;
  createdAt: string;
};

export type TextFile = {
  id: string;
  name: string;
  content: string;
  updatedAt: string;
};

export type AgentMessage = {
  role: 'user' | 'assistant';
  content: string | ContentBlock[];
};

export type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool_use_id: string; content: string };

export type AgentStatus = 'idle' | 'running' | 'awaiting_approval' | 'done' | 'error' | 'interrupted';

export type ToolCallLogEntry = {
  id: string;
  toolName: string;
  input: Record<string, unknown>;
  output: string | null;
  status: 'pending' | 'in_progress' | 'done' | 'error';
  startedAt: string;
  completedAt: string | null;
};

export type GraphNodeStatus = 'pending' | 'in_progress' | 'done' | 'error' | 'interrupted';

export type GraphNodeData = {
  label: string;
  toolName: string;
  status: GraphNodeStatus;
  input: Record<string, unknown>;
  output: string | null;
  timestamp: string;
};

export type PlanBranchOption = {
  id: string;
  title: string;
  summary: string;
  tradeoff: string;
};

// Supabase row types

export type UserProfile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
};

export type WallpaperType = 'preset' | 'custom' | 'color';

export type UserSettings = {
  id: string;
  wallpaper_type: WallpaperType;
  wallpaper_value: string;
  dock_position: 'bottom';
  updated_at: string;
};

export type DBFile = {
  id: string;
  user_id: string;
  name: string;
  content: string;
  created_at: string;
  updated_at: string;
};

export type DBCalendarEvent = {
  id: string;
  user_id: string;
  date: string;
  title: string;
  notes: string | null;
  created_at: string;
};

export type DBPhoto = {
  id: string;
  user_id: string;
  storage_path: string;
  captured_at: string;
};

export type AgentStreamEvent =
  | {
      type: 'tool_start';
      toolCallId: string;
      toolName: string;
      input: Record<string, unknown>;
      parentNodeId?: string;
    }
  | { type: 'tool_done'; toolCallId: string; output: string }
  | { type: 'tool_error'; toolCallId: string; error: string }
  | {
      type: 'graph_node';
      nodeId: string;
      label: string;
      toolName: string;
      input: Record<string, unknown>;
      status: GraphNodeStatus;
      output?: string | null;
    }
  | { type: 'graph_edge'; sourceId: string; targetId: string }
  | {
      type: 'planner_ready';
      branches: PlanBranchOption[];
      recommendedBranchId: string;
      rationale: string;
    }
  | { type: 'text'; content: string }
  | { type: 'done' }
  | { type: 'error'; message: string };
