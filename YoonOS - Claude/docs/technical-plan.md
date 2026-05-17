# Technical Plan

## YoonOS — Specification for AI Coding Agents

**Version:** 1.0  
**Date:** 2026-05-10  
**Intended Reader:** AI coding agent (Claude Code, Cursor, Codex, etc.)

---

## Instructions for the AI Coding Agent

This document is your implementation spec. Read it fully before writing any code. Each section tells you exactly what to build, what libraries to use, and how the pieces connect. Follow the phases in order. Do not skip ahead. After each milestone, verify the stated success criteria before moving to the next.

---

## 1. Tech Stack


| Layer               | Technology        | Version         | Notes                                                                            |
| ------------------- | ----------------- | --------------- | -------------------------------------------------------------------------------- |
| Framework           | Next.js           | 14 (App Router) | Use the `app/` directory. Use TypeScript throughout.                             |
| UI                  | React             | 18              | Functional components with hooks only. No class components.                      |
| Styling             | Tailwind CSS      | 3               | No custom CSS files. Use Tailwind utilities only.                                |
| Auth + DB + Storage | Supabase          | latest          | `npm install @supabase/supabase-js @supabase/ssr`. Single service for all three. |
| State               | Zustand           | 4               | One store file per domain (windows, agent, calendar, etc.).                      |
| Graph               | React Flow        | 11              | `npm install reactflow`. Import styles: `import 'reactflow/dist/style.css'`.     |
| Drag                | react-draggable   | latest          | Use for window dragging.                                                         |
| Icons               | lucide-react      | latest          | Use for all UI icons.                                                            |
| HTTP (client)       | Native `fetch`    | —               | No axios on the client side.                                                     |
| HTTP (proxy)        | axios             | latest          | Used server-side in the proxy service only.                                      |
| HTML parsing        | cheerio           | latest          | Server-side only, in the proxy service.                                          |
| AI SDK              | @anthropic-ai/sdk | latest          | `npm install @anthropic-ai/sdk`.                                                 |
| Deployment          | Vercel            | —               | Frontend + API routes.                                                           |
| Proxy service       | Railway           | —               | Separate Node.js/Express service.                                                |


---

## 2. Repository Structure

```
yoonos/
├── middleware.ts               # Route protection (Supabase session check)
├── app/
│   ├── layout.tsx              # Root layout, imports globals.css
│   ├── (auth)/
│   │   ├── layout.tsx          # Auth layout: centered, no OS chrome
│   │   └── login/
│   │       └── page.tsx        # Login + signup tabs
│   ├── (os)/
│   │   ├── layout.tsx          # OS layout: full screen
│   │   └── desktop/
│   │       └── page.tsx        # Server component: session gate + data fetch
│   └── api/
│       └── agent/
│           └── route.ts        # POST /api/agent — streaming agent endpoint
├── components/
│   ├── os/
│   │   ├── Desktop.tsx         # Full-screen desktop shell
│   │   ├── DesktopClient.tsx   # Client component: hydrates stores, renders OS
│   │   ├── TopBar.tsx          # Fixed top bar with clock + user name
│   │   ├── Dock.tsx            # Fixed bottom dock with app icons
│   │   └── Window.tsx          # Draggable, resizable window wrapper
│   ├── apps/
│   │   ├── BrowserApp.tsx      # Browser with URL bar + iframe
│   │   ├── CalendarApp.tsx     # Monthly calendar with Supabase-synced events
│   │   ├── PhotoBoothApp.tsx   # Webcam feed + Supabase Storage upload
│   │   ├── TextEditApp.tsx     # Text editor with Supabase-synced files
│   │   └── SystemSettingsApp.tsx  # Wallpaper, profile, account, sign out
│   ├── agent/
│   │   ├── ChatBar.tsx         # Fixed bottom chat input
│   │   └── AgentGraph.tsx      # React Flow graph component
│   └── ui/
│       └── Tooltip.tsx         # Reusable tooltip component
├── stores/
│   ├── authStore.ts            # Current user, profile, settings
│   ├── windowStore.ts          # Open windows state
│   ├── agentStore.ts           # Agent run state + tool call log
│   ├── graphStore.ts           # Graph nodes and edges
│   ├── calendarStore.ts        # Calendar events (Supabase-synced)
│   ├── textEditStore.ts        # Text editor files (Supabase-synced)
│   ├── browserStore.ts         # Browser current URL + history
│   └── photoBoothStore.ts      # Recent photo signed URLs
├── lib/
│   ├── supabase/
│   │   ├── client.ts           # Browser Supabase client
│   │   └── server.ts           # Server Supabase client (for API routes + RSC)
│   ├── storage/
│   │   ├── textFiles.ts        # CRUD helpers for files table
│   │   ├── photos.ts           # Photo capture + upload helpers
│   │   ├── wallpapers.ts       # Wallpaper upload helper
│   │   └── settings.ts         # updateUserSettings helper
│   ├── agent/
│   │   ├── tools.ts            # Tool schema definitions (for Claude)
│   │   ├── toolHandlers.ts     # Tool execution functions
│   │   └── agentLoop.ts        # Main agent execution loop
│   └── proxy/
│       └── client.ts           # Client for calling the proxy service
├── hooks/
│   └── useClock.ts             # Returns current time string, updates every second
├── types/
│   └── index.ts                # All shared TypeScript types
├── proxy-service/              # Separate Express app, deployed to Railway
│   ├── index.js                # Express server
│   ├── package.json
│   └── Dockerfile
└── public/
    └── wallpaper.jpg           # Fallback desktop background image
```

