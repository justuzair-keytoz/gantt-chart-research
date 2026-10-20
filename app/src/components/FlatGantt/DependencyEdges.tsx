"use client";

// Replaces the hand-rolled SVG elbow router (prototype's linkPath(), kept as
// a stand-in in v0's layout.ts — see app-dependencies-and-config.md's
// reactflow entry) with reactflow as the single shared line-drawing
// mechanism for step↔step / task↔task dependency links *and*
// task→milestone connector lines, per spec.md's one-gesture-at-every-level
// decision.
//
// Known integration difficulty (also documented in app-dependencies-and-
// config.md): reactflow wants to own node positioning, but our bars live on
// a date-driven grid it knows nothing about. The fix used here: nodes are
// invisible 1x1 anchors (they exist only so reactflow has a valid
// source/target id to resolve an edge against — the actual bar/diamond
// visuals keep rendering in FlatGantt's own SVG, unchanged), and each edge
// carries its *own* endpoint coordinates (BarPos-derived) via `data`,
// computed by the caller every render from the same `rowByUid`/`sched`
// state that positions the bars — not from reactflow's own node geometry.
// reactflow's pan/zoom/node-drag/selection are all disabled (see
// DependencyEdgesLayer below): this chart only ever scrolls via the
// surrounding div's native overflow, so pinning reactflow's viewport at
// {0,0,zoom:1} means its coordinate space and ours never drift apart.

import ReactFlow, { type Edge, type EdgeProps, type Node } from "reactflow";
import "reactflow/dist/style.css";
import type { BarPos } from "./layout";

export interface Point {
  x: number;
  y: number;
}

export interface DepEdgeData {
  kind: "elbow" | "straight";
  sourcePos: BarPos;
  /** "elbow" edges target another bar (BarPos); "straight" edges target a fixed point (milestone diamond center). */
  targetPos: BarPos | Point;
  stroke?: string;
  strokeWidth?: number;
  dashed?: string;
  /** Only dependency (step/task) edges are click-to-remove; milestone connectors aren't. */
  removable?: boolean;
  from?: string;
  to?: string;
}

/** Elbow-routed connector, ported from prototype's linkPath(). */
export function elbowPath(a: BarPos, b: BarPos): string {
  const x1 = a.x + a.w;
  const y1 = a.y + a.h / 2;
  const x2 = b.x;
  const y2 = b.y + b.h / 2;
  if (Math.abs(y1 - y2) < 1 && x2 >= x1) return `M${x1},${y1} H${x2}`;
  const mid = x1 + 8;
  if (x2 >= x1 + 16) return `M${x1},${y1} H${mid} V${y2} H${x2}`;
  return `M${x1},${y1} H${x1 + 8} V${(y1 + y2) / 2} H${x2 - 8} V${y2} H${x2}`;
}

/** Straight connector from a bar's right edge to a fixed point, ported from Milestone.tsx's old inline path. */
export function straightPath(a: BarPos, p: Point): string {
  return `M${a.x + a.w},${a.y + a.h / 2} L${p.x},${p.y}`;
}

function pathFor(data: DepEdgeData): string {
  return data.kind === "straight"
    ? straightPath(data.sourcePos, data.targetPos as Point)
    : elbowPath(data.sourcePos, data.targetPos as BarPos);
}

/**
 * Renders its own `d` from `data`, ignoring reactflow's computed
 * sourceX/sourceY/targetX/targetY (those come from anchor-node geometry we
 * don't care about). `data-link` matches the id format useBarDrag.ts's
 * paintFrame patches imperatively mid-drag, so dragging a bar keeps this
 * path glued to it without a React re-render.
 */
function DependencyEdge({ id, data }: EdgeProps<DepEdgeData>) {
  if (!data) return null;
  return (
    <path
      data-link={id}
      d={pathFor(data)}
      className="react-flow__edge-path"
      stroke={data.stroke ?? "#9ca3af"}
      strokeWidth={data.strokeWidth ?? 1.3}
      strokeDasharray={data.dashed}
      fill="none"
      style={{ pointerEvents: "stroke", cursor: data.removable ? "pointer" : "default" }}
    />
  );
}

const edgeTypes = { dependency: DependencyEdge };

export function DependencyEdgesLayer(props: {
  width: number;
  height: number;
  nodes: Node[];
  edges: Edge<DepEdgeData>[];
  onRemoveLink: (from: string, to: string) => void;
}) {
  return (
    <div
      style={{ position: "absolute", top: 0, left: 0, width: props.width, height: props.height, pointerEvents: "none" }}
    >
      <ReactFlow
        nodes={props.nodes}
        edges={props.edges}
        edgeTypes={edgeTypes}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        minZoom={1}
        maxZoom={1}
        nodesDraggable={false}
        nodesConnectable={false}
        nodesFocusable={false}
        elementsSelectable={false}
        panOnDrag={false}
        panOnScroll={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        preventScrolling={false}
        proOptions={{ hideAttribution: true }}
        onEdgeClick={(_e, edge) => {
          const d = edge.data as DepEdgeData | undefined;
          if (d?.removable && d.from && d.to) props.onRemoveLink(d.from, d.to);
        }}
      />
    </div>
  );
}
