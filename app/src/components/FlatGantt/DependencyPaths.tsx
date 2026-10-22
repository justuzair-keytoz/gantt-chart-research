"use client";

import type { BarPos } from "./layout";

export interface Point {
  x: number;
  y: number;
}

export interface DepEdgeData {
  kind: "elbow" | "milestone";
  sourcePos: BarPos;
  targetPos: BarPos | Point;
  stroke?: string;
  strokeWidth?: number;
  dashed?: string;
  removable?: boolean;
  from?: string;
  to?: string;
}

export interface DependencyPath {
  id: string;
  data: DepEdgeData;
}

const CORNER_RADIUS = 6;

function dist(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function pointToward(from: Point, toward: Point, amount: number): Point {
  const d = dist(from, toward) || 1;
  return { x: from.x + ((toward.x - from.x) / d) * amount, y: from.y + ((toward.y - from.y) / d) * amount };
}

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
  return d + ` L${last.x},${last.y}`;
}

export function elbowPath(a: BarPos, b: BarPos): string {
  const x1 = a.x + a.w;
  const y1 = a.y + a.h / 2;
  const x2 = b.x;
  const y2 = b.y + b.h / 2;
  if (Math.abs(y1 - y2) < 1 && x2 >= x1) return roundedOrthogonalPath([{ x: x1, y: y1 }, { x: x2, y: y2 }]);
  const mid = x1 + 8;
  const points: Point[] = x2 >= x1 + 16
    ? [{ x: x1, y: y1 }, { x: mid, y: y1 }, { x: mid, y: y2 }, { x: x2, y: y2 }]
    : [{ x: x1, y: y1 }, { x: x1 + 8, y: y1 }, { x: x1 + 8, y: (y1 + y2) / 2 }, { x: x2 - 8, y: (y1 + y2) / 2 }, { x: x2 - 8, y: y2 }, { x: x2, y: y2 }];
  return roundedOrthogonalPath(points);
}

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

export function DependencyPaths(props: { edges: DependencyPath[]; onRemoveLink: (from: string, to: string) => void }) {
  return (
    <g aria-label="Task dependencies">
      {props.edges.map(({ id, data }) => {
        const removable = !!data.removable && !!data.from && !!data.to;
        const stroke = data.stroke ?? (removable ? "#64748b" : "#cbd5e1");
        return (
          <path
            key={id}
            data-link={id}
            d={pathFor(data)}
            stroke={stroke}
            color={stroke}
            strokeWidth={data.strokeWidth ?? 1.3}
            strokeDasharray={data.dashed ?? (removable ? undefined : "2 3")}
            markerEnd={data.kind === "elbow" ? "url(#dependency-arrow)" : undefined}
            fill="none"
            style={{ pointerEvents: removable ? "stroke" : "none", cursor: removable ? "pointer" : "default" }}
            onClick={() => {
              if (removable) props.onRemoveLink(data.from!, data.to!);
            }}
          />
        );
      })}
    </g>
  );
}
