"use client";

// Main Gantt view — ported from prototype/app.js's render()/layoutFlat() for
// the flat (non-3D/4D — out of scope per spec) surface, with the sticky
// sidebar, collapsible task rows, and milestone diamonds the prototype
// doesn't have.

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ActionIcon,
  Badge,
  Button,
  Checkbox,
  Group,
  Menu,
  Paper,
  Stack,
  Tabs,
  Text,
  Tooltip,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";

import { computeSchedule, emptyOverlay, type ScheduleContext } from "@/lib/engine/schedule";
import type { ScheduleResult } from "@/lib/engine/types";
import { parseISO, toISO, isWeekend, addDays } from "@/lib/engine/date-utils";
import { DAYS, OUT_PRESETS, T0, TODAY } from "@/lib/mock-data";
import { useRoadmapStore, type RoadmapState } from "@/lib/store/useRoadmapStore";
import { buildContext } from "@/lib/store/deriveContext";

import {
  AXIS_H,
  DATE_AXIS_H,
  DEFAULT_DW,
  LABEL_W,
  allCollapsibleIds,
  barPosForRow,
  buildRows,
  collapsibleDescendantIds,
  xForDate,
  type BarPos,
  type GanttRow,
} from "./layout";
import { Bar, GhostBar } from "./Bar";
import { MilestoneDiamond } from "./Milestone";
import { resolveBar, useBarDrag, type MilestoneLink } from "./useBarDrag";
import { DependencyPaths, type DependencyPath, type Point } from "./DependencyPaths";
import { resolveVisibleRow } from "./resolveLinkEndpoint";
import { StepEditor } from "@/components/StepEditor/StepEditor";
import { CommitDialog } from "@/components/CommitDialog/CommitDialog";
import {
  ChangesPanel,
  ComparePanel,
  DecisionRecordPanel,
  EfficiencyGapsPanel,
  RiskPanel,
  WorkloadPanel,
} from "@/components/panels";

