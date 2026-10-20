# v1 changelog

Tracks what's actually been built against this version's spec ([`spec.md`](./spec.md)), and what changed from what existed before. One entry per meaningful build session, newest first. This is a feature/decision-level log — see [`../../../../app/CHANGELOG.md`](../../../../app/CHANGELOG.md) for the app package's own release notes.

The two entries below predate the ticket breakdown and were written retroactively, covering work already done before this convention existed. Starting with the ticket breakdown under [`./tickets/`](./tickets/), every new entry names the ticket(s) it closes — see [`AGENTS.md`](../../../../AGENTS.md) for the rule.

## 2026-10-20 — post-ticket polish, round 11: chart window re-centered on today, not split ±3 months around it

**Changed:** `app/src/lib/mock-data/constants.ts`'s chart window is no longer symmetric around today — `today - 1 month` to `today + 5 months`, instead of `today - 3 months` to `today + 3 months`. Per explicit owner feedback: "the chart's focus should be on the gantt view based on today or as of today, not on the -3 months from today." `TODAY` is now exported from this file for reuse. `FlatGantt.tsx` also gained a one-time `useEffect` that scrolls the chart horizontally so today's date sits near the left edge of the viewport on load (with a small lookback margin), instead of leaving the scroll position at its native 0 (the oldest, least relevant date in the window). See `spec.md`'s correction note (directly below the one it supersedes) for the full reasoning.

## 2026-10-20 — post-ticket polish, round 10: hand-rolled drag-to-connect replaced with reactflow's native connection system

**Diagnosis:** round 2's `useLinkDrag.ts` (raw pointer tracking + `document.elementsFromPoint()` on drop, entirely outside reactflow) was reported by the owner, directly, as not working, "shaky/flaky," and missing the visible start/multi-connection affordances competitor apps show. This is the third attempt at this exact feature this session — researched reactflow 11.11.4's actual `Handle`/`onConnect`/`Connection`/`Position` mechanics and this codebase's own working prior art (`databonder-enterprise-search/UI/src/component/WorkflowDesigner/{WorkflowDesigner.tsx,nodes/BaseNode.tsx}`, read-only reference) before touching code again, rather than patching the symptom a third time.

