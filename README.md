# Gantt chart research

Research and a prototype for a Gantt/roadmap-simulation feature that may eventually get merged into a separate, real product (`databonder-enterprise-search`, at a sibling path — not part of this repo). Nothing in this repo is production. For the rules agents and contributors are expected to follow here, see [`AGENTS.md`](./AGENTS.md); this file is orientation, not rules.

## Directory map

| Path | What it is |
| --- | --- |
| [`docs/gantt-chart/`](./docs/gantt-chart/INDEX.md) | All research and spec documentation — start at its `INDEX.md`, not here. |
| [`prototype/`](./prototype/) | The original vanilla HTML/CSS/JS proof of concept. Frozen reference, not where new work happens. |
| [`app/`](./app/) | The real, typed Next.js port (currently `v0`). Where active development happens. |
| `Planning Board and Roadmap Simulation.md` | The original CTO requirements doc this whole effort was synthesized from. |

## Running the prototype

`prototype/` is plain static HTML/CSS/JS with no build step and no dependencies. Open `prototype/index.html` directly in a browser, or serve the folder with any static file server if you'd rather not use `file://` URLs:

```
npx serve prototype
```

## Running the Next.js app

`app/` is a real Next.js + TypeScript app, pinned to the same dependency versions as the real destination app (`databonder-enterprise-search`) — see [`docs/gantt-chart/spec/v1/app-dependencies-and-config.md`](./docs/gantt-chart/spec/v1/app-dependencies-and-config.md) for exactly which packages and why.

```
cd app
npm install
npm run dev   # http://localhost:4000 — pinned off port 3000 to avoid colliding with databonder's own dev server
```

See [`app/README.md`](./app/README.md) for what this version does and doesn't include, and [`app/CHANGELOG.md`](./app/CHANGELOG.md) for the app package's own release notes.

## How the docs are structured

Everything starts at [`docs/gantt-chart/INDEX.md`](./docs/gantt-chart/INDEX.md). Broadly:

- **Research** (`00-discovery-and-scoping.md`, `01-feature-plan.md`, `competitors/`) — one-time investigation that informs every iteration. Not versioned; updated in place, with corrections noted inline where they've happened.
- **Spec** (`spec/`) — versioned by iteration. Each `spec/vN/` folder is a frozen snapshot of what that iteration actually decided — `v1/` keeps reading the way it did when it was live, even after a `v2` exists and changes something. See [`spec/INDEX.md`](./docs/gantt-chart/spec/INDEX.md) for the exact convention, including how a reversed decision gets written down (named, in the new version) instead of silently edited into the old one.
- Inside a version folder (e.g. [`spec/v1/`](./docs/gantt-chart/spec/v1/)): `spec.md` (the decisions), `CHANGELOG.md` (build-session-by-build-session changes against that version's own prior state), `what-changed.md` (the same work compared against the original prototype's actual behavior, formatted for sharing outside the team), `app-dependencies-and-config.md`, `data-shape-mapping.md`, and `tickets/` (the vertical-slice implementation tickets broken down from `spec.md`).

## Rules for working in this repo

See [`AGENTS.md`](./AGENTS.md) — versioning conventions, the ticket-based implementation workflow, commit conventions, and the standing guardrails for any agent (human or not) touching this repo.
