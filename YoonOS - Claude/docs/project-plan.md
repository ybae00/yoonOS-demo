# Project Plan
## YoonOS — Phased Build Plan

**Version:** 2.0  
**Date:** 2026-05-10

---

## How to Read This Plan

This plan is divided into four phases. Each phase has a clear goal and is broken into small, sequential milestones. Each milestone is a discrete, completable unit of work — something an AI coding agent can be handed as a single task.

The phases build on each other strictly. Do not start Phase 1 until Phase 0 is verified. Do not start Phase 2 until Phase 1 is verified. Do not start Phase 3 until Phase 2 is verified.

---

## Phase Overview

| Phase | Name | Goal | Estimated Duration |
|---|---|---|---|
| Phase 0 | Backend Foundation | Supabase configured, auth working, per-user data layer in place | 1 week |
| Phase 1 | The OS Shell | A working desktop with five real apps (including System Settings) | 2-3 weeks |
| Phase 2 | The Agent | A real Claude-powered agent that controls the OS | 2-3 weeks |
| Phase 3 | The Graph | Live Obsidian-style graph visualization of agent work | 1-2 weeks |

---

---

# PHASE 0 — Backend Foundation

**Goal:** Set up Supabase, create all database tables, configure storage buckets, and build the login/signup screen. By the end of Phase 0, a user can create an account, log in, and see a blank desktop. No apps yet.

**Success Criteria:** A new user can sign up with an email and password, see their name on the desktop top bar, and their account data persists in Supabase. Refreshing the page keeps them logged in.

---

## Milestone 0.1 — Supabase Project Setup

Create and configure the Supabase project.

**Tasks:**
- Create a new Supabase project at supabase.com.
- Copy the Project URL and anon key into `.env.local`.
- Run all SQL from `docs/backend/database-schema.md` in the Supabase SQL Editor in order.
- Verify all 5 tables exist: `user_profiles`, `user_settings`, `files`, `calendar_events`, `photos`.
- Verify RLS is enabled on all tables (green shield icon in Table Editor).
- Create three Storage buckets: `wallpapers`, `photos`, `user-files` (settings per `docs/backend/file-storage.md`).
- Run Storage policy SQL from `docs/backend/file-storage.md`.
- Verify: creating a test user in Supabase Auth dashboard auto-creates rows in `user_profiles` and `user_settings`.

---

## Milestone 0.2 — Supabase Client Setup in Next.js

Wire Supabase into the Next.js project.

**Tasks:**
- Install: `npm install @supabase/supabase-js @supabase/ssr`.
- Create `lib/supabase/client.ts` (browser client) and `lib/supabase/server.ts` (server client) — exact code in `docs/backend/database-schema.md`.
- Create `middleware.ts` at the project root — exact code in `docs/backend/auth-flow.md`.
- Add all five environment variables to `.env.local`.
- Verify: `npm run dev` starts without errors. No TypeScript errors.

---

## Milestone 0.3 — Login and Signup Screen

Build the login/signup page at `/login`.

**Tasks:**
- Create the route group structure: `app/(auth)/login/page.tsx` and `app/(auth)/layout.tsx`.
- Build the login page component — exact implementation in `docs/backend/auth-flow.md`.
- The layout for the `(auth)` group is a full-screen centered page with no OS chrome.
- Implement the Sign In tab: email + password form, calls `supabase.auth.signInWithPassword`.
- Implement the Create Account tab: display name + email + password + confirm password form, calls `supabase.auth.signUp`.
- Handle errors: show error message below form fields.
- On success: redirect to `/desktop`.
- Verify: can create a new account, see the redirect, and verify the new row in Supabase `user_profiles`.

---

## Milestone 0.4 — Auth Store and Desktop Gate

Set up the auth state store and protect the desktop route.

**Tasks:**
- Create `stores/authStore.ts` — exact code in `docs/backend/auth-flow.md`.
- Create the `app/(os)/desktop/page.tsx` server component — fetches session, profile, and settings from Supabase before rendering. Redirects to `/login` if no session.
- Create `app/(os)/layout.tsx` — full-screen layout, no extra chrome.
- Create a placeholder `components/os/DesktopClient.tsx` client component that receives user data as props, hydrates `useAuthStore`, and renders just a dark background with the user's display name centered.
- Verify: logged-in user sees the placeholder desktop. Non-logged-in user hitting `/desktop` is redirected to `/login`. Refreshing the page stays on the desktop.

