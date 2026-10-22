---
labels:
  - wayfinder:map
status: complete
---

# React Flow rendering boundary

## Destination

Decide whether the v2 spike should keep React Flow as a narrow dependency-interaction layer or replace it with native SVG dependency rendering. The answer must make the Gantt easier to reason about and robust under nesting, collapse, drag, zoom, and future production wiring; production adoption is explicitly not assumed.

## Notes

- This is a research-spike decision map, not an implementation plan.
- Consult the local competitor evidence, React Flow's official documentation/source, the `research`, `grilling`, `domain-modeling`, `design`, and Ponytail practices.
- The Gantt's authoritative schedule and row geometry already live in `schedule.ts` and `layout.ts`; do not presume a replacement must rewrite them.
- Direct drag-to-connect remains in scope, per the project owner.

## Decisions so far

- [Dependency interaction evidence](tickets/dependency-interaction-evidence.md) — retain direct connect with a named editor, neutral arrowed paths, computed conflict states, and a selected-item explanation; resolve collapsed endpoints in the row tree.
- [React Flow capability and ownership research](tickets/reactflow-capabilities-research.md) — React Flow is sound when it owns node geometry, but the current SVG overlay duplicates that geometry; retain the Gantt's owners and replace the overlay with native SVG paths and gestures.
- [Professional Gantt rendering architecture](tickets/professional-gantt-architecture-research.md) — public DHTMLX, Frappe, and Bryntum evidence supports one timeline coordinate owner rather than a graph overlay.
- [Rendering boundary decision](tickets/rendering-boundary-decision.md) — replace the Gantt-specific React Flow overlay with native SVG paths and pointer-captured direct linking; preserve the scheduling and layout owners.

## Not yet specified

- The exact production integration target inside `databonder-enterprise-search` and its browser/performance envelope.
- Whether the eventual production UI needs automatic obstacle avoidance beyond the current elbow paths.
- The reason/contact data-model decisions; they are adjacent UI work, not prerequisites for the rendering-boundary decision.

## Out of scope

- Rewriting the scheduling engine, persistence model, or backend integration.
- Selecting a production rollout date for the spike.
