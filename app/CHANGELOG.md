# Changelog

## v0.1.0 — initial port (v0)

First working port of the Gantt/roadmap-simulation prototype out of vanilla JS (`../prototype/`) into TypeScript, React, Next.js, Mantine, Tailwind, and Zustand — matching the exact package versions already used in `databonder-enterprise-search`. See `docs/gantt-chart/spec/v1/` for the full spec this implements.

Scope: the scheduling engine, scenario model (create/compare/commit/undo), risk severity tiers, the sticky collapsible sidebar, milestone rendering as its own row, and on-demand task/step creation — all on fake data, no backend wiring.

Known gaps carried forward from the port, not yet resolved:
- Dependency-link drawing uses a hand-rolled SVG elbow router as a stand-in; the committed plan is to replace it with `reactflow` (already used elsewhere in `databonder` for the same kind of interaction) — see `spec/v1/app-dependencies-and-config.md`.
- Reassignment (dropping a step onto a different person) only works through the Step Editor's dropdown, not a drag gesture.
