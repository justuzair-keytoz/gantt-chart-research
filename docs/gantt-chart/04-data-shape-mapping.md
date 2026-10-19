# Mock data shape — mapped against the real Strapi schema

The prototype's mock data doesn't get to be shaped however is convenient. Every field in it is either a real field that already exists in `databonder-enterprise-search`'s Strapi schema (same name, same type, reused as-is) or a genuinely new concept this feature needs, documented here with what it is, why it's needed, and where it would live for real. The goal: porting to real data later is "point the same field names at a real API," not "figure out which mock field meant what."

Source of truth read directly from the repo, not from memory: `Strapi/src/api/task/content-types/task/schema.json` and `Strapi/src/api/milestone/content-types/milestone/schema.json`.

## Fields that already exist and are reused as-is

| Field | Real type (Task schema) | Used for |
| --- | --- | --- |
| `name` | text, required | Task title |
| `status` | enum: TODO / In Progress / Review / Done | Still the task's own rolled-up status (per the spec's "task status derives from its steps" decision — see below for what a *step's* status is) |
| `priority` | enum: Low / Medium / High / Urgent | Unchanged |
| `startDate`, `dueDate` | datetime | Reused, but note: these live on **Task** today; in the new model they move to being **Step**-level fields primarily, with the task's own `startDate`/`dueDate` becoming the rolled-up min/max of its steps, consistent with the spec's "task's headline status/start/end are derived from its steps" decision |
| `assignee` | relation → app-user, manyToOne | Reused at the step level (each step gets its own assignee, not just the task) |
| `watchers` | relation → app-user, manyToMany | Closest existing field to the spec's "stakeholders to update or consult" concept. **Not assumed identical** — needs an explicit decision (see open items below) on whether `watchers` is reused directly or whether stakeholders is a distinct concept that happens to look similar |
| `dependencies` | relation → task, manyToMany, self | This is already exactly the substrate for the task-to-task "Blocked by / Blocking" relationship decided in the spec. No new field needed — the existing flat self-relation is the right shape, we're just surfacing it with named UI (Blocked by/Blocking) instead of a generic "dependency" label |
| `milestone` | relation → milestone, manyToOne | This is already exactly the one-directional "task gates milestone" relationship decided in the spec. A task points at one milestone; nothing new needed here either |
| `parentTask` / `subtasks` | relation → task, self, one-to-many | **Not reused for the Step concept.** This is a generic, arbitrary-depth task nesting mechanism already in the schema — it's a different thing from our specific three-level Task → Stage → Step model, where Stage is a fixed semantic category and Step is the one level below it. Using `parentTask`/`subtasks` for steps would conflate two different concepts that happen to look similar |
| `progress` | integer 0–100 | Reused for the task-level rollup, computed from step completion rather than stored independently |
| `tags`, `customFields` | json | Available if needed, not actively used by this feature yet |
| Milestone: `name`, `dueDate`, `color` | — | Reused as-is. `color` already existing is a pleasant surprise — the diamond-with-connector-lines rendering decided in the spec can use the milestone's own stored color rather than a fixed palette value |

## New concepts that don't exist in the real schema today

| Concept | Proposed shape | Why it's needed | Where it would live |
| --- | --- | --- | --- |
| **Step** | A new content-type: its own `startDate`, `durationDays`, `assignee`, `reviewer`, `stakeholders`, `status`, a `stage` field, and a reference back to its parent Task | This is the core of the whole feature — the step, not the task, is the schedulable unit (spec: "Work model"). Nothing today represents "one dated, assigned, reviewed piece of a task" | New content-type, e.g. `api::task-step.task-step`, manyToOne back to `api::task.task` |
| **Stage** | An enum on Step (`planning` / `design` / `development` / `marketing`, tenant-owner-editable per project type per R1) | Steps need a semantic category for coloring and grouping on the chart; this doesn't exist as a concept anywhere in the current schema | Enum field on the new Step content-type, with the allowed values themselves eventually needing to live somewhere tenant-owner-editable (R1) — that template-editing mechanism is explicitly deferred, not designed here |
| **Reviewer** | A relation, distinct from `assignee` and from `watchers` | The schema has `assignee` (who does the work) and `watchers` (who's cc'd), but nothing for "who signs off on this specific step" — review/QA steps are worked *by* the reviewer (R4), a different role than either existing relation | New relation field on Step, `reviewer → app-user`, manyToOne |
| **Step-to-step dependency (cross-task)** | A relation between two Steps, not two Tasks | The existing `dependencies` field is Task-to-Task. Our model's dependency chain is at the Step level (a step in one task can depend on a step in a different task) | New self-relation on the Step content-type, manyToMany |
| **Sprint** | A new content-type with `name`, `startDate`, `endDate`, `capacity` | Confirmed via the CTO's own requirements doc: *"Sprint is only a filter over milestones, there is no timeline view"* — Sprint is not a real entity today, it's inferred. The spec's entire "a step belongs to whichever sprint its end date falls in" decision needs a real Sprint to belong to | New content-type, e.g. `api::sprint.sprint` |
| **Task/root-task gates Sprint** | A relation, Task → Sprint | The spec's gating hierarchy needs root-level tasks to gate a sprint, the same shape as gating a milestone, so the sprint's own risk state can roll up | New relation on Task (or computed from which sprint a task's steps' dates fall into, rather than an explicit field — open question, see below) |
| **Scenario / overlay state** | Not a Strapi concept at all for the prototype | Explicitly a slice-two, backend-wiring concern per the spec's "Slicing" decision. The prototype's scenario state lives entirely in the browser (Zustand + localStorage), with no real-data equivalent until slice two | N/A for now — when slice two happens, this becomes its own design question, not an extension of the Task/Step schema |

## What this means for the mock data itself

The prototype's existing mock data (`TASKS`, `BASE_SPRINTS`, `MS`, `BASE_LINKS` in the original `app.js`) used short, convenient internal names (`who`, `rev`, `stk`, `dur`) that don't match any real field name. When this gets ported into the standalone app, the mock data gets reshaped to use the real names from the tables above (`assignee` not `who`, `reviewer` not `rev`, `stakeholders` not `stk`, `durationDays` not `dur`) — so that swapping the mock data source for a real API call later is a data-fetching change, not also a field-renaming exercise.

## Open items this mapping surfaces, not yet decided

- **Is `watchers` the same thing as "stakeholders to update or consult," or a distinct concept that happens to look similar?** They sound alike but weren't designed for the same purpose — `watchers` today is a generic cc-list, while the spec's "stakeholders" concept is specifically about who needs updating when a step's dates move. Worth a real decision, not an assumption, before the Step content-type's stakeholder field gets built.
- **Does Task-gates-Sprint need to be an explicit stored relation, or can it be computed** (a task gates whichever sprint contains its last step's end date, the same way a step's own sprint membership is computed, not stored)? The latter is more consistent with the spec's existing "a sprint's risk state is a rollup, not stored" pattern — leaning toward computed, but not locked in here.
