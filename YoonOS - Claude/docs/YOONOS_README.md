# YoonOS — Master Reference

This is the single source of truth for the entire codebase. Every file in the project is listed here with its role, what it owns, and what to know before editing it.

---

## Project Overview

YoonOS is a browser-native operating system powered by an AI agent. The core experience: you type a task, the desktop slides right to reveal a full-screen Obsidian-style node graph on the left, and the agent works through your task step by step, each action appearing as a live node. The graph is the main screen — not a widget.

**Stack:** Next.js 14 (App Router), React, Tailwind CSS, Zustand, Anthropic Claude API (tool use + SSE streaming), react-force-graph-2d, Supabase (auth + storage), Vercel + Railway.

---

## Directory Map

```
yoonos/
├── app/                    Next.js App Router pages and API routes
├── components/             React UI components
│   ├── agent/              Agent graph and chat bar
│   ├── apps/               Individual OS app UIs
│   └── os/                 Core OS shell (desktop, windows, dock, topbar)
├── stores/                 Zustand global state
├── lib/                    Business logic, agent loop, tool handlers
├── types/                  TypeScript type definitions
├── hooks/                  Custom React hooks
├── electron/               Electron wrapper (native desktop builds)
├── proxy-service/          Standalone browser proxy service (Railway)
├── public/                 Static assets (app icons, wallpapers)
└── docs/                   Design documents
```

---

## UI Paradigm (Layout)

```
┌─────────────────────────────────────────────────────────────┐
│                  [Take Over] (top center, z-[9999])          │
│                  visible only while agent runs               │
├───────────────────────────┬─────────────────────────────────┤
│                           │                                  │
│   Graph Panel (left 50%)  │   Desktop Panel (right 50%)      │
│   white bg                │   wallpaper + windows + dock     │
│   Obsidian-style nodes    │   slides right when graph opens  │
│   AgentGraph.tsx          │   Desktop.tsx                    │
│                           │                                  │
│   hover node              │   → desktop switches to that app │
│   click node              │   → aborts agent at that step    │
│                           │                                  │
├───────────────────────────┴─────────────────────────────────┤
│                  [Prompt Bar] (bottom center)                 │
│                  ChatBar.tsx, z-[9998]                        │
└─────────────────────────────────────────────────────────────┘
```

When the agent is idle or the graph has no nodes, the graph panel is hidden and the desktop expands to full screen. The transition is a CSS cubic-bezier slide on the `left` property.

---

## File Reference

### app/

**`app/layout.tsx`**
Root HTML shell. Sets fonts, global CSS, `<html>` and `<body>` tags.

**`app/globals.css`**
Global Tailwind base styles and any custom CSS resets.

**`app/page.tsx`**
Root redirect — sends `/` to `/desktop` (or `/login` if unauthenticated).

**`app/(auth)/layout.tsx`**
Layout wrapper for the login/auth flow pages.

**`app/(auth)/login/page.tsx`**
Login page UI. Handles Supabase email/password auth and redirects on success.

**`app/(os)/layout.tsx`**
Layout wrapper for the OS route group. Applies any OS-level CSS.

**`app/(os)/desktop/page.tsx`**
Server component. Fetches the authenticated user's profile and settings from Supabase, then renders `<DesktopClient>` with that data as props.

**`app/api/agent/route.ts`**
Streaming SSE endpoint for the agent. Receives the user task and conversation history, calls the Claude API with tool use, and streams back `AgentStreamEvent` objects. Each tool call is streamed as it starts and completes.

**`app/api/browser/proxy/route.ts`**
Proxies external HTTP requests for the Browser app iframe. Strips `X-Frame-Options` and CSP headers so sites can be embedded. Rewrites internal links to stay in the proxy.

**`app/api/browser/content/route.ts`**
Returns clean plain-text content of a proxied URL for the agent to read (separate from the visual iframe render). Uses JSDOM/Cheerio to parse.

---

### components/os/

