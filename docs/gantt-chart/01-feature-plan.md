# Gantt chart — feature plan, merged with the independent review

Status: draft, now folded together with an independent check of its own evidence, and a full citation-accuracy pass across every competitor file. The plan hasn't changed shape much, but a few claims got downgraded and then re-confirmed, one stayed corrected, and two new ideas came in from tools outside the original seven.

## The citation problem, and that it's now fixed

An independent review opened the actual screenshot files this plan cites and compared them against what the captions say. A lot didn't match — not just in Airtable, but in Jira, ClickUp, and Wrike too, and in Linear's file set added later. The pattern was consistent: no evidence was invented, every behavior described really was seen in the product, but captions had been written to match a narrative and then attached to the wrong file out of a batch of a dozen near-identical screenshots.

Every `competitors/*.md` file has since been re-verified image by image: each cited screenshot was re-opened, checked against its caption, and corrected where it pointed at the wrong file. Smartsheet's set turned out to be entirely correct already. Jira, ClickUp, Wrike, Airtable, and Linear each had real mismatches, now fixed — see the "Citation fix" note at the top of each affected file for specifics. Nothing below needed to be walked back as a result; the behaviors described were real all along, they just needed the right file put behind them. The two downgrades from the first review pass (the Airtable conflict-line rendering, and the Airtable milestone shape) are both restored to confirmed below, now that the correct screenshots have been identified.

## Pick up

**A blocker should be a named relationship, not a generic dependency.** This one doesn't need the screenshots to be right — it's a sound call on its own terms. "Blocked by" is easier to query, easier to notify on, and easier to explain to a user than an unlabeled predecessor/successor pair. Four tools do some version of it (Jira, ClickUp, Wrike, Linear), and even with some of those citations now in question, the pattern itself holds up independently.

**Ask before cascading a date change, don't just apply it.** Wrike asks first; ClickUp applies immediately with no confirmation. Given that this product's actual moat is surfacing a problem and waiting for a human to acknowledge it rather than quietly fixing things on its own, ask-first fits what this team is already good at. Worth treating as closer to a default than a toss-up.

**Flag a dependency as a conflict only when the dates actually clash, not just because a relationship exists.** Two tasks can be linked and still not overlap — nothing to flag there. The moment their dates do overlap, that's worth a different visual treatment, a running count somewhere, and a direct pointer to the exact relationship causing it. Confirmed firsthand in Airtable, now correctly cited (`competitors/airtable.md`): a dashed red line plus a chart-level "This chart has 2 invalid dependencies" banner plus a per-relationship "Fix invalid dependencies" link, all computed live off the actual dates — not a stored flag, a condition evaluated on the spot. It also maps cleanly onto the rule engine this product already trusts for financial conflicts — evaluate a condition, surface it, let someone confirm. Worth building.

Wrike reportedly does something similar with a feature called Conflict Monitor, turning an arrow red on a date clash — but that behavior was never triggered in the Wrike walkthrough, so it's supporting precedent, not a second confirmed example. Airtable is the one piece of real, firsthand evidence for this idea.

**A sprint, or whatever this ends up being called, should be a row with its own bar**, spanning the union of its children's dates, with a status rolled up from those children rather than stored separately. Three tools do this (Jira, Wrike, Linear) in a way consistent enough that it reads as closer to a default pattern than a borrowed idea.

**Dependency lines should be allowed to cross sprint boundaries.** A task in one sprint blocking a task three sprints later should draw on the same chart, not get cut off at the edge of its own container. Confirmed in three separate tools, and this is also where an earlier draft of this research got something wrong and fixed it: a secondhand write-up claimed Linear refuses to do this on purpose, and a direct look at the product showed the opposite.

**A dependency doesn't have to live at the task level.** Wrike let a whole sprint depend on another whole sprint finishing, not just one task inside it depending on one task inside another (`competitors/wrike.md`, the group-level `2FS` predecessor on Sprint 3's own row). A second shape for "blocker" worth keeping in mind beyond task-to-task.