---

## Milestone 0.5 — Phase 0 Integration and Sign Out

Connect everything and add sign out.

**Tasks:**
- Add sign out functionality (button or link accessible from the placeholder desktop) — code in `docs/backend/auth-flow.md`.
- Verify sign out redirects to `/login` and the session is cleared.
- Verify the `on_auth_user_created` trigger fires correctly for every new signup.
- Verify middleware blocks unauthenticated access to every `/desktop` route.
- Test the full flow: sign up → desktop → refresh → still logged in → sign out → login page.

**Phase 0 Complete Checkpoint:** A user can sign up, log in, see a placeholder desktop with their name, and sign out. All data persists in Supabase.

---

---

# PHASE 1 — The OS Shell

**Goal:** Build a browser-based desktop that a user can interact with. Four apps work. No AI yet.

**Success Criteria:** A user can open all four apps, use them manually, and the experience feels like a real (if simple) desktop OS.

---

## Milestone 1.1 — Project Scaffolding

Set up the development environment and project structure.

**Tasks:**
- Initialize a new Next.js 14 project with TypeScript and Tailwind CSS.
- Configure folder structure: `app/`, `components/`, `stores/`, `lib/`, `hooks/`, `types/`.
- Install core dependencies: `zustand`, `react-flow`, `react-draggable`, `react-resizable`, `lucide-react`.
- Set up Vercel project and connect to GitHub repo.
- Create `.env.local` with placeholder for `ANTHROPIC_API_KEY`.
- Verify: `npm run dev` starts without errors and shows a blank page.

---

## Milestone 1.2 — Desktop Shell

Build the base OS shell: desktop, dock, and top bar.

**Tasks:**
- Create the `Desktop` component: full-screen div with a background gradient or wallpaper image.
- Create the `TopBar` component: fixed top bar showing "YoonOS" on the left and a live clock on the right.
- Create the `Dock` component: fixed bottom bar with four app icons (Browser, Calendar, Photo Booth, Text Edit).
- Wire Dock icons to open app windows (using Zustand store to track open windows).
- Verify: desktop renders, clock ticks, dock shows four icons, clicking an icon "opens" a placeholder window.

---

## Milestone 1.3 — Window Manager

Build the windowing system that all apps live inside.

**Tasks:**
- Create a `Window` component that wraps all app content.
- Window has: title bar (with app name and close/minimize buttons), draggable header, resizable edges.
- Implement `useWindowStore` in Zustand: state contains an array of open windows, each with id, app type, position, size, z-index, and minimized status.
- Clicking any open window brings it to the front (updates z-index).
- Close button removes the window from state.
- Minimize button hides the window (minimized flag set to true).
- Verify: can open two windows, drag them independently, bring each to front, close them.

---

## Milestone 1.4 — Browser App

Build the Browser app with real internet access via a backend proxy.

**Tasks:**
- Build the proxy service (Node.js + Express, deployed on Railway):
  - Endpoint: `GET /proxy?url=<target-url>`
  - Fetches the target URL server-side, strips `X-Frame-Options` and `Content-Security-Policy` headers.
  - Rewrites relative links in returned HTML to route through the proxy.
  - Returns the modified HTML.
  - Second endpoint: `GET /content?url=<target-url>` — returns extracted plain text using Cheerio (for agent reading).
- Build the `BrowserApp` React component:
  - URL bar input at the top.
  - Back/forward buttons (maintain history array in local state).
  - `<iframe>` that loads `{PROXY_BASE_URL}/proxy?url={currentUrl}`.
  - Loading spinner while the iframe is loading.
- Verify: user can type a URL, press Enter, and see the page load inside the Browser window.

---

## Milestone 1.5 — Calendar App

Build the Calendar app with event creation. Events now persist to Supabase.

**Tasks:**
- Create `useCalendarStore` in Zustand: stores `{ events: DBCalendarEvent[], isLoading: boolean }`.
- Add `loadEvents(userId)` action: fetches events from `calendar_events` table via Supabase.
- Add `createEvent(userId, date, title, notes)` action: inserts into Supabase, then updates local store.
- Add `deleteEvent(id, userId)` action: deletes from Supabase, then updates local store.
- Build the `CalendarApp` component:
  - Monthly grid view (7 columns for days of week, rows for weeks).
  - Navigation arrows for previous/next month.
  - Clicking a day opens an event creation panel on the right.
  - Event creation panel has: event title input, optional notes, Save button.
  - Saved events show as colored dots on their day in the grid.
  - Clicking a day with events shows the event list with delete option.
