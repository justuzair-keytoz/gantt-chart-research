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
// a date-driven grid it knows nothing about. The fix used here: linkable
// (step / plain-bar task) anchor nodes are sized/positioned to match the
// real bar's current rect exactly, with a custom "anchor" node type (see
// AnchorNode below) rendering real, visible reactflow Handles at the bar's
// edges — but still no body of their own, so the actual bar/diamond visuals
// keep rendering in FlatGantt's own SVG, unchanged, underneath. Milestone
// anchor nodes stay invisible 1x1 (connectable: false — see spec.md's
// correction note on this gap), existing only so reactflow has a valid id to
// resolve a milestone connector edge against. Each edge still carries its
// *own* endpoint coordinates (BarPos-derived) via `data`,
// computed by the caller every render from the same `rowByUid`/`sched`
// state that positions the bars — not from reactflow's own node geometry.
// reactflow's pan/zoom/node-drag/selection are all disabled (see
// DependencyEdgesLayer below): this chart only ever scrolls via the
// surrounding div's native overflow, so pinning reactflow's viewport at
// {0,0,zoom:1} means its coordinate space and ours never drift apart.

import ReactFlow, {
  Handle,
  Position,
  type Connection,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeTypes,
} from "reactflow";
import "reactflow/dist/style.css";
import type { BarPos } from "./layout";

export interface Point {
  x: number;
  y: number;
}

export interface DepEdgeData {
  kind: "elbow" | "milestone";
  sourcePos: BarPos;
  /** "elbow" edges target another bar (BarPos); "milestone" edges target a fixed point (the diamond center), merging onto a shared vertical spine at the milestone's due-date X first. */
  targetPos: BarPos | Point;
  stroke?: string;
  strokeWidth?: number;
  dashed?: string;
  /** Only dependency (step/task) edges are click-to-remove; milestone connectors aren't. */
  removable?: boolean;
  from?: string;
  to?: string;
}

const CORNER_RADIUS = 6;

/**
 * Extra width tacked onto a linkable anchor node past the bar's real right
 * edge, so the reactflow source Handle (Position.Right, CSS `right: -4px`
 * relative to the node's own box) lands a few px clear of Bar.tsx's 6px-wide
 * resize grip (`x={pos.w - 6}`) instead of directly on top of it — the two
 * used to occupy the same pixels, so a click near the edge could grab either
 * gesture unpredictably. Only the anchor node's own (invisible) box grows;
 * the bar's real rect/grip are untouched. FlatGantt.tsx's flowNodes memo and
 * useBarDrag.ts's live-drag repaint both need this same value so the handle
 * stays correctly offset whether the bar is static or mid-drag/resize.
 */
export const HANDLE_RIGHT_PAD = 6;

function dist(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function pointToward(from: Point, toward: Point, amount: number): Point {
  const d = dist(from, toward) || 1;
  return { x: from.x + ((toward.x - from.x) / d) * amount, y: from.y + ((toward.y - from.y) / d) * amount };
}

/**
 * Renders an axis-aligned polyline (purely horizontal/vertical segments,
 * which is all our elbow routing ever produces) with each interior corner
 * rounded via a quadratic Bezier — ClickUp's "curved but clear" connector
 * look, instead of sharp right angles.
 */
function roundedOrthogonalPath(points: Point[]): string {
  if (points.length < 2) return "";
  if (points.length === 2) return `M${points[0].x},${points[0].y} L${points[1].x},${points[1].y}`;
  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];
    const rIn = Math.min(CORNER_RADIUS, dist(prev, curr) / 2);
    const rOut = Math.min(CORNER_RADIUS, dist(curr, next) / 2);
    const inPoint = pointToward(curr, prev, rIn);
    const outPoint = pointToward(curr, next, rOut);
    d += ` L${inPoint.x},${inPoint.y} Q${curr.x},${curr.y} ${outPoint.x},${outPoint.y}`;
  }
  const last = points[points.length - 1];
  d += ` L${last.x},${last.y}`;
  return d;
}

/** Elbow-routed connector between two bars, ported from prototype's linkPath(), now with rounded corners. */
export function elbowPath(a: BarPos, b: BarPos): string {
  const x1 = a.x + a.w;
  const y1 = a.y + a.h / 2;
  const x2 = b.x;
  const y2 = b.y + b.h / 2;
  if (Math.abs(y1 - y2) < 1 && x2 >= x1) return roundedOrthogonalPath([{ x: x1, y: y1 }, { x: x2, y: y2 }]);
  const mid = x1 + 8;
  const points: Point[] =
    x2 >= x1 + 16
      ? [{ x: x1, y: y1 }, { x: mid, y: y1 }, { x: mid, y: y2 }, { x: x2, y: y2 }]
      : [
          { x: x1, y: y1 },
          { x: x1 + 8, y: y1 },
          { x: x1 + 8, y: (y1 + y2) / 2 },
          { x: x2 - 8, y: (y1 + y2) / 2 },
          { x: x2 - 8, y: y2 },
          { x: x2, y: y2 },
        ];
  return roundedOrthogonalPath(points);
}