## Leave behind

**Typed dependency relationships — finish-to-start, start-to-start, finish-to-finish, start-to-finish — plus lead/lag offsets.** Every tool that has these treats them as secondary. Airtable puts lead/lag behind a paid tier. This is a day-fifty problem, not a day-one one.

**A second, lighter-density view alongside the main Gantt.** Wrike, Smartsheet, and Airtable all ship something like this — a simpler pill-based timeline next to the dense grid. Real pattern, but the scope already agreed on is Table, Kanban, and Gantt as the three views. A fourth view competes for time against things that matter more right now.

## Parked, not rejected

**Baseline versus actual tracking.** Smartsheet's cleanest standalone idea — lock in the original planned dates, compare against what's actually happening, give a one-line verdict instead of two date columns to eyeball. Genuinely good, but it answers a different question than the one this view exists to solve. Keep it in mind for later.

**AI-generates-the-whole-workspace flows**, the kind Smartsheet and Airtable both ship for initial setup. Interesting, unrelated to how the Gantt view itself should behave once data already exists. Out of scope here.

## The milestone question — two confirmed shapes, pick one on purpose

Two shapes for "milestone" turned up, both now correctly cited and confirmed firsthand: Airtable's, where a milestone sits in the same dependency graph as any task — a record badged "MILESTONE," one Due Date instead of a range, rendered as a diamond, but with the same Predecessors/Successors sections as a task (`competitors/airtable.md`: 3 Predecessors feeding one milestone, 0 Successors); and Linear's, where a milestone is a progress sub-stage nested inside a project ("Task 1, 0% of 0"), disconnected entirely from the project-level Blocked by/Blocking relationship (`competitors/linear.md`). Both are real, shipped, and screenshotted correctly. The choice between them is still a design opinion, not something the research settles on its own: a milestone that can be blocked by, and can block, other things (Airtable's shape) fits the "milestone is basically a sprint for us, and should link to all its predecessors/successors" framing better than a disconnected progress tracker does.

## A real gap, and it's not actually unclaimed

Earlier research flagged that no tool shows a task's full reachable chain — every tool highlights only the immediate neighbor, even the ones with good blocker UI. That's true of the seven tools surveyed, but not true of the category: NocoDB's Gantt view, in a 2026 release, highlights a task's entire upstream and downstream chain on hover, including across group boundaries. So the whitespace exists in this specific survey, not in the market. Worth knowing before calling it a differentiator.

A smaller find from the same pass: Monday.com doesn't force one global answer to the ask-first-versus-auto-apply question. It lets you set the cascade behavior per dependency — flexible (auto-adjust to avoid overlap), strict (always shift to match exactly), or none (show the link, never touch the dates). That reframes the cascade decision from "pick one for the whole product" to "let the relationship itself carry that setting." Not clearly worth building, but worth remembering as an option.

Nothing from Asana or TeamGantt cleared the bar of actually adding something new — their dependency and critical-path features are the same shape already covered by Jira, ClickUp, and Wrike, just gated behind different pricing.

## Still unresolved

Row granularity for subtasks — nested and indented, or flattened to one level — has no clean precedent in anything surveyed; the closest example (Jira) nests sprint under issue, not task under subtask. Whether dragging and editing belong in the concept at all on day one, or whether this starts read-only, is a product-scope call that no amount of competitor research settles. And the exact words this product should use for "blocker" are still an open question.

## Where things stand now

Every claim in this plan that cites a screenshot now points at a verified, correctly-matched file: Airtable's invalid-dependency state (dashed-red-versus-plain line, chart banner, fix-it link), Jira's task detail panel with a real blocks/is-blocked-by relationship, ClickUp's populated Blocked by field with its activity-log trail, and Wrike's Predecessors/Successors panel on a real task all check out against the actual images, not just the captions. The remaining open items are the ones that were never about citation accuracy in the first place — see "Still unresolved" above, and the milestone shape decision just above this.
