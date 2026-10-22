# Professional Gantt rendering architecture

## Answer

The inspectable professional implementations put timeline geometry, task bars,
dependency rendering, and the dependency-create gesture in **one Gantt
timeline renderer**. They may split that renderer into DOM/SVG layers, but do
not use a separate node-graph canvas as a positioning authority.

This supports the narrow v2 change: retain `schedule.ts` and `layout.ts` as
the data/projection owners, and make the existing Gantt surface the sole
renderer and interaction owner for bars, link endpoints, paths, and the live
connection line. It does **not** support moving the entire chart to React
Flow, nor retaining React Flow as a second geometry system.

## Primary-source findings

### DHTMLX Gantt — full-featured timeline component

- **Timeline geometry and render layers are co-owned by one timeline view.**
  Its timeline creates sibling background, link, and bar containers in one
  timeline data area, then binds its task and link stores to those layers.
  The [timeline source](https://github.com/DHTMLX/gantt/blob/67d4425db50009705fbe41538d75c8f5f5ac9276/src/core/ui/timeline/timeline.js#L21-L74)
  and [layer configuration](https://github.com/DHTMLX/gantt/blob/67d4425db50009705fbe41538d75c8f5f5ac9276/src/core/ui/timeline/timeline_layers.js#L25-L60)
  show this directly. There is no graph-overlay dependency.
- **Bars and links consume the same timeline position model.** The bar renderer
  calls `view.getItemPosition(task)` and writes that `left`, `top`, `width`,
  and `height` to the bar. The link renderer obtains both tasks, calculates
  endpoints and route points through the same `view`, then renders the line,
  corners, and arrow into the Gantt's link layer. See the
  [bar renderer](https://github.com/DHTMLX/gantt/blob/67d4425db50009705fbe41538d75c8f5f5ac9276/src/core/ui/render/task_bar_render.js#L16-L102)
  and [link renderer](https://github.com/DHTMLX/gantt/blob/67d4425db50009705fbe41538d75c8f5f5ac9276/src/core/ui/render/link_render.js#L8-L79).
- **Direct linking is a timeline-native gesture.** The bar renderer adds its
  start/end link controls only when `drag_links` and `show_links` are enabled.
  The timeline's DnD controller starts from that control, derives source and
  target from the Gantt itself, draws a live direction line, validates via
  `isLinkAllowed`, and adds the link on drop. This is source fact, not a UI
  inference: [controls](https://github.com/DHTMLX/gantt/blob/67d4425db50009705fbe41538d75c8f5f5ac9276/src/core/ui/render/task_bar_render.js#L123-L154),
  [drag state and live endpoint](https://github.com/DHTMLX/gantt/blob/67d4425db50009705fbe41538d75c8f5f5ac9276/src/core/ui/timeline/links_dnd.js#L27-L69),
  [target tracking and temporary line](https://github.com/DHTMLX/gantt/blob/67d4425db50009705fbe41538d75c8f5f5ac9276/src/core/ui/timeline/links_dnd.js#L124-L195),
  and [validated add on drop](https://github.com/DHTMLX/gantt/blob/67d4425db50009705fbe41538d75c8f5f5ac9276/src/core/ui/timeline/links_dnd.js#L199-L225).
- **Collapse is a data-projection concern before link rendering.** A collapsed
  child is filtered from the task tree. The link store filters out a link when
  either endpoint is not visible, except for DHTMLX's split-task case; it does
  not hand a hidden child to a second renderer to guess an endpoint. See
  [visibility/link filtering](https://github.com/DHTMLX/gantt/blob/67d4425db50009705fbe41538d75c8f5f5ac9276/src/core/datastore/datastore_hooks.js#L202-L229).
  This differs from our desired nearest-visible-ancestor rule, but confirms
  the boundary: the row/tree projection decides visible endpoints before the
  route is drawn.
- DHTMLX's public documentation independently confirms `drag_links` defaults
  to enabled and creates dependencies by drag-and-drop:
  [official API documentation](https://docs.dhtmlx.com/gantt/api/config/drag_links/).

### Frappe Gantt — a smaller, inspectable SVG renderer

- **One SVG owns grid, bars, and arrows.** `render` makes grid, dates, bars,
  then arrows, while `setup_layers` creates SVG `grid`, `arrow`, `progress`,
  and `bar` groups. [Source](https://github.com/frappe/gantt/blob/5c83708d300a99d9142edea0d4d52f421e3a2e68/src/index.js#L371-L392).
- **Dependency paths read the bar rectangles from that same SVG model.** An
  arrow is constructed from the source and target bars and updates its own SVG
  `d` path after recalculation. [Creation](https://github.com/frappe/gantt/blob/5c83708d300a99d9142edea0d4d52f421e3a2e68/src/index.js#L889-L926),
  [routing/update](https://github.com/frappe/gantt/blob/5c83708d300a99d9142edea0d4d52f421e3a2e68/src/arrow.js#L13-L102).
- **Limit of this precedent:** master is flat and has neither task-tree
  projection/collapse nor a direct dependency-create gesture. It is evidence
  for one rendering coordinate system, not for v2 roll-up behavior or link
  controls. The project itself documents Frappe Gantt as a web Gantt library
  used by ERPNext, but that does not make its smaller feature set a product
  requirement: [official README](https://github.com/frappe/gantt/blob/5c83708d300a99d9142edea0d4d52f421e3a2e68/README.md#L1-L24).

### Bryntum Gantt — vendor architecture documentation

- Bryntum describes its Gantt as a TreeGrid: the left side shows hierarchy and
  the right side is the time axis; task relationships render as arrows in the
  background of that same view. It explicitly lists drag-and-drop dependency
  creation as a default interaction:
  [official Gantt API overview](https://www.bryntum.com/products/gantt-next/docs/api/Gantt/view/Gantt).
- Bryntum's dependency feature also exposes whether it redraws lines during
  task movement/resizing and during scroll—evidence that dependency repainting
  is a capability of the Gantt view, rather than an external graph overlay:
  [official Dependencies API](https://www.bryntum.com/products/gantt-next/docs/api/SchedulerPro/feature/Dependencies).
  Its implementation is proprietary, so this is vendor-documented behavior,
  not source-inspected code.

## Architecture consequence for v2

| Concern | Owner in the v2 spike | Basis |
| --- | --- | --- |
| Dates, task schedule, dependency validity | Existing schedule/store | Already the authoritative domain model; no professional source suggests duplicating it in a graph renderer. |
| Tree collapse and nearest-visible endpoint | Existing visible-row projection | DHTMLX filters links after visibility is decided; our differing ancestor roll-up rule belongs at this same boundary. |
| Bar rectangles and calendar zoom | Existing Gantt layout/SVG surface | Frappe and DHTMLX couple these coordinates directly to their link renderers. |
| Dependency paths, hit targets, selection, live temporary line | Existing Gantt SVG surface | Both source implementations keep paths with the timeline; DHTMLX also keeps direct linking there. |
| Direct linking | Pointer-captured Gantt gesture with the existing schedule validation | DHTMLX proves the pattern without a node graph. Keep the existing click/editor fallback for keyboard access. |

## What this does *not* prove

- No inspected source says every Gantt must use SVG; DHTMLX uses DOM layers and
  Frappe uses SVG. The durable pattern is **one timeline coordinate owner**,
  not one graphics technology.
- Neither inspected open source establishes our intended rule that a hidden
  child dependency visibly converges on its nearest collapsed ancestor. That
  remains a deliberate v2 product rule, to be implemented and tested in the
  visible-row resolver.
- This is architecture evidence, not visual-copying guidance. The local
  competitor screenshots remain the source for visual language and task-flow
  choices.

## Recommendation

Close the renderer decision as: **replace the React Flow overlay with native
SVG dependency paths and a native pointer drag-to-connect gesture, while
preserving the existing schedule, row projection, bar renderer, native scroll,
and zoom.** This is the smallest change that follows the professional
architecture pattern and removes the current duplicate geometry owner.
