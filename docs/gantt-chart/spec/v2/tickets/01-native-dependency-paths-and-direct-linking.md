# 01: Native dependency paths and direct linking

**What to build:** The Gantt itself owns dependency rendering and direct linking between scheduler-supported step bars. A focused step bar exposes a quiet connection affordance; dragging it to another valid visible step creates a dependency through the existing scheduling validation. Dependency and milestone paths remain attached while a task moves, resizes, zooms, scrolls, or collapses, without a second graph scene mirroring the Gantt.

**Blocked by:** None (can start immediately).

**Status:** complete

- [x] Normal dependencies and milestone connectors render in the Gantt SVG and remain aligned through drag, resize, zoom, and scroll.
- [x] A user can create a valid dependency by dragging from a visible source bar to a visible target bar; a rejected dependency leaves the plan unchanged and uses the existing reason feedback.
- [x] A user can remove an unambiguous normal dependency from its line; grouped or milestone connectors remain non-removable.
- [x] The React Flow overlay, its imperative DOM synchronization, and its standalone dependency are removed from this prototype without replacing them with another package.
- [x] `npm run build` passes with zero TypeScript errors.

**Verification and known limit:** Build, dependency removal, and a post-fix interaction critique were checked on 2026-10-22; the final pointer gesture was not observed in a live browser. Direct links intentionally remain step-level because `effectiveDeps()` only schedules step UIDs; plain task roll-ups, sprint rows, and milestones are not treated as valid targets.