---

## 3. TypeScript Types

Define all shared types in `types/index.ts`.

```typescript
// types/index.ts

export type AppName = 'browser' | 'calendar' | 'photobooth' | 'textedit';

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
};

export type CalendarEvent = {
  id: string;
  date: string;       // ISO date string: "YYYY-MM-DD"
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

export type AgentStatus = 'idle' | 'running' | 'done' | 'error' | 'interrupted';

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

export type AgentStreamEvent =
  | { type: 'tool_start'; toolCallId: string; toolName: string; input: Record<string, unknown> }
  | { type: 'tool_done'; toolCallId: string; output: string }
  | { type: 'tool_error'; toolCallId: string; error: string }
  | { type: 'text'; content: string }
  | { type: 'done' }
  | { type: 'error'; message: string };
```

---

## 4. Zustand Stores

### 4.1 windowStore.ts

```typescript
import { create } from 'zustand';
import { WindowState, AppName } from '@/types';

const DEFAULT_SIZES: Record<AppName, { width: number; height: number }> = {
  browser: { width: 800, height: 600 },
  calendar: { width: 600, height: 500 },
  photobooth: { width: 500, height: 450 },
  textedit: { width: 650, height: 520 },
};

const APP_TITLES: Record<AppName, string> = {
  browser: 'Browser',
  calendar: 'Calendar',
  photobooth: 'Photo Booth',
  textedit: 'Text Edit',
};

type WindowStore = {
  windows: WindowState[];
  maxZIndex: number;
  openWindow: (app: AppName) => void;
  closeWindow: (id: string) => void;
  bringToFront: (id: string) => void;
  minimizeWindow: (id: string) => void;
  updatePosition: (id: string, x: number, y: number) => void;
  updateSize: (id: string, width: number, height: number) => void;
};

export const useWindowStore = create<WindowStore>((set, get) => ({
  windows: [],
  maxZIndex: 10,
  openWindow: (app) => {
    const existing = get().windows.find((w) => w.app === app);
    if (existing) {
      get().bringToFront(existing.id);
      return;
    }
    const newZ = get().maxZIndex + 1;
    const { width, height } = DEFAULT_SIZES[app];
    set((state) => ({
      maxZIndex: newZ,
      windows: [
        ...state.windows,
        {
          id: crypto.randomUUID(),
          app,
          title: APP_TITLES[app],
          x: 80 + Math.random() * 40,
          y: 60 + Math.random() * 40,
          width,
          height,
          zIndex: newZ,
          minimized: false,
        },
      ],
    }));
  },
  closeWindow: (id) =>
    set((state) => ({ windows: state.windows.filter((w) => w.id !== id) })),
  bringToFront: (id) => {
    const newZ = get().maxZIndex + 1;
    set((state) => ({
      maxZIndex: newZ,
      windows: state.windows.map((w) => (w.id === id ? { ...w, zIndex: newZ } : w)),
    }));
  },
  minimizeWindow: (id) =>
    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === id ? { ...w, minimized: !w.minimized } : w
      ),
    })),
  updatePosition: (id, x, y) =>
    set((state) => ({
      windows: state.windows.map((w) => (w.id === id ? { ...w, x, y } : w)),
    })),
  updateSize: (id, width, height) =>
    set((state) => ({
      windows: state.windows.map((w) => (w.id === id ? { ...w, width, height } : w)),
    })),
}));
```