/**
 * Connector from a gating bar to a milestone diamond, routed through a
 * shared vertical "spine" at the milestone's own due-date X — every gating
 * task's line bends onto that same X before dropping into the diamond, so
 * multiple gating tasks visually converge on one line rather than arriving
 * as a fan of separate diagonals (Wrike-style grouping, per spec.md).
 */
export function milestonePath(a: BarPos, spineX: number, target: Point): string {
  const x1 = a.x + a.w;
  const y1 = a.y + a.h / 2;
  return roundedOrthogonalPath([{ x: x1, y: y1 }, { x: spineX, y: y1 }, { x: spineX, y: target.y }]);
}

function pathFor(data: DepEdgeData): string {
  return data.kind === "milestone"
    ? milestonePath(data.sourcePos, (data.targetPos as Point).x, data.targetPos as Point)
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
  // Default (non-clash) stroke now differs by `removable` — previously both
  // a removable single-link dependency edge and a non-removable merged-group
  // dependency edge (several hidden links collapsed onto one row-to-row
  // line, ambiguous to click-remove) fell through to the same "#9ca3af"
  // default, with no way to tell them apart before hovering/clicking.
  // Milestone connectors are unaffected: they always pass an explicit
  // `stroke`/`dashed` (m?.color / "4 3", or clash red), so these fallbacks
  // never apply to them. Clash styling (`data.stroke`/`data.dashed` set by
  // the `g.clash`/`isGatingRisk` callers) still wins whenever present.
  const stroke = data.stroke ?? (data.removable ? "#64748b" : "#cbd5e1");
  const dashed = data.dashed ?? (data.removable ? undefined : "2 3");
  return (
    <path
      data-link={id}
      d={pathFor(data)}
      className="react-flow__edge-path"
      stroke={stroke}
      strokeWidth={data.strokeWidth ?? 1.3}
      strokeDasharray={dashed}
      fill="none"
      // reactflow's own stylesheet sets .react-flow__edge { pointer-events:
      // visibleStroke } regardless of this inline style's ancestor — a
      // non-removable (milestone) line sitting on top of a bar/handle would
      // otherwise swallow clicks meant for what's underneath it. Only
      // removable dependency edges need to catch a click at all (to delete
      // them); everything else passes clicks straight through.
      style={{ pointerEvents: data.removable ? "stroke" : "none", cursor: data.removable ? "pointer" : "default" }}
    />
  );
}

const edgeTypes = { dependency: DependencyEdge };

// Real connection-handle node, replacing the old invisible 1x1 anchor for
// every linkable bar (step / plain-bar task) — see useLinkDrag.ts's removal
// and spec.md's correction note for why. Sized/positioned by the caller
// (FlatGantt.tsx's flowNodes) to exactly match the real bar's current
// on-screen rect, so Position.Right/Position.Left land the handles right at
// the bar's own edges without moving the bar's actual visuals (rect, label,
// risk outline, grip — all still plain SVG in FlatGantt.tsx) into reactflow's
// node layer. Renders no body of its own — just the two Handles — so the
// node's own pointer-events:none (see flowNodes) leaves the rest of the
// bar's area click-through for Bar.tsx's own listeners underneath; only the
// Handles themselves get pointer-events back (reactflow's own
// `.react-flow__handle.connectionindicator` CSS rule, applied automatically
// once a handle is connectable), the same "override pointer-events only
// where something needs to be interactive" pattern already used by
// DependencyEdge above.
function AnchorNode() {
  return (
    <>
      <Handle
        type="target"
        position={Position.Left}
        style={{ width: 9, height: 9, background: "#fff", border: "1.5px solid #94a3b8" }}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{ width: 9, height: 9, background: "#fff", border: "1.5px solid #94a3b8" }}
      />
    </>
  );
}

const nodeTypes: NodeTypes = { anchor: AnchorNode };

export function DependencyEdgesLayer(props: {
  width: number;
  height: number;
  nodes: Node[];
  edges: Edge<DepEdgeData>[];
  onRemoveLink: (from: string, to: string) => void;
  onConnect: (from: string, to: string) => void;
}) {
  return (
    <div
      style={{ position: "absolute", top: 0, left: 0, width: props.width, height: props.height, pointerEvents: "none" }}
    >
      <ReactFlow
        nodes={props.nodes}
        edges={props.edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        minZoom={1}
        maxZoom={1}
        nodesDraggable={false}
        nodesConnectable
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
        onConnect={(connection: Connection) => {
          if (connection.source && connection.target) props.onConnect(connection.source, connection.target);
        }}
      />
    </div>
  );
}
