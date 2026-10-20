// v1 dataset, loaded from ./seed.v1.json (see that file's _note for the
// seeding design intent). Supersedes the inline-literal v0 dataset, archived
// at ./v0.json for reference (not imported). Re-exports the same typed
// constants (BASE_SPRINTS, MILESTONES, BASE_TASKS, BASE_LINKS) the rest of
// the app already consumes, per docs/gantt-chart/04-data-shape-mapping.md's
// field names — only the source of the data changed, not its shape.

import type { Link, Milestone, PathSegment, Sprint, StageId, TaskDef } from "@/lib/engine/types";
import seed from "./seed.v1.json";

interface SeedPathSegment {
  stage: string;
  assignee: string;
  reviewer: string | null;
  stakeholders: string[];
  steps: (string | number)[][];
}

interface SeedTask {
  id: string;
  name: string;
  startDate: string;
  milestone: string | null;
  path: SeedPathSegment[];
}

export const BASE_SPRINTS: Sprint[] = seed.sprints as Sprint[];

export const MILESTONES: Milestone[] = seed.milestones as Milestone[];

export const BASE_TASKS: TaskDef[] = (seed.tasks as SeedTask[]).map((t) => ({
  id: t.id,
  name: t.name,
  startDate: t.startDate,
  milestone: t.milestone,
  path: t.path.map(
    (seg): PathSegment => ({
      stage: seg.stage as StageId,
      assignee: seg.assignee,
      reviewer: seg.reviewer,
      stakeholders: seg.stakeholders,
      steps: seg.steps.map(([key, days]) => [key as string, days as number]),
    }),
  ),
}));

// Cross-task links are between steps (from unit uid -> to unit uid).
export const BASE_LINKS: Link[] = (seed.links as [string, string][]).map(([from, to]) => ({ from, to }));
