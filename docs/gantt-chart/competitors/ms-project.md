# Microsoft Project — roll-up bars, driving-task highlighting, summary-task scheduling

**Verification status: documentation only, no screenshots.** Every claim below is sourced from a vendor or vendor-adjacent write-up, not a screenshot taken firsthand in a running instance of the product, unlike most of the other files in this folder. Treat every point here as secondhand until someone actually opens MS Project and checks it directly — this file exists because the underlying *pattern* is directly relevant to this round's "flatten on collapse" and "huge task spanning multiple sprints" work, not because the evidence bar here matches the rest of this folder.

## Roll-up Gantt bars on a collapsed summary task

When a summary (parent) task is collapsed, its child tasks' bars don't disappear — they're projected onto the summary row itself, as smaller bars positioned at their own real dates, inside the parent's row. A collapsed summary still shows the shape of its children's actual schedule, not just a single earliest-start-to-latest-end bar. Source: [Roll-up Gantt bars in Microsoft Project](https://tensix.com/rollup-gantt-bars-in-microsoft-project/) (a third-party MS Project consultancy's write-up, not Microsoft's own documentation).

This is the pattern this round's v2/spec.md cites as the shape behind its own "rolled-up segments" proposal — segments representing each child's actual span inside the collapsed parent's row, rather than one summary bar that would hide gaps between children.

## Task Inspector and Task Path — highlighting what's actually driving a date

Two separate features, per the same source: Task Inspector is a side panel that lists the specific predecessor tasks currently driving a selected task's start date (so "why does this start when it does" has a direct, named answer). Task Path is a highlighting mode that colors the actual driving predecessors directly on the Gantt chart itself, so the chain that matters is visually distinct from everything else on the board. Source: [Displaying Driving Tasks in Microsoft Project](https://tensix.com/displaying-driving-tasks-in-microsoft-project/).

Relevant to this round's "reason for timeline change" feedback item — this is an existing, shipped precedent for exactly the "highlight the driving chain" idea discussed as part of this round's reason model, independent of the human-authored-reason half of that proposal.

## A summary task's predecessor constrains its subtasks

If a summary task itself has a predecessor relationship set, its subtasks cannot be scheduled earlier than that predecessor allows — the constraint propagates down from the summary level to the children, not just the other direction (children rolling up into the summary's own displayed dates). Source: [Microsoft support article, KB 175457](https://support.microsoft.com/kb/175457/hr).

This is the precedent cited in `spec/v2/spec.md` for the "stage-level dependency expands into step edges" proposal — a dependency declared at a group level (here, Microsoft's summary task; there, this project's Stage) constraining everything scheduled underneath it, rather than needing a separate dependency type at the group level.
