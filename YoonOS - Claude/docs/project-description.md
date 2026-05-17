# YoonOS — Project Description

## What It Is

YoonOS is a web-based operating system that lives in your browser. It looks and feels like a real desktop OS — with draggable windows, a dock, and real apps — but its most important feature is a built-in AI agent that can control everything inside it.

You give the agent a task in plain English. It opens apps, browses the internet, edits files, and manages your calendar — just like a person sitting at a computer would. While it works, the entire interface restructures to show you not just what the agent is doing, but a live graph of *how* it is thinking: every step, every decision, every subtask mapped out as connected nodes in a full-screen Obsidian-style visual graph.

This is not a chatbot. It is not a dashboard. It is an operating system where the AI is a first-class resident, and transparency into its work is built into the interface itself.

---

## The Core Idea in One Sentence

A browser-native OS where an AI agent does your tasks and shows you its entire thought process as a live, interactive node graph that takes over the main screen — not a sidebar, not a corner widget, but the center of the experience.

---

## The UI Paradigm (Key Design)

The graph is not a secondary element. It is the main screen.

1. **You open YoonOS in your browser.** You see a full-screen desktop with a dock, wallpaper, and app icons.
2. **You type a task** in the prompt bar at the bottom center of the screen.
3. **The desktop slides right.** The entire desktop panel shrinks to the right half of the screen, revealing a white canvas behind it. This is the Agent Graph — a live Obsidian-style force-directed node graph.
4. **The graph grows in real time** on the left half, one node per agent action. Nodes are connected by edges showing sequence and dependency.
5. **You hover over any node.** The desktop panel on the right instantly changes to show the app that node interacted with — the browser, text editor, calendar, or photo booth.
6. **A "Take Over" button** floats at the very top center of the screen while the agent is running. Clicking it immediately aborts the agent and returns full control of the desktop to you.
7. **The prompt bar** remains fixed at the bottom center of the full screen throughout — accessible whether the graph is open or not.
8. **Approval notices** appear directly on graph nodes as amber badges when the agent needs your input before it can proceed.
9. **When the task completes**, the graph stays visible on the left for review. You dismiss it with the close button in the graph header, which collapses the panel and slides the desktop back to full width.

---

## The Apps (Phase 1)

| App | Description |
|---|---|
| **Browser** | A real internet browser. The agent (and the user) can navigate to actual URLs. Powered by a backend proxy. |
| **Calendar** | A simple calendar with event creation and viewing. The agent can read and write events. |
| **Photo Booth** | Uses the device webcam to capture photos. Agent can trigger captures or view the last photo. |
| **Text Edit** | A plain-text and rich-text editor. The agent can open, read, write, and save files. |

---

## The Agent

- Powered by **Anthropic's Claude API** (claude-sonnet or claude-opus).
- Uses Claude's **tool use** feature to call OS-level functions (open app, navigate URL, type text, read screen content, save file, etc.).
- Each tool call the agent makes becomes a **node in the graph**.
- The agent can handle multi-step, multi-app tasks end-to-end.
- The user can interrupt at any point by clicking a node or pressing "Take Over."

---

## The Graph (What Makes This Different)

Most AI assistants show you a text transcript. YoonOS shows you a **live force-directed node graph** — the same visual language as Obsidian or Roam Research, but generated in real time as the agent works, and taking up the entire left half of the screen.

- **Each node** = one action the agent took (e.g., "Open Browser", "Search for coffee shops", "Read page content", "Switch to Text Edit", "Write list").
- **Edges** connect nodes to show sequence and dependency.
- **Color codes** show status: purple (in progress), green (done), red (error), amber (interrupted).
- **White background** — clean, readable, Obsidian-style.
- **Hover** over any node to see its status and switch the desktop to show the relevant app.
- **Click** any node to pause the agent at that step.
- **Approval badges** (amber "!" dot) appear on nodes when the agent needs user approval.

---

## Key Differentiators

- **The graph is the main screen.** Not a corner widget. Not a modal. The entire left half of the display.
- **Transparency by design.** You don't just see what the agent did — you see how it thought, in real time, visually.
- **Real apps, real web.** Not a simulation. The browser actually browses. The calendar actually stores events. Files actually save.
- **Interruptible at any moment.** "Take Over" button at the top center, always visible while the agent runs.
- **Node hover = app context switch.** The desktop panel follows your focus in the graph.
- **OS-native feel.** Not a plugin, not a sidebar, not a chatbot modal. The agent *is part of the OS.*

---

## Target User (Phase 1)

The creator. A personal power tool for someone who wants to push the boundary of what AI-assisted computing looks like. Not yet built for mass deployment — optimized first for depth and correctness.

---

## Tech Stack (Summary)

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, React, Tailwind CSS |
| Window Manager | Custom React component system (sliding panel layout) |
| Agent | Anthropic Claude API (tool use + streaming) |
| Graph | react-force-graph-2d (white-bg Obsidian style, full left panel) |
| Browser App | Backend proxy + iframe rendering |
| Real-time | Server-Sent Events (SSE) for agent streaming |
| Deployment | Vercel (frontend + API), Railway (browser proxy service) |
| State | Zustand (windowStore, agentStore, graphStore, uiStore) |

---

## What This Is Not

- Not a virtual machine or real OS kernel. It is a web application that looks and behaves like an OS.
- Not a general-purpose coding environment. Focused on task execution and visual agent transparency.
- Not a multi-user SaaS product in Phase 1. Personal tool first.
