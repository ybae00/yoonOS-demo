# YoonOS — Obsidian-Style Force Graph Implementation Plan

> Replacing ReactFlow with react-force-graph for an authentic Obsidian-grade force-directed graph experience

**Date:** May 2026 | **Version:** 1.0

---

## 1. Feasibility Assessment

The short answer is yes, and it is the right call. The existing ReactFlow-based `AgentGraph` does not give you a true force-directed graph. Nodes are positioned at fixed coordinates calculated by index (`x: count * 200`), which means the graph does not breathe, cluster, or self-organize the way Obsidian's does. The react-force-graph and 3d-force-graph libraries fix all of this.

### 1.1 What You Currently Have

`AgentGraph.tsx` uses reactflow v11, a general-purpose node-and-edge canvas for flowcharts and diagrams. It is not a physics simulation. Nodes are placed at static positions and stay there. The current implementation places nodes in a zig-zag horizontal line, not a self-organizing web.

| Current Behavior (ReactFlow) | Target Behavior (Obsidian-style) |
|---|---|
| Nodes placed at index * 200px on X axis | Nodes pulled and repelled by physics simulation |
| No gravity or repulsion between nodes | Nodes repel each other, edges attract linked nodes |
| Static layout, does not reorganize | Layout continuously evolves as new nodes arrive |
| React DOM-rendered node elements | Canvas pixel rendering (HTML Canvas or WebGL) |
| Generic flowchart aesthetics (white bg) | Dark theme with glowing circular nodes and soft links |
| No zoom-to-fit physics | Camera auto-fits and tracks the living graph |

### 1.2 What the Libraries Provide

`react-force-graph` is a React binding for two underlying vanilla JS libraries:

- **force-graph** — 2D canvas rendering using HTML Canvas and d3-force physics engine
- **3d-force-graph** — 3D WebGL rendering using ThreeJS and d3-force-3d physics engine

Both are MIT licensed, actively maintained (3d-force-graph v1.80.0 per the downloaded source), and authored by Vasco Asturiano. The React bindings (`react-force-graph-2d`, `react-force-graph-3d`) wrap these via react-kapsule, making them first-class React components with full prop and ref APIs.

> **Verdict:** Both `react-force-graph-2d` and `react-force-graph-3d` are viable replacements for the graph layer in `AgentGraph.tsx`. The data shape (`nodes[]` and `edges[]`) stays compatible. The `graphStore` does not need changes. Only `AgentGraph.tsx` is rewritten.

### 1.3 Compatibility with YoonOS Stack

| Concern | Assessment |
|---|---|
| Next.js 14 App Router (SSR) | Requires `dynamic` import with `ssr: false`. Canvas and WebGL are browser-only. Standard practice. |
| React 18 | Both libraries support React 18. No compatibility issues. |
| TypeScript | `3d-force-graph` ships a bundled `.d.ts` file. `graphStore` types unchanged. |
| Tailwind CSS | The force graph canvas fills its container div. Tailwind classes on the wrapper work normally. |
| Zustand graphStore | Store shape stays the same. Only the position calculation in `addNode` is removed — physics handles layout. |
| Electron desktop build | Canvas and WebGL work in Electron's Chromium. No issues. |
| Vercel deployment | Client-side only rendering. No server calls. Fully compatible. |

---

## 2. Library Selection: 2D vs 3D

You have a genuine choice here. The recommendation is to use both: 2D for the mini-map widget, and 3D for the expanded full-screen view.

### 2.1 react-force-graph-2d (HTML Canvas)

- Renders to a 2D HTML Canvas element using d3-force for physics
- Extremely performant — handles thousands of nodes without dropping frames
- Custom node rendering via `nodeCanvasObject` callback — draw any shape, color, or label
- Custom link rendering via `linkCanvasObject` — gradients, curves, animated particles
- Hover highlighting works exactly as in Obsidian (neighbor traversal pattern)
- Lightweight bundle, smaller than the 3D version
- Best choice for the mini-map panel (the compact widget in the bottom corner)

