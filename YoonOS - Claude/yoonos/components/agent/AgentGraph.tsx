'use client';

/**
 * AgentGraph — transparent full-screen force-graph layer.
 *
 * Renders directly on the AI Canvas background with no chrome of its own.
 * The tooltip hover card is included but positioned absolutely within the
 * canvas. No header, no close button — the parent AICanvas owns those concerns.
 */

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MutableRefObject, ReactElement } from 'react';
import type {
  ForceGraphMethods,
  ForceGraphProps,
  LinkObject,
  NodeObject,
} from 'react-force-graph-2d';
import { useGraphStore } from '@/stores/graphStore';
import { useAgentStore } from '@/stores/agentStore';
import { useUIStore } from '@/stores/uiStore';
import { useWindowStore } from '@/stores/windowStore';
import {
  buildGraphData,
  ForceGraphLink,
  ForceGraphNode,
  getNodeLabel,
  STATUS_LABELS,
  drawNodeLight,
} from './graphUtils';
import { AppName } from '@/types';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
  ssr: false,
  loading: () => <div className="h-full w-full" />,
}) as <NodeType, LinkType>(
  props: ForceGraphProps<NodeObject<NodeType>, LinkObject<NodeType, LinkType>> & {
    ref?: MutableRefObject<
      ForceGraphMethods<NodeObject<NodeType>, LinkObject<NodeType, LinkType>> | undefined
    >;
  }
) => ReactElement;

const TOOL_TO_APP: Partial<Record<string, AppName>> = {
  navigate_browser: 'browser',
  get_browser_content: 'browser',
  type_in_text_editor: 'textedit',
  get_text_editor_content: 'textedit',
  read_text_file: 'textedit',
  write_text_file: 'textedit',
  create_calendar_event: 'calendar',
  get_calendar_events: 'calendar',
  capture_photo: 'photobooth',
  get_last_photo: 'photobooth',
};

function getAppForNode(node: ForceGraphNode): AppName | null {
  if (node.toolName === 'open_app') {
    const name = node.input?.app_name as string | undefined;
    if (name) return name as AppName;
  }
  return TOOL_TO_APP[node.toolName] ?? null;
}