**`components/os/Desktop.tsx`**
The root OS layout. Owns the sliding-panel paradigm:
- White root background (`bg-white`).
- Graph panel (`left: 0, width: 50%`) revealed by CSS transition when `graphPanelOpen` is true.
- Desktop panel (`left: 0` or `left: 50%`) slides right on that same trigger.
- `graphPanelOpen` = `storeNodes.length > 0 && agentStatus !== 'idle'`.
- Renders the Take Over button (top center, `z-[9999]`, only when `status === 'running'`).
- Renders `<ChatBar />` outside both panels so it spans the full viewport.
- Wallpaper logic: supports preset, color, local (Electron), and cloud (Supabase) wallpapers.

**`components/os/DesktopClient.tsx`**
Thin client wrapper. Receives server-fetched `userId`, `userEmail`, `profile`, and `settings` as props, calls `useAuthStore.setUser()`, loads text files and calendar events, then renders `<Desktop />`.

**`components/os/Window.tsx`**
Draggable, resizable, focusable window shell. Wraps each app component. Manages its own drag state via mouse events. Reads `WindowState` from `windowStore`. Handles minimize/maximize/close controls in the title bar.

**`components/os/TopBar.tsx`**
macOS-style menu bar at the top of the desktop panel. Shows the active app name, a clock, and standard menu items. Reads `getActiveApp()` from `windowStore`.

**`components/os/Dock.tsx`**
Fixed dock bar at the bottom of the desktop panel. Renders app icons. Clicking an icon calls `openWindow(app)` from `windowStore`. Shows a dot under open apps.

**`components/os/DesktopIcons.tsx`**
Optional desktop icon grid. Renders app shortcuts directly on the wallpaper.

**`components/os/ContextMenu.tsx`**
Right-click context menu. Accepts an array of `ContextMenuItem` objects, renders a floating menu at `(x, y)`, closes on outside click or escape.

---

### components/agent/

**`components/agent/AgentGraph.tsx`**
The full left-panel Obsidian-style graph. This is the main visual feature of YoonOS.
- Rendered inside the graph panel div in `Desktop.tsx`.
- Uses `react-force-graph-2d` with a **white background** and dark nodes.
- Reads nodes/edges from `graphStore`, agent status from `agentStore`.
- On node hover: highlights neighbors, sets `hoveredNodeId` in `uiStore`, and calls `openWindow(app)` for the app associated with that node's tool (via the `TOOL_TO_APP` map).
- On node click: aborts the agent and marks the node as `interrupted`.
- Approval badge: when `agentStatus === 'awaiting_approval'`, draws an amber "!" badge on active nodes via `drawNodeLight()`.
- Header: shows "Agent Graph" label, running/approval status, step count, and a close (X) button.
- Tooltip: shows node label, status, and truncated output at the bottom of the panel on hover.
- `onClose` prop: aborts the agent (if running) and calls `clearGraph()`.

**`components/agent/ChatBar.tsx`**
The prompt input bar. Fixed at `bottom-14`, spans the full viewport width.
- Shows a centered input when idle (presses Enter to open).
- Shows "Working..." while agent runs, with a stop button.
- Shows plan approval options (`PlanBranchOption[]`) when `agentStatus === 'awaiting_approval'`.
- Shows streamed `responseText` and errors in a card above the input.
- Calls `runAgentTask(task)` from `lib/agent/agentLoop.ts` on submit.

**`components/agent/NodeDetailPanel.tsx`**
(Retained, not actively mounted in the current layout.) Shows full node detail — tool name, status, timestamp, input JSON, output, and a Resume button for interrupted nodes. Can be reattached to any panel if needed.

**`components/agent/graphUtils.ts`**
Pure utility functions for the graph. No React.
- `buildGraphData()` — converts `graphStore` nodes/edges into the `ForceGraphData` shape (adding `neighbors` and `links` arrays to each node).
- `getNodeColor()` — maps `GraphNodeStatus` to a hex color.
- `getNodeLabel()` — returns a human-readable label from `toolName`.
- `drawNodeLight()` — canvas rendering function for the **white-background** graph. Draws pulse rings, highlight rings, node body, white border, dark label, and optional approval badge. Used as the `nodeCanvasObject` prop in `AgentGraph.tsx`.
- `STATUS_COLORS` / `STATUS_LABELS` — shared status mapping used in the tooltip and detail panel.

