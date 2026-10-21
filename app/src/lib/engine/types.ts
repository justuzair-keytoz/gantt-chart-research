// Field names here follow docs/gantt-chart/04-data-shape-mapping.md:
// who -> assignee, rev -> reviewer, stk -> stakeholders, dur/days -> durationDays.

export type StageId = "planning" | "design" | "development" | "marketing";

export interface Stage {
  id: StageId;
  label: string;
  color: string;
}

/** One leg of a task's stage path, authored in the mock data / "add step" flow. */
export interface PathSegment {
  stage: StageId;
  assignee: string;
  reviewer: string | null;
  stakeholders: string[];
  /** [stepKey, durationDays][] in order. */
  steps: [string, number][];
}

/** A Task as authored (mock data + localStorage-created tasks), pre-flattening. */
export interface TaskDef {
  id: string;
  name: string;
  /** Bootstrap start date for the task's first step (ISO yyyy-mm-dd). */
  startDate: string;
  /**
   * Milestone id this task gates, or null. Named to match the real Strapi
   * Task schema's `milestone` relation (manyToOne) — see
   * docs/gantt-chart/04-data-shape-mapping.md.
   */
  milestone: string | null;
  path: PathSegment[];
  /**
   * Plain-bar fallback dates, used only while path has zero steps (a task
   * created via "Add Task" before any step is added). Once a step exists the
   * task's rolled-up start/end is derived from its steps instead.
   */
  dueDate?: string;
  /**
   * Parent task id, or null/absent for a root task (v2 nesting-to-any-depth
   * decision, see docs/gantt-chart/spec/v2/spec.md's "The generic tree uses
   * parentTask/subtasks" section). Named `parentTaskId` rather than the real
   * Strapi schema's `parentTask` because this mock engine stores relations
   * as plain id references everywhere else too (e.g. `milestone` above is a
   * ` string | null` id, not a `Milestone` object) — same convention, not a
   * new one. A child task is a full TaskDef in its own right: it can carry
   * its own `path`/`milestone`/`dueDate`, and can itself be a parent.
   */
  parentTaskId?: string | null;
}

/** A flattened, schedulable Step (the engine's actual unit). */
export interface Step {
  uid: string;
  taskId: string;
  stage: StageId;
  stepKey: string;
  name: string;
  durationDays: number;
  assignee: string;
  reviewer: string | null;
  stakeholders: string[];
  /** True for review/QA steps, which are worked BY the reviewer. */
  review: boolean;
  prevUid: string | null;
}

export interface Sprint {
  id: string;
  name: string;
  start: string;
  end: string;
  /** Populated by computeSchedule; absent on the raw/base sprint list. */
  load?: number;
  over?: boolean;
}

export interface Milestone {
  id: string;
  name: string;
  /** Matches the real Strapi Milestone schema's `dueDate` field name. */
  dueDate: string;
  color: string;
}

export interface Link {
  from: string;
  to: string;
}

export interface PersonOut {
  who: string;
  from: string;
  to: string;
  label: string;
}

export type RiskSeverity = "critical" | "warning" | "expired" | "info";

export interface Risk {
  sev: RiskSeverity;
  rule: string;
  msg: string;
}

export interface StepSchedule {
  start: Date;
  end: Date;
  durationDays: number;
  pushedBy: string | null;
  outHit: PersonOut | null;
  done: boolean;
  slip: number;
  moved: boolean;
  sprint: string | null;
  spill: boolean;
  spillFrom: string | null;
  spillTo: string;
  risks: Risk[];
}

export interface TaskRollup {
  start: Date;
  end: Date;
  moved: boolean;
  slip: number;
}

export interface PersonOverride {
  assignee?: string;
  reviewer?: string | null;
  stakeholders?: string[];
}

export interface Overlay {
  starts: Record<string, string>;
  durations: Record<string, number>;
  addLinks: Link[];
  rmLinks: Link[];
  out: PersonOut[];
  /** sprint id -> new end date (ISO) */
  bounds: Record<string, string>;
  people: Record<string, PersonOverride>;
  notes: Record<string, string>;
  changes: string[];
}

export interface Scenario {
  id: string;
  name: string;
  locked: boolean;
  ov: Overlay;
  /** Snapshot stack for atomic, per-action undo (cascades included). */
  history: Overlay[];
}

export interface WorkloadCell {
  sprint: string;
  avail: number;
  load: number;
  util: number;
  over: number;
  idle: number;
}

export interface WorkloadRow {
  p: string;
  name: string;
  cells: WorkloadCell[];
}

export interface Gap {
  task: string;
  fromUid: string;
  toUid: string;
  days: number;
  why: string;
}

export interface WorkloadResult {
  table: WorkloadRow[];
  gaps: Gap[];
}

export interface ScheduleSummary {
  moved: number;
  movedTasks: number;
  overCells: number;
  idleDays: number;
  gapDays: number;
  maxSlip: number;
  spills: number;
  critical: number;
  expired: number;
  warning: number;
  info: number;
  overSprints: string[];
  notify: Record<string, string[]>;
}

export interface ScheduleResult {
  units: Record<string, StepSchedule>;
  tasks: Record<string, TaskRollup>;
  sprints: Sprint[];
  deps: Record<string, Set<string>>;
  risks: Risk[];
  summary: ScheduleSummary;
  wl: WorkloadResult;
}

export interface DecisionRecordEntry {
  n: number;
  title: string;
  why: string;
  when: string;
}
