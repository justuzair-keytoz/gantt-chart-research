// Row-tree + bar-position layout, ported from prototype/app.js's
// layoutFlat()/barPos()/linkPath(), adapted for real collapsible sprint rows
// (spec decision) instead of a background band.

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
export const SPRINT_H = 34;
export const MILESTONE_ROW_H = 32;
// 48 -> 54: the old single-row month-label axis is now a 3-row header (month
// label / weekday letter / date number, ClickUp-style — see FlatGantt.tsx's
// axis rendering), each row ~18px. No longer "matches the prototype's AXIS_H"
// — that single-row value is superseded by this spike's own header.
export const AXIS_H = 54;
export const UNSCHEDULED_ID = "__unscheduled";

export interface GanttRow {
  kind: "sprint" | "task" | "step" | "milestone";
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

  // Milestones are interleaved into the row tree, each landing right after the
  // sprint cluster that leads up to it — not bunched into one trailing block
  // (see spec.md's "Correction" superseding the old bottom-grouped layout).
  // A milestone's anchor is the LAST real sprint whose window (start..end)
  // ends at or before the milestone's own due date; only real sprints count
  // (the synthetic "Unscheduled" group is never a target). Milestones that
  // share an anchor stay sorted by due date relative to each other, same as
  // the old bottom-block ordering.
  const BEFORE_ALL = "__before_all_sprints";
  const sortedMilestones = [...ctx.milestones].sort(
    (a, b) => parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime(),
  );
  const milestonesByAnchor = new Map<string, typeof sortedMilestones>();
  sortedMilestones.forEach((m) => {
    const due = parseISO(m.dueDate);
    // Edge case: due before every sprint's start (or no sprints exist) -> top.
    // Edge case: due after every sprint's end -> after the last sprint group
    // (matches the old trailing-block behavior for this one case).
    let anchor: string = BEFORE_ALL;
    let anchorEnd: Date | null = null;
    sched.sprints.forEach((s) => {
      const end = parseISO(s.end);
      if (end <= due && (!anchorEnd || end > anchorEnd)) {
        anchor = s.id;
        anchorEnd = end;
      }
    });
    if (!milestonesByAnchor.has(anchor)) milestonesByAnchor.set(anchor, []);
    milestonesByAnchor.get(anchor)!.push(m);
  });

  const flushMilestonesFor = (anchor: string) => {
    const bucket = milestonesByAnchor.get(anchor);
    if (!bucket) return;
    bucket.forEach((m) => {
      rows.push({
        kind: "milestone",
        id: `milestone::${m.id}`,
        y,
        height: MILESTONE_ROW_H,
        depth: 0,
        label: m.name,
        collapsible: false,
        milestoneId: m.id,
      });
      y += MILESTONE_ROW_H;
    });
  };

  flushMilestonesFor(BEFORE_ALL);

  sprintGroups.forEach((sprint) => {
    const taskIds = ctx.tasks
      .filter((t) => {
        // Only root tasks get bucketed into a sprint group directly — a
        // child task (parentTaskId set) is a full task but renders nested
        // under its parent's row (buildTaskSubtree's recursion below), not
        // as its own second, independent top-level row in whichever sprint
        // its own dates happen to fall in.
        if (t.parentTaskId) return false;
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

    if (!taskIds.length) {
      flushMilestonesFor(sprint.id);
      return;
    }

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
    if (sprintExpanded) {
      taskIds.forEach((taskId) => {
        const taskRowId = `${sprint.id}::${taskId}`;
        // Sprint-bucket filtering (a root task's own steps only count toward
        // this sprint if their computed end date actually lands in it) only
        // applies at this top level — see buildTaskSubtree's doc comment for
        // why child tasks render their full step list instead, un-filtered.
        buildTaskSubtree(taskId, 1, taskRowId, sprint.id, true, new Set());
      });
    }

    flushMilestonesFor(sprint.id);
  });

  // Recursive task-row builder, used for both a sprint-bucketed root task
  // (filterToSprint: true, only that sprint's own steps show at this row)
  // and any of its descendants (filterToSprint: false — a child task is a
  // full task nested under its parent's row, not itself re-bucketed by
  // sprint; the "a task whose steps end in different sprints" multi-bucket
  // problem this would otherwise reintroduce one level down is the same,
  // already-known, out-of-scope issue named in spec.md's Baseline Fixes
  // table, not something this ticket re-solves for nested tasks either).
  //
  // Ordering choice: a task's own step rows render BEFORE its child-task
  // rows (steps are "this task's own direct work", children are "things
  // under it") — arbitrary but consistent, documented here rather than left
  // implicit.
  function buildTaskSubtree(
    taskId: string,
    depth: number,
    rowId: string,
    sprintId: string,
    filterToSprint: boolean,
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
    const allUnitUids = ctx.taskUnits[taskId];
    const unitUids = filterToSprint
      ? allUnitUids.filter((uid) => (sched.units[uid].sprint ?? UNSCHEDULED_ID) === sprintId)
      : allUnitUids;
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
        buildTaskSubtree(child.id, depth + 1, `${rowId}::${child.id}`, sprintId, false, visited);
      });
    }
  }

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
 * Implementation: row ids are parent-prefixed by construction
 * (`${sprintId}::${taskId}`, then `${taskRowId}::${childId}` for each nesting
 * level below that — see buildTaskSubtree above), so instead of re-deriving
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