- Call `loadEvents` on app mount (pass userId from `useAuthStore`).
- Verify: user can navigate months, create an event, see it persist after page refresh.

---

## Milestone 1.6 — Photo Booth App

Build the Photo Booth app. Photos now upload to Supabase Storage.

**Tasks:**
- Build the `PhotoBoothApp` component:
  - On mount, call `navigator.mediaDevices.getUserMedia({ video: true })` and stream to a `<video>` element.
  - Capture button calls `captureAndStorePhoto()` from `lib/storage/photos.ts` (see `docs/backend/file-storage.md`).
  - Display the last captured photo using a signed URL returned from the upload function.
  - On app open, call `getRecentPhotos(3)` to load and show the last 3 photos as a strip.
  - Handle permission denied gracefully (show error message).
- Verify: webcam activates, capture uploads to Supabase Storage, photo displays and persists after refresh.

---

## Milestone 1.7 — Text Edit App

Build the Text Edit app. Files now persist to Supabase `files` table.

**Tasks:**
- Use the Supabase-synced `useTextEditStore` from `docs/backend/file-storage.md` (not the original in-memory version).
- Build the `TextEditApp` component:
  - File list sidebar (left) showing all saved files.
  - "New File" button calls `createFile(userId)` — creates in Supabase and local store.
  - Main editing area: a `<textarea>` bound to the active file's content in the store.
  - File name displayed at the top, editable on click (calls `renameFile`).
  - Auto-save or Save button calls `saveActiveFile(userId)`.
  - Delete button on each file in the sidebar calls `removeFile`.
- Call `loadFiles(userId)` on app mount.
- Verify: user can create multiple files, switch between them, edit content, save, and all files persist after page refresh.

---

## Milestone 1.8 — System Settings App

Build the System Settings app. This is new in Version 2.0.

**Tasks:**
- Create `components/apps/SystemSettingsApp.tsx` — full spec in `docs/backend/system-settings.md`.
- Add `systemsettings` to the `AppName` type and update `windowStore.ts` constants.
- Add the gear icon to the Dock (use `<Settings />` from lucide-react).
- Implement the three sections: Wallpaper, Profile, Account.
- Wallpaper section: preset grid, color picker, custom upload — all read/write `user_settings` via `updateUserSettings()`.
- Profile section: editable display name — writes to `user_profiles`.
- Account section: shows email and member-since date — sign out button.
- The desktop must reactively apply wallpaper changes from `useAuthStore().settings` without a page refresh.
- Verify: changing wallpaper updates the desktop immediately and persists after refresh. Display name change reflects in the top bar immediately.

---

## Milestone 1.9 — Phase 1 Integration and Polish

Connect everything and make it feel like a real OS.

**Tasks:**
- Ensure all five apps open correctly from the Dock.
- Verify the `DesktopClient` hydrates auth store and loads files + calendar events on mount.
- Add a subtle drop shadow and window chrome styling to windows.
- Add a right-click context menu on the desktop ("About YoonOS", "Close All Windows").
- Smooth-animate window open/close (CSS transition, 150ms).
- Test the full experience end-to-end: sign up, use all five apps, log out, log back in, verify all data persists.
- Deploy to Vercel and verify everything works on the live URL (including Supabase connection).

**Phase 1 Complete Checkpoint:** All five apps functional on a live Vercel URL. User data persists. No AI yet.

---

---

# PHASE 2 — The Agent

**Goal:** Connect Claude to the OS. The agent can receive a text task and execute it across apps using tool calls. No graph yet — just a working agent.

**Success Criteria:** User types "Search for the weather in Seoul and put the result in my text editor" and the agent does it correctly, end to end.

---

## Milestone 2.1 — Agent Infrastructure

Set up the backend agent pipeline.

**Tasks:**
- Create a Next.js API route: `POST /api/agent` that accepts `{ task: string, conversationHistory: Message[] }`.
- Initialize the Anthropic SDK with `ANTHROPIC_API_KEY`.
- Define the full tool schema for all agent tools (see Technical Plan for exact schema).
- Set up streaming response using SSE from the API route.
- Create a `useAgentStore` in Zustand: stores `{ status, messages, currentTask, toolCallLog }`.
- Verify: a test POST to `/api/agent` returns a streaming response from Claude.