### 2.2 react-force-graph-3d (ThreeJS / WebGL)

- Renders to a WebGL canvas using ThreeJS and d3-force-3d
- Full 3D space — nodes have x, y, z positions and the scene can orbit freely
- Supports `UnrealBloomPass` post-processing — the exact glow effect in Obsidian's 3D graph view
- Custom THREE.js geometries for nodes — spheres, icosahedra, custom meshes
- Heavier bundle (~600kb for ThreeJS), more GPU cost
- Best choice for the expanded full-screen view

### Recommended Architecture

**Mini-map widget: `react-force-graph-2d`**
Use 2D for the always-visible compact widget. It renders fast, stays responsive during agent runs, and draws clean Obsidian-style circular nodes on a dark canvas.

**Expanded full-screen view: `react-force-graph-3d`**
When the user clicks expand, switch to the 3D view with bloom post-processing. Glowing nodes floating in dark space — the exact Obsidian aesthetic, activated on demand.

---

## 3. Obsidian Visual Specification

Every visual element must be precisely specified to replicate the Obsidian graph UI experience.

### 3.1 Color System

| Element | Color Value |
|---|---|
| Canvas background | `#0d0e12` (near-black with slight blue tint) |
| Default node fill | `#483699` (muted purple — Obsidian default) |
| Node `in_progress` | `#7C3AED` (bright purple — active, pulsing) |
| Node `done` | `#16A34A` (green — completed) |
| Node `error` | `#DC2626` (red — failed) |
| Node `pending` | `#374151` (dark gray — not yet started) |
| Node `interrupted` | `#D97706` (amber — paused by user) |
| Default link color | `rgba(120, 100, 200, 0.35)` (faint purple line) |
| Highlighted link | `rgba(139, 92, 246, 0.9)` (bright purple) |
| Node label text | `#e5e7eb` (near-white) |
| Label font size | `4px` in canvas units (scales with zoom) |
| Hover ring | `rgba(139, 92, 246, 0.6)` |
| Neighbor node highlight | `#a78bfa` (lighter purple tint) |

### 3.2 Node Rendering (2D Canvas)

Each node is drawn as a filled circle with a floating label. The `nodeCanvasObject` callback draws both in one pass:

```ts
nodeCanvasObject={(node, ctx, globalScale) => {
  const { x, y } = node;
  const r = Math.sqrt(node.val || 1) * NODE_R;

  // Outer glow ring for highlighted nodes
  if (highlightNodes.has(node)) {
    ctx.beginPath();
    ctx.arc(x, y, r * 1.6, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(139, 92, 246, 0.25)';
    ctx.fill();
  }

  // Node circle
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2 * Math.PI);
  ctx.fillStyle = STATUS_COLORS[node.status];
  ctx.fill();

  // Label only visible when zoomed in enough
  if (globalScale >= 1.2) {
    const label = node.toolName?.replace(/_/g, ' ') || node.id;
    const fontSize = 4 / globalScale;
    ctx.font = `${fontSize}px Arial`;
    ctx.fillStyle = '#e5e7eb';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(label, x, y + r + 2 / globalScale);
  }
}}
```

### 3.3 Bloom Effect (3D Expanded View)

The `UnrealBloomPass` is what gives the 3D view its signature Obsidian glow:

```ts
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

const graphRef = useRef();

useEffect(() => {
  if (!graphRef.current) return;
  const bloomPass = new UnrealBloomPass();
  bloomPass.strength = 1.5;  // 1–3 is the Obsidian range
  bloomPass.radius = 0.6;
  bloomPass.threshold = 0.1;
  graphRef.current.postProcessingComposer().addPass(bloomPass);
}, []);
```

### 3.4 Physics Configuration

These d3-force parameters replicate the Obsidian graph feel:

