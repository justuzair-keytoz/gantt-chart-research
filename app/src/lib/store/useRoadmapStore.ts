"use client";

// Ported from prototype/app.js's `state` object and its mutators
// (newScenario, ensureScenario, snapshot, undo, editOv), with scenario
// overlays matching lib/engine/types.ts's Overlay shape.

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { notifications } from "@mantine/notifications";

import {
  computeSchedule,
  effectiveDeps,
  emptyOverlay,
  unitLabel,
  wouldCycle,
} from "@/lib/engine/schedule";
import type {
  DecisionRecordEntry,
  Link,
  Milestone,
  Overlay,
  PathSegment,
  PersonOut,
  Scenario,
  Sprint,
  TaskDef,
} from "@/lib/engine/types";
import { addDays, parseISO, toISO } from "@/lib/engine/date-utils";
import { BASE_LINKS, BASE_SPRINTS, PEOPLE, T0 } from "@/lib/mock-data";
import { buildContext, nextSegment } from "./deriveContext";

export interface RoadmapPersistedState {
  scenarios: Scenario[];
  active: string;
  asOf: string;
  decisions: DecisionRecordEntry[];
  expanded: string[];
  userTasks: TaskDef[];
  userMilestones: Milestone[];
  taskStepOverrides: Record<string, PathSegment[]>;
  baseStarts: Record<string, string>;
  baseDurations: Record<string, number>;
  basePeople: Record<
    string,
    { assignee?: string; reviewer?: string | null; stakeholders?: string[] }
  >;
  baseLinks: Link[];
  baseSprints: Sprint[];
}

export interface RoadmapState extends RoadmapPersistedState {
  linkMode: boolean;
  linkFrom: string | null;

  activeScenario: () => Scenario;
  ensureScenario: () => Scenario;
  setActive: (id: string) => void;
  resetScenario: () => void;
  undo: () => void;

  editOverlay: (label: string, fn: (ov: Overlay) => void) => void;
  addLink: (from: string, to: string) => void;
  removeLink: (from: string, to: string) => void;
  toggleLinkMode: () => void;
  handleLinkClick: (uid: string) => void;

  setAsOf: (iso: string) => void;
  toggleExpanded: (id: string) => void;
  expandAll: (ids: string[]) => void;
  collapseAll: () => void;

  togglePersonOut: (preset: PersonOut, on: boolean) => void;

  addTask: (name: string, opts?: { sprintId?: string }) => string;
  addMilestone: (name: string) => string;
  addStep: (taskId: string, name: string, durationDays?: number) => void;

  siblingsToDiscard: () => Scenario[];
  commitScenario: (reason: string) => void;
}

// Scenario auto-creation is disabled for v1 — see spec.md's "Correction,
// scenario creation disabled" note. A single always-unlocked working
// scenario replaces the old locked-Baseline + ensureScenario()-spawns-a-new-
// one-per-edit model: edits always land in this one scenario directly, so
// there's exactly one place to look for "what am I changing right now."
const WORKING_SCENARIO: Scenario = {
  id: "working",
  name: "Working",
  locked: false,
  ov: emptyOverlay(),
  history: [],
};

function freshWorkingScenario(): Scenario {
  return { ...WORKING_SCENARIO, ov: emptyOverlay(), history: [] };
}

