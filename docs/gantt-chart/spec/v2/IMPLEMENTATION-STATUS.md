# v2 implementation status

Last reconciled: 2026-10-22.

Use this as the handoff entry point after [`spec.md`](./spec.md). The versioned spec records intent; this file records the verified state of the prototype and the active ticket frontier.

## Completed

### 01 — Native dependency paths and direct linking

[Ticket 01](./tickets/01-native-dependency-paths-and-direct-linking.md) is complete. The Gantt SVG is now the one coordinate owner for bars, dependency paths, milestone connectors, and the direct-link gesture:

- `DependencyPaths.tsx` draws normal, merged, and milestone paths from the same date-grid positions used by the bars.
- `Bar.tsx` owns the source-port interaction. Every schedulable step bar keeps a 20px transparent SVG hit area mounted beyond its resize grip; its smaller ring is hover/focus feedback only. The port is pointer-captured for drag linking and keyboard-accessible through the existing source-then-target fallback.
- `FlatGantt.tsx` draws the temporary link, highlights only scheduler-supported step targets, and delegates create/remove validation to the existing store actions.
- `useBarDrag.ts` repaints the native SVG paths during a bar drag. There is no React Flow overlay or mirrored node geometry.

The standalone app no longer declares `reactflow`; this is a Gantt-only reversal, not a recommendation to remove React Flow from the destination product's Workflow Designer.

**Verified:** `npm run build`, `git diff --check`, and `npm ls reactflow --depth=0` (empty) passed on 2026-10-22. An independent critique confirmed the persistent hit target, target eligibility, cancellation handling, and keyboard fallback after the repair.

**Not verified:** no browser surface was available after the final repair. In particular, manually test normal drag-to-link, resize beside the port, pointer cancellation, keyboard source/target linking, zoom while links exist, and collapsed-row path projection before calling this production-ready.

### 02 — Task-only row tree and stable bar placement

[Ticket 02](./tickets/02-task-only-row-tree-and-stable-bar-placement.md) is complete. The left pane is now the stable Task → Subtask → Step hierarchy; it no longer renders sprint or unscheduled rows. Existing sprint bands and their labels remain timeline context in their own header strip, so dragging or resizing a bar across a band does not relocate its row.

- Root tasks render once, children only beneath their parent, and chronological milestone rows remain after the hierarchy.
- Persisted expansion paths migrate from the former `<sprint>::<task>` shape. An intentionally collapsed tree remains collapsed; a formerly opened sprint seeds the new root-task tree so work remains visible. Task, link, scenario, milestone, and schedule data are unchanged.
- `expandedRows.test.ts` covers the migration's collapsed, opened-sprint, nested, and unscheduled cases without adding a test dependency.

**Verified:** `npm test`, `npm run build`, `git diff --check`, and an independent Ponytail review passed on 2026-10-22.

**Not verified:** no live browser pass observed sprint-label alignment, drag continuity, or persisted migration in an existing browser profile.

## Next frontier

[Ticket 03](./tickets/03-visible-endpoints-and-dependency-explanation.md) is ready and blocked only by completed ticket 02. It owns the arbitrary-depth visible-endpoint correction and selected-task dependency explanation; grouped collapsed paths must remain non-removable because they may represent several hidden links.

Do not reopen React Flow for either ticket: its geometry/cache ownership conflicts with this timeline's date grid, native scroll, collapse projection, and live drag repaint. The supporting research and reversal are recorded in [`../../wayfinding/reactflow-rendering-boundary/`](../../wayfinding/reactflow-rendering-boundary/map.md) and `spec.md`.

## Deliberate limits, not regressions

- Dependencies are step-level in the scheduling engine. Plain task roll-up bars and milestones do not offer direct-link targets; adding group-level semantics needs its own rule/design work.
- Rolled-up bars on collapsed parents, sprint commitment versus current position/spill, rule-driven blocking, contacts, and schedule-change reasons remain unimplemented. Their unresolved design work stays in [`todo.md`](./todo.md).
- `collapsibleDescendantIds()` has a defensive 64-iteration cap. That is a separate arbitrary-depth limitation to address when working on the nested-tree slice.

## Where to read next

- Intent and reversals: [`spec.md`](./spec.md)
- What actually changed: [`CHANGELOG.md`](./CHANGELOG.md)
- Ticket graph: [`tickets/`](./tickets/)
- Renderer research: [`../../wayfinding/reactflow-rendering-boundary/`](../../wayfinding/reactflow-rendering-boundary/map.md)
- Shared terms: [`../../../../GLOSSARY.md`](../../../../GLOSSARY.md)