```ts
// Applied via d3Force() method calls on the graph component:
d3Force('charge', forceManyBody().strength(-120))  // Node repulsion strength
d3Force('link').distance(60)                       // Link rest length
d3Force('center', forceCenter())                   // Pull towards canvas center

// Props on the ForceGraph component:
d3AlphaDecay={0.02}    // Slow cooldown for smoother animation
d3VelocityDecay={0.3}  // Friction coefficient
warmupTicks={40}       // Pre-run simulation ticks before first render
cooldownTicks={200}    // Continue animating after initial layout
```

---

## 4. Implementation Plan

### Phase 1 — Install and Configure (30 min)

**Step 1.1: Install packages**

```bash
cd yoonos
npm install react-force-graph-2d react-force-graph-3d
# Do not uninstall reactflow yet — wait until migration is confirmed working
```

**Step 1.2: Remove ReactFlow imports**

Remove the following from `AgentGraph.tsx`:

```ts
// DELETE THESE:
import ReactFlow, { Background, MiniMap, useNodesState,
  useEdgesState, Node, NodeProps } from 'reactflow';
import 'reactflow/dist/style.css';
```

**Step 1.3: Set up dynamic imports for Next.js SSR**

Canvas and WebGL cannot run in Node.js. Both graph components must be loaded with `next/dynamic`:

```ts
import dynamic from 'next/dynamic';

const ForceGraph2D = dynamic(
  () => import('react-force-graph-2d'),
  { ssr: false }
);
const ForceGraph3D = dynamic(
  () => import('react-force-graph-3d'),
  { ssr: false }
);
```

---

### Phase 2 — Data Adapter (1 hour)

The `graphStore` holds data in ReactFlow format. An adapter function converts it without changing the store.

**Step 2.1: Data shape difference**

| ReactFlow Format | react-force-graph Format |
|---|---|
| `{ id, type, position: {x,y}, data: {...} }` | `{ id, ...data fields nested or spread }` |
| `edges: [{ id, source, target, animated }]` | `links: [{ source, target }]` |
| Position is static and set manually | Position is computed by physics — do not set x/y |
| `nodeTypes` map to React components | `nodeCanvasObject` is a single callback function |

**Step 2.2: Write the adapter in AgentGraph.tsx**

```ts
const graphData = useMemo(() => ({
  nodes: storeNodes.map(n => ({
    id: n.id,
    toolName: n.data.toolName,
    label: n.data.label,
    status: n.data.status,
    input: n.data.input,
    output: n.data.output,
    timestamp: n.data.timestamp,
    val: 1,  // Controls node radius: sqrt(val) * NODE_R
  })),
  links: storeEdges.map(e => ({
    source: e.source,
    target: e.target,
  }))
}), [storeNodes, storeEdges]);
```

**Step 2.3: Clean up graphStore.ts**

```ts
// In graphStore.ts addNode — REMOVE these two lines:
const yOffset = existingNodes.length % 2 === 0 ? 0 : 60;
position: { x: existingNodes.length * 200, y: 40 + yOffset },

// REPLACE with (kept for type compatibility only):
position: { x: 0, y: 0 },  // Ignored by force graph; physics handles layout
```

---

### Phase 3 — Rewrite AgentGraph Component (2–3 hours)

**Step 3.1: Build the 2D mini-map component**

```tsx
const MINI_NODE_R = 5;

function MiniGraph({ graphData, onNodeClick }) {
  const [highlightNodes, setHighlightNodes] = useState(new Set());
  const [highlightLinks, setHighlightLinks] = useState(new Set());

  const handleNodeHover = useCallback(node => {
    highlightNodes.clear(); highlightLinks.clear();
    if (node) {
      highlightNodes.add(node);
      (node.neighbors || []).forEach(n => highlightNodes.add(n));
      (node.links || []).forEach(l => highlightLinks.add(l));
    }
    setHighlightNodes(new Set(highlightNodes));
    setHighlightLinks(new Set(highlightLinks));
  }, []);

  return (
    <ForceGraph2D
      graphData={graphData}
      backgroundColor="#0d0e12"
      nodeRelSize={MINI_NODE_R}
      autoPauseRedraw={false}
      linkColor={() => 'rgba(120, 100, 200, 0.35)'}
      linkWidth={link => highlightLinks.has(link) ? 2 : 0.8}
      nodeCanvasObject={(node, ctx, scale) =>
        drawNode(node, ctx, scale, highlightNodes)}
      onNodeHover={handleNodeHover}
      onNodeClick={onNodeClick}
      d3AlphaDecay={0.02}
      warmupTicks={40}
    />
  );
}
```