### 4.2 graphStore.ts

```typescript
import { create } from 'zustand';
import { Node, Edge } from 'reactflow';
import { GraphNodeData, GraphNodeStatus } from '@/types';

type GraphStore = {
  nodes: Node<GraphNodeData>[];
  edges: Edge[];
  isExpanded: boolean;
  addNode: (id: string, toolName: string, input: Record<string, unknown>) => void;
  updateNodeStatus: (id: string, status: GraphNodeStatus, output?: string) => void;
  addEdge: (sourceId: string, targetId: string) => void;
  clearGraph: () => void;
  setExpanded: (expanded: boolean) => void;
};

export const useGraphStore = create<GraphStore>((set, get) => ({
  nodes: [],
  edges: [],
  isExpanded: false,
  addNode: (id, toolName, input) => {
    const existingNodes = get().nodes;
    const label = Object.values(input)[0] as string || toolName;
    const newNode: Node<GraphNodeData> = {
      id,
      type: 'agentNode',
      position: { x: existingNodes.length * 180, y: Math.random() * 100 },
      data: {
        label,
        toolName,
        status: 'in_progress',
        input,
        output: null,
        timestamp: new Date().toISOString(),
      },
    };
    set((state) => ({ nodes: [...state.nodes, newNode] }));
  },
  updateNodeStatus: (id, status, output) =>
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, status, output: output ?? n.data.output } } : n
      ),
    })),
  addEdge: (sourceId, targetId) => {
    const edgeId = `${sourceId}->${targetId}`;
    set((state) => ({
      edges: [
        ...state.edges,
        { id: edgeId, source: sourceId, target: targetId, animated: true },
      ],
    }));
  },
  clearGraph: () => set({ nodes: [], edges: [] }),
  setExpanded: (expanded) => set({ isExpanded: expanded }),
}));
```

---

## 5. Agent Tool Definitions

Define all tools in `lib/agent/tools.ts`. These are passed to the Claude API.

```typescript
import Anthropic from '@anthropic-ai/sdk';

export const AGENT_TOOLS: Anthropic.Tool[] = [
  {
    name: 'open_app',
    description: 'Opens one of the OS apps and brings it to the foreground.',
    input_schema: {
      type: 'object',
      properties: {
        app_name: {
          type: 'string',
          enum: ['browser', 'calendar', 'photobooth', 'textedit'],
          description: 'The app to open.',
        },
      },
      required: ['app_name'],
    },
  },
  {
    name: 'navigate_browser',
    description: 'Navigates the Browser app to a given URL.',
    input_schema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The full URL to navigate to (include https://).',
        },
      },
      required: ['url'],
    },
  },
  {
    name: 'get_browser_content',
    description: 'Returns the plain text content of the currently loaded page in the Browser app. Use this after navigating to read what is on the page.',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'type_in_text_editor',
    description: 'Writes or appends text content to the currently active file in the Text Edit app. Opens the app if not already open.',
    input_schema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'The text to write into the editor.',
        },
        mode: {
          type: 'string',
          enum: ['replace', 'append'],
          description: 'Whether to replace existing content or append to it. Default: replace.',
        },
      },
      required: ['content'],
    },
  },
  {
    name: 'get_text_editor_content',
    description: 'Returns the current text content of the active file in the Text Edit app.',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'create_calendar_event',
    description: 'Creates a new event in the Calendar app.',
    input_schema: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'The date for the event in YYYY-MM-DD format.',
        },
        title: {
          type: 'string',
          description: 'The title or name of the event.',
        },
        notes: {
          type: 'string',
          description: 'Optional notes or description for the event.',
        },
      },
      required: ['date', 'title'],
    },
  },
  {
    name: 'get_calendar_events',
    description: 'Returns all events for a given date.',
    input_schema: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'The date to query in YYYY-MM-DD format.',
        },
      },
      required: ['date'],
    },
  },
  {
    name: 'capture_photo',
    description: 'Triggers the Photo Booth app to take a photo using the webcam.',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
];
```