---

### components/apps/

Each app is a self-contained React component that fills the window content area. The agent reads/writes to each via its Zustand store.

**`BrowserApp.tsx`**
Renders an iframe pointed at `api/browser/proxy?url=...`. Has a URL bar the user and agent can control. Reads `browserStore.currentUrl`. The agent calls `navigate_browser(url)` to drive it.

**`CalendarApp.tsx`**
Monthly calendar grid. Reads/writes `calendarStore.events`. The agent calls `create_calendar_event` and `get_calendar_events`.

**`TextEditApp.tsx`**
Plain text editor (`<textarea>`). Reads/writes `textEditStore.activeFile`. The agent calls `type_in_text_editor`, `get_text_editor_content`, `read_text_file`, `write_text_file`.

**`PhotoBoothApp.tsx`**
Webcam feed via `getUserMedia()`. Captures frames to canvas. Reads/writes `photoBoothStore`. The agent calls `capture_photo`.

**`FinderApp.tsx`**
File browser. Reads from `finderStore` and `lib/native/virtualFs.ts`. Lists virtual files and folders.

**`SystemSettingsApp.tsx`**
Settings UI for wallpaper, account info, and preferences. Writes to `authStore.settings` (and Supabase).

---

### stores/

All global state lives here. Every store uses Zustand.

**`stores/windowStore.ts`**
Owns the list of open windows (`WindowState[]`). Key methods: `openWindow(app)`, `closeWindow(id)`, `bringToFront(id)`, `minimizeWindow(id)`, `maximizeWindow(id)`, `updatePosition(id, x, y)`, `updateSize(id, w, h)`, `getActiveApp()`. Prevents duplicate windows — opening the same app twice focuses the existing window.

**`stores/agentStore.ts`**
Owns agent execution state. Key fields: `status` (idle/running/awaiting_approval/done/error/interrupted), `currentTask`, `responseText`, `toolCallLog`, `error`, `abortController`, `planBranches`, `recommendedBranchId`. Key methods: `startTask()` (returns a new AbortController), `abort()`, `reset()`, `setPlanApproval()`, `appendResponseText()`.

**`stores/graphStore.ts`**
Owns the agent's node graph. Key fields: `nodes` (ReactFlow `Node<GraphNodeData>[]`), `edges`. Key methods: `addGraphNode()`, `addNode()`, `updateNodeStatus(id, status, output)`, `addEdge(sourceId, targetId)`, `clearGraph()`. Nodes are de-duplicated by ID (upsert behavior).

**`stores/uiStore.ts`**
Owns UI-only state that doesn't belong in agent or window stores. Fields: `isAboutOpen`, `hoveredNodeId` (set when the user hovers a graph node — used to know which node is active). Methods: `openAbout()`, `closeAbout()`, `setHoveredNodeId(id | null)`.

**`stores/browserStore.ts`**
Owns Browser app state. `currentUrl`, `setUrl()`. The agent and the user both write to this.

**`stores/calendarStore.ts`**
Owns calendar events. `events: CalendarEvent[]`. `loadEvents(userId)` fetches from Supabase. `addEvent()`, `deleteEvent()`.

**`stores/textEditStore.ts`**
Owns text files. `files: TextFile[]`, `activeFileId`. `loadFiles(userId)` fetches from Supabase. `createFile()`, `updateContent()`, `saveFile()`, `initLocal()` (for unauthenticated use).

**`stores/photoBoothStore.ts`**
Owns photo capture state. `lastPhotoDataUrl`, `setLastPhoto()`.

**`stores/finderStore.ts`**
Owns finder navigation state. `currentPath`, `setPath()`.

**`stores/authStore.ts`**
Owns the current user session. `userId`, `userEmail`, `profile`, `settings`. `setUser()` is called by `DesktopClient` on mount with server-fetched data.

