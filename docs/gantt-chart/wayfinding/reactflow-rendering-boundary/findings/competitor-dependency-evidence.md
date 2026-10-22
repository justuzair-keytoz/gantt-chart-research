# Dependency interaction evidence

**Scope.** This note re-opened the local PNGs named below. A claim marked
**screenshot-verified** comes from the image itself. A claim marked
**documentation/prose only** comes from the existing competitor notes or their
linked vendor documentation and was not re-tested here. This distinction matters:
several existing captions do not match their PNG's visible content.

## What the screenshots establish

### Creation and the visible affordance

- **Jira:** the bar end carries a chain-link icon when the item is involved in a
  dependency. This is visible on both parent and child bars in
  `jira-timeline-walkthrough/16-dependency-arrows-row-hover.png` and on
  collapsed parent bars in
  `jira-timeline-walkthrough/13-dependency-arrows-fanout-with-popover.png`.
  **Screenshot-verified:** dependency affordances belong on the bar, not in a
  separate mode. **Not screenshot-verified:** that the icon is dragged to
  create the link; that comes from the existing Jira prose.
- **Wrike:** selected bars expose small circular endpoint controls in
  `wrike-gantt-walkthrough/12-classic-gantt-view-arrows-and-predecessor-column.png`.
  The same image also shows a `Predecessors` table column with shorthand such
  as `3FS`. **Screenshot-verified:** direct manipulation and an explicit,
  inspectable fallback can coexist. **Documentation/prose only:** that dragging
  those controls creates the same relationship as the table entry.
- **ClickUp:** the screenshots prove a linked chain is rendered, but none capture
  the gesture that creates it. `clickup-gantt-walkthrough/11-create-task-inline-popover.png`
  shows a four-task cross-sprint chain; `clickup-gantt-walkthrough/02-task-detail-blocked-by.png`
  only shows the untouched task's “Relate items or add dependencies” entry.
  The claimed bar-edge drag gesture is therefore **documentation/prose only**.
- **Airtable:** `airtable-gantt-walkthrough/08-timeline-view-month-zoom.png`
  shows a selected record panel with separate “NO PREDECESSORS” and “NO
  SUCCESSORS” sections, each offering “Link to a record.”
  **Screenshot-verified:** an explicit named-relationship path is clear and
  low-risk. The images do not show direct bar-to-bar creation.

### Routing and conflict meaning

- **Jira:** `jira-timeline-walkthrough/16-dependency-arrows-row-hover.png`
  shows many curved, red/orange lines with a hover card that names the source,
  the word “blocks,” and the target. This directly supports treating a line as
  an inspectable relationship, not decoration. It does **not** support copying
  Jira's default all-red styling: the image offers no visible legend for what
  red means.
- **ClickUp:** `clickup-gantt-walkthrough/11-create-task-inline-popover.png`
  and `12-gantt-view-final-state.png` show thin neutral elbow connectors that
  step vertically through a four-task chain spanning three sprints. The path is
  legible because it follows row geometry and uses arrowheads, not because it
  tries to avoid every intervening bar.
- **Wrike:** `wrike-gantt-walkthrough/11-predecessor-column-shorthand-full-chain.png`
  and `12-classic-gantt-view-arrows-and-predecessor-column.png` show crisp
  right-angle connectors with arrowheads. The former also visibly connects a
  Sprint 1 bar to the Sprint 3 summary bar, where Sprint 3's predecessor cell
  reads `2FS`. This is firsthand evidence for dependencies on visible group
  rows; it is not evidence for how a hidden child resolves when its ancestor is
  collapsed.
- **Airtable:** `airtable-gantt-walkthrough/12-ai-build-plan-and-generated-grid.png`
  shows neutral gray elbow connectors for valid links and dashed red elbow
  connectors for invalid ones, plus the chart-level message “This chart has 2
  invalid dependencies.” `11-dependencies-field-record-picker.png` shows the
  matching per-record warning and “Fix invalid dependencies” action.
  **Screenshot-verified:** semantic warning styling needs both a local reason
  and an aggregate count. It should be reserved for a computed problem, not
  used as the normal link color.