**Changed:**
- `FlatGantt.tsx`'s `flowNodes`: every linkable bar's (step / plain-bar task) anchor node is no longer an invisible 1×1 placeholder — it's now sized/positioned to match that bar's real on-screen `BarPos` rect exactly, with `type: "anchor"`, `connectable: true`, and a `pointerEvents: "none"` style override (see below for why). Milestone anchor nodes are untouched (still invisible 1×1, `connectable: false` — see spec.md's new correction note on this deliberate gap).
- `DependencyEdges.tsx`: new `AnchorNode` custom node type, rendering two real reactflow `Handle`s (`type="target"` at `Position.Left`, `type="source"` at `Position.Right`) and no visible body of its own. `DependencyEdgesLayer`'s `<ReactFlow>` now sets `nodesConnectable` (was `false`) and takes a new `onConnect` prop, wired in `FlatGantt.tsx` straight to the existing `state.addLink(from, to)` — its cycle-prevention and duplicate-link check are untouched, reused as-is. `nodesDraggable` stays `false`.
- `Bar.tsx`: the hand-rolled link-handle `<circle>` and its `onLinkHandlePointerDown` prop are removed — reactflow's own `Handle` elements are now the only drag-to-connect affordance.
- `useLinkDrag.ts` deleted entirely.
- `FlatGantt.tsx`'s `onClick` passed to `useBarDrag` now checks `state.linkMode` first and calls `state.handleLinkClick(uid)` when it's on, falling through to the existing Step Editor open otherwise — re-wiring the click-source-then-click-target fallback gesture, which (found during this change, not before) was previously reachable *only* through the now-removed handle circle's own `onPointerDown`. Removing that circle without this re-wire would have silently broken the fallback gesture too, not just the drag gesture it replaces.

**Known risk investigated and solved, not routed around:** giving the anchor node real on-screen dimensions means reactflow's base `.react-flow__node { pointer-events: all }` rule would otherwise make the whole bar's area swallow `Bar.tsx`'s own move/resize pointer-downs underneath it. Fixed by setting `pointerEvents: "none"` on the node's own style and relying on reactflow's `connectionindicator` class (applied automatically to a connectable handle) to give only the small `Handle` dots their own pointer events back — same override pattern already used by `DependencyEdge`'s removable-vs-not click handling in this same file.

**Known, deliberate gap:** the milestone anchor node stays non-connectable — there is no store action to create a `task.milestone` gate interactively (`addLink()` only covers step/task dependency links). Scoped out explicitly; see spec.md's new correction note.

**Not verified:** no browser is available in this environment. `npm run build` passes with zero TypeScript errors; the connection mechanics, click-fallback re-wire, and pointer-events layering were verified by reading reactflow's actual CSS/source and this codebase's render tree, not by seeing it run.

## 2026-10-20 — post-ticket polish, round 9: non-last-step drag/resize capped at its own task's current end

**Diagnosis:** owner feedback, direct quote — a multi-step task (e.g. 3 subtasks) where dragging any one step more than the task's own span "cascades and I do not know where it flows to." Traced to `useBarDrag.ts`'s existing drag-cap mechanism (round 4/5, per spec.md) only covering two boundaries — the milestone gate and the chart's own visible range — with no cap on the task's own rolled-up end when a *non-last* step's chain-push (`step.prevUid`, the existing intentional cascade) would move it later. The cascade engine itself is correct and untouched; the gap was the complete absence of a visible limit or explanation for this one case.

**Fixed:** `useBarDrag.ts` adds a third boundary, `taskSpanEnd`, captured at drag-start only when the dragged uid is a step with a later sibling in its task's chain (another step whose `prevUid === uid`; null for a task's last step or a plain/single-step task, since those have nothing downstream to protect and are already governed by the other two boundaries). `handleMove`'s existing `exceeds` check now also freezes at `lastSafeDays` when the candidate schedule would push the task's own pre-drag end past `taskSpanEnd`. New, specific to this boundary: the chain link to the immediate next sibling (already rendered as a dependency edge via `effectiveDeps()`'s `prevUid` handling, `data-link` id `"<uid>><nextUid>"`) gets the same broken-dashed-red (`var(--crit)`, `"3 3"`) styling already used for a clashing dependency line elsewhere on the chart — imperatively patched in `paintFrame`, live during the drag, restored from captured original stroke attributes when no longer violated. The dragged bar's own outline reuses the existing broken-dashed-red treatment, unchanged. Siblings are never actually pushed once frozen, since the frozen `effectiveDays` is what feeds `computeSchedule()` for that frame.

See spec.md's new "Resolved" note (end of Further Notes) for the full writeup.

## 2026-10-20 — post-ticket polish, round 8: zoom level and 3-row date-axis header

**Diagnosis:** owner feedback, direct quote: "the timeline/gantt chart feels too zoomed out, it should be zoomed in more like the days and weeks should be visible clearly," with a competitor screenshot showing a 3-row date axis (month label / weekday letter / date number) over shaded weekend columns. At the old zoom level, `app/src/components/FlatGantt/layout.ts`'s `DW` (pixels per day column) was `14` and `AXIS_H` (header height) was `48` — only wide/tall enough for a single "month abbreviation, once per Monday" header row (`FlatGantt.tsx`'s old `monthLabels` loop); there was no day-of-week or date-number row at all, and no room to add one without the glyphs overlapping.

**Changed:**
- `layout.ts`: `DW` `14` → `36` (enough width per day column for one centered weekday letter and one centered 1-2 digit date number without crowding their neighbors); `AXIS_H` `48` → `54` (three stacked 18px header rows instead of one).
- `FlatGantt.tsx`'s axis header now renders 3 rows, each `AXIS_H / 3` tall:
  1. Month label (e.g. "May 2024") — once per calendar month, left-aligned at that month's first day, or at the chart's first visible day if the chart starts mid-month. Replaces the old "once per Monday, abbreviated day+month" grouping.
  2. Weekday letter — one per day column (every day, not just Mondays), via `toLocaleDateString(..., { weekday: "narrow" })`, horizontally centered. Tue/Thu and Sat/Sun are both single-letter-ambiguous ("T", "S") — same ambiguity the reference screenshot has; not "fixed" with a custom two-letter scheme, per the task's own instruction not to invent one.
  3. Date number — day-of-month, directly under its weekday letter, horizontally centered.
