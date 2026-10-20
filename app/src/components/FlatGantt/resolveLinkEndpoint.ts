// Resolves a dependency/milestone-gating link's true endpoint (a step uid, or
// a plain-bar task id) to the nearest *visible* row in the current row tree —
// per spec.md's "Correction, dependency and milestone-gating lines merge with
// the row tree instead of vanishing when collapsed" note. A hidden step
// climbs to its task row, then to its sprint row (sprint rows are always
// present, even collapsed, so this always terminates); visible rows resolve
// to themselves.

import type { ScheduleContext } from "@/lib/engine/schedule";
import type { ScheduleResult } from "@/lib/engine/types";
import { UNSCHEDULED_ID, type GanttRow } from "./layout";

export function resolveVisibleRow(
  uid: string,
  ctx: ScheduleContext,
  sched: ScheduleResult,
  rowByUid: Record<string, GanttRow>,
  rowsById: Record<string, GanttRow>,
): GanttRow | null {
  const direct = rowByUid[uid];
  if (direct) return direct;
  const step = ctx.stepByUid[uid];
  if (!step) return null;
  const sprintId = sched.units[uid]?.sprint ?? UNSCHEDULED_ID;
  const taskRowId = `${sprintId}::${step.taskId}`;
  if (rowsById[taskRowId]) return rowsById[taskRowId];
  if (rowsById[sprintId]) return rowsById[sprintId];
  return null;
}