---

## 6. API Route: /api/agent

This is the backend endpoint the frontend calls to start an agent run.

```typescript
// app/api/agent/route.ts
import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { AGENT_TOOLS } from '@/lib/agent/tools';
import { AgentMessage } from '@/types';

const client = new Anthropic();

const SYSTEM_PROMPT = `You are an AI agent operating inside YoonOS, a web-based operating system. You have access to four apps: Browser, Calendar, Photo Booth, and Text Edit.

When given a task:
1. Break it into logical steps.
2. Use the appropriate tools to complete each step.
3. Always open an app before interacting with it.
4. After navigating the browser to a URL, always call get_browser_content to read what is on the page before drawing conclusions.
5. When you are done, provide a brief, friendly summary of what you accomplished.

Be efficient. Do not repeat steps. Do not ask clarifying questions — make a reasonable assumption and proceed.`;

export async function POST(req: NextRequest) {
  const { task, conversationHistory }: { task: string; conversationHistory: AgentMessage[] } =
    await req.json();

  const messages: AgentMessage[] = [
    ...conversationHistory,
    { role: 'user', content: task },
  ];

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      try {
        let continueLoop = true;

        while (continueLoop) {
          const response = await client.messages.create({
            model: 'claude-sonnet-4-5',
            max_tokens: 4096,
            system: SYSTEM_PROMPT,
            tools: AGENT_TOOLS,
            messages: messages as Anthropic.MessageParam[],
          });

          const toolCalls = response.content.filter((b) => b.type === 'tool_use');
          const textBlocks = response.content.filter((b) => b.type === 'text');

          for (const block of textBlocks) {
            if (block.type === 'text') {
              send({ type: 'text', content: block.text });
            }
          }

          if (response.stop_reason === 'end_turn' || toolCalls.length === 0) {
            continueLoop = false;
            send({ type: 'done' });
            break;
          }

          messages.push({ role: 'assistant', content: response.content });

          const toolResults: Anthropic.ToolResultBlockParam[] = [];

          for (const toolUse of toolCalls) {
            if (toolUse.type !== 'tool_use') continue;

            send({
              type: 'tool_start',
              toolCallId: toolUse.id,
              toolName: toolUse.name,
              input: toolUse.input,
            });

            // Tool execution happens client-side via store updates.
            // The server signals the client what to do; the client executes and returns the result
            // via a second mechanism. For Phase 1, tools are executed server-side where possible
            // (browser content fetching) or return an acknowledgment.
            let result = '';
            try {
              result = await executeToolServerSide(toolUse.name, toolUse.input as Record<string, unknown>);
              send({ type: 'tool_done', toolCallId: toolUse.id, output: result });
            } catch (err) {
              result = `Error: ${(err as Error).message}`;
              send({ type: 'tool_error', toolCallId: toolUse.id, error: result });
            }

            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: result,
            });
          }

          messages.push({ role: 'user', content: toolResults });
        }
      } catch (err) {
        send({ type: 'error', message: (err as Error).message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

async function executeToolServerSide(
  toolName: string,
  input: Record<string, unknown>
): Promise<string> {
  // Tools that can be executed server-side:
  if (toolName === 'get_browser_content') {
    // Fetch and parse the current page content
    // Note: current URL must be passed from client or stored in session
    return 'Page content fetched. (Implementation: pass currentUrl from client in request body.)';
  }
  // All other tools: the client handles them. Return acknowledgment.
  return JSON.stringify({ status: 'ok', tool: toolName, input });
}
```

