# YoonOS — Plan B: The Convincing Dummy

**Goal:** Build a version of YoonOS that looks, sounds, and feels completely real — but runs entirely on pre-scripted data, timed animations, and zero real backend infrastructure. The user never knows the difference unless they try to break it.

**Audience:** Demo day / public  
**Stack:** Next.js + React + Tailwind  
**Deployment:** Vercel (live URL, shareable)

---

## The Core Philosophy

A great demo is not a lie — it is a controlled performance. Every Hollywood prop looks real under stage lights. Your job is to design the stage lighting, not build a real building.

The rule: **simulate the seams, not just the surfaces.** The graph should animate smoothly. The browser should "load." The AI should pause, think, then type. If it feels instant, it feels fake. Timing is everything.

---

## Architecture Overview

```
YoonOS Demo (Next.js)
├── /app
│   ├── page.tsx              ← Desktop / OS shell
│   ├── /api
│   │   └── agent/route.ts    ← Returns pre-scripted step sequence (no real AI call)
├── /components
│   ├── Desktop.tsx
│   ├── Dock.tsx
│   ├── WindowManager.tsx
│   ├── apps/
│   │   ├── Browser.tsx       ← Fake browser with pre-loaded pages
│   │   ├── Calendar.tsx      ← Pre-populated events
│   │   ├── TextEdit.tsx      ← Typewriter effect output
│   │   └── PhotoBooth.tsx    ← Static webcam frame / pre-baked photo
│   ├── agent/
│   │   ├── AgentBar.tsx      ← Chat input at bottom of screen
│   │   ├── AgentRunner.tsx   ← Replays the script step by step
│   │   └── scripts/          ← JSON files, one per demo scenario
│   └── graph/
│       ├── NodeGraph.tsx     ← React Flow canvas
│       ├── MiniMap.tsx       ← Corner overlay during demo
│       └── graphScripts/     ← Pre-defined node/edge sequences
├── /public
│   └── screenshots/          ← Pre-rendered "browser" pages as images
└── /lib
    └── demoEngine.ts         ← Core timing and sequencing engine
```

---

## Visual Direction: macOS Style

The OS should feel immediately familiar to anyone who uses a Mac. The goal is "this IS macOS" at a glance — not "this is inspired by macOS."

### Core Design Language

| Element | Spec |
|---|---|
| Background | Soft macOS-style wallpaper (blurred gradient landscape, or use an actual macOS Sonoma/Sequoia wallpaper image) |
| Window chrome | White/light gray background, `backdrop-filter: blur(20px)`, subtle `box-shadow: 0 20px 60px rgba(0,0,0,0.15)`, 12px border-radius |
| Title bar | macOS traffic lights (red/yellow/green circles, 12px, 8px gap), centered window title in SF Pro or `font-family: -apple-system` |
| Dock | Frosted glass pill at bottom center, icon size 52px with magnify-on-hover (scale 1.0 to 1.6), bounces on open |
| Font | `-apple-system, BlinkMacSystemFont, "SF Pro Display"` — this literally uses the system font on Macs |
| Menu bar | Top bar, 24px height, frosted glass, left: Apple logo + app name, right: WiFi/Battery/Clock (all static, decorative) |
| Cursor | Default system cursor — do NOT override it |
| Animations | Spring physics (CSS `cubic-bezier(0.34, 1.56, 0.64, 1)` for opens), 200ms for closes |

### Window Behavior

- Windows open with a scale-from-dock animation (starts at dock icon position, scales to full size).
- Dragging: smooth, no lag, constrained to the desktop area.
- Minimize: genie effect or simple scale-down into dock.
- Close: fade + scale to 0.8 in 150ms.
- Active window: slightly elevated shadow vs. background windows.

### App Icon Style

Each dock icon should be a macOS-style rounded rectangle with a flat icon inside:
- Browser: Safari compass
- Calendar: white calendar with today's date (live)
- Text Edit: lined document
- Photo Booth: red camera
- System Settings: gear

Use the `lucide-react` icon set for the internals — they're clean and readable at small sizes.

### Agent Bar (macOS Spotlight feel)