- The "As of" marker pill (previously vertically centered across the whole single-row header) now sits in its own strip at the top of row 1, so it doesn't straddle the new weekday/date-number rows below it.
- No change to `weekendBands` (already correct, just needed `AXIS_H` to grow to still start right below the new 3-row header), `barPosForRow()` (already a `DW` multiplier, scales correctly at the new width), `Milestone.tsx`, or `DependencyEdges.tsx` (`CORNER_RADIUS` and the small fixed routing offsets in `elbowPath`/`milestonePath` are corner-rounding/detour constants, not `DW`-scaled, and still look fine at the wider column width).

## 2026-10-20 — post-ticket polish, round 7: milestone rows interleaved into the row tree, not bunched at the bottom

**Changed:** `app/src/components/FlatGantt/layout.ts`'s `buildRows()` no longer appends every milestone row as one trailing block after the whole sprint/task/step tree. Each milestone's row is now inserted right after the sprint group it logically follows — the last real sprint whose window (`start`..`end`) ends at or before the milestone's own `dueDate` — interleaved with the sprint rows. A milestone due before every sprint's start (or when there are no sprints at all) lands at the very top, before the first sprint row; a milestone due after every sprint's end still lands after the last sprint group, same as the old behavior for that one case; milestones sharing the same anchor sprint stay sorted by due date relative to each other. No change to the diamond's own X-position/connector-line logic (`Milestone.tsx`, `FlatGantt.tsx`, `DependencyEdges.tsx`) — those already read the row generically via `row.y`/`row.height`/`row.milestoneId` and needed no edits.

**Why:** the "Correction, major" bottom-grouped placement (see `spec.md`'s Further Notes) was modeled on Airtable's own milestone-row layout, but that layout's bottom placement turned out to be an artifact of how that specific Airtable demo was authored (a last-minute addition the demo's author liked, not a considered layout decision) — not something to copy here. The round-6 reseed above already front-loaded this intent in the mock data's `_note` field ("each milestone sits right after the sprint cluster that feeds it") and in this changelog's own round-6 entry, but `buildRows()` itself still put every milestone in one block at the end regardless of due date — this entry is the code catching up to that already-stated intent. See `spec.md`'s new correction note (added directly below the "Correction, major" one it supersedes) for the full writeup.

## 2026-10-20 — post-ticket polish, round 6: v1 seed moved to JSON, rebalanced across risk tiers