**Note for AI agent implementing this:** The tool execution architecture has two parts. Server-side tools (like `get_browser_content`) can be executed in the API route using the proxy service. Client-side tools (like `open_app`, `navigate_browser`, `type_in_text_editor`) need to be dispatched to the React stores in the frontend. The SSE events tell the frontend what to do, and the frontend updates its stores accordingly. The results are then sent back to the server in the next iteration via the `conversationHistory` in the request body.

---

## 7. Proxy Service

Deploy this as a separate service on Railway.

```javascript
// proxy-service/index.js
const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();
app.use(cors());

// Visual proxy: strips blocking headers, rewrites links
app.get('/proxy', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).send('Missing url parameter');

  try {
    const response = await axios.get(targetUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; YoonOS/1.0)' },
      timeout: 10000,
    });

    // Strip security headers that block iframe embedding
    res.removeHeader('X-Frame-Options');
    res.setHeader('Content-Security-Policy', '');

    // Rewrite relative links and assets to go through the proxy
    const $ = cheerio.load(response.data);
    const base = new URL(targetUrl);
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (href && href.startsWith('/')) {
        $(el).attr('href', `/proxy?url=${base.origin}${href}`);
      }
    });

    res.setHeader('Content-Type', 'text/html');
    res.send($.html());
  } catch (err) {
    res.status(500).send(`Proxy error: ${err.message}`);
  }
});

// Content proxy: returns clean plain text for agent reading
app.get('/content', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).send('Missing url parameter');

  try {
    const response = await axios.get(targetUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; YoonOS/1.0)' },
      timeout: 10000,
    });

    const $ = cheerio.load(response.data);
    // Remove scripts, styles, nav, footer
    $('script, style, nav, footer, header, aside').remove();
    const text = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 8000);

    res.json({ url: targetUrl, content: text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3001, () => console.log('Proxy service running on port 3001'));
```

```json
// proxy-service/package.json
{
  "name": "yoonos-proxy",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": { "start": "node index.js" },
  "dependencies": {
    "express": "^4.18.0",
    "axios": "^1.6.0",
    "cheerio": "^1.0.0-rc.12",
    "cors": "^2.8.5"
  }
}
```

---

## 8. React Flow Graph Component

```typescript
// components/agent/AgentGraph.tsx
'use client';

import ReactFlow, {
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  Node,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useGraphStore } from '@/stores/graphStore';
import { GraphNodeData } from '@/types';
import { useEffect } from 'react';

const STATUS_COLORS: Record<string, string> = {
  pending: '#6b7280',
  in_progress: '#3b82f6',
  done: '#22c55e',
  error: '#ef4444',
  interrupted: '#f59e0b',
};

function AgentNode({ data }: { data: GraphNodeData }) {
  return (
    <div
      className="px-3 py-2 rounded-lg text-white text-xs max-w-32 text-center"
      style={{ backgroundColor: STATUS_COLORS[data.status] }}
      title={`${data.toolName}: ${JSON.stringify(data.input)}`}
    >
      <div className="font-bold truncate">{data.toolName.replace(/_/g, ' ')}</div>
      <div className="truncate opacity-75">{data.label}</div>
    </div>
  );
}

const nodeTypes = { agentNode: AgentNode };

export default function AgentGraph() {
  const { nodes: storeNodes, edges: storeEdges, isExpanded } = useGraphStore();
  const [nodes, setNodes] = useNodesState([]);
  const [edges, setEdges] = useEdgesState([]);

  useEffect(() => {
    setNodes(storeNodes as Node[]);
  }, [storeNodes, setNodes]);

  useEffect(() => {
    setEdges(storeEdges);
  }, [storeEdges, setEdges]);

  if (!isExpanded) {
    // Mini-map mode: fixed bottom-right panel
    return (
      <div className="fixed bottom-24 right-4 w-72 h-48 bg-black/70 rounded-xl border border-white/10 overflow-hidden z-50">
        <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView>
          <Background color="#333" gap={12} />
        </ReactFlow>
      </div>
    );
  }

  // Full-screen mode
  return (
    <div className="fixed inset-0 bg-black/90 z-50">
      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView>
        <Background color="#333" gap={12} />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}
```