export default function AgentGraph() {
  const storeNodes = useGraphStore((s) => s.nodes);
  const storeEdges = useGraphStore((s) => s.edges);
  const agentStatus = useAgentStore((s) => s.status);
  const setHoveredNodeId = useUIStore((s) => s.setHoveredNodeId);
  const openWindow = useWindowStore((s) => s.openWindow);

  const graphRef =
    useRef<ForceGraphMethods<NodeObject<ForceGraphNode>, LinkObject<ForceGraphNode, ForceGraphLink>>>();
  const animationTimeRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);

  const [highlightNodes, setHighlightNodes] = useState<Set<ForceGraphNode>>(new Set());
  const [highlightLinks, setHighlightLinks] = useState<Set<ForceGraphLink>>(new Set());
  const [tooltipNode, setTooltipNode] = useState<ForceGraphNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const graphData = useMemo(
    () => buildGraphData(storeNodes, storeEdges),
    [storeNodes, storeEdges]
  );

  const isAwaitingApproval = agentStatus === 'awaiting_approval';

  useEffect(() => {
    const animate = (time: number) => {
      animationTimeRef.current = time;
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    animationFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      graphRef.current?.zoomToFit(400, 60);
      graphRef.current?.d3ReheatSimulation();
    }, 150);
    return () => window.clearTimeout(timer);
  }, [graphData.nodes.length, graphData.links.length]);

  const handleNodeHover = useCallback(
    (node: NodeObject<ForceGraphNode> | null) => {
      if (!node) {
        setHighlightNodes(new Set());
        setHighlightLinks(new Set());
        setHoveredNodeId(null);
        setTooltipNode(null);
        setTooltipPos(null);
        return;
      }

      const fgNode = node as ForceGraphNode;
      setHighlightNodes(new Set([fgNode, ...fgNode.neighbors]));
      setHighlightLinks(new Set(fgNode.links));
      setHoveredNodeId(fgNode.id);
      setTooltipNode(fgNode);

      if (graphRef.current && fgNode.x != null && fgNode.y != null) {
        const coords = graphRef.current.graph2ScreenCoords(fgNode.x, fgNode.y);
        setTooltipPos({ x: coords.x, y: coords.y });
      }

      const app = getAppForNode(fgNode);
      if (app) openWindow(app);
    },
    [setHoveredNodeId, openWindow]
  );

  const handleNodeClick = useCallback(
    (node: NodeObject<ForceGraphNode>) => {
      if (agentStatus === 'running') {
        useAgentStore.getState().abort();
        useGraphStore.getState().updateNodeStatus((node as ForceGraphNode).id, 'interrupted');
      }
    },
    [agentStatus]
  );

  return (
    <div className="absolute top-0 left-0 bottom-0 z-0" style={{ right: '45%' }}>
      <ForceGraph2D<ForceGraphNode, ForceGraphLink>
        ref={graphRef}
        graphData={graphData}
        backgroundColor="rgba(0,0,0,0)"
        nodeRelSize={6}
        nodeLabel={() => ''}
        autoPauseRedraw={false}
        enableNodeDrag={false}
        minZoom={0.2}
        maxZoom={8}
        linkColor={(link) =>
          highlightLinks.has(link as ForceGraphLink)
            ? 'rgba(37, 99, 235, 0.5)'
            : 'rgba(0, 0, 0, 0.09)'
        }
        linkWidth={(link) => (highlightLinks.has(link as ForceGraphLink) ? 2 : 1)}
        linkDirectionalArrowLength={4}
        linkDirectionalArrowRelPos={1}
        linkDirectionalArrowColor={() => 'rgba(37, 99, 235, 0.4)'}
        linkDirectionalParticles={(link) =>
          highlightLinks.has(link as ForceGraphLink) ? 2 : 0
        }
        linkDirectionalParticleSpeed={0.005}
        linkDirectionalParticleWidth={2}
        linkDirectionalParticleColor={() => '#2563eb'}
        nodeCanvasObject={(node, ctx, scale) =>
          drawNodeLight(
            node as ForceGraphNode,
            ctx,
            scale,
            highlightNodes,
            animationTimeRef.current,
            isAwaitingApproval
          )
        }
        onNodeHover={handleNodeHover}
        onNodeClick={handleNodeClick}
        onBackgroundClick={() => {
          setHighlightNodes(new Set());
          setHighlightLinks(new Set());
          setTooltipNode(null);
          setTooltipPos(null);
        }}
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
        warmupTicks={50}
        cooldownTicks={200}
      />

      {tooltipNode && tooltipPos && (
        <div
          className="fixed z-20 pointer-events-none max-w-[260px]"
          style={{
            left: tooltipPos.x,
            top: tooltipPos.y,
            transform: 'translate(-100%, -100%) translate(-12px, -12px)',
          }}
        >
          <div className="bg-[#e5e5e5] rounded-xl px-3 py-2.5 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 mb-1.5">
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{
                  backgroundColor:
                    tooltipNode.status === 'done'
                      ? '#16a34a'
                      : tooltipNode.status === 'error'
                      ? '#dc2626'
                      : tooltipNode.status === 'interrupted'
                      ? '#d97706'
                      : tooltipNode.status === 'in_progress'
                      ? '#7c3aed'
                      : '#9ca3af',
                }}
              />
              <span className="text-[11px] font-medium text-black/80 truncate">
                {getNodeLabel(tooltipNode)}
              </span>
              <span className="text-[9px] text-black/35 ml-auto flex-shrink-0">
                {STATUS_LABELS[tooltipNode.status]}
              </span>
            </div>
            {tooltipNode.output && (
              <p className="text-[11px] text-black/60 leading-relaxed">
                {tooltipNode.output.slice(0, 120)}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
