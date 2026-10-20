// Row-tree + bar-position layout, ported from prototype/app.js's
// layoutFlat()/barPos()/linkPath(), adapted for real collapsible sprint rows
// (spec decision) instead of a background band.

import type { ScheduleContext } from "@/lib/engine/schedule";
import { parseISO, diffDays } from "@/lib/engine/date-utils";
import type { ScheduleResult } from "@/lib/engine/types";

export const LABEL_W = 320;
export const DW = 14;
export const ROW_H = 32;
export const STEP_H = 26;
export const SPRINT_H = 34;
// Taller than the prototype's AXIS_H (48) to fit two staggered milestone
// bands above the month-label row without them colliding — see
// milestoneBands() below.
export const AXIS_H = 64;
export const UNSCHEDULED_ID = "__unscheduled";
export const MILESTONE_BAND_Y = [16, 32] as const;

export interface GanttRow {
  kind: "sprint" | "task" | "step";
  id: string;
  y: number;
  height: number;
  depth: number;
  label: string;
  sublabel?: string;
  collapsible: boolean;
  expanded?: boolean;
  taskId?: string;
  /** Linkable/draggable unit id: a step uid, or a task id for a plain-bar task. */
  uid?: string;
  stageColor?: string;
}

function sprintIdForDate(
  sprints: { id: string; start: string; end: string }[],
  date: Date,
): string {
  const hit = sprints.find((s) => date >= parseISO(s.start) && date <= parseISO(s.end));
  return hit ? hit.id : UNSCHEDULED_ID;
}

export function allCollapsibleIds(rows: GanttRow[]): string[] {
  return rows.filter((r) => r.collapsible).map((r) => r.id);
}

export function buildRows(
  ctx: ScheduleContext,
  sched: ScheduleResult,
  expanded: string[],
): { rows: GanttRow[]; height: number } {
  const rows: GanttRow[] = [];
  let y = AXIS_H;

  const sprintGroups = [
    ...sched.sprints,
    { id: UNSCHEDULED_ID, name: "Unscheduled", start: "", end: "", load: 0, over: false },
  ];

  sprintGroups.forEach((sprint) => {
    const taskIds = ctx.tasks
      .filter((t) => {
        const unitUids = ctx.taskUnits[t.id];
        if (unitUids.length) {
          return unitUids.some(
            (uid) => (sched.units[uid].sprint ?? UNSCHEDULED_ID) === sprint.id,
          );
        }
        const roll = sched.tasks[t.id];
        return sprintIdForDate(sched.sprints, roll.end) === sprint.id;
      })
      .map((t) => t.id);

    if (!taskIds.length) return;

    const sprintExpanded = expanded.includes(sprint.id);
    rows.push({
      kind: "sprint",
      id: sprint.id,
      y,
      height: SPRINT_H,
      depth: 0,
      label: sprint.name,
      sublabel: sprint.id === UNSCHEDULED_ID ? undefined : `${sprint.load ?? 0}d load`,
      collapsible: true,
      expanded: sprintExpanded,
    });
    y += SPRINT_H;
    if (!sprintExpanded) return;

    taskIds.forEach((taskId) => {
      const task = ctx.taskById[taskId];
      const unitUids = ctx.taskUnits[taskId].filter(
        (uid) => (sched.units[uid].sprint ?? UNSCHEDULED_ID) === sprint.id,
      );
      const hasSteps = unitUids.length > 0;
      const taskRowId = `${sprint.id}::${taskId}`;
      const taskExpanded = expanded.includes(taskRowId);
      rows.push({
        kind: "task",
        id: taskRowId,
        y,
        height: ROW_H,
        depth: 1,
        label: `${task.id} ${task.name}`,
        collapsible: hasSteps,
        expanded: taskExpanded,
        taskId,
        uid: hasSteps ? undefined : taskId,
      });
      y += ROW_H;
      if (hasSteps && taskExpanded) {
        unitUids.forEach((uid) => {
          const step = ctx.stepByUid[uid];
          rows.push({
            kind: "step",
            id: uid,
            y,
            height: STEP_H,
            depth: 2,
            label: `${ctx.stageById[step.stage].label.split(" ")[0]} · ${step.name}`,
            sublabel: ctx.people[step.assignee] ?? step.assignee,
            collapsible: false,
            taskId,
            uid,
            stageColor: ctx.stageById[step.stage].color,
          });
          y += STEP_H;
        });
      }
    });
  });

  return { rows, height: y + 24 };
}

export function xForDate(t0: Date, date: Date): number {
  return diffDays(date, t0) * DW;
}

/**
 * Assigns each milestone a vertical band (0 or 1) so labels close together
 * in time don't render on top of each other — ported from the prototype's
 * `(i % 2) * 12` label offset, which solved the exact same overlap by
 * alternating by sorted-date order rather than by a fixed position.
 */
export function milestoneBands(
  milestones: { id: string; dueDate: string }[],
): Record<string, number> {
  const sorted = [...milestones].sort(
    (a, b) => parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime(),
  );
  const bands: Record<string, number> = {};
  sorted.forEach((m, i) => {
    bands[m.id] = i % 2;
  });
  return bands;
}

export interface BarPos {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function barPosForRow(t0: Date, row: GanttRow, start: Date, durationDays: number): BarPos {
  const barH = row.kind === "step" ? STEP_H - 8 : ROW_H - 8;
  return {
    x: xForDate(t0, start),
    y: row.y + (row.height - barH) / 2,
    w: Math.max(DW * durationDays - 2, 6),
    h: barH,
  };
}

// TODO: replace with reactflow per docs/gantt-chart/03-app-dependencies-and-config.md
// (positioning reactflow nodes at these same bar coordinates and letting it
// own edge routing + drag-to-connect). Kept as the prototype's hand-rolled
// SVG elbow router for v0 so shipping isn't blocked on the reactflow spike.
/** Elbow-routed connector, ported from prototype's linkPath(). */
export function linkPath(a: BarPos, b: BarPos): string {
  const x1 = a.x + a.w;
  const y1 = a.y + a.h / 2;
  const x2 = b.x;
  const y2 = b.y + b.h / 2;
  if (Math.abs(y1 - y2) < 1 && x2 >= x1) return `M${x1},${y1} H${x2}`;
  const mid = x1 + 8;
  if (x2 >= x1 + 16) return `M${x1},${y1} H${mid} V${y2} H${x2}`;
  return `M${x1},${y1} H${x1 + 8} V${(y1 + y2) / 2} H${x2 - 8} V${y2} H${x2}`;
}