### Collapsed hierarchy endpoints

- **Jira:** `jira-timeline-walkthrough/13-dependency-arrows-fanout-with-popover.png`
  shows collapsed sprint rows retaining their bars and chain-link affordances.
  `14-task-detail-blocks-and-blocked-by.png` shows Sprint 2 collapsed while
  visible work in Sprints 1 and 3 retains its dependency lines. **What it does
  not show:** an edge whose hidden child resolves onto the collapsed parent's
  bar. The stronger claim in the existing prose is not supported by these PNGs.
- **Wrike:** `wrike-gantt-walkthrough/09-inline-edit-sprint-due-date.png`
  shows collapsed sprint summary bars, but no dependency lines. It establishes
  the summary-row visual, not endpoint resolution.
- **ClickUp and Airtable:** the available screenshots do not show a collapsed
  hierarchy with a hidden endpoint.

**Decision implication:** “nearest visible ancestor” remains an application
correctness requirement from our own v2 behavior, not a competitor behavior
we can cite as screenshot-proven. The rendering layer must accept an already
resolved visible endpoint; it must not be asked to infer tree semantics from
screen coordinates.

### Explanations in words

- **Jira:** `jira-timeline-walkthrough/15-dependency-arrows-board-overview.png`
  shows two named lists under “Linked work items”: “blocks” and “is blocked by,”
  with each linked work item and status. `16-dependency-arrows-row-hover.png`
  shows the relationship itself as source → “blocks” → target in a small card.
  This is the cleanest screenshot-backed precedent for the v2 request to say
  why a date is constrained in plain language.
- **Wrike:** `wrike-gantt-walkthrough/11-predecessor-column-shorthand-full-chain.png`
  puts explicit predecessor codes beside each affected row. It makes links
  auditable, but it does not explain their business reason.
- **Airtable:** `11-dependencies-field-record-picker.png` pairs an invalid
  successor with “Fix invalid dependencies”; `12-ai-build-plan-and-generated-grid.png`
  adds the count. This is a good pattern for a concrete repair state, not for
  the human-authored “why did the plan change?” record proposed in v2.
- **ClickUp:** no inspected screenshot supplies an explanatory dependency card
  or a reason for a date. Do not infer one from its rendered chain.

## Minimum consequences for the v2 spike

1. Keep direct connect as a first-class interaction, but pair it with one
   named, keyboard-accessible relationship editor. The screenshot evidence
   supports both paths; neither requires more dependency types than the current
   finish-to-start primitive.
2. Make default links neutral, thin, orthogonal, and arrowheaded. Apply warning
   styling only to an evaluated conflict and show the specific cause close to
   the link or selected record plus a count/summary at chart level.
3. Put the “why” in a selected-item card or inspector: “X blocks Y” plus dates
   and status is the proven baseline. A driving-chain explanation is a valuable
   extension of that pattern, but not something these screenshots prove.
4. Resolve hidden tasks to their nearest visible ancestor before rendering.
   This is necessary for v2's collapsed tree, but remains product behavior to
   validate in our own prototype rather than copied competitor behavior.
5. Do not use screenshot evidence to justify a whole-chart React Flow rewrite.
   These tools demonstrate paths, arrowheads, summary rows, and explanations;
   none demonstrate that their rendering architecture owns the schedule tree.

## Evidence caveat

The existing competitor Markdown says its citations were corrected, but the
following descriptions demonstrably do not match the named PNGs after visual
inspection: Jira's use of `14`/`15`/`16`, Wrike's use of `06`–`09`, and
Airtable's use of `03`–`13`. This note deliberately cites only what the shown
file visibly contains. The older notes should not be used as proof for
collapsed-endpoint behavior until their citations are repaired again.
