"use client";

// Reschedule-drag interaction, ported directly from prototype/app.js's
// pointerdown/pointermove/pointerup handlers: drag state lives in a ref,
// every intermediate frame writes SVG attributes directly (no React state
// writes mid-drag), and the store is only touched once, on pointer-up.

import { useCallback, useRef } from "react";
import { computeSchedule, type ScheduleContext } from "@/lib/engine/schedule";
import { addDays, diffDays, fmt, parseISO, toISO } from "@/lib/engine/date-utils";
import type { Overlay, ScheduleResult, StepSchedule } from "@/lib/engine/types";
import { barPosForRow, type GanttRow } from "./layout";
import { elbowPath, milestonePath, type Point } from "./DependencyPaths";
import { resolveVisibleRow } from "./resolveLinkEndpoint";

/** A step/task → milestone gating relationship: the milestone end is a fixed
 * point (due dates don't move when a gating bar is dragged), so only the
 * bar end needs re-resolving mid-drag. */
export interface MilestoneLink {
  uid: string;
  milestoneId: string;
  target: Point;
}

interface DragState {
  uid: string;
  kind: "move" | "resize";
  x0: number;
  baseStartISO: string;
  baseDur: number;
  lastDays: number;
  moved: boolean;
  /** The dragged unit's task, and the boundaries that cap how far it can
   * move — per spec.md's drag-cap notes. Every drag is capped at the
   * chart's own visible date range (chartStart/chartEnd) — dragging past it
   * used to silently clip the bar out of view (the SVG's default
   * overflow:hidden) with the date still committed, which is how a task
   * could "disappear" with no explanation. A task whose task also gates a
   * milestone is additionally capped at that milestone's due date,
   * whichever boundary is hit first. */
  taskId: string;
  gateDueDate: Date | null;
  chartStart: Date;
  chartEnd: Date;
  /** Third boundary: dragging a non-last step of a multi-step task must not
   * push the task's own rolled-up end past where it sat before the drag
   * started — null when the dragged uid IS the task's last step (or has no
   * later sibling at all), since then there's nothing downstream to protect
   * and moving the task's real end is legitimate, governed by the other two
   * boundaries instead. */
  taskSpanEnd: Date | null;
  lastSafeDays: number;
  violated: boolean;
  /** Whether the CURRENT freeze is specifically caused by taskSpanEnd (vs.
   * the gate/chart boundaries) — drives the sibling-link clash indicator
   * independently of the dragged bar's own (always-on-any-boundary) outline. */
  taskSpanViolated: boolean;
  /** `data-link` id of the edge to the immediate next sibling step
   * (`prevUid === uid`), i.e. the chain link this boundary is protecting —
   * null when taskSpanEnd is null. */
  clashLinkId: string | null;
  /** The dragged bar's stroke attributes as they were before the drag
   * started — restored exactly when a violation clears, instead of being
   * blindly cleared (which would erase an unrelated pre-existing risk
   * outline the bar already had). */
  origStroke: string | null;
  origStrokeWidth: string | null;
  origStrokeDasharray: string | null;
  /** Same capture, for the clash-link path element — null when clashLinkId
   * is null or the edge isn't currently rendered (e.g. merged into a
   * collapsed ancestor's group line). */
  origLinkStroke: string | null;
  origLinkStrokeWidth: string | null;
  origLinkStrokeDasharray: string | null;
}

export function resolveBar(sched: ScheduleResult, uid: string): { start: Date; end: Date; durationDays: number } {
  const unit = sched.units[uid];
  if (unit) return unit;
  const task = sched.tasks[uid];
  return { start: task.start, end: task.end, durationDays: diffDays(task.end, task.start) + 1 };
}