The AgentBar should feel like Spotlight / macOS search:
- Centered horizontally, fixed at bottom (40px from bottom edge)
- Frosted glass background, 600px wide, 48px tall, 24px border-radius
- Subtle inner glow when active (blue border, 1px, `rgba(59,130,246,0.6)`)
- Magnifying glass icon on left, send arrow on right

---

## The Demo Engine (How Fake Becomes Real)

The `demoEngine.ts` is the heart of the dummy. It works like a screenplay director:

1. A user types a prompt in the AgentBar (or a pre-set prompt auto-fills).
2. The engine loads the matching script from `/agent/scripts/`.
3. It replays each step with configured delays — opening apps, typing text, updating the graph.
4. Each step dispatches to the right component via a Zustand store.

### Step Schema

```typescript
type DemoStep = {
  id: string
  delay: number          // ms to wait before this step fires
  type:
    | "thinking"         // AI "thinking" bubble shows
    | "open_app"         // Window opens with animation
    | "browser_navigate" // Browser shows a pre-baked screenshot
    | "browser_read"     // Browser highlights fake "reading" overlay
    | "calendar_read"    // Calendar highlights today's events
    | "calendar_write"   // New event appears with animation
    | "textedit_type"    // Typewriter effect in Text Edit
    | "photo_capture"    // Photo Booth snaps a fake photo
    | "graph_node"       // New node appears in graph
    | "agent_message"    // AI sends a chat message
    | "complete"         // Task done state
  payload: Record<string, unknown>
}
```

### Timing Feel

The goal is to feel like watching a real agent work — not a slideshow. Use these delay patterns:

| Step type | Suggested delay | Why |
|---|---|---|
| "thinking" | 1200–2000ms | Makes it feel like the AI is "considering" |
| "open_app" | 400ms after thinking | Snappy, confident |
| "browser_navigate" | 800ms | Page "load" time illusion |
| "browser_read" | 1500ms | Reading takes time |
| "textedit_type" | character-by-character at 18ms/char | Feels like live typing |
| "graph_node" | 200ms after corresponding action | Graph slightly lags reality — realistic |
| "agent_message" | 600ms after task completion | Calm, not instant |

---

## Making Each App Feel Real

### Browser App

Do NOT use a live iframe — most major sites (NYT, CNBC, Apple) block iframe embedding via `X-Frame-Options`. The solution: **take real screenshots of the actual pages** and use them as static `next/image` assets. They look 100% real because they are the real pages, just frozen. Zero CORS issues, loads instantly, never goes down mid-demo.

**How it works:**
- Take a full-page screenshot of each target site at a reasonable viewport (1280x800 or 1440x900).
- Store them in `/public/screenshots/` as high-quality PNGs.
- When the agent "navigates," run a 600ms fake loading bar, then fade-in the screenshot behind the address bar.
- The address bar updates to the real URL (e.g., `nytimes.com`) so it reads as authentic.
- For "reading" state: overlay a slow, semi-transparent highlight sweep down the page — simulates the agent's eye scanning the content.

**Pages to screenshot (use the real sites):**
- `nytimes.com` — used in the Good Morning Briefing for headlines
- `cnbc.com` — used in the Research scenario for financial/productivity content
- `apple.com` — used as a "browsed" destination in the Calendar+Browser combo (e.g., checking an Apple event date)
- `weather.com` or `wttr.in` — weather lookup for New York / EST timezone

**Re-screenshot tip:** Refresh your screenshots every few weeks before a demo so the pages don't look stale. Takes 5 minutes.

### Calendar App

- Hard-code 3–4 events already on the calendar (makes it look used and real).
- When the agent "creates" an event, animate it appearing — slide in from the side, color fill.
- Use a real date library (date-fns) so today's date is always correct.

### Text Edit App

- Starts empty when the scenario begins.
- Agent output uses a typewriter effect — do NOT dump the text at once.
- Use a monospace or clean serif font. Format the output with headers and bullet points.
- After typing is done, show a subtle "auto-saved" indicator in the corner.

### Photo Booth App