export function FlatGantt() {
  const state = useRoadmapStore();
  const svgRef = useRef<SVGSVGElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastPointer = useRef({ x: 0, y: 0 });
  const [selected, setSelected] = useState<{ uid: string; x: number; y: number } | null>(null);
  const [commitOpen, setCommitOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [linking, setLinking] = useState<{ from: string; start: Point; end: Point; target: string | null } | null>(null);
  const linkingRef = useRef<typeof linking>(null);

  // v2 zoom: day-column width is now state (ported from prototype/app.js's
  // module-level `let DW`, see setZoom() below), not the old `layout.ts`
  // constant. 36 (not the prototype's 12) stays the default — see spec/v2's
  // zoom decision note.
  const [dw, setDw] = useState(DEFAULT_DW);
  // Read live inside setZoom/the wheel handler without re-subscribing those
  // callbacks on every dw change (both are set up once, in effects/useCallback
  // with stable deps) — a plain ref kept in sync with the current render's dw.
  const dwRef = useRef(dw);
  dwRef.current = dw;
  // setZoom's cursor-anchoring math (dayAt, the pointer's clientX, and the
  // chart's bounding-rect left) is computed BEFORE the dw state update, from
  // the pre-zoom layout — then consumed by the useLayoutEffect below, which
  // fires after React has committed the new dw to the DOM but before the
  // browser paints, so the corrective scrollLeft write never flashes the old
  // (unanchored) scroll position on screen. This is the one place a
  // synchronous "setDW + direct DOM write" (the prototype's own approach)
  // can't translate 1:1 into React: the new layout only exists after a
  // render triggered by the state update, so the restore has to happen in a
  // layout effect keyed on dw instead of immediately after setDw.
  const pendingAnchorRef = useRef<{ dayAt: number; ax: number; left: number } | null>(null);
  // Zoom-to-fit wants scrollLeft reset to 0 instead of anchor-restored —
  // a separate flag so the same dw-keyed layout effect can tell which
  // behavior this particular zoom change wants.
  const scrollToZeroRef = useRef(false);

  const setZoom = useCallback((nw: number, anchorClientX?: number) => {
    const clamped = Math.max(4, Math.min(40, nw));
    const el = scrollRef.current;
    if (!el || clamped === dwRef.current) return;
    const r = el.getBoundingClientRect();
    const ax = anchorClientX ?? r.left + r.width / 2;
    const dayAt = (el.scrollLeft + ax - r.left - LABEL_W) / dwRef.current;
    scrollToZeroRef.current = false;
    pendingAnchorRef.current = { dayAt, ax, left: r.left };
    setDw(clamped);
  }, []);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (scrollToZeroRef.current) {
      scrollToZeroRef.current = false;
      el.scrollLeft = 0;
      return;
    }
    const anchor = pendingAnchorRef.current;
    if (!anchor) return;
    pendingAnchorRef.current = null;
    el.scrollLeft = Math.max(0, anchor.dayAt * dw + LABEL_W - (anchor.ax - anchor.left));
  }, [dw]);

  const zoomFit = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nw = Math.max(4, Math.min(40, Math.floor((el.clientWidth - LABEL_W - 24) / DAYS)));
    pendingAnchorRef.current = null;
    scrollToZeroRef.current = true;
    setDw(nw);
  }, []);

  const zoomToday = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollLeft = Math.max(0, xForDate(T0, TODAY, dwRef.current) - el.clientWidth / 3);
  }, []);

  // Native (non-JSX) wheel listener: React's onWheel is always passive and
  // can't call preventDefault(), which is required here — without it, a
  // trackpad pinch (which Chrome/Firefox deliver as a ctrl/metaKey wheel
  // event) falls through to the browser's own page-zoom instead of this
  // custom chart zoom. Ported directly from prototype/app.js's wrap wheel
  // listener.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const cur = dwRef.current;
      setZoom(Math.round(cur * (e.deltaY < 0 ? 1.15 : 1 / 1.15)) || cur + (e.deltaY < 0 ? 1 : -1), e.clientX);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [setZoom]);

  const ctx = useMemo(
    () => buildContext(state),
    [
      state.userTasks,
      state.taskStepOverrides,
      state.baseStarts,
      state.baseDurations,
      state.basePeople,
      state.baseLinks,
      state.baseSprints,
      state.userMilestones,
    ],
  );
  const linkableUids = useMemo(() => new Set(ctx.steps.map((step) => step.uid)), [ctx.steps]);

  const baselineUnits = useMemo(
    () => computeSchedule(ctx, emptyOverlay(), state.asOf, null).units,
    [ctx, state.asOf],
  );

  const scenario = state.activeScenario();
  const sched = useMemo(
    () => computeSchedule(ctx, scenario.ov, state.asOf, baselineUnits),
    [ctx, scenario.ov, state.asOf, baselineUnits],
  );

  const { rows, height } = useMemo(
    () => buildRows(ctx, sched, state.expanded),
    [ctx, sched, state.expanded],
  );

  const rowByUid = useMemo(() => {
    const m: Record<string, GanttRow> = {};
    rows.forEach((r) => {
      if (r.uid) m[r.uid] = r;
    });
    return m;
  }, [rows]);

  // All rows by row id (not just linkable ones) — lets resolveVisibleRow
  // resolve a hidden step to its visible task row.
  const rowsById = useMemo(() => {
    const m: Record<string, GanttRow> = {};
    rows.forEach((r) => (m[r.id] = r));
    return m;
  }, [rows]);

  const milestoneRows = useMemo(() => rows.filter((r) => r.kind === "milestone"), [rows]);
  const milestoneById = useMemo(() => {
    const m: Record<string, (typeof ctx.milestones)[number]> = {};
    ctx.milestones.forEach((ms) => (m[ms.id] = ms));
    return m;
  }, [ctx.milestones]);

  // Each milestone's due-date X / row-center Y, computed once and shared by
  // milestoneLinks' connector targets and dependency-path positions below
  // — computing this twice from the same row+due-date inputs risked the two
  // silently drifting apart after a future edit to either formula.
  const milestonePointById = useMemo(() => {
    const m: Record<string, { x: number; y: number }> = {};
    milestoneRows.forEach((row) => {
      const ms = milestoneById[row.milestoneId!];
      if (!ms) return;
      m[ms.id] = { x: xForDate(ctx.t0, parseISO(ms.dueDate), dw), y: row.y + row.height / 2 };
    });
    return m;
  }, [milestoneRows, milestoneById, ctx.t0, dw]);

  // Gating-task → milestone relationships, fixed-point end (milestone due
  // dates don't move when a gating bar is dragged) — shared by the edge list
  // below and by useBarDrag's paintFrame so connector lines stay glued to
  // the bar during a reschedule-drag.
  const milestoneLinks: MilestoneLink[] = useMemo(() => {
    const out: MilestoneLink[] = [];
    milestoneRows.forEach((row) => {
      const m = milestoneById[row.milestoneId!];
      if (!m) return;
      const target = milestonePointById[m.id];
      if (!target) return;
      ctx.tasks
        .filter((t) => t.milestone === m.id)
        .forEach((t) => {
          const uids = ctx.taskUnits[t.id];
          const uid = uids.length ? uids[uids.length - 1] : t.id;
          // No visibility check here — a gating task hidden behind a
          // collapsed sprint/task still gates the milestone; its connector
          // just resolves to the nearest visible ancestor row (see
          // dependency-path resolution below) instead of vanishing.
          out.push({ uid, milestoneId: m.id, target });
        });
    });
    return out;
  }, [milestoneRows, milestoneById, milestonePointById, ctx.tasks, ctx.taskUnits]);

  const drag = useBarDrag({
    svgRef,
    ctx,
    dw,
    getOverlay: () => state.activeScenario().ov,
    asOf: state.asOf,
    baselineUnits,
    rowByUid,
    rowsById,
    milestoneLinks,
    onCommit: (uid, patch, label) => {
      state.editOverlay(label, (ov) => {
        if (patch.starts) Object.assign(ov.starts, patch.starts);
        if (patch.durations) Object.assign(ov.durations, patch.durations);
      });
    },
    onClick: (uid) => {
      // Click-source-then-click-target fallback gesture (toggled by the
      // "Add link" toolbar button): previously wired through the now-
      // removed link-handle circle's onPointerDown (`props.onLinkHandle()`
      // in the old Bar.tsx); that was this gesture's only entry point, so
      // keeping the fallback here preserves it alongside direct linking.
      // bar body's own existing click-without-drag detection (useBarDrag
      // already distinguishes a plain click from a drag), gated on linkMode
      // so normal clicks still open the Step Editor when not in link mode.
      if (state.linkMode) {
        state.handleLinkClick(uid);
        return;
      }
      if (!ctx.stepByUid[uid]) return; // plain-bar tasks: editable via "Add step" first
      setSelected({ uid, x: lastPointer.current.x, y: lastPointer.current.y });
    },
  });

  const width = DAYS * dw + 40;
  const svgHeight = height;

  // Focus the viewport on today by default, instead of leaving it at its
  // native scroll-left-0 position — with the chart window now starting a
  // month in the past (see mock-data/constants.ts), scroll-0 would show
  // mostly stale lookback days first. Runs once on mount; a small left
  // margin (roughly a week at the current day width) keeps a sliver of
  // recent-past context visible rather than pinning "today" to the exact
  // edge of the sticky sidebar.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const todayX = xForDate(T0, TODAY, dw);
    el.scrollLeft = Math.max(0, LABEL_W + todayX - dw * 5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sprint bands — v2's "sprints render as calendar bands" direction:
  // tinted full-height column ranges underneath everything else. Alternating
  // fill colors are ported from
  // prototype/app.js's own sprint-axis rendering (`i % 2 ? "#eef2ff" : "#e0e7ff"`).
  const sprintBands: JSX.Element[] = [];
  sched.sprints.forEach((s, i) => {
      const x1 = xForDate(T0, parseISO(s.start), dw);
      const x2 = xForDate(T0, parseISO(s.end), dw) + dw;
      sprintBands.push(
        <rect
          key={s.id}
          x={x1}
          y={DATE_AXIS_H}
          width={Math.max(0, x2 - x1)}
          height={svgHeight - DATE_AXIS_H}
          fill={i % 2 ? "#eef2ff" : "#e0e7ff"}
        />,
      );
      sprintBands.push(
        <text
          key={`${s.id}-label`}
          x={x1 + 4}
          y={DATE_AXIS_H + 13}
          fontSize={10}
          fontWeight={600}
          fill="#4338ca"
        >
          {s.name}
        </text>,
      );
  });

  const weekendBands: JSX.Element[] = [];
  for (let i = 0; i < DAYS; i++) {
    const dt = addDays(T0, i);
    if (isWeekend(dt)) {
      weekendBands.push(
        <rect
          key={i}
          x={xForDate(T0, dt, dw)}
          y={AXIS_H}
          width={dw}
          height={svgHeight - AXIS_H}
          fill="#f3f4f6"
        />,
      );
    }
  }

  // 3-row date-axis header (month label / weekday letter / date number),
  // each row an even third of DATE_AXIS_H — replaces the old single "month
  // abbrev. every Monday" row (owner feedback: zoom in, make days/weeks
  // legible — see spec.md's "Further Notes").
  const AXIS_ROW_H = DATE_AXIS_H / 3;
  const monthLabels: JSX.Element[] = [];
  const weekdayLabels: JSX.Element[] = [];
  const dateLabels: JSX.Element[] = [];
  for (let i = 0; i < DAYS; i++) {
    const dt = addDays(T0, i);
    const cx = xForDate(T0, dt, dw) + dw / 2;
    // Month label: once per month, left-aligned at that month's first day —
    // or at i===0 if the chart's visible range starts mid-month.
    if (dt.getDate() === 1 || i === 0) {
      monthLabels.push(
        <text key={i} x={xForDate(T0, dt, dw) + 2} y={AXIS_ROW_H - 5} fontSize={10} fontWeight={600} fill="#4b5563">
          {dt.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
        </text>,
      );
    }
    // Weekday letter: single capital letter, every day (ambiguous for
    // Tue/Thu and Sat/Sun — same ambiguity the reference screenshot has;
    // not "fixed" with a two-letter scheme per the task's instructions).
    weekdayLabels.push(
      <text key={i} x={cx} y={AXIS_ROW_H * 2 - 5} fontSize={10} fill="#6b7280" textAnchor="middle">
        {dt.toLocaleDateString("en-US", { weekday: "narrow" })}
      </text>,
    );
    // Date number: day-of-month, directly under its weekday letter.
    dateLabels.push(
      <text key={i} x={cx} y={DATE_AXIS_H - 5} fontSize={10.5} fontWeight={500} fill="#374151" textAnchor="middle">
        {dt.getDate()}
      </text>,
    );
  }

  const asOfX = xForDate(T0, parseISO(state.asOf), dw);

  const anchorPos = (uid: string): { row: GanttRow; pos: ReturnType<typeof barPosForRow> } | null => {
    const row = resolveVisibleRow(uid, ctx, sched, rowByUid, rowsById);
    if (!row) return null;
    const s = resolveBar(sched, uid);
    return { row, pos: barPosForRow(ctx.t0, row, s.start, s.durationDays, dw) };
  };

  const isGatingRisk = (uid: string): boolean =>
    !!sched.units[uid]?.risks.some((r) => r.sev === "critical" || r.sev === "expired");

  const dependencyPaths: DependencyPath[] = useMemo(() => {
    // Dependency edges are grouped by (resolved source row, resolved target
    // row) rather than emitted one-per-original-link — several hidden steps
    // climbing to the same collapsed ancestor row must render as ONE merged
    // line, not several overlapping near-duplicates (which is what made the
    // "merge" look broken: it was visually converging but never actually
    // deduplicating). A group with more than one original link isn't
    // individually removable by click — which single link a click would mean
    // to remove is ambiguous once several are merged into one line.
    interface Group {
      sourcePos: BarPos;
      targetPos: BarPos;
      clash: boolean;
      originals: { from: string; to: string }[];
    }
    const groups = new Map<string, Group>();
    ctx.steps.forEach((u) => {
      sched.deps[u.uid]?.forEach((p) => {
        const a = anchorPos(p);
        const b = anchorPos(u.uid);
        if (!a || !b) return;
        if (a.row.id === b.row.id) return; // merged onto the same row — nothing to draw
        const key = `${a.row.id}>${b.row.id}`;
        const existing = groups.get(key);
        const clash = isGatingRisk(u.uid);
        if (existing) {
          existing.clash = existing.clash || clash;
          existing.originals.push({ from: p, to: u.uid });
        } else {
          groups.set(key, { sourcePos: a.pos, targetPos: b.pos, clash, originals: [{ from: p, to: u.uid }] });
        }
      });
    });
    const edges: DependencyPath[] = [];
    groups.forEach((g) => {
      const single = g.originals.length === 1 ? g.originals[0] : null;
      const source = single?.from ?? g.originals[0].from;
      const target = single?.to ?? g.originals[0].to;
      edges.push({
        id: `${source}>${target}`,
        data: {
          kind: "elbow",
          sourcePos: g.sourcePos,
          targetPos: g.targetPos,
          removable: !!single,
          from: single?.from,
          to: single?.to,
          ...(g.clash ? { stroke: "var(--crit)", dashed: "3 3", strokeWidth: 1.5 } : {}),
        },
      });
    });

    // Milestone connectors: group by resolved source row only — the target
    // is always the one milestone node — so several gating tasks hidden
    // behind the same collapsed sprint/task converge into one line too.
    const msGroups = new Map<
      string,
      { sourcePos: BarPos; milestoneId: string; clash: boolean; uid: string }
    >();
    milestoneLinks.forEach((ml) => {
      const a = anchorPos(ml.uid);
      if (!a) return;
      const key = `${a.row.id}>>${ml.milestoneId}`;
      const clash = isGatingRisk(ml.uid);
      const existing = msGroups.get(key);
      if (existing) existing.clash = existing.clash || clash;
      else msGroups.set(key, { sourcePos: a.pos, milestoneId: ml.milestoneId, clash, uid: ml.uid });
    });
    msGroups.forEach((g) => {
      const m = milestoneById[g.milestoneId];
      const target = milestonePointById[g.milestoneId];
      if (!target) return;
      edges.push({
        id: `${g.uid}>>${g.milestoneId}`,
        data: {
          kind: "milestone",
          sourcePos: g.sourcePos,
          targetPos: target,
          stroke: g.clash ? "var(--crit)" : m?.color,
          strokeWidth: 1.5,
          dashed: g.clash ? "3 3" : "4 3",
          removable: false,
        },
      });
    });
    return edges;
  }, [ctx, sched, rowByUid, rowsById, milestoneLinks, milestoneById, dw]);

  const allIds = useMemo(() => allCollapsibleIds(rows), [rows]);

  const pointForPointer = useCallback((clientX: number, clientY: number): Point | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    return { x: ((clientX - rect.left) * width) / rect.width, y: ((clientY - rect.top) * svgHeight) / rect.height };
  }, [width, svgHeight]);

  const startLink = useCallback((event: React.PointerEvent, from: string) => {
    event.preventDefault();
    event.stopPropagation();
    const point = pointForPointer(event.clientX, event.clientY);
    if (!point) return;
    const next = { from, start: point, end: point, target: null };
    linkingRef.current = next;
    setLinking(next);
  }, [pointForPointer]);

  const cancelLink = useCallback(() => {
    linkingRef.current = null;
    setLinking(null);
  }, []);

  useEffect(() => {
    if (!linking?.from) return;
    const update = (event: PointerEvent) => {
      const point = pointForPointer(event.clientX, event.clientY);
      if (!point) return;
      const element = document.elementFromPoint(event.clientX, event.clientY);
      const candidate = element?.closest<SVGGElement>("[data-bar]")?.dataset.bar ?? null;
      const target = candidate && linkableUids.has(candidate) ? candidate : null;
      const next = { ...linkingRef.current!, end: point, target: target === linkingRef.current?.from ? null : target };
      linkingRef.current = next;
      setLinking(next);
    };
    const finish = () => {
      const current = linkingRef.current;
      cancelLink();
      if (current?.target) state.addLink(current.from, current.target);
    };
    window.addEventListener("pointermove", update);
    window.addEventListener("pointerup", finish, { once: true });
    window.addEventListener("pointercancel", cancelLink, { once: true });
    window.addEventListener("blur", cancelLink, { once: true });
    return () => {
      window.removeEventListener("pointermove", update);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", cancelLink);
      window.removeEventListener("blur", cancelLink);
    };
  }, [cancelLink, linking?.from, linkableUids, pointForPointer, state.addLink]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <Toolbar
        state={state}
        onCommit={() => setCommitOpen(true)}
        onCompare={() => setCompareOpen((v) => !v)}
        compareOpen={compareOpen}
        allIds={allIds}
        dw={dw}
        onZoomIn={() => setZoom(Math.round(dw * 1.25))}
        onZoomOut={() => setZoom(Math.round(dw / 1.25))}
        onZoomFit={zoomFit}
        onZoomToday={zoomToday}
      />
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <div
          ref={scrollRef}
          style={{ flex: 1, overflow: "auto", position: "relative" }}
          className="border-r border-divider-light"
        >
          <div style={{ display: "flex", width: LABEL_W + width }}>
            <div
              style={{
                position: "sticky",
                left: 0,
                zIndex: 5,
                width: LABEL_W,
                flexShrink: 0,
                background: "#fff",
                borderRight: "1px solid #e5e7eb",
              }}
            >
              <div style={{ height: AXIS_H, borderBottom: "1px solid #e5e7eb" }} />
              {rows.map((row) => (
                <RowLabel key={row.id} row={row} state={state} ctx={ctx} sched={sched} />
              ))}
            </div>
            <div style={{ position: "relative", width, height: svgHeight }}>
            <svg ref={svgRef} width={width} height={svgHeight}>
              <defs>
                <marker id="dependency-arrow" viewBox="0 0 8 8" refX={7} refY={4} markerWidth={5} markerHeight={5} orient="auto">
                  <path d="M0,0 L8,4 L0,8 Z" fill="currentColor" />
                </marker>
                <pattern id="revhatch" width={6} height={6} patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
                  <line x1={0} y1={0} x2={0} y2={6} stroke="rgba(255,255,255,.55)" strokeWidth={2} />
                </pattern>
                {/* Critical/expired (past-hard-deadline) hatch — same technique as
                    revhatch above (diagonal pattern + fill="url(#...)" overlay rect
                    in Bar.tsx), but its own pattern so the two meanings (review step
                    vs. gate-violated) stay visually distinguishable when a bar is
                    both at once. Red stripes over a translucent red wash, mockup's
                    "solid diagonal-hatch fill" look, tuned for readability without a
                    running browser to check against. */}
                <pattern id="crithatch" width={7} height={7} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <rect width={7} height={7} fill="var(--crit)" fillOpacity={0.18} />
                  <line x1={0} y1={0} x2={0} y2={7} stroke="var(--crit)" strokeWidth={3} strokeOpacity={0.85} />
                </pattern>
              </defs>
              {sprintBands}
              {weekendBands}
              {/* "As of" marker — the adjustable simulation anchor used for risk
                  severity (critical vs expired), NOT a literal today indicator —
                  it's deliberately NOT Date.now(). Styled distinctly from the
                  red clash-risk lines (violet, full date spelled out in a pill)
                  so it doesn't read as ClickUp/Wrike's literal-today dot. */}
              <line x1={asOfX} x2={asOfX} y1={0} y2={svgHeight} stroke="#7c3aed" strokeWidth={1.5} strokeDasharray="2 3" />
              {monthLabels}
              {weekdayLabels}
              {dateLabels}
              {/* "As of" pill sits in its own strip above the 3-row date axis
                  header, rather than overlapping the month-label row (the old
                  single-row header had room to center it there; the new
                  3-row header doesn't). */}
              <rect x={asOfX - 34} y={2} width={68} height={16} rx={8} fill="#7c3aed" />
              <text
                x={asOfX}
                y={13}
                fontSize={9.5}
                fontWeight={600}
                fill="#fff"
                textAnchor="middle"
              >
                As of {parseISO(state.asOf).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
              </text>
              {rows.map((row) =>
                row.kind !== "step" ? (
                  <rect
                    key={row.id}
                    x={0}
                    y={row.y}
                    width={width}
                    height={row.height}
                    fill="transparent"
                  />
                ) : null,
              )}
              <DependencyPaths edges={dependencyPaths} onRemoveLink={state.removeLink} />
              {linking && (
                <path
                  d={`M${linking.start.x},${linking.start.y} L${linking.end.x},${linking.end.y}`}
                  stroke="#1d4ed8"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  fill="none"
                  pointerEvents="none"
                />
              )}
              {milestoneRows.map((row) => {
                const m = milestoneById[row.milestoneId!];
                if (!m) return null;
                return (
                  <MilestoneDiamond
                    key={m.id}
                    milestone={m}
                    t0={ctx.t0}
                    chartHeight={svgHeight}
                    rowY={row.y + row.height / 2}
                    dw={dw}
                  />
                );
              })}
              {rows.map((row) => {
                if (!row.uid) return null;
                const s = resolveBar(sched, row.uid);
                const pos = barPosForRow(ctx.t0, row, s.start, s.durationDays, dw);
                const stepSched = sched.units[row.uid];
                const b = baselineUnits[row.uid];
                const moved = stepSched?.moved ?? false;
                return (
                  <g key={row.id}>
                    {b && (
                      <GhostBar
                        visible={moved}
                        pos={barPosForRow(ctx.t0, row, b.start, b.durationDays, dw)}
                      />
                    )}
                    <Bar
                      uid={row.uid}
                      pos={pos}
                      label={row.label}
                      color={row.stageColor ?? "#64748b"}
                      moved={moved}
                      done={stepSched?.done ?? false}
                      review={ctx.stepByUid[row.uid]?.review ?? false}
                      risks={stepSched?.risks ?? []}
                      linkSource={state.linkFrom === row.uid || linking?.from === row.uid}
                      linkTarget={linking?.target === row.uid}
                      linkable={!!stepSched}
                      resizable={!!stepSched}
                      onPointerDown={(e, kind) => {
                        lastPointer.current = { x: e.clientX, y: e.clientY };
                        drag.onPointerDown(e, row.uid!, kind);
                      }}
                      onLinkPointerDown={(event) => startLink(event, row.uid!)}
                      onLinkActivate={() => state.handleLinkClick(row.uid!)}
                      onLinkCancel={cancelLink}
                    />
                  </g>
                );
              })}
              {/* Drag-cap explanation label — always rendered (so useBarDrag's
                  paintFrame can find it via querySelector the same way it
                  finds `[data-bar]`/`[data-grip]`/`[data-link]` elements) but
                  hidden by default; paintFrame toggles display and sets the
                  rect/text attributes imperatively, live, while a drag is
                  frozen against a boundary. No React state involved, same
                  reason the rest of this drag loop avoids re-renders mid-
                  gesture. */}
              <g data-drag-label="1" style={{ display: "none" }} pointerEvents="none">
                <rect rx={4} fill="var(--crit)" />
                <text fill="#fff" fontSize={10.5} fontWeight={600} />
              </g>
            </svg>
            </div>
          </div>
        </div>
        <div style={{ width: 340, overflow: "auto", padding: 12 }}>
          <Stack gap="sm">
            <RiskPanel sched={sched} />
            <WorkloadPanel sched={sched} />
            <EfficiencyGapsPanel ctx={ctx} sched={sched} />
            <ChangesPanel scenario={scenario} />
            <DecisionRecordPanel decisions={state.decisions} />
            {compareOpen && (
              <ComparePanel ctx={ctx} scenarios={state.scenarios} asOf={state.asOf} />
            )}
          </Stack>
        </div>
      </div>

      {selected && (
        <StepEditor
          uid={selected.uid}
          x={selected.x}
          y={selected.y}
          ctx={ctx}
          sched={sched}
          onClose={() => setSelected(null)}
        />
      )}
      <CommitDialog opened={commitOpen} onClose={() => setCommitOpen(false)} ctx={ctx} sched={sched} />
    </div>
  );
}

function RowLabel({
  row,
  state,
  ctx,
  sched,
}: {
  row: GanttRow;
  state: RoadmapState;
  ctx: ScheduleContext;
  sched: ScheduleResult;
}) {
  const indent = 10 + row.depth * 16;
  return (
    <div
      style={{
        position: "absolute",
        top: row.y,
        left: 0,
        width: LABEL_W,
        height: row.height,
        display: "flex",
        alignItems: "center",
        paddingLeft: indent,
        paddingRight: 8,
        gap: 6,
        background: "#fff",
        borderBottom: "1px solid #f1f3f6",
        boxSizing: "border-box",
      }}
    >
      {row.collapsible ? (
        <ActionIcon
          size="xs"
          variant="subtle"
          onClick={() => state.toggleExpanded(row.id)}
          aria-label={row.expanded ? "Collapse" : "Expand"}
        >
          {row.expanded ? "−" : "+"}
        </ActionIcon>
      ) : (
        <span style={{ width: 18, display: "inline-block" }} />
      )}
      {row.collapsible && (
        // User Story 31: per-row "Expand all" — expand just this row's own
        // subtree, not the whole chart (the existing Toolbar button above
        // does that already, globally). Separate, additive affordance, not a
        // replacement for either the row's own toggle or the global button.
        <Tooltip label="Expand this row and everything beneath it">
          <ActionIcon
            size="xs"
            variant="subtle"
            onClick={() => state.expandSubtree(collapsibleDescendantIds(ctx, sched, row.id))}
            aria-label="Expand all beneath this row"
          >
            ⇊
          </ActionIcon>
        </Tooltip>
      )}
      <div style={{ overflow: "hidden" }}>
        <Text
          size="xs"
          fw={row.kind === "task" ? 600 : 400}
          truncate
        >
          {row.label}
        </Text>
        {row.sublabel && (
          <Text size="10px" c="dimmed" truncate>
            {row.sublabel}
          </Text>
        )}
      </div>
      {row.kind === "task" && row.taskId && (
        <Menu position="bottom-start" shadow="md">
          <Menu.Target>
            <ActionIcon size="xs" variant="subtle" ml="auto">
              ⋯
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item
              onClick={() => {
                const name = window.prompt("New step name", "New step");
                if (name) state.addStep(row.taskId!, name);
              }}
            >
              Add step
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      )}
    </div>
  );
}

function Toolbar({
  state,
  onCommit,
  onCompare,
  compareOpen,
  allIds,
  dw,
  onZoomIn,
  onZoomOut,
  onZoomFit,
  onZoomToday,
}: {
  state: RoadmapState;
  onCommit: () => void;
  onCompare: () => void;
  compareOpen: boolean;
  allIds: string[];
  dw: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomFit: () => void;
  onZoomToday: () => void;
}) {
  return (
    <Paper p="xs" radius={0} withBorder style={{ borderLeft: 0, borderRight: 0, borderTop: 0 }}>
      <Group justify="space-between" wrap="wrap" gap="xs">
        <Group gap="xs" wrap="wrap">
          <Button
            size="xs"
            variant="default"
            onClick={() => {
              const name = window.prompt("New task name");
              if (name) state.addTask(name);
            }}
          >
            + Add Task
          </Button>
          <Button
            size="xs"
            variant="default"
            onClick={() => {
              const name = window.prompt("New milestone name");
              if (name) state.addMilestone(name);
            }}
          >
            ⚑ Add Milestone
          </Button>
          <Button size="xs" variant="subtle" onClick={() => state.expandAll(allIds)}>
            Expand all
          </Button>
          <Button size="xs" variant="subtle" onClick={() => state.collapseAll()}>
            Collapse all
          </Button>
          <Button size="xs" variant="default" onClick={onZoomOut}>
            Zoom out
          </Button>
          <Button size="xs" variant="default" onClick={onZoomIn}>
            Zoom in
          </Button>
          <Button size="xs" variant="default" onClick={onZoomFit}>
            Zoom to fit
          </Button>
          <Button size="xs" variant="default" onClick={onZoomToday}>
            Zoom to today
          </Button>
          <Text size="xs" c="dimmed">
            {Math.round((dw / 12) * 100)}%
          </Text>
          <Button
            size="xs"
            variant={state.linkMode ? "filled" : "default"}
            onClick={() => state.toggleLinkMode()}
          >
            {state.linkMode ? (state.linkFrom ? "Pick target…" : "Pick source…") : "Add link"}
          </Button>
          <DateInput
            size="xs"
            label="As of"
            value={parseISODate(state.asOf)}
            onChange={(v) => {
              if (!v) return;
              state.setAsOf(toISO(typeof v === "string" ? parseISO(v) : v));
            }}
            w={140}
          />
          {Object.entries(OUT_PRESETS).map(([k, p]) => (
            <Checkbox
              key={k}
              size="xs"
              label={p.label}
              checked={state.activeScenario().ov.out.some((o) => o.label === p.label)}
              onChange={(e) => state.togglePersonOut(p, e.currentTarget.checked)}
            />
          ))}
        </Group>
        <Group gap="xs">
          <Tabs value={state.active} onChange={(v) => v && state.setActive(v)}>
            <Tabs.List>
              {state.scenarios.map((sc) => (
                <Tabs.Tab key={sc.id} value={sc.id}>
                  {sc.name}
                  {!sc.locked && (
                    <Badge size="xs" ml={6} variant="light">
                      {sc.ov.changes.length}
                    </Badge>
                  )}
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </Tabs>
          <Tooltip label="Disabled for this spike — only one working scenario is supported, so every edit stays in one traceable place. See spec.md's scenario-creation correction note.">
            {/* Mantine disables pointer-events on a disabled Button, which would
                also block hover from reaching the Tooltip — wrap in a plain span
                so the Tooltip still gets the hover even though the button can't be clicked. */}
            <span>
              <Button size="xs" variant="default" disabled style={{ pointerEvents: "none" }}>
                New scenario
              </Button>
            </span>
          </Tooltip>
          <Button size="xs" variant="default" onClick={() => state.undo()}>
            Undo
          </Button>
          <Button
            size="xs"
            variant="default"
            disabled={state.activeScenario().locked}
            onClick={() => state.resetScenario()}
          >
            Reset
          </Button>
          <Button size="xs" variant={compareOpen ? "filled" : "default"} onClick={onCompare}>
            Compare
          </Button>
          <Button
            size="xs"
            disabled={state.activeScenario().locked || state.activeScenario().ov.changes.length === 0}
            onClick={onCommit}
          >
            Commit
          </Button>
        </Group>
      </Group>
    </Paper>
  );
}

function parseISODate(iso: string): Date {
  return parseISO(iso);
}
