# AGENTS.md

Rules for any agent (not just one tool's) working in this repo. Read this before touching anything, especially before committing or restructuring.

## What this repo is

Research and a prototype for a Gantt/roadmap-simulation feature that may eventually get merged into a separate, real product (`databonder-enterprise-search`, at a sibling path — not part of this repo). Nothing here is production. Start at [`docs/gantt-chart/INDEX.md`](./docs/gantt-chart/INDEX.md) for the actual content; this file is rules, not context.

## Directory map

- `docs/gantt-chart/` — research (competitor screenshots, discovery notes) and the versioned spec.
- `prototype/` — the original vanilla HTML/CSS/JS proof of concept. Frozen reference, not where new work happens.
- `app/` — the real, typed Next.js port (currently v0). See [`app/README.md`](./app/README.md).

## Rules

**Spec changes are versioned, not edited in place.** A spec folder under `docs/gantt-chart/spec/vN/` is a frozen snapshot once the next version exists. Full convention, including when to cut a new version: [`docs/gantt-chart/spec/INDEX.md`](./docs/gantt-chart/spec/INDEX.md).

**Implementation work happens as tickets, broken down from that version's `spec.md`, not ad hoc.** Use the `to-tickets` skill against `docs/gantt-chart/spec/vN/spec.md` to produce vertical-slice tickets under `docs/gantt-chart/spec/vN/tickets/` (one file per ticket, numbered in dependency order, each declaring what blocks it — see the skill for the exact template). Present the draft breakdown for approval before writing the ticket files; don't publish a breakdown nobody's reviewed.

**Every versioned spec folder keeps its own `CHANGELOG.md`.** As a ticket gets implemented, add an entry naming the ticket it closes, what it actually changed, and what existed before it that got replaced or fixed — not a vague "did some work" line. This is the thing that makes "what shipped against this version's plan" answerable without reading every commit by hand.

**A decision that gets reversed says so, in writing, where the reversal happens.** Don't silently rewrite an earlier decision to look like it was always this way. See the "Further Notes" section of [`docs/gantt-chart/spec/v1/spec.md`](./docs/gantt-chart/spec/v1/spec.md) for the pattern already in use — each reversal is named, with why.

**Dependencies get reused and pinned exactly, not added loosely.** Before adding anything to `app/`, check whether the real app (`databonder-enterprise-search`) already has it, at what version, and reuse that version exactly. If something is genuinely new, document it with why. Full policy and the exact pinned versions: [`docs/gantt-chart/spec/v1/app-dependencies-and-config.md`](./docs/gantt-chart/spec/v1/app-dependencies-and-config.md).

**Prefer a proven library already in the real app over adding a new one, even when the proven one is harder to integrate.** This repo has one concrete precedent for choosing to push through a harder integration rather than keep a simpler hand-rolled workaround — see the `reactflow` decision in the file above. Don't quietly reverse that kind of call without writing down why.

**Competitor/research claims cite the exact evidence, not a general impression.** A screenshot-backed claim names the file; an unverified claim says so explicitly. See [`docs/gantt-chart/competitors/INDEX.md`](./docs/gantt-chart/competitors/INDEX.md) — several claims in this repo's own history turned out to cite the wrong screenshot and had to be corrected after the fact. Verify before citing, the same way.

**`databonder-enterprise-search` is read-only reference material from here.** Read it for schema, package versions, and existing patterns. Never edit it from this repo.

**Don't trust a "done" report at face value, including your own subagent's.** Rebuild, re-grep, or re-read the actual result before treating something as verified — this has caught real mistakes in this repo already (wrong field names, a layout bug that only showed up once someone actually looked at the running app).

**Commits follow [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/), single-line subject, no body unless asked for one.** One logical concern per commit — split rather than combine. Never commit without being explicitly told to.