**Changed:** the mock dataset is now authored as JSON (`app/src/lib/mock-data/seed.v1.json`) instead of inline TypeScript array literals — `tasks.ts` loads it and re-exports the same typed `BASE_SPRINTS`/`MILESTONES`/`BASE_TASKS`/`BASE_LINKS` constants, so nothing downstream changed. The round-4 reseed is superseded by this file (round 4's content is what `v0.json` already archives from before that round — no further archiving needed here).

**Reseeded again, this time verifying the actual resulting risk severity per milestone by hand-tracing `computeSchedule()`'s real cascade math end to end, not assuming it from nominal start dates:**
- Every milestone now sits right after the sprint cluster that feeds it (`scopeSignoff` after Sprint 5, `lcNotice` after Sprint 6, `rel23` after Sprint 7, `cod` after Sprint 8/9) instead of three of the four being bunched near the very end.
- Added a 5th sprint (`s9`, 2026-11-30 to 2026-12-11) — several tasks' real cascaded dates landed after Sprint 8 once multi-dependency pushes were traced through, and a genuine sprint beats letting that work fall into the `Unscheduled` bucket (which never auto-expands and would have reproduced the exact "where did it go" complaint this round of fixes exists to address). `useRoadmapStore.ts`'s default `expanded` list now includes `s9`.
- Verified severity mix across the whole dataset, not just one deliberate example: `lcNotice`'s gating task (`OAK-162`) overruns by 1 day (critical/clash); `scopeSignoff` and `rel23`'s gating tasks land a few days of float short (warning); `cod` has two gating tasks — `OAK-172` lands clean, well ahead of its due date (the "future, not yet urgent, no alarm" case), `OAK-190` lands warning-tier (close but not violated). First draft of this reseed accidentally produced three critical clashes instead of the intended mix — caught by hand-tracing rather than assumed, and corrected by moving `rel23`/`cod`'s due dates out (not by changing task dates, to avoid re-deriving every downstream cascade again).
- `OAK-171`, `OAK-172`, and `OAK-181` each now depend on steps from more than one other sprint at once, to exercise the multi-fan-in merge-on-collapse rendering from earlier rounds.

## 2026-10-20 — post-ticket polish, round 5: dynamic ±3-month chart range, drag-cap generalized to chart edges

**Diagnosis before fixing, per explicit instruction:** tasks were observed to "disappear" when dragged far — traced to the chart's date range being a hardcoded 65-day constant (`2026-10-01` to `2026-12-04`) with no guard on how far a drag could push a bar past it. Round 4's drag-cap only covered tasks gating a milestone; any other task had no limit, so dragging it far enough moved it past the SVG's own declared width, which clips anything outside it by default — invisible, with the new (off-chart) date still committed on release. Not a prior decision being reversed, since no decision existed; just an unexamined assumption from the original prototype.

**Fixed:**
- `app/src/lib/mock-data/constants.ts`: chart's date range (`T0`/`T1`) is now computed as real-calendar `today ± 3 months` at load, instead of a fixed constant sized to the mock data — per spec.md's correction note. New `addMonths()` helper in `date-utils.ts`.
- `useBarDrag.ts`'s drag-cap mechanism (round 4) is generalized: every drag — not just milestone-gated ones — is capped at the chart's own start/end, with the same live broken-red-outline indicator, in addition to the existing milestone-deadline cap (whichever boundary is hit first wins).

## 2026-10-20 — post-ticket polish, round 4: deadline-capped dragging, v1 dataset reseed

**Fixed/changed:**
- **Dragging a task past its gating milestone's due date is now capped, not cascaded through unbounded.** `useBarDrag.ts`'s live drag loop checks, per frame, whether the candidate position would push the dragged task's rolled-up end past its milestone's due date (only tasks with `milestone` set are affected — a task with no milestone has no deadline to violate, and its cascade behavior is unchanged); if so, the drag freezes at the last safe position and the bar gets a broken-dashed-red outline live, during the drag — not just after release. Dragging back under the limit un-freezes immediately. See spec.md's "Resolved" note (was an open item from round 2).
- The critical/expired risk outline (`Bar.tsx`) changed from a solid 2px stroke to a dashed ("broken") one, matching the Airtable-style violation line referenced throughout this feedback — applies both to the new live drag-cap indicator and to any task that already ends past its milestone's due date independent of dragging.

**Reseeded the v1 mock dataset** (`app/src/lib/mock-data/tasks.ts`) rather than treating it as a blind "add more data" exercise — checked first whether it was rigid (it isn't: a handful of flat array literals, trivially editable, already git-tracked, archived as-is at [`v0.json`](../../../../app/src/lib/mock-data/v0.json) for reference, not imported):
- Added a 4th milestone, "Scope & design sign-off" (due 2026-10-19), placed logically right after Sprint 5's design/scope task cluster finishes — previously all 3 milestones landed in sprints 6-8, leaving sprint 5 with no milestone to demonstrate against.
- Added `OAK-190` ("Final lender sign-off"), a task that *already* ends 4 days after the `cod` milestone's due date from its seeded dates alone (verified by hand-tracing `stepEnd()`'s working-day math, not assumed) — so the broken-red-outline violation styling above is visible on first load, without needing to manufacture one by dragging.
- Added one more mock person (`priya`, assignee for `OAK-190`) and one more cross-task link (`OAK-172:marketing:send → OAK-190:marketing:draft`).
- `useRoadmapStore.ts`'s default `expanded` list was fixed in round 3 to use sprint ids (`s5`-`s8`); unaffected by this reseed since sprint ids are static, not schedule-dependent.

## 2026-10-20 — post-ticket polish, round 3: hydration root-caused, reactflow pointer-events bug, dead default-expanded state

Round 2's own "fix" (patching one hydration-mismatched component) treated the symptom, not the mechanism — the same class of error recurred elsewhere. This round root-causes it instead.

**Fixed:**
- **Hydration mismatches, root cause**: this entire tool is one client-only, `localStorage`-persisted (zustand `persist`) interactive surface — server-rendering it was *always* going to diverge from a returning visitor's persisted state (any field that differs from the hardcoded defaults produces a mismatch, which is every visit after the first). Round 2's `RiskPanel.tsx` fix addressed one specific instance of this; the actual fix is `page.tsx` now loading `FlatGantt` via `next/dynamic` with `ssr: false`, removing the entire category rather than chasing individual mismatched fields one at a time.
- **reactflow's own stylesheet was intercepting pointer events meant for bars underneath it.** `.react-flow__node { pointer-events: all }` and `.react-flow__edge { pointer-events: visibleStroke }` are set by reactflow's base CSS regardless of the wrapper `pointer-events: none` set around the whole layer — so the invisible 1×1 anchor nodes and (more impactfully) any non-removable line crossing over a bar's drag handle or link-handle circle were silently swallowing clicks meant for what's underneath. This is very likely what made the new drag-to-connect gesture (round 2) feel broken/invisible. Fixed: anchor nodes get explicit `pointer-events: none`; only *removable* dependency edges keep `pointer-events: stroke` (milestone connectors and merged/non-removable edges now pass clicks straight through).
- **The default `expanded` row-id list never matched anything.** It held bare task ids (`"OAK-151"`, ...), but a task row's real id is `"<sprintId>::<taskId>"` (and sprint assignment itself is computed from the schedule, not static) — so on a fresh load, *no* sprint or task was ever actually expanded by default, which is most of why the chart looked sparse/empty and made content feel "too far down." Changed the default to the sprint ids themselves (`s5`–`s8`, stable and not schedule-dependent), so sprints are open by default without needing "Expand all" first.

**Investigated, not changed:** the mock dataset (`app/src/lib/mock-data/tasks.ts`) is a small set of flat array literals — not rigid, trivially editable, already git-tracked (so no separate "backup" is needed before changing it). Confirmed rather than reseeded this round, since the three fixes above were the actual cause of "sprints too far down" and "drag doesn't work" — reseeding the data would not have fixed either.

## 2026-10-20 — post-ticket polish, round 2: real drag-to-connect, actual line dedup, hydration fix, as-of relabel

Found by using the round-1 polish above in the running build — several things in it didn't hold up. Superseding details noted here rather than rewritten into the round-1 entry below.

**Fixed/changed:**
- **Real drag-to-connect**, per spec.md's original "drag from one row's edge to another" decision. Ticket 02 deliberately deferred this (kept the click-source-then-click-target gesture, `linkMode`/`linkFrom`/`handleLinkClick`), and round 1 above left it that way — but it read as "flaky" and not what the spec actually called for. New `useLinkDrag.ts`: a pointer drag from a bar's handle circle now draws a live preview line and, on drop over another bar, calls the existing `addLink()` (same cycle-prevention, same "already exists" check — no store changes needed). A plain click with no movement still falls back to the old click-mode gesture, so nothing that worked before stopped working.
- **Dependency/milestone line merging was visually converging but not actually deduplicating** — round 1's fix made several distinct links climb to the same ancestor row, but still rendered one line per original link, so a collapsed sprint with three internally-linked tasks showed three overlapping near-duplicate lines, not one merged line (this is what read as "swirly"/"not really merged"). Fixed: links are now grouped by their *resolved* (source row, target row) pair and rendered as a single edge per group; a link whose two ends resolve to the same row (nothing meaningful to draw) is dropped entirely instead of drawing a degenerate self-loop.
- **Hydration error fixed**: `RiskPanel.tsx` rendered a `<Badge>` (a `<div>`) inside a Mantine `<Text>` (a `<p>` by default) — invalid HTML nesting that Next.js's hydration check caught once that panel re-rendered with new content (e.g. after adding a task). Changed to a flex `<div>` wrapping the badge and text, matching the pattern already used a few lines above it in the same file.
- **"As of" marker restyled, not changed in meaning**: it's the adjustable risk-simulation anchor (`state.asOf`, used for critical-vs-expired severity), not literal today (`Date.now()`) — it was never meant to track the real device date. Round 1's red solid line + bare day-number badge read exactly like ClickUp/Wrike's literal-today indicator, which was the confusion. Restyled to violet with a "As of {day Mon}" pill instead of red + a bare number, so it doesn't look like a real-today marker; red is now reserved for the critical/expired clash-risk line styling introduced in round 1.
- A dangling or cyclic step dependency (e.g. from stale persisted overlay/base-link state surviving a schema change) no longer crashes `computeSchedule()` — `out[p]` is checked before use; a not-yet-computed predecessor is skipped for that pass instead of throwing.

**Documented, not built — recorded as an open item in spec.md's Further Notes:** bounding how far a drag-reschedule can cascade past a step/task's own enclosing boundary, so a user extending a bar to test a deadline has a visible limit instead of an unbounded push through every downstream dependent. Deliberately deferred per explicit instruction; not designed yet.

## 2026-10-20 — post-ticket polish: scenario creation disabled, dependency/milestone lines merge with collapse state

Not tied to a ticket — found by actually using the running build after tickets 01/02 landed, not by re-reading the spec. Both fixes are written up as named decision reversals in [`spec.md`](./spec.md)'s "Further Notes" (third entry); this changelog entry covers what actually changed in code.

**Fixed/changed:**
- Scenario auto-creation is disabled. `ensureScenario()` no longer spawns a new named scenario ("Scenario A," "Scenario B"...) the moment an edit is made against a locked Baseline — there is now exactly one, permanently-unlocked "Working" scenario that every edit lands in directly. The "New scenario" toolbar button is disabled with a tooltip explaining why, rather than removed outright. Commit/Undo/Reset behave as before, now against the one working scenario.
- Dependency and task→milestone connector lines no longer vanish when one end's row is hidden behind a collapsed sprint or task. A hidden endpoint now resolves to its nearest *visible* ancestor row (new `resolveLinkEndpoint.ts`), so collapsing a sprint visually merges its internal tasks' lines into one line arriving at the sprint row, and expanding it fans them back out — replacing the previous "just don't draw it" behavior that, combined with most of the board being collapsed by default, made linking look broken.
- Milestone connectors switched from a straight point-to-point diagonal to the same elbow routing used for step/task links, merging onto a shared vertical spine at the milestone's due-date column before reaching the diamond (`DependencyEdges.tsx`'s new `milestonePath()`), instead of arriving as a fan of separate diagonals.
- All elbow-routed lines (step/task and milestone) now render with rounded corners instead of sharp right angles (`roundedOrthogonalPath()`).
- A dependency or milestone line renders dotted red instead of its normal color when the line's downstream task currently carries a critical/expired risk, surfacing an active scheduling conflict directly on the line itself.
- The "as of" marker is now a solid red line the full height of the chart with a red date badge in the axis header, instead of a thin dashed blue line.

