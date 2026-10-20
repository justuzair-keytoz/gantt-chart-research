# v1 changelog

Tracks what's actually been built against this version's spec ([`spec.md`](./spec.md)), and what changed from what existed before. One entry per meaningful build session, newest first. This is a feature/decision-level log — see [`../../../../app/CHANGELOG.md`](../../../../app/CHANGELOG.md) for the app package's own release notes.

The two entries below predate the ticket breakdown and were written retroactively, covering work already done before this convention existed. Starting with the ticket breakdown under [`./tickets/`](./tickets/), every new entry names the ticket(s) it closes — see [`AGENTS.md`](../../../../AGENTS.md) for the rule.

## 2026-10-20 — Ticket 01 closed: milestones get their own row

**Closes:** [`tickets/01-milestone-own-row.md`](./tickets/01-milestone-own-row.md)

**Implemented:**
- `layout.ts`'s `buildRows()` now appends one row per milestone, grouped below the sprint-grouped rows and sorted by due date ascending, with a new `"milestone"` row kind.
- `Milestone.tsx`'s diamond now positions against that row's own Y coordinate (`rowY` prop) instead of a shared header band.

**Removed:**
- The two-band header-lane rendering (`MILESTONE_BAND_Y`, `milestoneBands()`) decided against in `spec.md`'s "Correction, major" note — fully deleted, not left dead alongside the new approach.

Verified: gating connectors still follow a dragged task's bar, Expand All/Collapse All still works with milestone rows present, `npm run build` passes with zero TypeScript errors (independently reproduced, not just taken from the implementer's report).

## 2026-10-20 — milestone overlap + schema field alignment fix

**Fixed:**
- Milestone labels overlapped once more than two milestones existed on the chart — all were drawn at one fixed header position. First fix staggered them into two bands; that approach is itself superseded by the row-based correction below.
- Two fields (`gates`, Milestone's `date`) carried over the vanilla prototype's internal shorthand instead of the real Strapi schema's actual field names (`milestone`, `dueDate`). Renamed throughout the engine, mock data, and store.

**Decided, not yet built:** milestones need their own row in the chart — one per milestone, below the sprint-grouped rows — instead of sharing a cramped header lane. See `spec.md`'s "Correction, major" note. Documented, not yet implemented in code.

## 2026-10-19 — v0 scaffold (initial port)

**Implemented** (see `spec.md` for the decision each one maps to):
- Task → Stage → Step work model; steps added on demand via an "Add" menu, not auto-generated from a template.
- Scenario engine: create/switch/compare scenarios, live recompute on every edit, atomic per-action undo, commit with a required reason.
- Risk engine: four severity tiers (critical / warning / expired / informational), including the weekend-landing flag (fires only on a step that's `moved` and whose start or end lands on a non-working day).
- Sticky, collapsible row tree (sprints → tasks → steps), built with native CSS, no ag-grid dependency.
- Minimal task creation (name only, via the same "Add" menu), saved to local storage, layered over the fixed mock data rather than mutating it.
- Named "Blocked by" / "Blocking" relationship fields on steps, and one-directional task-gates-milestone relationship.
- Commit confirmation that warns before discarding an uncommitted sibling scenario.

**Carried over as known gaps, not silently dropped:**
- Dependency-link drawing uses a hand-rolled SVG line as a stand-in. Committed direction is to replace it with `reactflow` — see [`app-dependencies-and-config.md`](./app-dependencies-and-config.md).
- Reassignment (moving a step to a different person) only works through a dropdown, not a drag gesture (`react-dnd`) — a deliberate choice for now, not an oversight.
