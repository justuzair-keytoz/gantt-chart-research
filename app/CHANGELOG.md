# Changelog

## v0.2.0 — v2 spec work, first slice

Implements the first clear-to-build slice of `docs/gantt-chart/spec/v2/` — see that folder's own `CHANGELOG.md` for the full build-by-build detail this entry summarizes. Scope: resize-grip/connect-handle overlap, connection-dot drift during drag, link-type/clash visual clarity, and frozen-drag explanation text (four pre-existing gaps, fixed); pinch/ctrl-wheel zoom re-ported from `../prototype/`; sprint calendar bands (additive, sprint rows unchanged); a red hatch-fill for the past-hard-deadline risk state; and arbitrary-depth task nesting via a `parentTaskId` field, confirmed to map onto the real schema's `parentTask`/`subtasks` relation.

Known, still-open gap carried into the next round, not resolved by this version: dependency/milestone connector lines can still terminate at the wrong row or leave dangling fragments when a nested task's ancestor chain is collapsed — see `spec/v2/todo.md`.

## v0.1.0 — initial port (v0)

First working port of the Gantt/roadmap-simulation prototype out of vanilla JS (`../prototype/`) into TypeScript, React, Next.js, Mantine, Tailwind, and Zustand — matching the exact package versions already used in `databonder-enterprise-search`. See `docs/gantt-chart/spec/v1/` for the full spec this implements.

Scope: the scheduling engine, scenario model (create/compare/commit/undo), risk severity tiers, the sticky collapsible sidebar, milestone rendering as its own row, and on-demand task/step creation — all on fake data, no backend wiring.

Known gaps carried forward from the port, not yet resolved:
- Dependency-link drawing uses a hand-rolled SVG elbow router as a stand-in; the committed plan is to replace it with `reactflow` (already used elsewhere in `databonder` for the same kind of interaction) — see `spec/v1/app-dependencies-and-config.md`.
- Reassignment (dropping a step onto a different person) only works through the Step Editor's dropdown, not a drag gesture.
