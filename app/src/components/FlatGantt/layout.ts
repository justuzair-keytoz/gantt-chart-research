// Row-tree + bar-position layout, ported from prototype/app.js's
// layoutFlat()/barPos()/linkPath(), adapted for a hierarchy-only left tree.
// Sprints are calendar bands, not rows that own work.

import type { ScheduleContext } from "@/lib/engine/schedule";
import { parseISO, diffDays } from "@/lib/engine/date-utils";
import type { ScheduleResult } from "@/lib/engine/types";

export const LABEL_W = 320;
// 14 -> 36: 14px/day left no room for a day-of-week letter + date number per
// column (owner feedback: "too zoomed out, days/weeks should be visible
// clearly" — see spec.md's "Further Notes"). 36px comfortably fits a single
// centered glyph in each of the two new per-day header rows below.
// v2: no longer a fixed constant — pinch-to-zoom (spec/v2) needs day-width to
// vary at runtime, so this is now just the default/initial value, owned as
// React state in FlatGantt.tsx and threaded into the functions below as a
// `dw` parameter instead of being read as a module-level constant.
export const DEFAULT_DW = 36;
export const ROW_H = 32;
export const STEP_H = 26;
export const MILESTONE_ROW_H = 32;
// The date header retains its three 18px rows; the sprint-name strip sits
// below it as timeline context, never as a work-tree row.
export const DATE_AXIS_H = 54;
export const SPRINT_AXIS_H = 18;
export const AXIS_H = DATE_AXIS_H + SPRINT_AXIS_H;
export interface GanttRow {
  kind: "task" | "step" | "milestone";
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
  /** Set on "milestone" rows, for rendering the diamond at this row's dueDate/color. */
  milestoneId?: string;
}

export function allCollapsibleIds(rows: GanttRow[]): string[] {
  return rows.filter((r) => r.collapsible).map((r) => r.id);
}

export function buildRows(
  ctx: ScheduleContext,
  _sched: ScheduleResult,
  expanded: string[],
): { rows: GanttRow[]; height: number } {
  const rows: GanttRow[] = [];
  let y = AXIS_H;

  // A task's own step rows render before its child-task rows: direct work,
  // then the work it contains.
  function buildTaskSubtree(
    taskId: string,
    depth: number,
    rowId: string,
    visited: Set<string>,
  ) {
    // Defensive cycle guard (see schedule.ts's matching comment) — mock/
    // user-authored data has no legitimate way to form a parentTaskId cycle,
    // but this stops a corrupt one from recursing forever instead of just
    // rendering a task twice.
    if (visited.has(taskId)) return;
    visited.add(taskId);

    const task = ctx.taskById[taskId];
    if (!task) return;
    const unitUids = ctx.taskUnits[taskId];
    const hasSteps = unitUids.length > 0;
    const children = ctx.tasks.filter((t) => t.parentTaskId === taskId);
    const hasChildren = children.length > 0;
    const collapsible = hasSteps || hasChildren;
    const taskExpanded = expanded.includes(rowId);

    rows.push({
      kind: "task",
      id: rowId,
      y,
      height: ROW_H,
      depth,
      label: `${task.id} ${task.name}`,
      collapsible,
      expanded: taskExpanded,
      taskId,
      // A bar only draws directly on this row for a true leaf (no steps of
      // its own, no children) — same rule the pre-nesting code already used
      // for a plain-bar task: a task with steps shows its bars on the step
      // rows below it instead, and (new) a task with children shows nothing
      // on its own row either, same as any other collapsed/uid-less row
      // today (rolled-up segments are explicitly out of scope, see spec.md).
      uid: collapsible ? undefined : taskId,
    });
    y += ROW_H;

    if (collapsible && taskExpanded) {
      if (hasSteps) {
        unitUids.forEach((uid) => {
          const step = ctx.stepByUid[uid];
          rows.push({
            kind: "step",
            id: uid,
            y,
            height: STEP_H,
            depth: depth + 1,
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
      children.forEach((child) => {
        buildTaskSubtree(child.id, depth + 1, `${rowId}::${child.id}`, visited);
      });
    }
  }

  ctx.tasks
    .filter((task) => !task.parentTaskId)
    .forEach((task) => buildTaskSubtree(task.id, 0, task.id, new Set()));

  // Milestones stay visible but are no longer anchored to sprint buckets.
  [...ctx.milestones]
    .sort((a, b) => parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime())
    .forEach((milestone) => {
      rows.push({
        kind: "milestone",
        id: `milestone::${milestone.id}`,
        y,
        height: MILESTONE_ROW_H,
        depth: 0,
        label: milestone.name,
        collapsible: false,
        milestoneId: milestone.id,
      });
      y += MILESTONE_ROW_H;
    });

  return { rows, height: y + 24 };
}

/**
 * All collapsible row ids nested under `rootId` (inclusive), regardless of
 * whether they're currently visible — i.e. what a *fully expanded* version of
 * just that one subtree would contain. Used for User Story 31's per-row
 * "Expand all" (expand just this row and everything beneath it), distinct
 * from the existing global "Expand all" button, which only expands whatever
 * collapsible rows happen to already be visible under the current `expanded`
 * state (see FlatGantt.tsx's `allIds`).
 *
 * Implementation: row ids are parent-prefixed by construction (`taskId`, then
 * `${taskRowId}::${childId}` for each nesting level below that — see
 * buildTaskSubtree above), so instead of re-deriving
 * the tree structure here a second time, this just runs buildRows to a fixed
 * point (growing the expanded set until no new collapsible id appears, capped
 * defensively) and filters the final id list down to rootId and its
 * prefix-matched descendants.
 */
export function collapsibleDescendantIds(
  ctx: ScheduleContext,
  sched: ScheduleResult,
  rootId: string,
): string[] {
  let exp: string[] = [];
  for (let i = 0; i < 64; i++) {
    const next = allCollapsibleIds(buildRows(ctx, sched, exp).rows);
    if (next.length === exp.length && next.every((id, idx) => id === exp[idx])) break;
    exp = next;
  }
  return exp.filter((id) => id === rootId || id.startsWith(`${rootId}::`));
}

export function xForDate(t0: Date, date: Date, dw: number): number {
  return diffDays(date, t0) * dw;
}

export interface BarPos {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function barPosForRow(
  t0: Date,
  row: GanttRow,
  start: Date,
  durationDays: number,
  dw: number,
): BarPos {
  const barH = row.kind === "step" ? STEP_H - 8 : ROW_H - 8;
  return {
    x: xForDate(t0, start, dw),
    y: row.y + (row.height - barH) / 2,
    w: Math.max(dw * durationDays - 2, 6),
    h: barH,
  };
}