export function useBarDrag(opts: {
  svgRef: React.RefObject<SVGSVGElement>;
  ctx: ScheduleContext;
  /** Current day-column width (v2: zoom state, owned by FlatGantt.tsx) — read live off opts, not captured at hook-setup time. */
  dw: number;
  getOverlay: () => Overlay;
  asOf: string;
  baselineUnits: Record<string, StepSchedule> | null;
  rowByUid: Record<string, GanttRow>;
  /** All rows keyed by row id — used to climb to a hidden link endpoint's nearest visible ancestor row (collapsed sprint/task), matching FlatGantt's dependency paths. */
  rowsById: Record<string, GanttRow>;
  milestoneLinks: MilestoneLink[];
  onCommit: (
    uid: string,
    patch: { starts?: Record<string, string>; durations?: Record<string, number> },
    label: string,
  ) => void;
  onClick: (uid: string) => void;
}) {
  const dragRef = useRef<DragState | null>(null);

  const paintFrame = useCallback(
    (sched: ScheduleResult, violation?: { uid: string; violated: boolean; reason?: string }) => {
      const svg = opts.svgRef.current;
      if (!svg) return;
      Object.entries(opts.rowByUid).forEach(([uid, row]) => {
        const el = svg.querySelector<SVGGElement>(`[data-bar="${CSS.escape(uid)}"]`);
        if (!el) return;
        const s = resolveBar(sched, uid);
        const pos = barPosForRow(opts.ctx.t0, row, s.start, s.durationDays, opts.dw);
        el.setAttribute("transform", `translate(${pos.x},${pos.y})`);
        const body = el.querySelector("rect.body");
        if (body) body.setAttribute("width", String(pos.w));
        const grip = el.querySelector("[data-grip]");
        if (grip) grip.setAttribute("x", String(pos.w - 6));
      });
      if (violation) {
        const drag = dragRef.current;
        const el = svg.querySelector<SVGGElement>(`[data-bar="${CSS.escape(violation.uid)}"]`);
        const body = el?.querySelector<SVGRectElement>("rect.body");
        if (body && drag) {
          if (violation.violated) {
            body.setAttribute("stroke", "var(--crit)");
            body.setAttribute("stroke-width", "2.5");
            body.setAttribute("stroke-dasharray", "4 2");
          } else {
            drag.origStroke ? body.setAttribute("stroke", drag.origStroke) : body.removeAttribute("stroke");
            drag.origStrokeWidth
              ? body.setAttribute("stroke-width", drag.origStrokeWidth)
              : body.removeAttribute("stroke-width");
            drag.origStrokeDasharray
              ? body.setAttribute("stroke-dasharray", drag.origStrokeDasharray)
              : body.removeAttribute("stroke-dasharray");
          }
        }
        // Third boundary's own indicator: the specific sibling chain link
        // being encroached on, not the dragged bar itself — only touched
        // when taskSpanEnd is what's actually being violated this frame (the
        // dragged bar's outline above already covers the gate/chart cases).
        if (drag?.clashLinkId) {
          const linkEl = svg.querySelector<SVGPathElement>(`[data-link="${CSS.escape(drag.clashLinkId)}"]`);
          if (linkEl) {
            if (drag.taskSpanViolated) {
              linkEl.setAttribute("stroke", "var(--crit)");
              linkEl.setAttribute("stroke-width", "1.5");
              linkEl.setAttribute("stroke-dasharray", "3 3");
            } else {
              drag.origLinkStroke
                ? linkEl.setAttribute("stroke", drag.origLinkStroke)
                : linkEl.removeAttribute("stroke");
              drag.origLinkStrokeWidth
                ? linkEl.setAttribute("stroke-width", drag.origLinkStrokeWidth)
                : linkEl.removeAttribute("stroke-width");
              drag.origLinkStrokeDasharray
                ? linkEl.setAttribute("stroke-dasharray", drag.origLinkStrokeDasharray)
                : linkEl.removeAttribute("stroke-dasharray");
            }
          }
        }
        // Drag-cap explanation label (Fix 4): the freeze itself was already
        // visible (the dashed red outline above), but said nothing about
        // *which* of the three boundaries (milestone gate / chart edge /
        // task span) caused it — a frozen bar with no explanation reads as a
        // bug, not a deliberate cap. `violation.reason` is computed in
        // handleMove (it has the pre-cap testTask/boundaries at hand) and
        // just painted here, imperatively, onto the always-rendered-but-
        // hidden `[data-drag-label]` group (see FlatGantt.tsx) — same
        // query/setAttribute pattern as the rest of this function, no React
        // state, no per-frame element creation.
        const labelG = svg.querySelector<SVGGElement>('[data-drag-label="1"]');
        if (labelG) {
          if (violation.violated && violation.reason && drag) {
            const row = opts.rowByUid[violation.uid];
            if (row) {
              const s = resolveBar(sched, violation.uid);
              const pos = barPosForRow(opts.ctx.t0, row, s.start, s.durationDays, opts.dw);
              const text = violation.reason;
              const h = 16;
              const w = text.length * 5.6 + 12; // approximate — avoids an
              // extra getBBox() reflow every pointermove frame; close enough
              // for a short-lived explanatory pill, not pixel-measured text.
              const x = pos.x;
              const y = Math.max(2, pos.y - h - 4);
              const rectEl = labelG.querySelector("rect");
              const textEl = labelG.querySelector("text");
              rectEl?.setAttribute("x", String(x));
              rectEl?.setAttribute("y", String(y));
              rectEl?.setAttribute("width", String(w));
              rectEl?.setAttribute("height", String(h));
              textEl?.setAttribute("x", String(x + 6));
              textEl?.setAttribute("y", String(y + h - 5));
              if (textEl) textEl.textContent = text;
              labelG.style.display = "";
            }
          } else {
            labelG.style.display = "none";
          }
        }
      }
      svg.querySelectorAll<SVGPathElement>("[data-link]").forEach((el) => {
        const [from, to] = (el.dataset.link ?? "").split(">");
        // Climb to the nearest visible ancestor row exactly like dependency paths
        // does when building the static edge list — keeps a dragged bar's
        // merged-into-parent line glued to the right row even mid-drag.
        const a = resolveVisibleRow(from, opts.ctx, sched, opts.rowByUid, opts.rowsById);
        const b = resolveVisibleRow(to, opts.ctx, sched, opts.rowByUid, opts.rowsById);
        if (!a || !b) return;
        const sa = resolveBar(sched, from);
        const sb = resolveBar(sched, to);
        const pa = barPosForRow(opts.ctx.t0, a, sa.start, sa.durationDays, opts.dw);
        const pb = barPosForRow(opts.ctx.t0, b, sb.start, sb.durationDays, opts.dw);
        el.setAttribute("d", elbowPath(pa, pb));
      });
      opts.milestoneLinks.forEach((ml) => {
        const el = svg.querySelector<SVGPathElement>(
          `[data-link="${CSS.escape(`${ml.uid}>>${ml.milestoneId}`)}"]`,
        );
        const row = resolveVisibleRow(ml.uid, opts.ctx, sched, opts.rowByUid, opts.rowsById);
        if (!el || !row) return;
        const s = resolveBar(sched, ml.uid);
        const pos = barPosForRow(opts.ctx.t0, row, s.start, s.durationDays, opts.dw);
        el.setAttribute("d", milestonePath(pos, ml.target.x, ml.target));
      });
    },
    [opts],
  );

  const applyDays = useCallback(
    (drag: DragState, days: number): Overlay => {
      const ov: Overlay = JSON.parse(JSON.stringify(opts.getOverlay()));
      if (drag.kind === "move") {
        ov.starts[drag.uid] = toISO(addDays(parseISO(drag.baseStartISO), days));
      } else {
        ov.durations[drag.uid] = Math.max(1, drag.baseDur + days);
      }
      return ov;
    },
    [opts],
  );

  const handleMove = useCallback(
    (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const days = Math.round((e.clientX - drag.x0) / opts.dw);
      if (!drag.moved && Math.abs(e.clientX - drag.x0) < 3) return;
      drag.moved = true;

      const testSched = computeSchedule(opts.ctx, applyDays(drag, days), opts.asOf, opts.baselineUnits);
      const testTask = testSched.tasks[drag.taskId];
      const taskSpanExceeded =
        !!testTask && drag.taskSpanEnd !== null && testTask.end > drag.taskSpanEnd;
      const exceeds =
        !!testTask &&
        ((drag.gateDueDate !== null && testTask.end > drag.gateDueDate) ||
          testTask.end > drag.chartEnd ||
          testTask.start < drag.chartStart ||
          taskSpanExceeded);

      // Fix 4: which specific boundary caused this freeze — checked in the
      // same priority order `exceeds` itself does (gate, then chart, then
      // task span), using the pre-cap `testTask`/boundaries this function
      // already has at hand. `fmt` matches the "DD Mon" short-date style
      // used elsewhere in this app (e.g. the "As of" pill).
      let reason: string | undefined;
      if (exceeds && testTask) {
        if (drag.gateDueDate !== null && testTask.end > drag.gateDueDate) {
          reason = `Capped at milestone deadline (${fmt(drag.gateDueDate)})`;
        } else if (testTask.end > drag.chartEnd || testTask.start < drag.chartStart) {
          reason = "Capped at chart edge";
        } else if (taskSpanExceeded) {
          reason = "Capped — would delay a later step in this task";
        }
      }

      let effectiveDays = days;
      let violated = false;
      let taskSpanViolated = false;
      let schedToUse = testSched;
      if (exceeds) {
        // Past a boundary (the milestone gate, the chart's own visible date
        // range, or — new — a non-last step's own task span) — freeze at the
        // last position that wasn't, rather than letting the push cascade
        // past it unbounded or clip the bar out of the visible chart with no
        // explanation.
        effectiveDays = drag.lastSafeDays;
        violated = true;
        taskSpanViolated = taskSpanExceeded;
        if (
          effectiveDays === drag.lastDays &&
          violated === drag.violated &&
          taskSpanViolated === drag.taskSpanViolated
        )
          return;
        schedToUse = computeSchedule(opts.ctx, applyDays(drag, effectiveDays), opts.asOf, opts.baselineUnits);
      } else {
        drag.lastSafeDays = days;
        if (
          effectiveDays === drag.lastDays &&
          violated === drag.violated &&
          taskSpanViolated === drag.taskSpanViolated
        )
          return;
      }
      drag.lastDays = effectiveDays;
      drag.violated = violated;
      drag.taskSpanViolated = taskSpanViolated;
      paintFrame(schedToUse, { uid: drag.uid, violated, reason });
    },
    [opts, paintFrame, applyDays],
  );

  const handleUp = useCallback(() => {
    window.removeEventListener("pointermove", handleMove);
    const drag = dragRef.current;
    dragRef.current = null;
    // A drag released while still frozen against a boundary would otherwise
    // leave the Fix 4 explanation label stuck on-screen forever (nothing
    // else hides it once pointermove stops firing) — hide it unconditionally
    // on every drag end, the actual bar's outline gets reset the normal way
    // via the store commit's React re-render.
    const labelG = opts.svgRef.current?.querySelector<SVGGElement>('[data-drag-label="1"]');
    if (labelG) labelG.style.display = "none";
    if (!drag) return;
    if (!drag.moved || drag.lastDays === 0) {
      opts.onClick(drag.uid);
      return;
    }
    if (drag.kind === "move") {
      const newStart = toISO(addDays(parseISO(drag.baseStartISO), drag.lastDays));
      opts.onCommit(
        drag.uid,
        { starts: { [drag.uid]: newStart } },
        `${drag.uid} start ${drag.lastDays > 0 ? "+" : ""}${drag.lastDays}d`,
      );
    } else {
      const newDur = Math.max(1, drag.baseDur + drag.lastDays);
      opts.onCommit(
        drag.uid,
        { durations: { [drag.uid]: newDur } },
        `${drag.uid} ${drag.baseDur}d → ${newDur}d`,
      );
    }
  }, [handleMove, opts]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent, uid: string, kind: "move" | "resize") => {
      e.stopPropagation();
      e.preventDefault();
      const sched = computeSchedule(opts.ctx, opts.getOverlay(), opts.asOf, opts.baselineUnits);
      const s = resolveBar(sched, uid);

      const step = opts.ctx.stepByUid[uid];
      const taskId = step ? step.taskId : uid;
      const task = opts.ctx.taskById[taskId];
      const milestone = task?.milestone ? opts.ctx.milestones.find((m) => m.id === task.milestone) : null;

      const el = opts.svgRef.current?.querySelector<SVGGElement>(`[data-bar="${CSS.escape(uid)}"]`);
      const body = el?.querySelector<SVGRectElement>("rect.body");

      // Third boundary: only applies to a step that has a later sibling in
      // the same task's chain (another step whose prevUid === uid) — the
      // task's last step (or a plain single-step/no-step task) has nothing
      // downstream to protect, so taskSpanEnd stays null and this drag is
      // governed only by the gate/chart boundaries, same as before.
      const nextSibling = step ? opts.ctx.steps.find((s2) => s2.prevUid === uid) : undefined;
      const taskSpanEnd = nextSibling ? sched.tasks[taskId].end : null;
      const clashLinkId = nextSibling ? `${uid}>${nextSibling.uid}` : null;
      const linkEl = clashLinkId
        ? opts.svgRef.current?.querySelector<SVGPathElement>(`[data-link="${CSS.escape(clashLinkId)}"]`)
        : null;

      dragRef.current = {
        uid,
        kind,
        x0: e.clientX,
        baseStartISO: toISO(s.start),
        baseDur: s.durationDays,
        lastDays: 0,
        moved: false,
        taskId,
        gateDueDate: milestone ? parseISO(milestone.dueDate) : null,
        chartStart: opts.ctx.t0,
        chartEnd: addDays(opts.ctx.t0, opts.ctx.days - 1),
        taskSpanEnd,
        lastSafeDays: 0,
        violated: false,
        taskSpanViolated: false,
        clashLinkId,
        origStroke: body?.getAttribute("stroke") ?? null,
        origStrokeWidth: body?.getAttribute("stroke-width") ?? null,
        origStrokeDasharray: body?.getAttribute("stroke-dasharray") ?? null,
        origLinkStroke: linkEl?.getAttribute("stroke") ?? null,
        origLinkStrokeWidth: linkEl?.getAttribute("stroke-width") ?? null,
        origLinkStrokeDasharray: linkEl?.getAttribute("stroke-dasharray") ?? null,
      };
      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp, { once: true });
    },
    [handleMove, handleUp, opts],
  );

  return { onPointerDown };
}
