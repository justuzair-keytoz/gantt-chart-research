// Resolves a dependency/milestone-gating link's true endpoint (a step uid, or
// a plain-bar task id) to the nearest *visible* row in the current row tree —
// per spec.md's "Correction, dependency and milestone-gating lines merge with
// the row tree instead of vanishing when collapsed" note. A hidden step
// resolves to its visible task row; arbitrary-depth ancestor projection is
// deliberately deferred to ticket 03. Visible rows resolve to themselves.

import type { ScheduleContext } from "@/lib/engine/schedule";
import type { ScheduleResult } from "@/lib/engine/types";
import type { GanttRow } from "./layout";

export function resolveVisibleRow(
  uid: string,
  ctx: ScheduleContext,
  _sched: ScheduleResult,
  rowByUid: Record<string, GanttRow>,
  rowsById: Record<string, GanttRow>,
): GanttRow | null {
  const direct = rowByUid[uid];
  if (direct) return direct;
  const step = ctx.stepByUid[uid];
  if (!step) return null;
  return rowsById[step.taskId] ?? null;
}
