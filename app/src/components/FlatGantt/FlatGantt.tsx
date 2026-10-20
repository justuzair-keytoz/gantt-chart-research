"use client";

// Main Gantt view — ported from prototype/app.js's render()/layoutFlat() for
// the flat (non-3D/4D — out of scope per spec) surface, with the sticky
// sidebar, collapsible sprint rows, and milestone diamonds the prototype
// doesn't have.

import { useMemo, useRef, useState } from "react";
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
} from "@mantine/core";
import { DateInput } from "@mantine/dates";

import { computeSchedule, emptyOverlay } from "@/lib/engine/schedule";
import { parseISO, toISO, isWeekend, addDays } from "@/lib/engine/date-utils";
import { DAYS, OUT_PRESETS, T0 } from "@/lib/mock-data";
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
  type GanttRow,
} from "./layout";
import { Bar, GhostBar } from "./Bar";
import { MilestoneDiamond } from "./Milestone";
import { resolveBar, useBarDrag, type MilestoneLink } from "./useBarDrag";
import { DependencyEdgesLayer, type DepEdgeData } from "./DependencyEdges";
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
          if (!rowByUid[uid]) return;
          out.push({ uid, milestoneId: m.id, target });
        });
    });
    return out;
  }, [milestoneRows, milestoneById, milestonePointById, ctx.tasks, ctx.taskUnits, rowByUid]);

  const drag = useBarDrag({
    svgRef,
    chartRef,
    ctx,
    getOverlay: () => state.activeScenario().ov,
    asOf: state.asOf,
    baselineUnits,
    rowByUid,
    milestoneLinks,
    onCommit: (uid, patch, label) => {
      state.editOverlay(label, (ov) => {
        if (patch.starts) Object.assign(ov.starts, patch.starts);
        if (patch.durations) Object.assign(ov.durations, patch.durations);
      });
    },
    onClick: (uid) => {
      if (!ctx.stepByUid[uid]) return; // plain-bar tasks: editable via "Add step" first
      setSelected({ uid, x: lastPointer.current.x, y: lastPointer.current.y });
    },
  });

  const width = DAYS * DW + 40;
  const svgHeight = height;

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

  const monthLabels: JSX.Element[] = [];
  for (let i = 0; i < DAYS; i++) {
    const dt = addDays(T0, i);
    if (dt.getDay() === 1) {
      monthLabels.push(
        <text key={i} x={xForDate(T0, dt) + 2} y={AXIS_H - 16} fontSize={10} fill="#4b5563">
          {dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
        </text>,
      );
    }
  }

  const asOfX = xForDate(T0, parseISO(state.asOf));

  // Dependency lines (step↔step, task↔task via effectiveDeps — same source
  // as before) and task→milestone connector lines now draw through one
  // shared mechanism: reactflow, via DependencyEdgesLayer. Anchor nodes
  // carry no visuals (the bars/diamonds still render in this component's own
  // SVG below); edges carry their own BarPos-derived endpoints in `data` so
  // reactflow draws against this app's date grid, not its own layout.
  const flowNodes: Node[] = useMemo(() => {
    const nodes: Node[] = rows
      .filter((r) => !!r.uid)
      .map((r) => {
        const s = resolveBar(sched, r.uid!);
        const pos = barPosForRow(ctx.t0, r, s.start, s.durationDays);
        return {
          id: r.uid!,
          position: { x: pos.x, y: pos.y },
          width: 1,
          height: 1,
          style: { width: 1, height: 1, opacity: 0 },
          draggable: false,
          selectable: false,
          connectable: false,
          data: {},
        };
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
        style: { width: 1, height: 1, opacity: 0 },
        draggable: false,
        selectable: false,
        connectable: false,
        data: {},
      });
    });
    return nodes;
  }, [rows, sched, ctx.t0, milestoneRows, milestoneById, milestonePointById]);

  const flowEdges: Edge<DepEdgeData>[] = useMemo(() => {
    const edges: Edge<DepEdgeData>[] = [];
    ctx.steps.forEach((u) => {
      sched.deps[u.uid]?.forEach((p) => {
        const a = rowByUid[p];
        const b = rowByUid[u.uid];
        if (!a || !b) return;
        const sa = resolveBar(sched, p);
        const sb = resolveBar(sched, u.uid);
        edges.push({
          id: `${p}>${u.uid}`,
          source: p,
          target: u.uid,
          type: "dependency",
          data: {
            kind: "elbow",
            sourcePos: barPosForRow(ctx.t0, a, sa.start, sa.durationDays),
            targetPos: barPosForRow(ctx.t0, b, sb.start, sb.durationDays),
            removable: true,
            from: p,
            to: u.uid,
          },
        });
      });
    });
    milestoneLinks.forEach((ml) => {
      const row = rowByUid[ml.uid];
      if (!row) return;
      const s = resolveBar(sched, ml.uid);
      const m = milestoneById[ml.milestoneId];
      edges.push({
        id: `${ml.uid}>>${ml.milestoneId}`,
        source: ml.uid,
        target: `milestone::${ml.milestoneId}`,
        type: "dependency",
        data: {
          kind: "straight",
          sourcePos: barPosForRow(ctx.t0, row, s.start, s.durationDays),
          targetPos: ml.target,
          stroke: m?.color,
          strokeWidth: 1.5,
          dashed: "4 3",
          removable: false,
        },
      });
    });
    return edges;
  }, [ctx.steps, ctx.t0, sched, rowByUid, milestoneLinks, milestoneById]);

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
              <line x1={asOfX} x2={asOfX} y1={0} y2={svgHeight} stroke="#1d4ed8" strokeDasharray="2 3" />
              {monthLabels}
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
                      onLinkHandle={() => state.handleLinkClick(row.uid!)}
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
          <Button size="xs" variant="default" onClick={() => state.newScenario()}>
            New scenario
          </Button>
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