**Not changed:** the click-source-then-click-target link-creation gesture (`linkMode`/`linkFrom`/`handleLinkClick`) is untouched — this round only changed how lines are drawn and routed, not how a new link is created.

## 2026-10-20 — Ticket 02 closed: dependency lines via reactflow

**Closes:** [`tickets/02-reactflow-dependency-lines.md`](./tickets/02-reactflow-dependency-lines.md)

**Implemented:**
- New `FlatGantt/DependencyEdges.tsx`: a `reactflow`-backed layer (`DependencyEdgesLayer`) that is now the single shared mechanism for step↔step, task↔task, and task→milestone connector lines. Pan/zoom/node-drag/selection are disabled — reactflow's viewport is pinned at `{0,0,zoom:1}`, and the chart's only scroll path remains the existing native `overflow: auto` container, so the two coordinate spaces never drift apart.
- Each bar/milestone gets an invisible 1×1 anchor node purely so reactflow has a valid id to resolve an edge against; the real bar/diamond visuals keep rendering unchanged in `FlatGantt.tsx`'s own SVG. Each edge carries its own `BarPos`-derived endpoints in `data`, recomputed every render from the same `rowByUid`/`sched` state that positions the bars — not from reactflow's own layout.
- `useBarDrag.ts`'s existing imperative 60fps `paintFrame` (no React re-render during drag) now also patches reactflow's edge `<path>` elements via the same `[data-link]` convention, extended to cover milestone connector edges too.

