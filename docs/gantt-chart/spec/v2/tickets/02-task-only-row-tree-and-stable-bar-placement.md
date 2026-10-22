# 02: Task-only row tree and stable bar placement

**What to build:** The left side of the Gantt shows work hierarchy only: root task → nested task → step. Sprints remain highlighted calendar bands in the timeline, not rows that own or regroup work. Moving or resizing a bar across a sprint boundary changes only its dates; it must never move the work to a different vertical row or create a duplicate row.

**Blocked by:** [01 — Native dependency paths and direct linking](./01-native-dependency-paths-and-direct-linking.md).

**Status:** complete

- [x] Every root task appears exactly once; children appear only beneath their parent; no sprint or unscheduled row is rendered in the left tree.
- [x] A drag or resize that crosses a sprint band leaves the bar in the same hierarchy row while the existing calendar band remains visible behind it.
- [x] Milestone rows remain visible in chronological order without reintroducing sprint buckets.
- [x] Persisted expansion state is safely migrated from obsolete sprint-prefixed row ids to the task-only tree without changing task, schedule, link, milestone, or scenario data.
- [x] Dependency endpoints still resolve for visible rows; the arbitrary-depth collapsed-endpoint correction is deferred to ticket 03.
- [x] `npm test` and `npm run build` pass with zero TypeScript errors.