**Step 3.2: Build the 3D expanded view**

```tsx
function ExpandedGraph({ graphData, onNodeClick }) {
  const graphRef = useRef();

  useEffect(() => {
    if (!graphRef.current) return;
    import('three/examples/jsm/postprocessing/UnrealBloomPass.js')
      .then(({ UnrealBloomPass }) => {
        const bloom = new UnrealBloomPass();
        bloom.strength = 1.5;
        bloom.radius = 0.6;
        bloom.threshold = 0.1;
        graphRef.current.postProcessingComposer().addPass(bloom);
      });
  }, []);

  return (
    <ForceGraph3D
      ref={graphRef}
      graphData={graphData}
      backgroundColor="#0d0e12"
      nodeColor={node => STATUS_COLORS_3D[node.status]}
      nodeOpacity={0.9}
      nodeResolution={16}
      linkColor={() => 'rgba(120, 100, 200, 0.4)'}
      linkOpacity={0.5}
      linkWidth={1}
      onNodeClick={onNodeClick}
      enableNavigationControls={true}
      controlType="orbit"
      d3AlphaDecay={0.02}
      warmupTicks={60}
    />
  );
}
```

**Step 3.3: Neighbor cross-linking for hover highlight**

```ts
useEffect(() => {
  graphData.links.forEach(link => {
    const a = graphData.nodes.find(n => n.id === link.source);
    const b = graphData.nodes.find(n => n.id === link.target);
    if (!a || !b) return;
    if (!a.neighbors) a.neighbors = [];
    if (!b.neighbors) b.neighbors = [];
    if (!a.links) a.links = [];
    if (!b.links) b.links = [];
    a.neighbors.push(b); b.neighbors.push(a);
    a.links.push(link); b.links.push(link);
  });
}, [graphData]);
```

**Step 3.4: Node click handler**

```ts
const handleNodeClick = useCallback(node => {
  setSelectedNode(node);
  if (agentStatus === 'running') {
    useAgentStore.getState().abort();
    useGraphStore.getState().updateNodeStatus(node.id, 'interrupted');
  }
}, [agentStatus]);
```

---

### Phase 4 — Visual Polish (1 hour)

**Step 4.1: Container styling (Tailwind)**

```tsx
// Mini-map container:
<div className="fixed bottom-28 right-3 w-72 h-48
  bg-[#0d0e12] rounded-xl border border-purple-900/40
  overflow-hidden z-[9990] shadow-2xl shadow-purple-900/20">
  <MiniGraph ... />
</div>

// Expanded container:
<div className="fixed inset-0 bg-[#0d0e12] z-[9990]">
  <ExpandedGraph ... />
</div>
```

**Step 4.2: In-progress node pulsing animation**

```ts
const animTimeRef = useRef(0);
const animFrameRef = useRef(null);

useEffect(() => {
  const animate = (t) => {
    animTimeRef.current = t;
    animFrameRef.current = requestAnimationFrame(animate);
  };
  animFrameRef.current = requestAnimationFrame(animate);
  return () => cancelAnimationFrame(animFrameRef.current);
}, []);

// In nodeCanvasObject, for in_progress nodes:
if (node.status === 'in_progress') {
  const pulse = 1 + 0.15 * Math.sin(animTimeRef.current / 300);
  ctx.beginPath();
  ctx.arc(x, y, r * 1.8 * pulse, 0, 2 * Math.PI);
  ctx.fillStyle = 'rgba(124, 58, 237, 0.2)';
  ctx.fill();
}
```

