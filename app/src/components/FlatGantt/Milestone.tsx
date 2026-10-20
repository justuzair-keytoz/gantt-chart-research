"use client";

// Milestones render as a diamond with dashed connector lines from each
// gating task, using the milestone's own stored `color` (not a fixed
// palette) — per docs/gantt-chart/02-spec-roadmap-simulation.md.

import { parseISO, fmt } from "@/lib/engine/date-utils";
import type { Milestone as MilestoneType } from "@/lib/engine/types";
import { AXIS_H, MILESTONE_BAND_Y, xForDate, type BarPos } from "./layout";

export function MilestoneDiamond(props: {
  milestone: MilestoneType;
  t0: Date;
  gatingBarPositions: BarPos[];
  chartHeight: number;
  /** 0 or 1, from layout.ts's milestoneBands() — avoids overlapping labels
   * when two milestones' dates are close together. */
  band: number;
}) {
  const x = xForDate(props.t0, parseISO(props.milestone.dueDate));
  const y = MILESTONE_BAND_Y[props.band] ?? MILESTONE_BAND_Y[0];
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
      {props.gatingBarPositions.map((pos, i) => (
        <path
          key={i}
          d={`M${pos.x + pos.w},${pos.y + pos.h / 2} L${x},${y}`}
          stroke={props.milestone.color}
          strokeDasharray="4 3"
          strokeWidth={1.5}
          fill="none"
        />
      ))}
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
