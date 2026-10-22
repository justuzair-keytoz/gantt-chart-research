# 02: Visible endpoints and dependency explanation

**What to build:** When a task is hidden inside a collapsed hierarchy, its dependency resolves to the nearest visible parent bar rather than falling back to an unrelated sprint row. The selected task explains its incoming and outgoing dependencies in plain language so people can see why its timeline is constrained and who is affected.

**Blocked by:** [01 — Native dependency paths and direct linking](./01-native-dependency-paths-and-direct-linking.md).

**Status:** ready-for-agent

- [ ] A dependency for a hidden grandchild resolves to its nearest visible task ancestor at any nesting depth.
- [ ] A selected task shows concise "Blocked by" and "Blocks" relationship explanations, including the linked task names.
- [ ] Collapsed, grouped dependency lines keep their existing non-removable behaviour and do not imply a single hidden link can be safely deleted.
- [ ] `npm run build` passes with zero TypeScript errors.
