---
labels:
  - wayfinder:research
status: closed
assignee: codex
blocks:
  - rendering-boundary-decision.md
---

# React Flow capability and ownership research

## Question

Against React Flow's official documentation and source for the pinned v11.11.4 package, can custom edges and handles coexist robustly with a separately-owned SVG Gantt during nested collapse, pointer-drag repainting, and cursor-anchored zoom? What ownership boundary would avoid imperative DOM synchronization and duplicate geometry?

## Resolution

See [the library and source findings](../findings/reactflow-capabilities.md). React Flow supports direct connections and custom edges, but its node transforms and cached handle bounds make the present SVG-overlay split inherently duplicated. Keep schedule/layout/SVG bars, and move dependency paths and direct-link gestures into the SVG instead of retaining invisible React Flow anchors.
