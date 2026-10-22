# Gantt / roadmap simulation — v0 prototype, v2 in progress

This is the standalone, typed Next.js prototype: the original v0 port plus completed slices from [`v2`](../docs/gantt-chart/spec/v2/spec.md). It is not wired to real Databonder data or considered production-ready. Start with the [v2 implementation status](../docs/gantt-chart/spec/v2/IMPLEMENTATION-STATUS.md) for what is actually built, verified, and next.

## Where this came from

[`../prototype/`](../prototype/) is a self-contained vanilla HTML/CSS/JS version of the same idea, built first to prove the scheduling engine and scenario model worked before committing to a real app. This folder (`app/`) is that same logic, ported into TypeScript, React, and the exact package versions already used by the real destination app (`databonder-enterprise-search`) — see [`docs/gantt-chart/spec/v1/app-dependencies-and-config.md`](../docs/gantt-chart/spec/v1/app-dependencies-and-config.md) for exactly which packages, pinned to exactly which versions, and why.

## What it currently includes

The v1 simulation model remains: step/stage/task scheduling, scenario editing with live recompute, undo, risk tiers, the sticky collapsible sidebar, and milestone/dependency rendering. Implemented v2 slices add arbitrary-depth task nesting, per-row expand-all, sprint calendar bands, trackpad-style zoom, native SVG dependency paths, and direct step-to-step linking.

The dependency renderer is intentionally native SVG, not React Flow. It shares the Gantt's date-grid geometry and native scroll/zoom; the decision and evidence are documented in [`v2/spec.md`](../docs/gantt-chart/spec/v2/spec.md) and the [renderer research map](../docs/gantt-chart/wayfinding/reactflow-rendering-boundary/map.md).

It runs entirely on fake data in the browser — no login, real database, AI, or permissions. Unbuilt v2 work includes correct nested collapsed endpoints, dependency explanations, rolled-up parent bars, sprint commitment/spill, contacts, and schedule-change reasons.

## Running it

```
npm install
npm run dev   # http://localhost:4000 — pinned off port 3000 to avoid colliding with databonder's own dev server
```

## Picking work back up

Check [`docs/gantt-chart/spec/INDEX.md`](../docs/gantt-chart/spec/INDEX.md) for versioning. `v1` is frozen on purpose; v2 is the active iteration. Use the v2 ticket graph and implementation-status document rather than inferring progress from this README or from older changelog entries.