- Keep the webcam feed live if the browser permits it (navigator.mediaDevices). It makes the app feel immediately real.
- If webcam is unavailable, use a looping fake "live feed" video.
- The "capture" animation: flash white overlay for 80ms, then show a frozen frame in the film strip at the bottom.
- For the Good Morning scenario: pre-bake one captured photo that the agent "analyzes."

### Agent Bar

- The bar sits fixed at the bottom of the screen.
- In demo mode: the prompt pre-fills character by character (typewriter) before the user even types.
- Add a subtle "pulse" ring around the send button while the agent is running.
- Show a streaming text output above the bar ("Opening Browser...", "Reading page...", "Writing to Text Edit...") in a small status chip.

---

## The Graph (The Wow Moment)

The graph is what makes YoonOS different from everything else. It needs to feel alive.

### Tech: React Flow

Use React Flow with a force-directed or dagre layout. Each node animates in with a spring effect. Edges draw themselves (SVG stroke-dashoffset animation).

### Node Design

Each node should be a pill-shaped card, not a raw circle:

```
[ icon ][ label           ][ status dot ]
```

- Icon: small emoji or Lucide icon representing the action type
- Label: short verb phrase ("Search weather", "Read calendar", "Write brief")
- Status dot: animated pulse (blue = active), solid green (done), red (error)

### Graph Color System

| Status | Color | Animation |
|---|---|---|
| Pending | Gray #6B7280 | Static |
| In Progress | Blue #3B82F6 | Pulsing ring |
| Done | Green #22C55E | Solid, slight scale-up on completion |
| Error | Red #EF4444 | Shake animation |

### Layout During Demo

- Mini-map: fixed bottom-right, 280x180px, semi-transparent dark background.
- Nodes build left-to-right or top-to-bottom as the task progresses.
- When the user clicks "expand," the graph takes over the full screen with a smooth transition.
- Add a subtle particle trail on edges as new nodes connect.

---

## The Three Demo Scenarios

### Scenario 1: Research + Save to File

**Trigger prompt (pre-filled):** `"Find the top 3 productivity tips and save them to a note"`

**Script sequence:**

1. Agent thinking (1500ms)
2. Open Browser — navigate to "productivity-tips.html" (fake search results)
3. Browser reading overlay (1500ms) — graph node: "Search web"
4. Agent thinking (800ms) — graph node: "Read results"
5. Open Text Edit
6. Typewriter: writes a formatted "Top 3 Productivity Tips" note with headers
7. Graph node: "Write to Text Edit"
8. Auto-save indicator appears
9. Agent message: "Done! I found 3 tips and saved them to your Text Edit."
10. Graph complete — all nodes green

**Total runtime:** ~18 seconds

---

### Scenario 2: Calendar + Browser Combo

**Trigger prompt (pre-filled):** `"Check if I have anything tomorrow and look up what the weather will be like"`

**Script sequence:**

1. Agent thinking (1200ms)
2. Open Calendar — animate highlight on tomorrow's date — graph node: "Read calendar"
3. Agent thinking (600ms)
4. Open Browser — fake loading bar (600ms), navigate to weather.com screenshot — graph node: "Check weather (New York, EST)"
5. Browser reading overlay (1200ms) — graph node: "Read weather"
6. Open Text Edit (or reuse if open)
7. Typewriter: writes a short summary — "Tomorrow: You have a 9am Eng standup and an 11am architecture review. Weather in New York: 68°F, partly cloudy. Good window for lunch around 12:30."
8. Graph node: "Summarize findings"
9. Agent message: "Here's your tomorrow at a glance. Saved it to Text Edit too."
10. Graph complete

**Total runtime:** ~22 seconds

---

### Scenario 3: Good Morning Briefing (Recommended Add)

**Trigger prompt (pre-filled):** `"Give me my morning briefing"`

**Script sequence:**