---

## 9. Environment Variables

```bash
# .env.local (never commit this file)
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_PROXY_BASE_URL=https://your-proxy.railway.app
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Vercel environment variables (set in Vercel dashboard — same five keys):
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_PROXY_BASE_URL=https://your-proxy.railway.app
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## 10. Implementation Order for AI Coding Agents

Follow this exact order. Each step should be implemented and verified before moving on.

**Phase 0 — Backend Foundation (do first)**

1. Run all SQL from `docs/backend/database-schema.md` in Supabase SQL Editor.
2. Create storage buckets + run storage policies from `docs/backend/file-storage.md`.
3. `lib/supabase/client.ts` and `lib/supabase/server.ts` — Supabase clients.
4. `middleware.ts` — Route protection.
5. `app/(auth)/login/page.tsx` — Login/signup screen.
6. `stores/authStore.ts` — Auth state.
7. `app/(os)/desktop/page.tsx` (server component) — Session gate + data fetch.
8. `components/os/DesktopClient.tsx` (placeholder) — Hydrates auth store, renders blank desktop.

**Phase 1 — OS Shell**
9. `types/index.ts` — All types (including backend types from `docs/backend/database-schema.md`).
10. All Zustand stores — Replace in-memory stores with Supabase-synced versions.
11. `components/os/Desktop.tsx`, `TopBar.tsx`, `Dock.tsx` — Full OS shell.
12. `components/os/Window.tsx` — Window manager.
13. `components/apps/BrowserApp.tsx` + proxy service.
14. `components/apps/CalendarApp.tsx` — Supabase-synced.
15. `components/apps/PhotoBoothApp.tsx` — Uploads to Supabase Storage.
16. `components/apps/TextEditApp.tsx` — Supabase-synced.
17. `components/apps/SystemSettingsApp.tsx` — Wallpaper, profile, sign out.

**Phase 2 — Agent**
18. `lib/agent/tools.ts` — Tool definitions.
19. `app/api/agent/route.ts` — Agent API route.
20. `lib/agent/toolHandlers.ts` — Client-side tool handlers.
21. `components/agent/ChatBar.tsx` — Chat input.

**Phase 3 — Graph**
22. `stores/graphStore.ts` + `components/agent/AgentGraph.tsx` — Graph last.

---

## 11. Key Implementation Notes

- **Never use `any` type in TypeScript.** Use proper types from `types/index.ts`.
- **All stores use Zustand with no persistence in Phase 1.** Data lives in memory only.
- **The proxy service is deployed separately.** Do not try to run it inside Next.js API routes (Vercel timeout limits make this unreliable for large page fetches).
- **SSE streaming from Next.js:** Use `ReadableStream` with `text/event-stream` content type. The client reads events with `EventSource` or a custom `fetch` stream reader.
- **React Flow version:** Use v11 (the `reactflow` package). Do not confuse it with the older `react-flow-renderer` package.
- **Tailwind in Next.js:** Ensure `tailwind.config.ts` includes `'./app/**/*.{ts,tsx}'` and `'./components/**/*.{ts,tsx}'` in the `content` array.
- **Window dragging and z-index:** Use CSS `position: absolute` for windows inside the `Desktop` div. The Desktop must have `position: relative` and `overflow: hidden`.

