# v1 changelog

Tracks what's actually been built against this version's spec ([`spec.md`](./spec.md)), and what changed from what existed before. One entry per meaningful build session, newest first. This is a feature/decision-level log — see [`../../../../app/CHANGELOG.md`](../../../../app/CHANGELOG.md) for the app package's own release notes.

The two entries below predate the ticket breakdown and were written retroactively, covering work already done before this convention existed. Starting with the ticket breakdown under [`./tickets/`](./tickets/), every new entry names the ticket(s) it closes — see [`AGENTS.md`](../../../../AGENTS.md) for the rule.

## 2026-10-20 — Ticket 02 closed: dependency lines via reactflow

**Closes:** [`tickets/02-reactflow-dependency-lines.md`](./tickets/02-reactflow-dependency-lines.md)

**Implemented:**
- New `FlatGantt/DependencyEdges.tsx`: a `reactflow`-backed layer (`DependencyEdgesLayer`) that is now the single shared mechanism for step↔step, task↔task, and task→milestone connector lines. Pan/zoom/node-drag/selection are disabled — reactflow's viewport is pinned at `{0,0,zoom:1}`, and the chart's only scroll path remains the existing native `overflow: auto` container, so the two coordinate spaces never drift apart.
- Each bar/milestone gets an invisible 1×1 anchor node purely so reactflow has a valid id to resolve an edge against; the real bar/diamond visuals keep rendering unchanged in `FlatGantt.tsx`'s own SVG. Each edge carries its own `BarPos`-derived endpoints in `data`, recomputed every render from the same `rowByUid`/`sched` state that positions the bars — not from reactflow's own layout.
- `useBarDrag.ts`'s existing imperative 60fps `paintFrame` (no React re-render during drag) now also patches reactflow's edge `<path>` elements via the same `[data-link]` convention, extended to cover milestone connector edges too.

**Removed:**
- `layout.ts`'s hand-rolled `linkPath()` elbow router and its `// TODO: replace with reactflow` comment — fully deleted, logic ported into `DependencyEdges.tsx`'s `elbowPath()`/`straightPath()`.
- `Milestone.tsx`'s inline gating-connector line rendering (`gatingBarPositions` prop) — that line-drawing now happens through the shared reactflow mechanism; the diamond shape, guide line, and label are unchanged.

**Scope note:** the existing click-based `linkMode`/`linkFrom`/`handleLinkClick` link-creation gesture (store-driven, with `wouldCycle` cycle prevention) was preserved as-is — no new mouse-drag-to-connect gesture was introduced, since the v0 app never had one despite the spec's "drag-to-link" phrasing; this ticket's scope was line-drawing/routing only.

Verified: `npm run build` passes with zero TypeScript errors (independently reproduced). Scroll/pan desync was verified by reading the render tree (no independent transform on either layer); zoom is not a feature of this app, so that specific failure mode is not applicable.

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
