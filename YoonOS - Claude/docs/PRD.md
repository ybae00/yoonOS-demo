# Product Requirements Document (PRD)

## YoonOS — AI-Native Web Operating System

**Version:** 2.0  
**Status:** Draft  
**Author:** Yoon  
**Last Updated:** 2026-05-10

---

## 1. Vision

Build a browser-based operating system where an AI agent is a first-class resident — not a plugin, not a sidebar, not an afterthought. The agent executes real tasks inside real apps, and the user experiences the agent's work through a live visual graph that makes every step, decision, and subtask transparent and interruptible.

The goal is not just to make an AI that does things for you. The goal is to make an AI whose work you can *see, understand, and trust.*

---

## 2. Problem Statement

Current AI assistants have a transparency problem. When you ask an agent to "research and summarize," you get output — but you don't see the process. You don't know what it searched, why it chose one source over another, what it read, or where it got stuck. The agent is a black box.

Separately, AI tools today are overlaid on top of existing operating systems as add-ons. They live in sidebars, pop-ups, and chat windows. They are not native to the environment they act in.

YoonOS solves both problems: a purpose-built environment where the agent operates natively, and a visual language (the node graph) that makes every step of agent reasoning visible and inspectable in real time.

---

## 3. Goals

### Primary Goals

- Build a functional, browser-based OS with at minimum four working apps (Browser, Calendar, Photo Booth, Text Edit).
- Implement a real AI agent using the Claude API that can control all apps via structured tool calls.
- Build a live Obsidian-style node graph UI that visualizes agent task execution in real time.
- Allow the user to hover, inspect, and interrupt agent nodes.
- Deploy the full system to the web (Vercel + Railway).

### Secondary Goals

- Keep the codebase clean and open-sourceable.
- Architect the agent tool system so new apps and tools can be added easily.
- Ensure the agent's tool calls are logged in a structured format for future debugging, replay, and export.

### Non-Goals (All Phases)

- Mobile/responsive design.
- Agent memory or long-term learning across sessions.
- Voice input or output.
- Native OS (Electron) packaging.
- Multi-user shared workspaces (user data is always isolated per account).
- Third-party OAuth login ("Sign in with Google" etc.).

---

## 4. Users

**Primary User (Phase 1):** The creator. A technically curious individual exploring the frontier of AI-assisted computing. Not a developer per se, but someone comfortable with web tools and interested in pushing this forward.

**Future Users (Phase 2+):** Knowledge workers, power users, researchers, and developers who want an AI assistant that is transparent, native, and controllable.

---

## 5. User Stories

### Auth Layer

- As a new user, I can create an account with a display name, email, and password.
- As a returning user, I can sign in with my email and password.
- As a logged-in user, refreshing the page keeps me logged in.
- As a logged-in user, I can sign out from System Settings.
- As an unauthenticated visitor, attempting to access the desktop redirects me to the login page.

### OS Layer

- As a user, I can see a desktop with a dock and app icons when I open YoonOS in my browser.
- As a user, I can open, move, resize, minimize, and close app windows.
- As a user, I can open multiple apps simultaneously.
- As a user, I can use the Browser app to navigate to real URLs on the internet.
- As a user, I can use the Calendar app to view dates and create events that persist across sessions.
- As a user, I can use the Photo Booth app to take a photo that is saved to my account.
- As a user, I can use the Text Edit app to write, edit, and save files that persist across sessions.
- As a user, I can use the System Settings app to change my wallpaper and display name.

### Agent Layer

- As a user, I can type a task in the chat bar at the bottom of the screen and press Enter to start the agent.
- As a user, I can watch the agent open apps and interact with them in real time.
- As a user, I can see the agent's progress in both the live app view and the node graph.
- As a user, I can type a new message to redirect the agent mid-task.
- As a user, I receive a completion message when the agent finishes.

### Graph Layer

- As a user, I can see a mini node graph in the bottom-right corner while the agent is working.
- As a user, I can hover over any node to see its label, type, and status.
- As a user, I can click a node to pause the agent and inspect that step.
- As a user, I can expand the mini-map into a full-screen graph view.
- As a user, I can see color coding that tells me which steps are done, in progress, pending, or failed.

---

