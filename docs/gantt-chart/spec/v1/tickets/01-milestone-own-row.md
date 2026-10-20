# 01: Milestones get their own row

**What to build:** Each milestone renders as its own row in the chart's row tree — grouped below the sprint-grouped rows, one milestone per row, sorted by due date — rendered as a zero-width diamond positioned at its due date, with its name always visible next to it, not hover-only. This replaces the two-band header-lane rendering currently in `app/src/components/FlatGantt/Milestone.tsx` and `layout.ts`.

Quoting the spec directly (`spec.md`, "Correction, major" note) so this ticket can't drift from it:

> A milestone gets its own row in the chart's row list — a fixed-position bar at its due date — not a marker pinned into the axis header. [...] Airtable's own milestone rendering [...] does something structurally different and better: a milestone sits in its own row in the record list, same as any task, with its diamond simply drawn where its due date falls on the X axis of that row, and its name printed right next to the diamond — "pinned" to it, not a hover-only label. [...] each milestone becomes its own row [...] positioned, per Airtable's own layout, as its own group below the sprint-grouped rows, one milestone per row, sorted by due date [...] rendered as a zero-width diamond rather than a dated bar (it doesn't have a duration, it has a due date), with its name always visible next to it in that row. The dashed connectors from each gating task to the milestone's diamond work exactly as already decided — nothing about the "gates" relationship or the connector-drawing logic changes, only where the diamond itself lives on the chart.

Nothing about the gating relationship, the connector-drawing logic, or the risk rollup changes — only where the diamond sits.

**Blocked by:** None (can start immediately). The decision is already locked in `spec.md`; no research or open question remains.

**Status:** ready-for-agent

- [ ] A milestone row appears in the row tree below the sprint-grouped rows, one row per milestone, sorted by due date ascending.
- [ ] The milestone's diamond renders at its due date's X position within its own row, using the milestone's own stored `color` field (per `data-shape-mapping.md`, not a fixed palette value).
- [ ] The milestone's name is always visible next to the diamond — no hover or click required to see it.
- [ ] Adding a third (or more) milestone close in date to another no longer produces any visual overlap — this was the original bug (`CHANGELOG.md`, 2026-10-20 entry) and is the thing this ticket is verified against.
- [ ] Dashed connector lines from each gating task to the milestone's diamond still render correctly, following the task's current bar position (confirm by dragging a gating task and checking the connector follows).
- [ ] Expand All / Collapse All still behaves correctly with the milestone rows present.
- [ ] `MILESTONE_BAND_Y` / `milestoneBands()` band-staggering logic (the superseded fix) is removed, not left dead in the codebase alongside the new approach.
- [ ] `npm run build` passes with zero TypeScript errors.
