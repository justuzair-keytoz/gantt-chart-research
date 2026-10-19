import { parseISO, diffDays } from "@/lib/engine/date-utils";
import type { Stage, StageId } from "@/lib/engine/types";

export const T0 = parseISO("2026-10-01");
export const T1 = parseISO("2026-12-04");
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
