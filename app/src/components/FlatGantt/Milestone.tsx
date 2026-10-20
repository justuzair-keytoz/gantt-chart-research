"use client";

// Milestones render as a diamond with a vertical dashed guide line, using
// the milestone's own stored `color` (not a fixed palette) — per
// docs/gantt-chart/02-spec-roadmap-simulation.md. The dashed connector
// lines from each gating task used to be drawn here too (inline SVG paths);
// they now draw via the shared reactflow mechanism in DependencyEdges.tsx —
// see FlatGantt.tsx's milestone edge-building — so this component only
// owns the diamond shape, the guide line, and the label.

import { parseISO, fmt } from "@/lib/engine/date-utils";
import type { Milestone as MilestoneType } from "@/lib/engine/types";
import { AXIS_H, xForDate } from "./layout";

export function MilestoneDiamond(props: {
  milestone: MilestoneType;
  t0: Date;
  chartHeight: number;
  /** Center-y of the milestone's own row (from the row tree, like any other row). */
  rowY: number;
}) {
  const x = xForDate(props.t0, parseISO(props.milestone.dueDate));
  const y = props.rowY;
  const size = 7;

  return (
    <g>
      <line
        x1={x}
        x2={x}
        y1={AXIS_H}
        y2={props.chartHeight}
        stroke={props.milestone.color}
        strokeDasharray="2 4"
        strokeWidth={1}
        opacity={0.5}
      />
      <rect
        x={x - size}
        y={y - size}
        width={size * 2}
        height={size * 2}
        fill={props.milestone.color}
        stroke="#fff"
        strokeWidth={1.5}
        transform={`rotate(45 ${x} ${y})`}
      />
      <text x={x + size + 4} y={y + 4} fontSize={10.5} fill={props.milestone.color} fontWeight={600}>
        {props.milestone.name} · {fmt(parseISO(props.milestone.dueDate))}
      </text>
    </g>
  );
}