---

## Milestone 2.2 — Agent Tools: App Control

Implement the tools the agent uses to interact with the OS.

**Tasks:**
- Implement `open_app` tool handler: dispatches to `useWindowStore` to bring the specified app to the foreground (or open it if closed).
- Implement `navigate_browser` tool handler: updates the Browser app's current URL via `useBrowserStore`.
- Implement `get_browser_content` tool handler: calls the proxy's `/content?url=` endpoint and returns plain text.
- Implement `type_in_text_editor` tool handler: writes content to the active file in `useTextEditStore`.
- Implement `get_text_editor_content` tool handler: reads active file content from `useTextEditStore`.
- Implement `create_calendar_event` tool handler: adds an event to `useCalendarStore`.
- Implement `get_calendar_events` tool handler: reads events for a given date from `useCalendarStore`.
- Implement `capture_photo` tool handler: triggers the Photo Booth capture action.

Each tool handler: validates inputs, performs the action, returns a structured result object.

---

## Milestone 2.3 — Tool Execution Loop

Build the loop that connects Claude's tool call decisions to actual tool execution.

**Tasks:**
- After streaming Claude's response, detect `tool_use` content blocks.
- For each tool call: extract `tool_name` and `input`, route to the correct tool handler.
- Collect tool results and send them back to Claude as `tool_result` messages.
- Continue the loop until Claude returns a `stop_reason: end_turn` with no tool calls.
- Handle errors: if a tool fails, return the error message to Claude so it can adapt.
- Verify: agent correctly sequences multiple tool calls to complete a multi-step task.

---

## Milestone 2.4 — Chat UI

Build the user-facing chat bar at the bottom of the OS.

**Tasks:**
- Create the `ChatBar` component: fixed bottom bar above the Dock.
- Input field for typing a task.
- Submit on Enter or click.
- While the agent is running, show a subtle pulsing indicator ("Agent working...").
- Show the agent's final text response below the input when done.
- Show an error message if the agent fails.
- Add a Stop button that aborts the current agent run (using `AbortController`).
- Verify: user types a task, agent runs, completion message appears.

---

## Milestone 2.5 — Phase 2 Integration & Testing

End-to-end agent testing across multiple scenarios.

**Tasks:**
- Test scenario 1: "Open the browser and go to news.ycombinator.com." — Agent opens Browser, navigates to URL.
- Test scenario 2: "Look up the weather in Seoul and write a summary in my text editor." — Agent browses, reads, switches to Text Edit, writes.
- Test scenario 3: "Create a calendar event called Team Meeting for tomorrow." — Agent creates event.
- Test scenario 4: "Take a photo." — Agent triggers Photo Booth capture.
- Fix any bugs found during testing.
- Verify all four tool categories work correctly in sequence.

**Phase 2 Complete Checkpoint:** Agent can complete a 3-step multi-app task end-to-end. The OS responds correctly to every tool call.

---

---

# PHASE 3 — The Graph

**Goal:** Add the Obsidian-style node graph that visualizes every agent action in real time. Make the graph interactive: hover, click to inspect, mini-map.

**Success Criteria:** When the agent runs any task, every tool call appears as a node in the graph, color-coded, connected, and hoverable. The mini-map is visible in the corner and can be expanded.

---

## Milestone 3.1 — Graph State

Set up the graph data layer.

**Tasks:**
- Create `useGraphStore` in Zustand: stores `{ nodes: Node[], edges: Edge[], isExpanded: boolean }`.
- Each node has: `id`, `type` (tool name), `label` (primary argument), `status` (pending | in_progress | done | error), `data` (full tool input/output).
- Each edge has: `id`, `source` (previous node id), `target` (current node id).
- Implement actions: `addNode`, `updateNodeStatus`, `addEdge`, `clearGraph`.
- Wire the tool execution loop (from Milestone 2.3) to dispatch `addNode` before each tool call and `updateNodeStatus` after.
- Verify: running an agent task populates the graph store correctly.

---

## Milestone 3.2 — Graph Rendering (Mini-Map)

Build the mini graph panel in the bottom-right corner.

