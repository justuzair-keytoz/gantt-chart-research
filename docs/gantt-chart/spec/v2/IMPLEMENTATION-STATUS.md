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

## Next frontier

[Ticket 02](./tickets/02-visible-endpoints-and-dependency-explanation.md) is ready and blocked only by the completed ticket 01. It has two separate but related outcomes:

1. Fix `resolveVisibleRow()` for arbitrary-depth nested tasks. Today it can fall back from a hidden nested child directly to the sprint row instead of the nearest visible task ancestor.
2. Add the selected-task “Blocked by” / “Blocks” explanation. Grouped collapsed paths must stay non-removable because they may represent several hidden links.

Do not reopen React Flow for ticket 02: its geometry/cache ownership conflicts with this timeline's date grid, native scroll, collapse projection, and live drag repaint. The supporting research and reversal are recorded in [`../../wayfinding/reactflow-rendering-boundary/`](../../wayfinding/reactflow-rendering-boundary/map.md) and `spec.md`.

## Deliberate limits, not regressions

- Dependencies are step-level in the scheduling engine. Plain task roll-up bars, sprint rows, and milestones do not offer direct-link targets; adding group-level semantics needs its own rule/design work.
- Rolled-up bars on collapsed parents, sprint commitment versus current position/spill, rule-driven blocking, contacts, and schedule-change reasons remain unimplemented. Their unresolved design work stays in [`todo.md`](./todo.md).
- `collapsibleDescendantIds()` has a defensive 64-iteration cap. That is a separate arbitrary-depth limitation to address when working on the nested-tree slice.

## Where to read next

- Intent and reversals: [`spec.md`](./spec.md)
- What actually changed: [`CHANGELOG.md`](./CHANGELOG.md)
- Ticket graph: [`tickets/`](./tickets/)
- Renderer research: [`../../wayfinding/reactflow-rendering-boundary/`](../../wayfinding/reactflow-rendering-boundary/map.md)
- Shared terms: [`../../../../GLOSSARY.md`](../../../../GLOSSARY.md)
