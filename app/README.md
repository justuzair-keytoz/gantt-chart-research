# Gantt / roadmap simulation — v0

This is **v0** of the standalone prototype described in [`docs/gantt-chart/spec/v1/spec.md`](../docs/gantt-chart/spec/v1/spec.md). "v0" means: this is the first working port of the feature out of a raw vanilla-JS prototype into real, typed code — not yet wired to any real backend, not yet a finished build of everything `v1`'s spec describes.

## Where this came from

[`../prototype/`](../prototype/) is a self-contained vanilla HTML/CSS/JS version of the same idea, built first to prove the scheduling engine and scenario model worked before committing to a real app. This folder (`app/`) is that same logic, ported into TypeScript, React, and the exact package versions already used by the real destination app (`databonder-enterprise-search`) — see [`docs/gantt-chart/spec/v1/app-dependencies-and-config.md`](../docs/gantt-chart/spec/v1/app-dependencies-and-config.md) for exactly which packages, pinned to exactly which versions, and why.

## What "v0" does and doesn't include

Everything in `v1`'s spec that's genuinely slice-one scope: the step/stage/task model, scenario editing with live recompute, undo, commit with sibling-scenario warnings, risk severity tiers, the sticky collapsible sidebar, and milestone/dependency rendering. It runs entirely on fake data in the browser — no login, no real database, no AI, no permissions. See the spec's own "Out of Scope" and "Slicing" sections for the exact boundary.

## Running it

```
npm install
npm run dev   # http://localhost:4000 — pinned off port 3000 to avoid colliding with databonder's own dev server
```

## If you're reading this after a later version exists

Check [`docs/gantt-chart/spec/INDEX.md`](../docs/gantt-chart/spec/INDEX.md) for the versioning convention — `v1`'s spec is frozen on purpose, even after a `v2` changes things, specifically so this README and the code it describes stay readable on their own terms.