**Tasks:**
- Install React Flow: `npm install reactflow`.
- Create the `AgentGraph` component using React Flow.
- Map `useGraphStore` nodes and edges to React Flow's node/edge format.
- Apply node colors based on status: blue (in_progress), green (done), red (error), grey (pending).
- Use a force-directed layout (d3-force or `@reactflow/layout`'s elk layout).
- Position the `AgentGraph` as a fixed panel: bottom-right corner, 280px x 200px, semi-transparent dark background.
- Show/hide the panel: visible only when an agent task is running or just completed.
- Verify: running an agent task shows nodes appearing in the mini-map in real time.

---

## Milestone 3.3 — Node Hover Tooltips

Add hover behavior to graph nodes.

**Tasks:**
- Create a custom React Flow node component (`AgentNode`) that replaces the default node.
- On hover, show a tooltip above the node containing:
  - Tool name (e.g., "navigate_browser")
  - Primary argument (e.g., "https://news.ycombinator.com")
  - Status badge
  - Timestamp of execution
- Tooltip uses a small floating div positioned near the node.
- Verify: hovering any node shows the correct tooltip.

---

## Milestone 3.4 — Full-Screen Graph Expansion

Allow the mini-map to expand to a full-screen graph view.

**Tasks:**
- Add an expand icon (arrows out) to the top-right of the mini-map panel.
- Clicking expand sets `useGraphStore.isExpanded = true`.
- When expanded, the `AgentGraph` renders as a full-screen overlay above the OS.
- Full-screen graph supports: pan (drag background), zoom (scroll wheel), node hover tooltips.
- Add a close/collapse button to return to mini-map mode.
- Verify: expand and collapse work correctly without losing graph state.

---

## Milestone 3.5 — Node Click: Pause and Inspect

Allow the user to click a node to pause the agent and inspect that step.

**Tasks:**
- Add an `onNodeClick` handler in React Flow.
- When a node is clicked while the agent is running: send an abort signal to the current agent run, mark the node as "interrupted" in the store, and open a detail panel.
- The detail panel (a side drawer or modal) shows: tool name, full input JSON, full output JSON, timestamp, and a "Resume" button.
- "Resume" re-starts the agent from the interrupted step (re-sends the conversation with the tool result intact).
- When the agent is not running, clicking a node shows the detail panel in read-only mode.
- Verify: clicking a node during an agent run pauses it correctly, and the detail panel shows accurate data.

---

## Milestone 3.6 — Phase 3 Polish and Final Deploy

Final cleanup, edge cases, and deployment.

**Tasks:**
- Graph clears automatically when a new task begins.
- Add a subtle enter animation for new nodes (scale from 0 to 1 in 200ms).
- Add a pulsing animation on in-progress nodes.
- Handle edge case: agent errors — red node, error message in tooltip.
- Handle edge case: very long graphs (10+ nodes) — auto-fit the graph on expand.
- Final end-to-end test on production URL (not just localhost).
- Verify all three phases work together: OS responds, agent executes, graph visualizes.

**Phase 3 Complete Checkpoint:** The full YoonOS experience is live. OS works, agent works, graph works.

---

---

## Summary Checklist

### Phase 0: Backend Foundation
- [ ] 0.1 Supabase project setup (tables, RLS, storage buckets)
- [ ] 0.2 Supabase client setup in Next.js
- [ ] 0.3 Login and signup screen
- [ ] 0.4 Auth store and desktop gate
- [ ] 0.5 Integration and sign out

### Phase 1: OS Shell
- [ ] 1.1 Project scaffolding
- [ ] 1.2 Desktop shell
- [ ] 1.3 Window manager
- [ ] 1.4 Browser app (with proxy)
- [ ] 1.5 Calendar app (Supabase-synced)
- [ ] 1.6 Photo Booth app (Supabase Storage)
- [ ] 1.7 Text Edit app (Supabase-synced)
- [ ] 1.8 System Settings app
- [ ] 1.9 Integration and polish

### Phase 2: The Agent
- [ ] 2.1 Agent infrastructure
- [ ] 2.2 Agent tools
- [ ] 2.3 Tool execution loop
- [ ] 2.4 Chat UI
- [ ] 2.5 Integration and testing

### Phase 3: The Graph
- [ ] 3.1 Graph state
- [ ] 3.2 Graph rendering (mini-map)
- [ ] 3.3 Node hover tooltips
- [ ] 3.4 Full-screen expansion
- [ ] 3.5 Node click: pause and inspect
- [ ] 3.6 Polish and final deploy
