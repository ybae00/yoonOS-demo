# YoonOS — Documentation Index

**For AI Coding Agents: Read this file first.**

This folder contains all planning and specification documents for the YoonOS project. Read them in the order listed below. Each document builds on the previous one.

---

## Reading Order

| Order | File | What It Contains | When to Read |
|---|---|---|---|
| 1 | `project-description.md` | What YoonOS is, how it works, the core concept, apps, agent, and graph — in plain language. | Before anything else. Sets the mental model. |
| 2 | `PRD.md` | Full product requirements: goals, user stories, feature requirements with priority levels (P0/P1/P2), technical requirements, success metrics. | Before writing any code. This defines what to build. |
| 3 | `possibility-analysis.md` | Component-by-component feasibility analysis. Explains the main technical challenges and how to solve them (especially the browser proxy). | Before making architecture decisions. |
| 4 | `project-plan.md` | Phased build plan in 4 phases, 22 milestones. Each milestone has discrete tasks and success criteria. | Before starting each phase. Use as your checklist. |
| 5 | `technical-plan.md` | Full implementation spec: repo structure, TypeScript types, Zustand stores, tool definitions, API route, proxy service, React Flow component, env vars, and implementation order. | When writing code. This is your primary reference. |
| 6 | `backend/README.md` | Index for the backend subfolder. Start here before reading any backend doc. | Before implementing auth, database, or file storage. |
| 7 | `obsidian-graph-implementation-plan.md` | In-depth plan for replacing ReactFlow with react-force-graph (2D + 3D) for an authentic Obsidian-style force-directed graph. Covers feasibility, visual spec, physics config, full code examples, and file change inventory. | Before implementing the agent graph visualization. |

---

## Project Summary

**YoonOS** is a browser-based operating system with a built-in AI agent (Claude API). Users create an account, log in, and get their own persistent desktop — with real files, calendar events, photos, and customizable settings (including wallpaper). The agent executes tasks across five apps and displays its work as a live Obsidian-style node graph.

**Stack:** Next.js 14, React 18, Tailwind CSS, Zustand, react-force-graph (2D + 3D), Supabase (auth + database + storage), Anthropic Claude API, Vercel, Railway.

**Four phases:**
- Phase 0: Backend Foundation (Supabase auth, database, storage)
- Phase 1: OS Shell (five working apps, no AI)
- Phase 2: The Agent (Claude agent controls the OS via tool calls)
- Phase 3: The Graph (live node graph visualization of agent work)

---

## Key Decisions (Do Not Change Without Reason)

- **AI Model:** `claude-sonnet-4-5` via the Anthropic SDK. Tool use enabled.
- **Graph Library:** `react-force-graph-2d` (mini-map widget) and `react-force-graph-3d` (expanded full-screen view with bloom). Replaces ReactFlow. See `obsidian-graph-implementation-plan.md`.
- **State:** Zustand. One store per domain. No Redux, no Context API for global state.
- **Database + Auth + Storage:** Supabase. Single service for all three. Not Firebase, not PlanetScale.
- **Browser Proxy:** Separate Node.js/Express service on Railway. NOT inside Next.js API routes.
- **Streaming:** Server-Sent Events (SSE) from `/api/agent`. Client uses `fetch` with stream reader.
- **TypeScript:** Strict mode. All types defined in `types/index.ts`. No `any`.
- **Styling:** Tailwind CSS only. No separate CSS files.
- **Sessions:** Cookie-based (Supabase SSR). Not localStorage.

---

## Environment Variables Required

```
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_PROXY_BASE_URL=https://your-proxy-service.railway.app
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Set all five in Vercel dashboard for production. Set in `.env.local` for local development. Never commit `.env.local` to git.

---

## What NOT to Build (Scope Limits)

Do not implement these in any phase:
- Agent memory across sessions (Phase 2+ consideration)
- Mobile/responsive layout
- Voice input or output
- Native OS (Electron) packaging
- Multi-user shared workspaces (each user's data is fully isolated)
- Third-party OAuth (no "Sign in with Google" — email/password only)

---

## File Map

```
docs/
├── README.md                              ← You are here. Read this first.
├── project-description.md                 ← Plain-language project overview
├── PRD.md                                 ← Product requirements (what to build)
├── possibility-analysis.md                ← Feasibility (how hard each part is)
├── project-plan.md                        ← Phased milestones (build order) — now 4 phases
├── technical-plan.md                      ← Code-level spec (how to build it)
├── obsidian-graph-implementation-plan.md  ← Force graph migration plan (ReactFlow → react-force-graph)
└── backend/
    ├── README.md              ← Backend index — read before any backend doc
    ├── database-schema.md     ← Postgres schema + RLS policies (run SQL in Supabase)
    ├── auth-flow.md           ← Login/signup, session handling, route protection
    ├── file-storage.md        ← Storage buckets, photo/file upload, agent file access
    └── system-settings.md     ← System Settings app: wallpaper, profile, preferences
```
