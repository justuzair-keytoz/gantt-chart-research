# Mock data shape v2 — new concepts from this round

Starting point: [`v1/data-shape-mapping.md`](../v1/data-shape-mapping.md). Everything in that file not named below is unchanged — same reused-field table, same Step/Stage/Reviewer/Sprint new-concept table, same open items about `watchers` vs `stakeholders` and whether task-gates-sprint should be stored or computed (still open, not resolved by this round).

All of the below stems from v2/spec.md's PROPOSED decisions — none of this is a built schema, and none of it should be read as more settled than the spec itself marks it.

## New concepts this round introduces

| Concept | Proposed shape | Why it's needed | Status |
| --- | --- | --- | --- |
| **Contacts** | A many relation on Task (and inherited down to its subtasks, per the spec's PROPOSED placement), replacing the free-text `stakeholders` concept rather than sitting alongside it | The project owner's own experimental ask: a list of people to contact when someone hits a blocker on a task. Explicitly not Jira's "reporter" (who raised the issue) | PROPOSED, naming not finalized — the project owner was open to suggestions here, not committed to "Contacts" |
| **Checkpoint (handoff point)** | PROPOSED: not a new field at all — a step with a handoff requirement is split into child steps, and the dependent step's link points at the specific child representing the checkpoint | Avoids inventing a new dependency type; reuses the same nesting mechanism this round already needs for arbitrary-depth subtasks | PROPOSED, and contingent on an OPEN question: whether the checkpoint is a named step (this proposal), a percentage, or a fixed day offset was never confirmed |
| **`reason` on a schedule change** | A short enum (scope grew / waiting on someone / person was out / estimate was wrong / priority changed / other) plus optional free text, attached to the Decision Record entry for that change | Answers feedback item #2 directly: a human-readable reason a *viewer* can read, not just a system-computed cause | PROPOSED — reuses the existing Decision Record entry shape (`why`, `when`, `n`) with new fields, rather than a new subsystem |
| **`causedBy` on a schedule change** | A reference from a cascaded step's own Decision Record entry back to the entry that caused its push | Lets a downstream step's tooltip read "Pushed +3d by Design review (reason, person, date)" instead of just showing that it moved, without re-deriving the cause each time | PROPOSED |
| **Committed sprint, separate from current position** | PROPOSED: a task's sprint *commitment* becomes a stored or otherwise-fixed fact, independent of `sched.units[uid].sprint` (today's live-recomputed "whichever sprint the current end date falls in") | Directly addresses the reversal named in `spec.md`'s Further Notes — without this split, "spill" cannot be represented; a task's sprint membership and its current position are the same fact today | PROPOSED, no concrete field shape designed yet — whether this is a new relation (Task → Sprint, committed) or a timestamp-frozen snapshot of membership at some commit point is undecided |

## `parentTask`/`subtasks` — verified against the real schema, not assumed

v1's mapping deliberately avoided `parentTask`/`subtasks` for the Step concept, reasoning that it's a generic nesting mechanism, distinct from the specific Task → Stage → Step model. Re-read directly this round (read-only, `databonder-enterprise-search/Strapi/src/api/task/content-types/task/schema.json`, never edited from this repo):

```json
"parentTask": { "type": "relation", "relation": "manyToOne", "target": "api::task.task", "inversedBy": "subtasks" },
"subtasks": { "type": "relation", "relation": "oneToMany", "target": "api::task.task", "mappedBy": "parentTask" }
```

Confirmed exactly as v1's mapping doc described: a self-referential, arbitrary-depth parent/child relation on Task, already in use by Table and Kanban today. **DECIDED 2026-10-21, directly by the project owner:** the Gantt's subtasks *are* this same `parentTask`/`subtasks` relation — a task's existing Table/Kanban subtasks show up in the Gantt automatically, not a separate nesting layer that happens to reuse the same field shape. For `app/`'s own fake-data prototype, which has no Strapi relations at all, this settles the semantics (a child is a full task, recursively, not a lesser Step-shaped node) without itself specifying the mock-data representation — see `spec.md`'s "Consequence of the above" note for that distinction.

No `reporter`-named field exists anywhere in the Task schema — confirmed by a direct search this round, not assumed from the absence of a prior mention. This is additional, independent confirmation that "Contacts" (or whatever this round's people-list ends up named) has no existing schema analogue to reuse or conflict with, beyond the already-open `watchers`/`stakeholders` question v1 raised.

## `ruleengine/` — existence confirmed, not newly investigated in depth

`databonder-enterprise-search/ruleengine/` exists with two subdirectories, `rules-service` and `rules-studio` — confirmed reachable and present this round (read-only, not edited). v1's `spec.md` already names this as the thing the risk/scheduling engine's "evaluate and surface" lifecycle is meant to match the shape of, for consistency with the rest of the codebase's conflict-detection moat. This round's Blocked-rules table (`spec.md`) would be the first concrete surface that actually needs to match that shape in practice — worth a closer read of `ruleengine/`'s actual rule-definition format before that table gets built for real, not assumed compatible from its existence alone.
