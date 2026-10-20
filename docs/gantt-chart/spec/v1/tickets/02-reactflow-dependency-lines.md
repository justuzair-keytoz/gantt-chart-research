# 02: Replace hand-rolled link-drawing with reactflow

**What to build:** Dependency lines — step↔step, task↔task, task↔sprint/milestone, per the spec's one-gesture-at-every-level decision — draw and support drag-to-connect via `reactflow`, replacing the hand-rolled SVG elbow router currently in `app/src/components/FlatGantt/layout.ts` (`linkPath()`, marked with a `// TODO: replace with reactflow` comment pointing at this exact work).

Quoting the spec and dependency doc directly so this ticket can't drift from the decision already made:

> `reactflow` [...] Already used in a real feature (`WorkflowDesigner` [...]). This is proven, working prior art in this exact codebase for "draw a connecting line between two things by dragging," which is exactly our dependency-link requirement (step↔step, task↔task, task↔sprint/milestone). **Committed, not a toss-up**: the v0 build tried wiring it in and found it genuinely awkward — reactflow wants to own node positioning itself, and our lines need to follow bars that live on a date-driven grid, not wherever reactflow would place them — so v0 shipped with a small hand-rolled SVG line-drawing function instead, as an explicitly temporary stand-in. The decision is to push through that integration difficulty anyway, specifically because the alternative is maintaining a second, bespoke line-drawing system indefinitely instead of one shared, already-proven library.
> — `app-dependencies-and-config.md`

> Drag-to-link is one interaction, available at every level of the gating hierarchy, not a step-only mechanism. [...] drag from one row's edge to another, whether both ends are steps, both are tasks, or one end is a task and the other a sprint or milestone.
> — `spec.md`

No new research is pending on this — the library choice, the reason for it, and the known difficulty are already documented. This ticket is the actual integration work, not a research spike.

**Blocked by:** [01 — Milestones get their own row](./01-milestone-own-row.md). Not a research dependency — a sequencing one: milestone connector lines are the same kind of line reactflow needs to own, and milestone positions are changing in ticket 01. Building the reactflow integration against positions that are about to move would mean redoing the positioning work twice.

**Status:** ready-for-agent

- [ ] Dependency lines between two steps draw via `reactflow`, positioned against this app's own date-driven bar coordinates (not wherever reactflow's own layout would place them).
- [ ] The same mechanism draws task↔task links and task↔milestone/sprint connector lines (including the milestone diamonds from ticket 01) — one gesture, not three separate implementations.
- [ ] Creating a new link by dragging from one bar's edge to another still works, matching the existing drag-to-connect gesture's behavior (cycle prevention via `wouldCycle` still applies; a link that would create a cycle is still refused with a reason).
- [ ] Removing a link (currently: click the line) still works.
- [ ] The `// TODO: replace with reactflow` comment and the hand-rolled `linkPath()` function are removed once reactflow is doing the job — not left behind as dead code.
- [ ] Scrolling, zooming, and panning the chart don't desync the lines from the bars they connect (this is the specific failure mode the spec flagged as the integration risk — verify it directly, don't assume it away).
- [ ] `npm run build` passes with zero TypeScript errors.