**Step 4.3: Directional link arrows and particles**

```ts
linkDirectionalArrowLength={3.5}
linkDirectionalArrowRelPos={1}
linkDirectionalArrowColor={() => 'rgba(139, 92, 246, 0.7)'}
// Optional animated particles along links:
linkDirectionalParticles={2}
linkDirectionalParticleSpeed={0.006}
linkDirectionalParticleWidth={1.5}
linkDirectionalParticleColor={() => '#7c3aed'}
```

**Step 4.4: Camera zoom-to-fit on expand/collapse**

```ts
const graphRef2D = useRef();
const graphRef3D = useRef();

useEffect(() => {
  if (isExpanded && graphRef3D.current) {
    setTimeout(() => graphRef3D.current.zoomToFit(400, 80), 100);
  }
  if (!isExpanded && graphRef2D.current) {
    setTimeout(() => graphRef2D.current.zoomToFit(300, 20), 100);
  }
}, [isExpanded]);
```

---

## 5. File Change Inventory

### Files to Modify

| File | Change |
|---|---|
| `yoonos/package.json` | Add `react-force-graph-2d` and `react-force-graph-3d`. Remove `reactflow` after migration. |
| `components/agent/AgentGraph.tsx` | Full rewrite. Replace ReactFlow with 2D/3D force graph components. ~250 lines of new code. |
| `stores/graphStore.ts` | Remove static position calculation from `addNode`. All other logic stays identical. |
| `app/(os)/desktop/page.tsx` | No change needed. |
| `types/index.ts` | No change. `GraphNodeData` interface stays the same. |

### Files to Create

| File | Purpose |
|---|---|
| `components/agent/MiniGraph.tsx` | Extracted 2D mini-map sub-component. |
| `components/agent/ExpandedGraph.tsx` | Extracted 3D full-screen sub-component with bloom effect. |
| `components/agent/graphUtils.ts` | Shared: `drawNode`, `STATUS_COLORS`, neighbor cross-linking, `graphData` adapter. |
| `components/agent/NodeDetailPanel.tsx` | Extracted node detail sidebar (same logic as current, isolated). |

> **Migration Risk Level: Low.** The `graphStore`, agent loop, and data pipeline are not changing. Only the rendering layer changes. Reverting to ReactFlow is a single `git checkout` of one file.

---

## 6. Final Component Architecture

### Component Tree

```
AgentGraph.tsx                     // Main orchestrator
  |-- graphUtils.ts               // Adapter, drawNode, STATUS_COLORS
  |-- MiniGraph.tsx               // 2D widget (react-force-graph-2d)
  |     |-- ForceGraph2D          // HTML Canvas renderer + physics
  |     |-- NodeDetailOverlay     // Inline mini detail on node click
  |
  |-- ExpandedGraph.tsx           // 3D full screen (react-force-graph-3d)
  |     |-- ForceGraph3D          // WebGL/ThreeJS + UnrealBloomPass
  |     |-- NodeDetailPanel       // Side panel: full node info + resume
  |
  |-- graphStore (Zustand)        // Source of truth: nodes[], edges[]
  |-- agentStore (Zustand)        // status, currentTask, abort()
```

### Live Data Flow

| Step | What Happens |
|---|---|
| 1. Agent calls a tool | `agentLoop.ts` calls `graphStore.addNode()` with toolName and input |
| 2. Node added to store | `graphStore` adds a new `Node<GraphNodeData>` to the nodes array |
| 3. AgentGraph reacts | `useMemo` in AgentGraph converts store data to `graphData` format |
| 4. Physics simulation updates | New node injected into running simulation. All nodes reposition naturally. |
| 5. Tool completes | `agentLoop.ts` calls `graphStore.updateNodeStatus()`. Node color transitions. |
| 6. User hovers a node | `onNodeHover` fires. Neighbor cross-links traversed. Highlight sets updated. |
| 7. User clicks a node | `onNodeClick` fires. `selectedNode` set. Detail panel opens. Agent aborted if running. |
| 8. User expands graph | `isExpanded` toggled. `ExpandedGraph3D` mounts. Bloom pass applied. Camera fits. |