**`stores/menuStore.ts`**
Owns top bar menu state. `activeMenu`, `setActiveMenu()`.

---

### lib/

**`lib/agent/agentLoop.ts`**
The main entry point for agent execution. `runAgentTask(task, options?)` is called by `ChatBar`. It calls `agentStore.startTask()`, opens an SSE connection to `api/agent`, parses the stream, and dispatches each event to the appropriate store (`graphStore.addNode`, `graphStore.updateNodeStatus`, `agentStore.appendResponseText`, etc.).

**`lib/agent/tools.ts`**
Defines the Claude tool schema (the JSON definition array passed to the API). Each tool has a name, description, and input schema. These are the actions the agent can take.

**`lib/agent/toolHandlers.ts`**
Server-side handlers for each tool call. Receives the tool name and input, executes the action (e.g., calling the browser proxy, updating a store via a server-accessible interface), and returns a string result for Claude to read.

**`lib/apps/registry.ts`**
Maps `AppName` to default window size and display title. Used by `windowStore.openWindow()`.

**`lib/menu/commands.ts`**
Maps top-bar menu item labels to actions. Used by `TopBar.tsx`.

**`lib/native/finder.ts`**
Finder logic for Electron builds. Calls `window.yoonosNative` IPC APIs for real filesystem access.

**`lib/native/virtualFs.ts`**
In-browser virtual filesystem for the web build. Stores file tree in memory/Zustand.

**`lib/proxy/client.ts`**
Client-side helper to build proxy URLs for the Browser app iframe.

**`lib/settings/osSettings.ts`**
Helpers for reading/writing OS settings (wallpaper, etc.) to Supabase or local storage.

**`lib/storage/calendarEvents.ts`**
Supabase CRUD helpers for calendar events.

**`lib/storage/textFiles.ts`**
Supabase CRUD helpers for text files.

**`lib/storage/photos.ts`**
Supabase storage helpers for photo uploads.

**`lib/storage/wallpapers.ts`**
Returns a signed URL for a custom wallpaper stored in Supabase.

**`lib/storage/settings.ts`**
Supabase CRUD for user settings row.

**`lib/storage/userFiles.ts`**
Generic Supabase file utilities.

**`lib/supabase/client.ts`**
Browser-side Supabase client instance (uses `createBrowserClient`).

**`lib/supabase/server.ts`**
Server-side Supabase client instance (uses `createServerClient` with cookies).

---

### types/

**`types/index.ts`**
All shared TypeScript types. Key ones:
- `AppName` — union of all valid app identifiers.
- `WindowState` — position, size, z-index, minimized/maximized state for one window.
- `AgentStatus` — `'idle' | 'running' | 'awaiting_approval' | 'done' | 'error' | 'interrupted'`.
- `GraphNodeData` — data payload for each graph node (label, toolName, status, input, output, timestamp).
- `GraphNodeStatus` — `'pending' | 'in_progress' | 'done' | 'error' | 'interrupted'`.
- `AgentStreamEvent` — discriminated union of all SSE event types streamed from `api/agent`.
- `PlanBranchOption` — a plan branch presented to the user for approval.
- Supabase row types: `UserProfile`, `UserSettings`, `DBFile`, `DBCalendarEvent`, `DBPhoto`.

**`types/native.ts`**
Types for `window.yoonosNative` — the Electron preload bridge. Includes `isNativeAvailable()` guard.

---

### hooks/

**`hooks/useClock.ts`**
Returns a formatted time string, updated every second with `setInterval`. Used by `TopBar.tsx`.

---

### electron/

Electron wrapper for building YoonOS as a native desktop app. Not required for the web build.

**`electron/main.ts`**
Electron main process. Creates the `BrowserWindow`, loads the Next.js app (dev: localhost, prod: bundled), sets up IPC listeners.

**`electron/preload.ts`**
Exposes `window.yoonosNative` to the renderer via `contextBridge`. Includes file system, settings, and native dialog IPC wrappers.

**`electron/ipc.ts`**
IPC channel name constants shared between main and preload.