## 6. Feature Requirements

### 6.0 Authentication and Backend

| ID | Requirement | Priority |
|---|---|---|
| AU-01 | Email and password signup with display name | P0 |
| AU-02 | Email and password login | P0 |
| AU-03 | Cookie-based persistent sessions (survives page refresh) | P0 |
| AU-04 | Route protection: unauthenticated users redirected to /login | P0 |
| AU-05 | Auto-create user_profiles and user_settings rows on signup | P0 |
| AU-06 | Sign out clears session and redirects to /login | P0 |
| AU-07 | All user data isolated by user_id (RLS enforced) | P0 |
| AU-08 | Text files persist to Supabase files table | P0 |
| AU-09 | Calendar events persist to Supabase calendar_events table | P0 |
| AU-10 | Photos upload to Supabase Storage and persist | P0 |
| AU-11 | User settings (wallpaper, display name) persist to Supabase | P0 |

### 6.1 OS Shell


| ID    | Requirement                                                   | Priority |
| ----- | ------------------------------------------------------------- | -------- |
| OS-01 | Desktop with wallpaper background                             | P0       |
| OS-02 | Dock with app icons at the bottom                             | P0       |
| OS-03 | App windows that can be opened, moved, and closed             | P0       |
| OS-04 | Window layering (z-index management, bring to front on click) | P0       |
| OS-05 | Window minimize to dock                                       | P1       |
| OS-06 | Window resize by dragging edges                               | P1       |
| OS-07 | Top menu bar with clock and OS name                           | P1       |
| OS-08 | Right-click desktop context menu                              | P2       |


### 6.2 Browser App


| ID    | Requirement                                     | Priority |
| ----- | ----------------------------------------------- | -------- |
| BR-01 | URL bar with navigation (type URL, press Enter) | P0       |
| BR-02 | Back and forward navigation buttons             | P0       |
| BR-03 | Render real web pages (via backend proxy)       | P0       |
| BR-04 | Loading indicator                               | P1       |
| BR-05 | New tab button                                  | P2       |


### 6.3 Calendar App


| ID    | Requirement                          | Priority |
| ----- | ------------------------------------ | -------- |
| CA-01 | Monthly calendar view                | P0       |
| CA-02 | Create an event on a selected day    | P0       |
| CA-03 | View list of events for selected day | P0       |
| CA-04 | Delete an event                      | P1       |
| CA-05 | Week view                            | P2       |


### 6.4 Photo Booth App


| ID    | Requirement                     | Priority |
| ----- | ------------------------------- | -------- |
| PB-01 | Request and display webcam feed | P0       |
| PB-02 | Capture photo on button press   | P0       |
| PB-03 | Display last captured photo     | P0       |
| PB-04 | Photo strip of last 3 captures  | P1       |


### 6.5 Text Edit App


| ID    | Requirement                             | Priority |
| ----- | --------------------------------------- | -------- |
| TE-01 | Plain text editor with editable area    | P0       |
| TE-02 | Save file to session storage            | P0       |
| TE-03 | Open saved files                        | P0       |
| TE-04 | File name display and renaming          | P1       |
| TE-05 | Basic formatting toolbar (bold, italic) | P2       |


### 6.6 System Settings App

| ID | Requirement | Priority |
|---|---|---|
| SS-01 | System Settings opens from Dock (gear icon) | P0 |
| SS-02 | Wallpaper section: choose from 5 preset gradients | P0 |
| SS-03 | Wallpaper section: pick a solid color via color picker | P0 |
| SS-04 | Wallpaper section: upload a custom image (JPG/PNG/WEBP, max 10 MB) | P1 |
| SS-05 | Wallpaper changes apply immediately to the desktop | P0 |
| SS-06 | Wallpaper preference persists across sessions | P0 |
| SS-07 | Profile section: edit and save display name | P0 |
| SS-08 | Account section: shows email and member-since date | P0 |
| SS-09 | Account section: sign out button | P0 |
| SS-10 | Display name shown in desktop top bar, updates immediately on change | P1 |

### 6.8 AI Agent


