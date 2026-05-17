import type { Edge, Node } from 'reactflow';
import type { GraphNodeData, GraphNodeStatus } from '@/types';

export type ForceGraphNode = GraphNodeData & {
  id: string;
  val: number;
  neighbors: ForceGraphNode[];
  links: ForceGraphLink[];
  x?: number;
  y?: number;
};

export type ForceGraphLink = {
  source: string | ForceGraphNode;
  target: string | ForceGraphNode;
};

export type ForceGraphData = {
  nodes: ForceGraphNode[];
  links: ForceGraphLink[];
};

export const STATUS_COLORS: Record<GraphNodeStatus, string> = {
  pending: '#374151',
  in_progress: '#7C3AED',
  done: '#16A34A',
  error: '#DC2626',
  interrupted: '#D97706',
};

export const STATUS_LABELS: Record<GraphNodeStatus, string> = {
  pending: 'Pending',
  in_progress: 'Running',
  done: 'Done',
  error: 'Error',
  interrupted: 'Interrupted',
};

const DEFAULT_NODE_COLOR = '#483699';
const NODE_R = 5;

export function buildGraphData(
  storeNodes: Node<GraphNodeData>[],
  storeEdges: Edge[]
): ForceGraphData {
  const nodes: ForceGraphNode[] = storeNodes.map((node) => ({
    id: node.id,
    label: node.data.label,
    toolName: node.data.toolName,
    status: node.data.status,
    input: node.data.input,
    output: node.data.output,
    timestamp: node.data.timestamp,
    val: node.data.status === 'in_progress' ? 1.4 : 1,
    neighbors: [],
    links: [],
  }));

  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const links: ForceGraphLink[] = storeEdges.map((edge) => ({
    source: edge.source,
    target: edge.target,
  }));

  links.forEach((link, index) => {
    const source = nodeById.get(storeEdges[index].source);
    const target = nodeById.get(storeEdges[index].target);
    if (!source || !target) return;

    source.neighbors.push(target);
    target.neighbors.push(source);
    source.links.push(link);
    target.links.push(link);
  });

  return { nodes, links };
}

export function getNodeColor(node: ForceGraphNode) {
  return STATUS_COLORS[node.status] ?? DEFAULT_NODE_COLOR;
}

export function getNodeLabel(node: ForceGraphNode) {
  return node.toolName?.replace(/_/g, ' ') || node.label || node.id;
}

/**
 * drawNodeLight — renders a node for the white-background Obsidian-style graph panel.
 * Used by AgentGraph (the main full left-panel graph).
 *
 * @param awaitingApproval - when true, draws an approval badge on active nodes
 */
export function drawNodeLight(
  node: ForceGraphNode,
  ctx: CanvasRenderingContext2D,
  globalScale: number,
  highlightNodes: Set<ForceGraphNode>,
  animationTime = 0,
  awaitingApproval = false
) {
  if (typeof node.x !== 'number' || typeof node.y !== 'number') return;

  const radius = Math.sqrt(node.val || 1) * NODE_R;
  const isHighlighted = highlightNodes.has(node);
  const color = isHighlighted ? '#2563eb' : getNodeColor(node);

  // Pulse ring for in-progress nodes
  if (node.status === 'in_progress') {
    const pulse = 1 + 0.2 * Math.sin(animationTime / 300);
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius * 2.2 * pulse, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(124, 58, 237, 0.07)';
    ctx.fill();
  }

  // Hover highlight ring
  if (isHighlighted) {
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius * 1.8, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(37, 99, 235, 0.12)';
    ctx.fill();
  }

  // Main node body
  ctx.beginPath();
  ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
  ctx.fillStyle = color;
  ctx.shadowBlur = isHighlighted || node.status === 'in_progress' ? 10 : 3;
  ctx.shadowColor = color;
  ctx.fill();
  ctx.shadowBlur = 0;

  // Thin white border for definition on white canvas
  ctx.beginPath();
  ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // Label — always visible, dark text on white bg
  const label = getNodeLabel(node);
  const fontSize = Math.max(2.5, 3.5 / globalScale);
  ctx.font = `${fontSize}px Inter, system-ui, Arial, sans-serif`;
  ctx.fillStyle = isHighlighted ? '#1e3a5f' : '#374151';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(label, node.x, node.y + radius + 1.5 / globalScale);

  // Approval badge — amber dot with "!" when agent is waiting for user input
  if (awaitingApproval && (node.status === 'in_progress' || node.status === 'done')) {
    const badgeR = radius * 0.55;
    const bx = node.x + radius * 0.75;
    const by = node.y - radius * 0.75;

    ctx.beginPath();
    ctx.arc(bx, by, badgeR, 0, 2 * Math.PI);
    ctx.fillStyle = '#f59e0b';
    ctx.fill();

    ctx.font = `bold ${badgeR * 1.4}px Arial`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('!', bx, by);
    ctx.textBaseline = 'alphabetic';
  }
}