---

### proxy-service/

Standalone Node.js/Express service deployed on Railway. Handles browser proxy requests when the app is in production (the Next.js API route handles it in development).

**`proxy-service/index.js`**
Express server. `GET /?url=<target>` fetches the target URL, strips blocking headers (`X-Frame-Options`, `Content-Security-Policy`, `frame-ancestors`), rewrites internal links, and returns the HTML. Also exposes `GET /content?url=<target>` which returns clean plain text via Cheerio parse.

---

### Configuration

| File | Purpose |
|---|---|
| `next.config.mjs` | Next.js config. Enables image domains, sets webpack aliases. |
| `tailwind.config.ts` | Tailwind theme. Custom colors, font families, screen sizes. |
| `tsconfig.json` | TypeScript config. Path aliases (`@/` = project root). |
| `package.json` | Dependencies and scripts. `dev`, `build`, `start`, `test`. |
| `.env.local` | Local secrets. `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Never commit this file. |
| `jest.config.ts` | Jest test config. |
| `middleware.ts` | Next.js middleware. Refreshes Supabase session cookies on every request. Redirects unauthenticated users from `/desktop` to `/login`. |

---

### Tests

**`__tests__/windowStore.test.ts`**
Unit tests for `windowStore`. Covers `openWindow`, `closeWindow`, `bringToFront`, z-index management, and duplicate prevention.

**`__tests__/registry.test.ts`**
Unit tests for `lib/apps/registry.ts`. Verifies default window sizes and titles for each app.

---

### docs/

**`docs/project-description.md`**
Product-level description of YoonOS: what it is, the UI paradigm, the apps, the agent, the graph, and the tech stack. Updated to reflect the current sliding-panel paradigm.

**`docs/possibility-analysis.md`**
Technical feasibility analysis of every major component. Covers risk levels, implementation approaches, and known limitations.

---

## Data Flow: Agent Task Execution

```
User types task in ChatBar
  → runAgentTask(task)                         lib/agent/agentLoop.ts
    → agentStore.startTask()                   clears state, returns AbortController
    → graphStore.clearGraph()                  resets graph
    → fetch POST /api/agent                    SSE stream opens
      → Claude API (tool use + streaming)      app/api/agent/route.ts
        → graph_node event                     graphStore.addNode()
        → graph_edge event                     graphStore.addEdge()
        → tool_start event                     agentStore.addToolCall()
        → [tool executes server-side]          lib/agent/toolHandlers.ts
        → tool_done event                      graphStore.updateNodeStatus('done')
        → text event                           agentStore.appendResponseText()
        → done event                           agentStore.setStatus('done')
    → graphPanelOpen becomes true              Desktop.tsx re-renders
    → Desktop slides right 50%                CSS transition on `left`
    → AgentGraph renders nodes                 components/agent/AgentGraph.tsx
```

## Data Flow: Node Hover

```
User hovers graph node in AgentGraph
  → handleNodeHover(node)
    → setHighlightNodes / setHighlightLinks    local state → canvas re-render
    → uiStore.setHoveredNodeId(node.id)        available to any subscriber
    → getAppForNode(node)                      TOOL_TO_APP lookup
    → windowStore.openWindow(app)              desktop panel shows that app
```

---

## Key Invariants

1. `graphStore` nodes are always upserted by ID — calling `addNode` or `addGraphNode` with an existing ID updates it, never duplicates.
2. `agentStore.startTask()` always resets `responseText`, `toolCallLog`, `error`, and creates a fresh `AbortController`. Never call it mid-task without aborting first.
3. `Desktop.tsx` derives `graphPanelOpen` from store state — it is never manually toggled. The graph opens when nodes exist and closes when cleared.
4. The `Take Over` button only aborts and clears the graph. It does not reset `agentStatus` to `idle` directly — `abort()` sets it to `interrupted`, and `clearGraph()` removes nodes so the panel closes.
5. `drawNodeLight()` must not throw if `node.x` or `node.y` is undefined (nodes may not have positions yet during the warmup ticks phase).
