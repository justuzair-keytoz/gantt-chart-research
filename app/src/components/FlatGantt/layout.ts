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
export const MILESTONE_ROW_H = 32;
// Matches the prototype's AXIS_H (48) — no longer needs extra height for
// staggered milestone bands, since milestones now get their own rows.
export const AXIS_H = 48;
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

  // Milestones get their own group below the sprint-grouped rows, one row
  // per milestone, sorted by due date ascending — per spec.md's
  // "Correction, major" note. Each is a zero-width diamond at a fixed due
  // date, not a dated bar, so it needs no expand/collapse or task/step tree.
  const sortedMilestones = [...ctx.milestones].sort(
    (a, b) => parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime(),
  );
  sortedMilestones.forEach((m) => {
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