**Removed:**
- `layout.ts`'s hand-rolled `linkPath()` elbow router and its `// TODO: replace with reactflow` comment — fully deleted, logic ported into `DependencyEdges.tsx`'s `elbowPath()`/`straightPath()`.
- `Milestone.tsx`'s inline gating-connector line rendering (`gatingBarPositions` prop) — that line-drawing now happens through the shared reactflow mechanism; the diamond shape, guide line, and label are unchanged.

**Scope note:** the existing click-based `linkMode`/`linkFrom`/`handleLinkClick` link-creation gesture (store-driven, with `wouldCycle` cycle prevention) was preserved as-is — no new mouse-drag-to-connect gesture was introduced, since the v0 app never had one despite the spec's "drag-to-link" phrasing; this ticket's scope was line-drawing/routing only.

Verified: `npm run build` passes with zero TypeScript errors (independently reproduced). Scroll/pan desync was verified by reading the render tree (no independent transform on either layer); zoom is not a feature of this app, so that specific failure mode is not applicable.

## 2026-10-20 — Ticket 01 closed: milestones get their own row

**Closes:** [`tickets/01-milestone-own-row.md`](./tickets/01-milestone-own-row.md)

**Implemented:**
- `layout.ts`'s `buildRows()` now appends one row per milestone, grouped below the sprint-grouped rows and sorted by due date ascending, with a new `"milestone"` row kind.
- `Milestone.tsx`'s diamond now positions against that row's own Y coordinate (`rowY` prop) instead of a shared header band.

