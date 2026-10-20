import { addMonths, diffDays } from "@/lib/engine/date-utils";
import type { Stage, StageId } from "@/lib/engine/types";

// Chart window is real-today biased forward — a roadmap/planning tool's
// focus is upcoming work, not a long look back, per explicit owner feedback
// ("the chart's focus should be on today... not on the -3 months from
// today"). A symmetric ±3-month window spent half its space on the past;
// this keeps a short lookback (1 month, for recently-finished context) and a
// longer forward window (5 months, where the actual planning happens).
// FlatGantt.tsx also scrolls the chart so "today" sits near the left edge on
// load, instead of leaving the viewport at its default scroll-left-0
// position (which would show the oldest, least relevant date first).
// Computed once at module load. Known trade-off for a fixed-date mock
// dataset: once "today" drifts far enough from Oct/Nov 2026, this window
// stops covering the seeded tasks — acceptable for an exploratory spike,
// called out here rather than silently discovered later.
export const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);
export const T0 = addMonths(TODAY, -1);
export const T1 = addMonths(TODAY, 5);
export const DAYS = diffDays(T1, T0) + 1;
export const CAPACITY = 40;

export const STAGES: Stage[] = [
  { id: "planning", label: "Planning", color: "#4f46e5" },
  { id: "design", label: "Design", color: "#0e7490" },
  { id: "development", label: "Development", color: "#475569" },
  { id: "marketing", label: "Marketing & lender comms", color: "#7c3aed" },
];
export const STAGE_BY_ID: Record<StageId, Stage> = Object.fromEntries(
  STAGES.map((s) => [s.id, s]),
) as Record<StageId, Stage>;

export const STEP_NAMES: Record<string, string> = {
  scope: "Scope",
  review: "Review",
  design: "Design",
  copy: "Copywriting",
  docs: "Documentation",
  build: "Build",
  qa: "QA",
  release: "Release",
  draft: "Draft",
  send: "Send",
};

export const PEOPLE: Record<string, string> = {
  ana: "Ana",
  moiz: "Moiz",
  ravi: "Ravi",
  sam: "Sam",
  lee: "Lee",
  priya: "Priya",
};

export const OUT_PRESETS: Record<
  string,
  { who: string; from: string; to: string; label: string }
> = {
  outRavi: {
    who: "ravi",
    from: "2026-10-20",
    to: "2026-10-24",
    label: "Ravi out 20–24 Oct",
  },
  outAna: {
    who: "ana",
    from: "2026-11-03",
    to: "2026-11-07",
    label: "Ana out 3–7 Nov",
  },
  outSam: {
    who: "sam",
    from: "2026-10-27",
    to: "2026-10-31",
    label: "Sam (reviewer) out 27–31 Oct",
  },
};