export const useRoadmapStore = create<RoadmapState>()(
  persist(
    (set, get) => ({
      scenarios: [WORKING_SCENARIO],
      active: "working",
      asOf: "2026-10-10",
      decisions: [],
      // Real row ids for a task with steps are "<sprintId>::<taskId>", not a
      // bare task id (and sprint assignment itself is computed from the
      // schedule, not a static field) — this list used to hold bare task
      // ids ("OAK-151", ...) that never matched anything, so nothing was
      // ever expanded by default. Defaulting to the sprint ids themselves
      // (stable, not schedule-dependent) actually opens the sprints instead.
      expanded: ["s5", "s6", "s7", "s8", "s9"],
      userTasks: [],
      userMilestones: [],
      taskStepOverrides: {},
      baseStarts: {},
      baseDurations: {},
      basePeople: {},
      baseLinks: BASE_LINKS,
      baseSprints: BASE_SPRINTS,
      linkMode: false,
      linkFrom: null,

      activeScenario: () => {
        const s = get();
        return s.scenarios.find((sc) => sc.id === s.active) ?? WORKING_SCENARIO;
      },

      // No longer spawns a new scenario — there is exactly one working
      // scenario (never locked) for the lifetime of the app, so every edit
      // always lands in the same, single, traceable place.
      ensureScenario: () => get().activeScenario(),

      setActive: (id) => set({ active: id }),

      resetScenario: () => {
        const sc = get().activeScenario();
        if (sc.locked) return;
        set((s) => ({
          scenarios: s.scenarios.map((x) =>
            x.id === sc.id ? { ...x, ov: emptyOverlay(), history: [] } : x,
          ),
        }));
      },

      undo: () => {
        const sc = get().activeScenario();
        if (sc.locked || !sc.history.length) {
          notifications.show({ message: "Nothing to undo." });
          return;
        }
        const history = sc.history.slice(0, -1);
        const last = sc.history[sc.history.length - 1];
        const ov = history.length ? history[history.length - 1] : emptyOverlay();
        set((s) => ({
          scenarios: s.scenarios.map((x) => (x.id === sc.id ? { ...x, ov, history } : x)),
        }));
        notifications.show({
          message: `Undid: ${last.changes[last.changes.length - 1] ?? "change"}`,
        });
      },

      editOverlay: (label, fn) => {
        const sc = get().ensureScenario();
        const ov: Overlay = JSON.parse(JSON.stringify(sc.ov));
        fn(ov);
        ov.changes = [...ov.changes, label];
        const history = [...sc.history, JSON.parse(JSON.stringify(ov))];
        set((s) => ({
          scenarios: s.scenarios.map((x) => (x.id === sc.id ? { ...x, ov, history } : x)),
        }));
      },

      addLink: (from, to) => {
        const ctx = buildContext(get());
        const sc = get().ensureScenario();
        const deps = effectiveDeps(ctx.steps, ctx.links, sc.ov);
        if (deps[to]?.has(from)) {
          notifications.show({ message: "That link already exists." });
          return;
        }
        if (wouldCycle(deps, from, to)) {
          notifications.show({
            color: "red",
            message: `Cannot link ${unitLabel(ctx, from)} → ${unitLabel(ctx, to)}: it would create a cycle.`,
          });
          return;
        }
        get().editOverlay(`link ${unitLabel(ctx, from)} → ${unitLabel(ctx, to)} added`, (ov) => {
          ov.addLinks.push({ from, to });
        });
      },

      removeLink: (from, to) => {
        const ctx = buildContext(get());
        const toStep = ctx.stepByUid[to];
        if (toStep?.prevUid === from) {
          notifications.show({
            message: "That is the step chain inside one task; it cannot be removed, only re-timed.",
          });
          return;
        }
        get().editOverlay(`link ${unitLabel(ctx, from)} → ${unitLabel(ctx, to)} removed`, (ov) => {
          if (ctx.links.some((l) => l.from === from && l.to === to)) {
            ov.rmLinks.push({ from, to });
          } else {
            ov.addLinks = ov.addLinks.filter((l) => !(l.from === from && l.to === to));
          }
        });
      },

      toggleLinkMode: () => set((s) => ({ linkMode: !s.linkMode, linkFrom: null })),

      handleLinkClick: (uid) => {
        const s = get();
        if (!s.linkMode) set({ linkMode: true });
        if (!s.linkFrom) {
          set({ linkFrom: uid });
          return;
        }
        if (s.linkFrom === uid) {
          set({ linkFrom: null });
          return;
        }
        get().addLink(s.linkFrom, uid);
        set({ linkFrom: null, linkMode: false });
      },

      setAsOf: (iso) => set({ asOf: iso }),

      toggleExpanded: (id) =>
        set((s) => ({
          expanded: s.expanded.includes(id)
            ? s.expanded.filter((x) => x !== id)
            : [...s.expanded, id],
        })),

      expandAll: (ids) => set({ expanded: ids }),
      collapseAll: () => set({ expanded: [] }),

      togglePersonOut: (preset, on) => {
        get().editOverlay(on ? preset.label : `${preset.label} removed`, (ov) => {
          ov.out = on
            ? [...ov.out, preset]
            : ov.out.filter((o) => o.label !== preset.label);
        });
      },

      addTask: (name, opts) => {
        const id = `TASK-${Date.now().toString(36)}`;
        const sprint = opts?.sprintId
          ? get().baseSprints.find((sp) => sp.id === opts.sprintId)
          : null;
        const startDate = sprint ? sprint.start : get().asOf;
        const dueDate = toISO(addDays(parseISO(startDate), 2));
        const task: TaskDef = { id, name, startDate, dueDate, milestone: null, path: [] };
        set((s) => ({ userTasks: [...s.userTasks, task] }));
        return id;
      },

      addMilestone: (name) => {
        const id = `MS-${Date.now().toString(36)}`;
        const dueDate = toISO(addDays(parseISO(get().asOf), 14));
        const milestone: Milestone = { id, name, dueDate, color: "#1d4ed8" };
        set((s) => ({ userMilestones: [...s.userMilestones, milestone] }));
        return id;
      },

      addStep: (taskId, name, durationDays = 1) => {
        const ctx = buildContext(get());
        const task = ctx.taskById[taskId];
        if (!task) return;
        const seg = nextSegment(task);
        seg.steps = [[seg.steps[0][0], durationDays]];
        set((s) => ({
          taskStepOverrides: {
            ...s.taskStepOverrides,
            [taskId]: [...(s.taskStepOverrides[taskId] ?? []), seg],
          },
        }));
        void name; // step display name is edited afterward via the Step Editor
      },

      siblingsToDiscard: () => {
        const s = get();
        return s.scenarios.filter((sc) => sc.id !== s.active && !sc.locked);
      },

      commitScenario: (reason) => {
        const s = get();
        const sc = s.activeScenario();
        if (sc.locked) return;
        const ctx = buildContext(s);
        const baselineSched = computeSchedule(ctx, emptyOverlay(), s.asOf, null);
        const sched = computeSchedule(ctx, sc.ov, s.asOf, baselineSched.units);

        const moved = ctx.steps.filter((u) => sched.units[u.uid].moved);
        const movedTasks = [...new Set(moved.map((u) => u.taskId))];

        const baseStarts = { ...s.baseStarts };
        const baseDurations = { ...s.baseDurations };
        ctx.steps.forEach((u) => {
          baseStarts[u.uid] = toISO(sched.units[u.uid].start);
          baseDurations[u.uid] = sched.units[u.uid].durationDays;
        });
        ctx.tasks
          .filter((t) => ctx.taskUnits[t.id].length === 0)
          .forEach((t) => {
            if (sc.ov.starts[t.id]) baseStarts[t.id] = sc.ov.starts[t.id];
            if (sc.ov.durations[t.id]) baseDurations[t.id] = sc.ov.durations[t.id];
          });

        const basePeople = { ...s.basePeople };
        Object.entries(sc.ov.people).forEach(([uid, pp]) => {
          basePeople[uid] = { ...(basePeople[uid] ?? {}), ...pp };
        });

        const baseLinks = ctx.links
          .filter((l) => !sc.ov.rmLinks.some((r) => r.from === l.from && r.to === l.to))
          .concat(sc.ov.addLinks);

        const baseSprints = sched.sprints.map((sp) => ({
          id: sp.id,
          name: sp.name,
          start: sp.start,
          end: sp.end,
        }));

        const notifyNames = Object.keys(sched.summary.notify);
        const entry: DecisionRecordEntry = {
          n: s.decisions.length + 1,
          title: `${sc.name} committed: ${movedTasks.join(", ") || "no moves"}${
            sc.ov.addLinks.length + sc.ov.rmLinks.length ? ", links changed" : ""
          } · update ${notifyNames.join(", ") || "nobody"}`,
          why: reason,
          when: new Date().toLocaleString([], {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          }),
        };

        set({
          baseStarts,
          baseDurations,
          basePeople,
          baseLinks,
          baseSprints,
          decisions: [entry, ...s.decisions],
          scenarios: [freshWorkingScenario()],
          active: "working",
          linkMode: false,
          linkFrom: null,
        });

        notifications.show({
          message: `Committed. ${moved.length} steps updated on ${
            movedTasks.join(", ") || "no tasks"
          }; decision entry D${entry.n} recorded; ${
            notifyNames.join(", ") || "nobody"
          } to update.`,
        });
      },
    }),
    {
      name: "gantt-roadmap-sim-v1",
      partialize: (s) => ({
        scenarios: s.scenarios,
        active: s.active,
        asOf: s.asOf,
        decisions: s.decisions,
        expanded: s.expanded,
        userTasks: s.userTasks,
        userMilestones: s.userMilestones,
        taskStepOverrides: s.taskStepOverrides,
        baseStarts: s.baseStarts,
        baseDurations: s.baseDurations,
        basePeople: s.basePeople,
        baseLinks: s.baseLinks,
        baseSprints: s.baseSprints,
      }),
    },
  ),
);

export const peopleOptions = () => PEOPLE;
export const t0 = T0;
