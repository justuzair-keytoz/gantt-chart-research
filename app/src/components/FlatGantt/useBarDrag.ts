"use client";

// Reschedule-drag interaction, ported directly from prototype/app.js's
// pointerdown/pointermove/pointerup handlers: drag state lives in a ref,
// every intermediate frame writes SVG attributes directly (no React state
// writes mid-drag), and the store is only touched once, on pointer-up.

import { useCallback, useRef } from "react";
import { computeSchedule, type ScheduleContext } from "@/lib/engine/schedule";
import { addDays, diffDays, parseISO, toISO } from "@/lib/engine/date-utils";
import type { Overlay, ScheduleResult, StepSchedule } from "@/lib/engine/types";
import { barPosForRow, DW, type GanttRow } from "./layout";

interface DragState {
  uid: string;
  kind: "move" | "resize";
  x0: number;
  baseStartISO: string;
  baseDur: number;
  lastDays: number;
  moved: boolean;
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
  getOverlay: () => Overlay;
  asOf: string;
  baselineUnits: Record<string, StepSchedule> | null;
  rowByUid: Record<string, GanttRow>;
  onCommit: (
    uid: string,
    patch: { starts?: Record<string, string>; durations?: Record<string, number> },
    label: string,
  ) => void;
  onClick: (uid: string) => void;
}) {
  const dragRef = useRef<DragState | null>(null);

  const paintFrame = useCallback(
    (sched: ScheduleResult) => {
      const svg = opts.svgRef.current;
      if (!svg) return;
      Object.entries(opts.rowByUid).forEach(([uid, row]) => {
        const el = svg.querySelector<SVGGElement>(`[data-bar="${CSS.escape(uid)}"]`);
        if (!el) return;
        const s = resolveBar(sched, uid);
        const pos = barPosForRow(opts.ctx.t0, row, s.start, s.durationDays);
        el.setAttribute("transform", `translate(${pos.x},${pos.y})`);
        const body = el.querySelector("rect.body");
        if (body) body.setAttribute("width", String(pos.w));
        const grip = el.querySelector("[data-grip]");
        if (grip) grip.setAttribute("x", String(pos.w - 6));
      });
      svg.querySelectorAll<SVGPathElement>("[data-link]").forEach((el) => {
        const [from, to] = (el.dataset.link ?? "").split(">");
        const a = opts.rowByUid[from];
        const b = opts.rowByUid[to];
        if (!a || !b) return;
        const sa = resolveBar(sched, from);
        const sb = resolveBar(sched, to);
        const pa = barPosForRow(opts.ctx.t0, a, sa.start, sa.durationDays);
        const pb = barPosForRow(opts.ctx.t0, b, sb.start, sb.durationDays);
        const x1 = pa.x + pa.w,
          y1 = pa.y + pa.h / 2,
          x2 = pb.x,
          y2 = pb.y + pb.h / 2;
        const mid = x1 + 8;
        const d =
          Math.abs(y1 - y2) < 1 && x2 >= x1
            ? `M${x1},${y1} H${x2}`
            : x2 >= x1 + 16
              ? `M${x1},${y1} H${mid} V${y2} H${x2}`
              : `M${x1},${y1} H${x1 + 8} V${(y1 + y2) / 2} H${x2 - 8} V${y2} H${x2}`;
        el.setAttribute("d", d);
      });
    },
    [opts],
  );

  const handleMove = useCallback(
    (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const days = Math.round((e.clientX - drag.x0) / DW);
      if (!drag.moved && Math.abs(e.clientX - drag.x0) < 3) return;
      drag.moved = true;
      if (days === drag.lastDays) return;
      drag.lastDays = days;

      const ov: Overlay = JSON.parse(JSON.stringify(opts.getOverlay()));
      if (drag.kind === "move") {
        ov.starts[drag.uid] = toISO(addDays(parseISO(drag.baseStartISO), days));
      } else {
        ov.durations[drag.uid] = Math.max(1, drag.baseDur + days);
      }
      const sched = computeSchedule(opts.ctx, ov, opts.asOf, opts.baselineUnits);
      paintFrame(sched);
    },
    [opts, paintFrame],
  );

  const handleUp = useCallback(() => {
    window.removeEventListener("pointermove", handleMove);
    const drag = dragRef.current;
    dragRef.current = null;
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
      dragRef.current = {
        uid,
        kind,
        x0: e.clientX,
        baseStartISO: toISO(s.start),
        baseDur: s.durationDays,
        lastDays: 0,
        moved: false,
      };
      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp, { once: true });
    },
    [handleMove, handleUp, opts],
  );

  return { onPointerDown };
}
