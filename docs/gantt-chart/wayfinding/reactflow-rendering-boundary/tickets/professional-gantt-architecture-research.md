---
labels:
  - wayfinder:research
status: closed
assignee: codex
blocks:
  - rendering-boundary-decision.md
---

# Professional Gantt rendering architecture research

## Question

In publicly inspectable, production-grade Gantt implementations, which layer owns timeline geometry, dependency routing, collapse projection, and drag-to-connect? Use published source and official documentation only; distinguish public implementation facts from UI behavior inferred from screenshots or marketing.

## Resolution

See [the professional architecture findings](../findings/professional-gantt-architecture.md). DHTMLX, Frappe, and Bryntum all keep dependency drawing and direct linking within the Gantt timeline's coordinate system. The v2 spike should do the same with native SVG; React Flow should not remain as a second geometry system.
