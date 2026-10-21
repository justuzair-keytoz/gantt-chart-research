# Gantt chart — discovery & scoping (pre-spec)

Status: exploration. Nothing here is locked. The point right now is to agree on what problem we're solving before touching fields or APIs. This is a free-experiment effort, so both frontend and backend are open to change.

## 1. Reality check on "the moat"

Going in, the assumption was that a Gantt chart would sit on top of our existing smart conflict detection. The repo pass says that's not quite true.

The task model today (`Strapi/src/api/task/.../schema.json`) has `startDate`, `dueDate`, `progress`, `estimatedTime`/`actualTime`, a flat `dependencies` self-relation with no typing (no finish-to-start vs. start-to-start, no lag), `parentTask`/`subtasks`, and `assignee`. There's no duration field and no resource or capacity model anywhere in the schema.

"Conflict detection" today (`ruleengine/`, `packages/conflict-types`, `packages/amendment-resolver`) is a GoRules/zen-engine decision-table system. What it actually catches is contradictions in extracted legal and financial document data across tables and projects — a guarantee-cap mismatch, an LC expiry conflict — not schedule overlaps and not resource double-booking. Right now there's zero detection of "these two tasks are competing for the same person's time."

The AI engine (`RAG/`, `docs/databonder-ai/`) is a LangGraph RAG and document-Q&A agent. Its "Scheduler" subgraph plans the order of its own tool calls. It has nothing to do with calendars.

The frontend is Next.js plus Mantine plus ag-grid, with Table and Kanban as the only views (`ViewSwitcher`). No Gantt library is installed. There's a `core/Timeline` component, but it's a vertical activity feed — unrelated to what we're building.

So a Gantt chart here is a new capability, not a thin view sitting on top of scheduling intelligence we already have. That's fine. It means the "smart" part still has to be built, but we're not starting from nothing: we already have a proven pattern for evaluating conflicts (the rule engine), and a kind of data — legal and financial dates living on the same parcels as the tasks — that none of our competitors have access to.

## 2. What the market already does

So we don't waste time rebuilding commodity features, here's a survey of Jira, ClickUp, Monday, Asana, Linear, and the 2026 crop of "AI-native" tools (Zoye, Ganty, Instagantt, Taskade). Full per-tool detail lives in [competitors/](./competitors/INDEX.md).

Table stakes, present in every serious tool: timeline bars derived from start and end dates, zoomable by day, week, month, or year; typed dependencies (finish-to-start by default, plus start-to-start, finish-to-finish, start-to-finish, with lag); drag-to-reschedule that cascades to downstream tasks automatically; critical path highlighting with slack time shown alongside it; milestones as zero-duration markers; a cross-project rollup view; a separate workload view for catching resource overallocation; and baseline tracking, though that last one is implemented inconsistently and often feels clunky even in mature tools.

Where the field is actually moving in 2026, and where real differentiation lives: AI acting as an active scheduler rather than a sidebar — rescheduling slipped work, flagging conflicts, rebalancing load, editing the plan directly instead of just suggesting things a human still has to do by hand. Several tools now let an LLM reason about the plan while handing the actual date arithmetic to a deterministic server-side engine — Ganty's pitch is literally that LLMs are bad at date math, so don't let them touch it. And the best conflict detection is prescriptive: "here are three valid reschedule options, ranked by priority, dependency, and availability," not just a red line on the chart that you have to go figure out yourself.