### What Changes vs What Stays

| Layer | Before | After |
|---|---|---|
| `graphStore.ts` | Node positions calculated manually | Position `{0,0}` — unused, physics handles layout |
| `graphStore.ts` | Node type is ReactFlow `Node<T>` | Same type — no change needed |
| `AgentGraph.tsx` | ReactFlow nodes state (`useNodesState`) | `useMemo` adapter produces `graphData` |
| `AgentGraph.tsx` | Edge state (`useEdgesState`) | Edges converted to `links[]` in adapter |
| `AgentGraph.tsx` | Static grid positions | Physics simulation handles all layout |
| `AgentGraph.tsx` | `nodeTypes` map to React components | `nodeCanvasObject` callback in canvas |
| `agentStore.ts` | No change | No change |
| `types/index.ts` | No change | No change |

---

## 7. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| `next/dynamic` with `ssr: false` causes flicker on first render | Add a loading skeleton with `bg-[#0d0e12]`. Container is visible immediately; only the canvas content is deferred. |
| Three.js bundle size increases initial page weight (~600kb) | Load `ExpandedGraph3D` lazily — only import `react-force-graph-3d` when the user clicks expand. |
| `UnrealBloomPass` import fails against bundled Three.js version | `3d-force-graph` v1.80.0 uses `three >=0.179`. Import `UnrealBloomPass` from esm.sh with a matching version pin. |
| Canvas renders behind OS window layers | Tailwind `z-[9990]` on the container controls stacking — identical to the current setup. |
| Physics simulation is CPU-intensive during agent runs | Set `cooldownTicks={150}` to stop simulation after layout stabilizes. Call `d3ReheatSimulation()` only when new nodes are added. |
| Node click coordinates wrong in mini-map | The 2D library handles coordinate scaling internally. `onNodeClick` receives the correct node object regardless of canvas size. |

### Rollback Plan

1. `git checkout` the two modified files (`AgentGraph.tsx`, `graphStore.ts`)
2. Re-add `reactflow` to `package.json`
3. Run `npm install`
4. The rest of the app is completely untouched

---

## 8. Effort and Timeline

| Phase | Estimated Time | Description |
|---|---|---|
| Phase 1: Install and Configure | 30 min | npm install, dynamic import setup, remove ReactFlow imports |
| Phase 2: Data Adapter | 1 hour | `graphData` converter, neighbor cross-linking, `graphStore` cleanup |
| Phase 3: Component Rewrite | 2–3 hours | `MiniGraph` 2D, `ExpandedGraph` 3D, node detail panel |
| Phase 4: Visual Polish | 1 hour | Bloom effect, pulse animation, arrows, zoom transitions |
| Testing and Verification | 30 min | Run agent task end-to-end, verify node lifecycle, test expand/collapse |
| **Total** | **5–6 hours** | Single focused session |

---

> **Bottom Line:** This migration is fully feasible, low-risk, and high-reward. The existing data structures (`graphStore`, `agentStore`, `GraphNodeData` types) require almost no changes. The only real work is rewriting `AgentGraph.tsx` — roughly 250–350 lines of new code replacing 230 lines of existing code. The result is an authentic, physics-driven, Obsidian-grade node graph that becomes the signature visual of YoonOS.
>
> The libraries you downloaded (`react-force-graph-master` and `3d-force-graph-master`) are exactly the right tools for this. Install them from npm as `react-force-graph-2d` and `react-force-graph-3d`. The source you have is the upstream reference.