1. Agent thinking (1800ms) — this one feels like it's "loading up"
2. Open Calendar — scan today's events (highlight each one briefly, left to right): 9am Eng Standup, 10am 1:1 with Alex, 11am Architecture Review — graph node: "Check today's calendar"
3. Open Browser — fake loading bar, navigate to weather.com screenshot (New York) — graph node: "Check weather (EST)"
4. Browser reading overlay (1000ms)
5. Browser — fake loading bar, navigate to nytimes.com screenshot — graph node: "Check headlines"
6. Browser reading overlay (1200ms)
7. Open Photo Booth — live webcam activates, 2-second pause, flash — frozen frame appears in film strip — graph node: "Capture morning photo"
8. Open Text Edit
9. Typewriter: writes full "Good Morning, Yoon" brief:
   - Date + time (EST, live)
   - Weather: "New York — 64°F, overcast. Rain expected after 3pm."
   - Calendar: "3 meetings before noon. Your morning is packed — block focus time after 11:30."
   - Headlines: 2 pulled from the NYT screenshot (written by you, feel real)
   - Closing line: "You've got this. Make the 11am count."
10. Graph node: "Compose briefing"
11. Agent message: "Good morning, Yoon. Your brief is in Text Edit."
12. All 6 graph nodes turn green in cascade — left to right

**Total runtime:** ~35 seconds (the "big" demo — use this for the main stage)

**Pre-baked calendar events for demo (hard-coded, always show these):**

| Time | Event | Color |
|---|---|---|
| 9:00 AM | Eng Standup | Blue |
| 10:00 AM | 1:1 with Alex | Purple |
| 11:00 AM | Architecture Review | Blue |
| 2:00 PM | Product Sync | Gray |
| 4:30 PM | Design Review | Gray |

---

## Pre-Set Prompts System

For demo day, you do not want to rely on someone typing correctly on stage. Build a **prompt picker**:

- When the AgentBar is focused, show 3 floating suggestion chips above it, one per scenario.
- Clicking a chip auto-fills the prompt and starts the demo with a 1-second delay.
- The chips animate in with a slight stagger so they feel alive, not static.

This makes the demo reliable and impressive every single time.

---

## What to Build First (Priority Order)

1. **OS shell** — Desktop, Dock, window open/close/drag. This is the "feel" of the whole thing. Get this right first.
2. **Demo engine** — The `demoEngine.ts` step sequencer. Without this, nothing else connects.
3. **Graph (mini-map mode)** — Nodes building in real time is the most impressive visual. Build it early, even with placeholder data.
4. **Text Edit with typewriter** — Easy to build, highest emotional impact per minute of work.
5. **Browser with fake pages** — Build the fake HTML pages and the screenshot switcher.
6. **Calendar** — Pre-populated, event highlight animation.
7. **Photo Booth** — Webcam or fake feed plus capture flash.
8. **Prompt picker** — Polish, but important for live demos. Build last.

---

## Vercel Deployment Notes

- The Next.js app deploys to Vercel with zero config (`vercel deploy`).
- No environment variables needed — there are no real API calls.
- The one API route (`/api/agent`) just returns the script JSON — no secrets.
- Use `next/image` for the fake browser screenshots so they load fast on stage.
- Add `export const dynamic = 'force-static'` to the agent route so it caches perfectly on the edge.
- Estimated cold boot time on Vercel: under 1 second. Reliable for demo day.

---

## Things That Will Make or Break the Demo

**Make it:**
- Timing. Every delay should feel intentional. Test it out loud and adjust.
- The graph building in real time. This is the thing people will screenshot.
- The typewriter effect in Text Edit. Audiences love watching it write.
- The OS chrome — window drag, dock bounce, smooth app open animation.

**Break it:**
- Instant responses. Nothing feels faker than an AI that answers in 0ms.
- Missing loading states. If the browser "page" just pops in, it feels like a slideshow.
- Frozen graph. If nodes don't build progressively, the graph is just decoration.
- A prompt box that does nothing unless the exact right words are typed.

---

## Stretch Goals (If Time Allows)

- **Replay mode:** After a demo runs, show a "replay" button that re-runs the graph animation from the beginning — great for people who missed the first run.
- **Speed control:** A 1x / 2x toggle in the corner so you can run it faster for time-pressed demos.
- **Export graph:** A button that exports the completed graph as a PNG — gives audiences something to take with them.
- **Dark/light mode toggle:** Takes 30 minutes, makes the OS feel more real.