Sources: [Atlassian](https://www.atlassian.com/agile/project-management/gantt-chart), [ClickUp Gantt](https://clickup.com/features/gantt-chart-view), [ClickUp critical path](https://clickup.com/blog/critical-path/), [Jira dependencies](https://getsimplegantt.com/blog/track-dependencies-jira/), [Monday/Asana/Linear comparison](https://resourceguruapp.com/blog/software-reviews/monday-vs-asana), [AI Gantt tools 2026](https://clickup.com/blog/gantt-chart-ai/), [Ganty](https://ganty.app/en/blog/best-ai-gantt-chart-tools-2026), [Instagantt conflict detector](https://www.instagantt.com/project-templates/gantt-chart-conflict-detector-ai-powered-template-that-identifies-resource-conflicts-and-suggests-optimal-task-rescheduling).

## 3. Where we could actually be first

Nobody surveyed puts schedule conflicts and contractual or financial deadline conflicts on the same timeline, because nobody else has a document-extraction engine sitting next to their task manager. We do. A parcel already carries dates that matter to scheduling but currently live outside the task table entirely: LC expiry, option deadlines, guarantee cap dates, amendment effective dates. If a task's due date slips past one of those, that's a conflict no competitor's Gantt chart can even see.

That changes the pitch. It's not "build a Gantt chart," it's "extend the rule engine we already trust for financial conflicts into a new domain — scheduling, resources, dependencies — and show both kinds of conflict on one timeline." That's reuse, not reinvention, and it's also just the lazier, more sensible path: `ruleengine/` already has the seed, evaluate, and status-lifecycle machinery (`OPEN → ACKNOWLEDGED/IN_PROGRESS → RESOLVED/AUTO_RESOLVED/DISMISSED`) built and working.

## 4. Corrected framing (direction given 2026-10-15)

This isn't a portfolio or cross-parcel view. The Gantt chart is a third view sitting next to Table and Kanban, at the same level, inside a given parcel's tasks (`parcel-id/tasks`). The value isn't "a timeline exists." It's three things: seeing a task's dependencies and blockers at a glance, seeing how far the work can actually proceed before it hits a blocker — which tasks are open right now versus stuck waiting on something else, and seeing the flow of work and its dependencies across sprints, not just inside one.

We're deliberately not planning phases or a proof of concept yet. The gaps listed in section 3 are real, but they're not what we resolve first — they're a target to build toward once the user stories and the mental model stop shifting, not a constraint that should shape the thinking right now. For this discussion, treat the current schema (the flat `dependencies` relation, no dependency typing, no sprint concept on `task`) as if it doesn't exist yet, rather than as a boundary we're designing inside of.

## 5. Vague doubts to clear

This is the actual work right now. No roadmap gets written until these are answered.

On the mental model: what counts as a "blocker" here? Is it strictly the `dependencies` relation — task A can't start until task B is done — or does it also cover things like an unassigned task, a missing field, or an external date like a document deadline? The answer changes what "how far can this proceed" even means. Does "sprint" exist as a real concept anywhere in this product today, or is it something we'd be inferring from date ranges? If it doesn't exist yet, is "across sprints" really just "across time," and we're borrowing Jira and ClickUp's vocabulary out of habit? Is the unit of a Gantt row a task, or do subtasks get their own nested rows? `parentTask`/`subtasks` already exists — does the chart need to show that hierarchy visually, with indented bars, or should it flatten everything to one level? And when we say "flow between tasks," do we mean a real dependency graph with arrows, or something simpler — task N blocks task N+1, drawn as a chain?

On scope: is this view read-only to start, just showing what already exists, or does dragging and editing need to be part of the concept from day one? That's not a "which phase" question, it's asking whether editing belongs in the mental model at all. And when a task is blocked, does the interface need to say why — which dependency, whose task is holding it up — or is a flag enough at this stage of thinking?

Keep iterating on these before writing anything down as a settled user story. The mental model needs to stop shifting first.

**Update 2026-10-21:** several of these doubts have since been answered directly, during the review that produced [`spec/v2/spec.md`](./spec/v2/spec.md) — recorded here rather than silently treated as always having been settled.

- **"What counts as a blocker?"** Answered: not strictly the `dependencies` relation. The project owner named three distinct meanings directly — an assignee with clashing deadlines, nobody assigned but overlapping timelines, and a dependent subtask whose predecessor must reach a certain point before the next one can start. See `spec/v2/spec.md`'s "Blocked" decisions.
- **"Is the unit of a Gantt row a task, or do subtasks get their own nested rows?"** Answered: subtasks get their own nested rows, to any depth a user actually creates — not flattened to one level. See `spec/v2/spec.md`'s nesting decision.
- Stages were independently confirmed as staying, directly: the project owner named a concrete cross-stage dependency example (development depending on design and review finishing first), separately from and consistent with the CTO doc's own R1/R2.

Not yet answered by this update: whether `parentTask`/`subtasks` is the actual relation the Gantt's nesting should use, or a separate nesting concept that happens to look similar — this is still open, see `spec/v2/spec.md`'s Open Questions.
