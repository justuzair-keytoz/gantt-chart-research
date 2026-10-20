"use client";

// Main Gantt view — ported from prototype/app.js's render()/layoutFlat() for
// the flat (non-3D/4D — out of scope per spec) surface, with the sticky
// sidebar, collapsible sprint rows, and milestone diamonds the prototype
// doesn't have.

import { useEffect, useMemo, useRef, useState } from "react";
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

import { computeSchedule, emptyOverlay } from "@/lib/engine/schedule";
import { parseISO, toISO, isWeekend, addDays } from "@/lib/engine/date-utils";
import { DAYS, OUT_PRESETS, T0, TODAY } from "@/lib/mock-data";
import { useRoadmapStore, type RoadmapState } from "@/lib/store/useRoadmapStore";
import { buildContext } from "@/lib/store/deriveContext";

import type { Edge, Node } from "reactflow";

import {
  AXIS_H,
  DW,
  LABEL_W,
  allCollapsibleIds,
  barPosForRow,
  buildRows,
  xForDate,
  type BarPos,
  type GanttRow,
} from "./layout";
import { Bar, GhostBar } from "./Bar";
import { MilestoneDiamond } from "./Milestone";
import { resolveBar, useBarDrag, type MilestoneLink } from "./useBarDrag";
import { DependencyEdgesLayer, type DepEdgeData } from "./DependencyEdges";
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
  const chartRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastPointer = useRef({ x: 0, y: 0 });
  const [selected, setSelected] = useState<{ uid: string; x: number; y: number } | null>(null);
  const [commitOpen, setCommitOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);

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
  // climb from a hidden step to its (always-present-once-expanded) task row,
  // then to its (always-present) sprint row.
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
  // milestoneLinks' connector targets and flowNodes' anchor positions below
  // — computing this twice from the same row+due-date inputs risked the two
  // silently drifting apart after a future edit to either formula.
  const milestonePointById = useMemo(() => {
    const m: Record<string, { x: number; y: number }> = {};
    milestoneRows.forEach((row) => {
      const ms = milestoneById[row.milestoneId!];
      if (!ms) return;
      m[ms.id] = { x: xForDate(ctx.t0, parseISO(ms.dueDate)), y: row.y + row.height / 2 };
    });
    return m;
  }, [milestoneRows, milestoneById, ctx.t0]);

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
          // flowEdges' use of resolveVisibleRow below) instead of vanishing.
          out.push({ uid, milestoneId: m.id, target });
        });
    });
    return out;
  }, [milestoneRows, milestoneById, milestonePointById, ctx.tasks, ctx.taskUnits]);

  const drag = useBarDrag({
    svgRef,
    chartRef,
    ctx,
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
      // in the pre-reactflow-connect Bar.tsx); that was this gesture's only
      // entry point, so removing the circle for reactflow's own Handle
      // elements would have silently killed it too. Re-wired here, onto the
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

  const width = DAYS * DW + 40;
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
    const todayX = xForDate(T0, TODAY);
    el.scrollLeft = Math.max(0, LABEL_W + todayX - DW * 5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const weekendBands: JSX.Element[] = [];
  for (let i = 0; i < DAYS; i++) {
    const dt = addDays(T0, i);
    if (isWeekend(dt)) {
      weekendBands.push(
        <rect
          key={i}
          x={xForDate(T0, dt)}
          y={AXIS_H}
          width={DW}
          height={svgHeight - AXIS_H}
          fill="#f3f4f6"
        />,
      );
    }
  }

  // 3-row date-axis header (month label / weekday letter / date number),
  // each row an even third of AXIS_H — replaces the old single "month
  // abbrev. every Monday" row (owner feedback: zoom in, make days/weeks
  // legible — see spec.md's "Further Notes").
  const AXIS_ROW_H = AXIS_H / 3;
  const monthLabels: JSX.Element[] = [];
  const weekdayLabels: JSX.Element[] = [];
  const dateLabels: JSX.Element[] = [];
  for (let i = 0; i < DAYS; i++) {
    const dt = addDays(T0, i);
    const cx = xForDate(T0, dt) + DW / 2;
    // Month label: once per month, left-aligned at that month's first day —
    // or at i===0 if the chart's visible range starts mid-month.
    if (dt.getDate() === 1 || i === 0) {
      monthLabels.push(
        <text key={i} x={xForDate(T0, dt) + 2} y={AXIS_ROW_H - 5} fontSize={10} fontWeight={600} fill="#4b5563">
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
      <text key={i} x={cx} y={AXIS_H - 5} fontSize={10.5} fontWeight={500} fill="#374151" textAnchor="middle">
        {dt.getDate()}
      </text>,
    );
  }

  const asOfX = xForDate(T0, parseISO(state.asOf));

  // Every linkable unit (step, or plain-bar task) gets an anchor node
  // regardless of whether its own row is currently visible — a hidden one's
  // *position* is projected onto its nearest visible ancestor row (see
  // resolveVisibleRow) rather than the node being omitted, which is what
  // lets a dependency/milestone line "merge into the parent" instead of
  // vanishing when a sprint or task is collapsed (spec.md's "Correction,
  // dependency and milestone-gating lines merge with the row tree" note).
  const allLinkableUids = useMemo(() => {
    const ids = ctx.steps.map((s) => s.uid);
    ctx.tasks.forEach((t) => {
      if (!ctx.taskUnits[t.id].length) ids.push(t.id);
    });
    return ids;
  }, [ctx.steps, ctx.tasks, ctx.taskUnits]);

  const anchorPos = (uid: string): { row: GanttRow; pos: ReturnType<typeof barPosForRow> } | null => {
    const row = resolveVisibleRow(uid, ctx, sched, rowByUid, rowsById);
    if (!row) return null;
    const s = resolveBar(sched, uid);
    return { row, pos: barPosForRow(ctx.t0, row, s.start, s.durationDays) };
  };

  const isGatingRisk = (uid: string): boolean =>
    !!sched.units[uid]?.risks.some((r) => r.sev === "critical" || r.sev === "expired");

  // Dependency lines (step↔step, task↔task via effectiveDeps — same source
  // as before) and task→milestone connector lines now draw through one
  // shared mechanism: reactflow, via DependencyEdgesLayer. Anchor nodes
  // carry no visuals (the bars/diamonds still render in this component's own
  // SVG below); edges carry their own BarPos-derived endpoints in `data` so
  // reactflow draws against this app's date grid, not its own layout.
  const flowNodes: Node[] = useMemo(() => {
    const nodes: Node[] = [];
    allLinkableUids.forEach((uid) => {
      const anchored = anchorPos(uid);
      if (!anchored) return;
      const { pos } = anchored;
      nodes.push({
        id: uid,
        type: "anchor",
        position: { x: pos.x, y: pos.y },
        width: pos.w,
        height: pos.h,
        // The node box itself matches the real bar's rect exactly (so
        // reactflow's Position.Left/Position.Right land the Handles at the
        // bar's actual edges) but stays fully click-through
        // (pointerEvents: "none" overrides reactflow's own
        // `.react-flow__node { pointer-events: all }` base rule) — only the
        // small Handle dots (AnchorNode, in DependencyEdges.tsx) get their
        // own pointer-events back, via reactflow's `connectionindicator`
        // class. Without this override the whole bar's area would swallow
        // Bar.tsx's own move/resize pointer-downs underneath it.
        style: { width: pos.w, height: pos.h, background: "transparent", border: "none", pointerEvents: "none" },
        draggable: false,
        selectable: false,
        connectable: true,
        data: {},
      });
    });
    milestoneRows.forEach((row) => {
      const m = milestoneById[row.milestoneId!];
      const point = m && milestonePointById[m.id];
      if (!m || !point) return;
      nodes.push({
        id: `milestone::${m.id}`,
        position: point,
        width: 1,
        height: 1,
        style: { width: 1, height: 1, opacity: 0, pointerEvents: "none" },
        draggable: false,
        selectable: false,
        connectable: false,
        data: {},
      });
    });
    return nodes;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allLinkableUids, ctx, sched, rowByUid, rowsById, milestoneRows, milestoneById, milestonePointById]);

  const flowEdges: Edge<DepEdgeData>[] = useMemo(() => {
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
    const edges: Edge<DepEdgeData>[] = [];
    groups.forEach((g) => {
      const single = g.originals.length === 1 ? g.originals[0] : null;
      const source = single?.from ?? g.originals[0].from;
      const target = single?.to ?? g.originals[0].to;
      // The id must stay in the `<uid>><uid>` shape (a real, always-
      // registered anchor uid, not the resolved row id used only for
      // grouping) — useBarDrag.ts's live-drag repaint parses this id back
      // into uids via resolveVisibleRow, the same way this memo does.
      edges.push({
        id: `${source}>${target}`,
        source,
        target,
        type: "dependency",
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
      // `uid` must be a real, always-registered anchor-node id (reactflow
      // drops an edge whose source/target isn't a known node) — the
      // resolved row id used for grouping is NOT itself a node id once the
      // group represents a collapsed task/sprint row, so a representative
      // original uid is used instead; the custom edge still draws from
      // `sourcePos`/`targetPos`, never from this node's real position.
      else msGroups.set(key, { sourcePos: a.pos, milestoneId: ml.milestoneId, clash, uid: ml.uid });
    });
    msGroups.forEach((g) => {
      const m = milestoneById[g.milestoneId];
      const target = milestonePointById[g.milestoneId];
      if (!target) return;
      edges.push({
        id: `${g.uid}>>${g.milestoneId}`,
        source: g.uid,
        target: `milestone::${g.milestoneId}`,
        type: "dependency",
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx, sched, rowByUid, rowsById, milestoneLinks, milestoneById]);

  const allIds = useMemo(() => allCollapsibleIds(rows), [rows]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <Toolbar
        state={state}
        onCommit={() => setCommitOpen(true)}
        onCompare={() => setCompareOpen((v) => !v)}
        compareOpen={compareOpen}
        allIds={allIds}
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
                <RowLabel key={row.id} row={row} state={state} />
              ))}
            </div>
            <div ref={chartRef} style={{ position: "relative", width, height: svgHeight }}>
            <svg ref={svgRef} width={width} height={svgHeight}>
              <defs>
                <pattern id="revhatch" width={6} height={6} patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
                  <line x1={0} y1={0} x2={0} y2={6} stroke="rgba(255,255,255,.55)" strokeWidth={2} />
                </pattern>
              </defs>
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
                    fill={row.kind === "sprint" ? "#eef2ff" : "transparent"}
                  />
                ) : null,
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
                  />
                );
              })}
              {rows.map((row) => {
                if (!row.uid) return null;
                const s = resolveBar(sched, row.uid);
                const pos = barPosForRow(ctx.t0, row, s.start, s.durationDays);
                const stepSched = sched.units[row.uid];
                const b = baselineUnits[row.uid];
                const moved = stepSched?.moved ?? false;
                return (
                  <g key={row.id}>
                    {b && (
                      <GhostBar
                        visible={moved}
                        pos={barPosForRow(ctx.t0, row, b.start, b.durationDays)}
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
                      linkSource={state.linkFrom === row.uid}
                      resizable={!!stepSched}
                      onPointerDown={(e, kind) => {
                        lastPointer.current = { x: e.clientX, y: e.clientY };
                        drag.onPointerDown(e, row.uid!, kind);
                      }}
                    />
                  </g>
                );
              })}
            </svg>
            <DependencyEdgesLayer
              width={width}
              height={svgHeight}
              nodes={flowNodes}
              edges={flowEdges}
              onRemoveLink={state.removeLink}
              onConnect={state.addLink}
            />
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

function RowLabel({ row, state }: { row: GanttRow; state: RoadmapState }) {
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
        background: row.kind === "sprint" ? "#eef2ff" : "#fff",
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
      <div style={{ overflow: "hidden" }}>
        <Text
          size={row.kind === "sprint" ? "sm" : "xs"}
          fw={row.kind === "sprint" ? 700 : row.kind === "task" ? 600 : 400}
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
      {row.kind === "sprint" && (
        <Menu position="bottom-start" shadow="md">
          <Menu.Target>
            <ActionIcon size="xs" variant="subtle" ml="auto">
              ⋯
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item
              onClick={() => {
                const name = window.prompt("New task name");
                if (name) state.addTask(name, { sprintId: row.id });
              }}
            >
              Add Task
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      )}
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
}: {
  state: RoadmapState;
  onCommit: () => void;
  onCompare: () => void;
  compareOpen: boolean;
  allIds: string[];
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