**Removed:**
- The two-band header-lane rendering (`MILESTONE_BAND_Y`, `milestoneBands()`) decided against in `spec.md`'s "Correction, major" note — fully deleted, not left dead alongside the new approach.

Verified: gating connectors still follow a dragged task's bar, Expand All/Collapse All still works with milestone rows present, `npm run build` passes with zero TypeScript errors (independently reproduced, not just taken from the implementer's report).

## 2026-10-20 — milestone overlap + schema field alignment fix

**Fixed:**
- Milestone labels overlapped once more than two milestones existed on the chart — all were drawn at one fixed header position. First fix staggered them into two bands; that approach is itself superseded by the row-based correction below.
- Two fields (`gates`, Milestone's `date`) carried over the vanilla prototype's internal shorthand instead of the real Strapi schema's actual field names (`milestone`, `dueDate`). Renamed throughout the engine, mock data, and store.

**Decided, not yet built:** milestones need their own row in the chart — one per milestone, below the sprint-grouped rows — instead of sharing a cramped header lane. See `spec.md`'s "Correction, major" note. Documented, not yet implemented in code.

## 2026-10-19 — v0 scaffold (initial port)

**Implemented** (see `spec.md` for the decision each one maps to):
- Task → Stage → Step work model; steps added on demand via an "Add" menu, not auto-generated from a template.
- Scenario engine: create/switch/compare scenarios, live recompute on every edit, atomic per-action undo, commit with a required reason.
- Risk engine: four severity tiers (critical / warning / expired / informational), including the weekend-landing flag (fires only on a step that's `moved` and whose start or end lands on a non-working day).
- Sticky, collapsible row tree (sprints → tasks → steps), built with native CSS, no ag-grid dependency.
- Minimal task creation (name only, via the same "Add" menu), saved to local storage, layered over the fixed mock data rather than mutating it.
- Named "Blocked by" / "Blocking" relationship fields on steps, and one-directional task-gates-milestone relationship.
- Commit confirmation that warns before discarding an uncommitted sibling scenario.

**Carried over as known gaps, not silently dropped:**
- Dependency-link drawing uses a hand-rolled SVG line as a stand-in. Committed direction is to replace it with `reactflow` — see [`app-dependencies-and-config.md`](./app-dependencies-and-config.md).
- Reassignment (moving a step to a different person) only works through a dropdown, not a drag gesture (`react-dnd`) — a deliberate choice for now, not an oversight.
