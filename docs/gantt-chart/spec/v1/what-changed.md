# V1 vs. the original prototype

A submission log comparing v1 of the Gantt experiment against the original prototype at `prototype/`, formatted as tickets since this repo has no issue tracker of its own (per `AGENTS.md`). This is not [`CHANGELOG.md`](./CHANGELOG.md): the changelog tracks build-session-by-build-session changes against this version's own prior state; this document tracks the same work against the original prototype's actual behavior, for reporting purposes. Scoped to genuine product and behavior changes only — framework, library, and rendering-stack bugs (hydration errors, crash guards, CSS quirks from the libraries involved) are excluded, as those are implementation details of the chosen tech stack rather than improvements over what the prototype did or didn't do as a Gantt tool. Full technical detail, including the stack-level fixes this document excludes, lives in `CHANGELOG.md` and `spec.md`.

---

**1. Research · Prototype audit prior to implementation**
`prototype/app.js` reviewed in full before any change was made. Several behaviors initially assumed to be regressions — the non-functional default-expanded row list, the fixed two-month calendar window, scenario auto-creation on edit — were confirmed present in the original prototype, not introduced by the port.

**2. Research · Root cause of tasks disappearing under drag**
Investigated reports of tasks vanishing when dragged beyond a certain point. Traced to the chart's drawing surface having a fixed boundary with no constraint preventing a drag from crossing it. Confirmed via the coordinate calculations, not inferred.

**3. Research · Scheduling-accuracy verification of the sample dataset**
Working-day scheduling math verified by hand for every milestone prior to the dataset reseed, rather than assuming nominal input dates would produce the intended risk distribution. Initial reseed draft produced three critical-severity milestones against an intended mix of one critical, two warning, and one clean; identified and corrected through calculation rather than visual inspection.

**4. Research · Prior-art review for drag-to-connect**
An existing, working drag-to-connect implementation elsewhere in the same codebase (a workflow editor in the production product) reviewed prior to designing the Gantt chart's own connection interaction.

---

**5. Feature · Drag-and-drop dependency linking**
Dependency links could previously only be removed by click; no interaction existed for creating one. A link can now be created by dragging from one task to another, with a visible handle indicating the connection point.

**6. Feature · Collapsible sprint/task/step hierarchy**
The prototype rendered sprints as a flat colored strip above the timeline with no nested structure. Sprint, task, and step rows are now a proper collapsible hierarchy, with row labels fixed in place during horizontal scroll.

**7. Feature · Three-tier calendar header**
The prototype's calendar header showed one date label per week. Replaced with a header showing month, weekday initial, and date number concurrently, at a zoom level where all three remain legible.

**8. Feature · Drag boundaries with live visual feedback**
No limit previously existed on how far a drag could cascade. Dragging past a deadline, the edge of the visible calendar, or a task's allotted duration now halts the drag and applies a live red indicator for the duration of the gesture, rather than only surfacing the conflict after release.

**9. Feature · Conflict indicator between dependent steps**
A dotted red connector now renders between two steps whose timing conflicts as a result of a drag. No equivalent indicator existed previously.

**10. Feature · Dependency-line consolidation on row collapse**
Collapsing a sprint now consolidates its tasks' dependency lines into a single line rather than removing them from view. Row collapsing did not exist in the prototype, so no equivalent behavior was previously possible.

---

**11. Fix · Default row-expansion state**
The default list of expanded rows referenced identifiers that matched no row in the tree, present since the original prototype — rows were never expanded by default. Corrected to reference valid sprint identifiers.

**12. Fix · Milestone label overlap**
The prototype's mitigation for overlapping milestone labels staggered them across two rows, reducing but not eliminating the overlap. Each milestone is now assigned its own row, removing the possibility of overlap.

---

**13. Improvement · Milestone placement aligned to preceding sprint**
Milestones previously rendered as a single block at the end of the chart regardless of due date. Each milestone now renders immediately following the sprint that leads up to it. The prototype's own milestone placement was a header annotation with no sequencing logic, so this is an improvement over the port's prior behavior rather than a direct upgrade of prototype behavior.

**14. Improvement · Calendar window anchored to the current date**
The calendar window previously covered a fixed two-month span tied to one specific year. It now anchors to the current date, keeping the chart usable independent of when it is opened.

**15. Improvement · Visual distinction between critical and warning severity**
The critical/expired risk outline changed from solid to dashed, distinguishing a deadline violation from a standard warning at a glance.

**16. Improvement · Structured sample dataset**
The sample dataset restructured to distribute milestones across sprints rather than clustering them, include a deliberately overdue task so conflict styling is demonstrable without manual setup, and add a sprint to accommodate work spilling past the final sprint.

---

**17. Won't do (this version) · 3D/4D replay view**
The prototype's 3D/4D replay mode is not carried into this version. Removed from scope earlier in the project; not an oversight.

## Known Issues:

- disabled scenarios
- sometimes after link/re-link the nodes' links show out of place.
- milestones/sprints arent fully yet linkable to tasks/subtasks that it depends on to complete
- no clear indicators of what removes a link.
- Dragging a task/item out of the milestone/sprint's deadline pushes it to new sprint section
- the node links need a better way of converging and diverging for simpler tracing by user
