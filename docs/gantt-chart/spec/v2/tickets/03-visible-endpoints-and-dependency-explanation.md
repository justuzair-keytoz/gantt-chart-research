# 03: Visible endpoints and dependency explanation

**What to build:** When a task is hidden inside a collapsed task hierarchy, its dependency resolves to the nearest visible parent task rather than disappearing or falling back to an unrelated row. The selected task explains its incoming and outgoing dependencies in plain language so people can see why its timeline is constrained and who is affected.

**Blocked by:** [02 — Task-only row tree and stable bar placement](./02-task-only-row-tree-and-stable-bar-placement.md).

**Status:** ready-for-agent

- [ ] A dependency for a hidden grandchild resolves to its nearest visible task ancestor at any nesting depth.
- [ ] A selected task shows concise "Blocked by" and "Blocks" relationship explanations, including the linked task names.
- [ ] Collapsed, grouped dependency lines keep their existing non-removable behaviour and do not imply a single hidden link can be safely deleted.
- [ ] `npm run build` passes with zero TypeScript errors.
