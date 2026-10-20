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
export const DW = 36;
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
    }

    flushMilestonesFor(sprint.id);
  });

  return { rows, height: y + 24 };
}

export function xForDate(t0: Date, date: Date): number {
  return diffDays(date, t0) * DW;
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
