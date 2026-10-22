---
labels:
  - wayfinder:grilling
status: closed
assignee: codex
---

# Rendering boundary decision

## Question

Given the capability and competitor-evidence findings, should v2 retain React Flow for dependency creation/routing, narrow it further, or replace it with a native SVG dependency layer while preserving direct drag-to-connect?

## Resolution

Replace the React Flow overlay with native SVG dependency paths and a pointer-captured direct-link gesture. Preserve `schedule.ts`, the visible-row projection, existing SVG bars, native scroll, and cursor-anchored zoom. This reverses the earlier Gantt-specific React Flow integration decision because it duplicated date-grid geometry and required imperative synchronization; React Flow remains a valid product dependency for its existing node-graph use elsewhere.
