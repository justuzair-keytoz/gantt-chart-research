// Pure merge of base mock data + localStorage-layered additions into the
// shape the engine (lib/engine/schedule.ts) consumes. Nothing here mutates
// the fixed bootstrap arrays in lib/mock-data — new/edited data is merged at
// read time, per docs/gantt-chart/02-spec-roadmap-simulation.md.

import { buildUnits, type ScheduleContext } from "@/lib/engine/schedule";
import type { Link, Milestone, PathSegment, Sprint, TaskDef } from "@/lib/engine/types";
import {
  BASE_LINKS,
  BASE_SPRINTS,
  BASE_TASKS,
  CAPACITY,
  DAYS,
  MILESTONES,
  PEOPLE,
  STAGES,
  STAGE_BY_ID,
  STEP_NAMES,
  T0,
} from "@/lib/mock-data";
import type { RoadmapPersistedState } from "./useRoadmapStore";

export function mergeTasks(
  persisted: Pick<RoadmapPersistedState, "userTasks" | "taskStepOverrides">,
): TaskDef[] {
  const base = BASE_TASKS.map((t) => {
    const extra = persisted.taskStepOverrides[t.id];
    return extra?.length ? { ...t, path: [...t.path, ...extra] } : t;
  });
  const user = persisted.userTasks.map((t) => {
    const extra = persisted.taskStepOverrides[t.id];
    return extra?.length ? { ...t, path: [...t.path, ...extra] } : t;
  });
  return [...base, ...user];
}

export function mergeMilestones(
  persisted: Pick<RoadmapPersistedState, "userMilestones">,
): Milestone[] {
  return [...MILESTONES, ...persisted.userMilestones];
}

/** Default new-segment the "Add step" affordance appends (R7 chain-in-after-last). */
export function nextSegment(task: TaskDef): PathSegment {
  const last = task.path[task.path.length - 1];
  const stepKey = `step-${Date.now().toString(36)}`;
  return {
    stage: last?.stage ?? "planning",
    assignee: last?.assignee ?? Object.keys(PEOPLE)[0],
    reviewer: last?.reviewer ?? null,
    stakeholders: last?.stakeholders ?? [],
    steps: [[stepKey, 1]],
  };
}

export function buildContext(persisted: RoadmapPersistedState): ScheduleContext {
  const tasks = mergeTasks(persisted);
  const milestones = mergeMilestones(persisted);
  const { steps, stepByUid, taskUnits } = buildUnits(tasks, STEP_NAMES);
  const taskById: Record<string, TaskDef> = Object.fromEntries(
    tasks.map((t) => [t.id, t]),
  );
  const links: Link[] = persisted.baseLinks;
  const sprints: Sprint[] = persisted.baseSprints;

  return {
    tasks,
    steps,
    stepByUid,
    taskUnits,
    taskById,
    links,
    sprints,
    milestones,
    stages: STAGES,
    stageById: STAGE_BY_ID,
    capacity: CAPACITY,
    people: PEOPLE,
    t0: T0,
    days: DAYS,
    baseStarts: persisted.baseStarts,
    baseDurations: persisted.baseDurations,
    basePeople: persisted.basePeople,
  };
}

export const DEFAULT_BASE_LINKS = BASE_LINKS;
export const DEFAULT_BASE_SPRINTS = BASE_SPRINTS;