| ID    | Requirement                                      | Priority |
| ----- | ------------------------------------------------ | -------- |
| AG-01 | Chat input bar fixed at bottom of OS             | P0       |
| AG-02 | Send task to Claude API with tool use enabled    | P0       |
| AG-03 | Agent can open any app by tool call              | P0       |
| AG-04 | Agent can navigate the browser to a URL          | P0       |
| AG-05 | Agent can read the current browser page content  | P0       |
| AG-06 | Agent can type into the Text Edit app            | P0       |
| AG-07 | Agent can read Text Edit content                 | P0       |
| AG-08 | Agent can create a Calendar event                | P0       |
| AG-09 | Agent can read Calendar events                   | P0       |
| AG-10 | Agent can trigger Photo Booth capture            | P1       |
| AG-11 | Agent streams responses in real time via SSE     | P0       |
| AG-12 | Agent can be interrupted mid-task                | P1       |
| AG-13 | Agent tool calls are logged in structured format | P0       |


### 6.7 Graph Visualization


| ID    | Requirement                                                    | Priority |
| ----- | -------------------------------------------------------------- | -------- |
| GR-01 | Mini graph panel in bottom-right corner                        | P0       |
| GR-02 | Each agent tool call creates a new node                        | P0       |
| GR-03 | Edges connect nodes in execution order                         | P0       |
| GR-04 | Node colors reflect status (pending, in progress, done, error) | P0       |
| GR-05 | Hover tooltip shows node label, type, and status               | P0       |
| GR-06 | Click node to pause agent and show step detail                 | P1       |
| GR-07 | Graph layout is force-directed and auto-arranges               | P0       |
| GR-08 | Expand mini-map to full-screen graph view                      | P1       |
| GR-09 | Pan and zoom within graph                                      | P1       |
| GR-10 | Graph resets/clears when new task begins                       | P0       |


---

## 7. Technical Requirements


| Requirement           | Specification                                                    |
| --------------------- | ---------------------------------------------------------------- |
| Frontend framework    | Next.js 14 (App Router), React 18                                |
| Styling               | Tailwind CSS                                                     |
| Auth, DB, Storage     | Supabase (single service for all three)                          |
| Sessions              | Cookie-based via @supabase/ssr                                   |
| Agent model           | Anthropic Claude (claude-sonnet-4-5 or higher)                   |
| Agent communication   | Streaming via Server-Sent Events                                 |
| Graph library         | React Flow v11                                                   |
| State management      | Zustand                                                          |
| Browser proxy         | Custom proxy service deployed on Railway                         |
| Deployment            | Vercel (frontend + API routes), Railway (proxy)                  |
| Environment secrets   | 5 variables stored in Vercel: Anthropic + Supabase + proxy URL   |
| Browser compatibility | Chrome, Arc, Safari (latest)                                     |


---

## 8. Design Principles

- **Transparency first.** Every agent action must be visible to the user in the graph. Nothing should happen invisibly.
- **The OS feels real.** Windows drag. Apps open. Buttons click. It should feel native, not like a mockup.
- **The graph is always present.** The graph is not an optional debug view. It is the primary UI for understanding agent work.
- **Interruption is always possible.** The user should never feel trapped watching the agent work. Stop, inspect, redirect — always available.
- **Clean code over clever code.** The codebase must be readable and extensible. New apps and tools should be addable in under an hour.

---

## 9. Success Metrics (Phase 1)


| Metric                                                              | Target |
| ------------------------------------------------------------------- | ------ |
| User can sign up, log in, and sign out                              | Yes    |
| All user data persists across page refreshes                        | Yes    |
| All five apps functional (user-operated, including System Settings) | Yes    |
| Agent completes a 3-step multi-app task end-to-end                  | Yes    |
| Graph renders correctly for every agent step                        | Yes    |
| Node hover tooltip works                                            | Yes    |
| Deployed and accessible via public URL                              | Yes    |
| Page load time under 3 seconds                                      | Yes    |
| Agent response begins streaming within 2 seconds of task submission | Yes    |


---

## 10. Out of Scope (Future Phases)

- User accounts and authentication
- Persistent cross-session file storage (database)
- Agent memory and context across sessions
- Additional apps (Terminal, Notes, Music, Maps)
- Mobile layout
- Plugin/extension system for third-party apps
- Export of graph as image or JSON
- Multi-agent coordination