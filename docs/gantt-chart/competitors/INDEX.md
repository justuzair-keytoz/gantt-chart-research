# Competitor research, one file per tool

Each file is self-contained: what the tool does, and where that came from. Add new screenshots or write-ups to the matching file as they come in, or add a new file for a tool not covered yet.

| Tool | What's useful about it |
| --- | --- |
| [Jira](./jira.md) | Live screenshots of Timeline, with and without dependencies set — the deepest look so far, including the clearest "blocks / is blocked by" UI seen in this research |
| [ClickUp](./clickup.md) | "Blocking" as a named relationship; a live walkthrough showing a real blocker chain drawn across three sprints on one chart |
| [Wrike](./wrike.md) | Conflict Monitor; a live walkthrough of real cross-sprint date cascading, with a confirm-before-applying step and sprint-level (not just task-level) dependencies |
| [Smartsheet](./smartsheet.md) | A flat-list Gantt, a separate auto-generated insights dashboard, a lighter pill-based Timeline view, and a Baseline-vs-Actual variance check |
| [Airtable](./airtable.md) | Closest existing data model match to this repo's `dependencies` self-relation; a live walkthrough covering the Milestone type, explicit Predecessors/Successors UI, invalid-dependency detection, and a separate Timeline view |
| [Notion](./notion.md) | The floor — simplest thing people still call a Gantt chart |
| [Linear](./linear.md) | Cycles as the sprint concept; a live walkthrough found project-level Blocked by/Blocking fields and cross-project dependency lines that secondhand write-ups said didn't exist |
| [Microsoft Project](./ms-project.md) | Roll-up Gantt bars on a collapsed summary task, Task Inspector/Task Path for highlighting what's driving a date, and a summary task's predecessor constraining its subtasks — documentation only, no screenshots, added 2026-10-21 |

Shared screenshot assets live in `../assets/`.
