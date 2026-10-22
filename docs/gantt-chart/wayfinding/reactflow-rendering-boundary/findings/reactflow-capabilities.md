# React Flow capability and ownership research

## Answer

React Flow v11.11.4 can draw a custom SVG edge and can create a connection by
dragging between `Handle`s. It is **not** a robust narrow overlay for this
Gantt as currently composed. The overlay has already had to duplicate every
bar's bounds and mutate React Flow's rendered nodes and edge paths outside
React on each drag frame. Collapse and the Gantt's cursor-anchored date zoom
add more cases where the two geometry systems can disagree.

**Recommendation: make the Gantt's SVG the sole owner of dependency
rendering _and_ dependency drag-to-connect.** Remove React Flow from this
chart slice; do not rewrite the schedule engine, row tree, bar renderer, or
zoom. This is a contained renderer-boundary correction, not a whole-chart
rewrite. It gives every bar, collapsed roll-up endpoint, link path, temporary
connection line, and hit target one source of coordinates: the existing
`barPosForRow` / `resolveVisibleRow` result.

The alternative is also valid in principle, but much larger: move the actual
Gantt bars, resize interaction, row/collapse projection, and viewport into
React Flow custom nodes and let React Flow own all positions and transforms.
Do not keep the current middle ground of SVG bars plus React Flow anchor
nodes.

## Version and sources

- The app pins [`reactflow` at `11.11.4`](../../../../../app/package.json).
  The upstream [11.11.4 release](https://github.com/xyflow/xyflow/releases/tag/11.11.4)
  identifies commit `ecdac16` and includes `@reactflow/core@11.11.4`; the
  installed `@reactflow/core/package.json` confirms that exact core version.
- React Flow's official [connection-event API](https://reactflow.dev/api-reference/react-flow)
  documents `onConnect` for a completed source/target connection and
  `isValidConnection` for central validation. This supports the required
  direct drag-to-connect interaction.
- Its official [custom-edge guide](https://reactflow.dev/learn/customization/custom-edges)
  documents that custom edges are React components rendering SVG paths. It
  therefore supports our elbow and milestone visuals, but does not require
  React Flow for them.
- Exact-v11 shipped source was inspected from the installed
  [`@reactflow/core` ESM bundle](../../../../../app/node_modules/@reactflow/core/dist/esm/index.js):
  `NodeWrapper` writes node coordinates into `style.transform`; `getHandleBounds`
  measures handle/client rectangles; and `updateNodeDimensions` caches those
  measurements. The same released source is in the upstream
  [`ecdac16` tree](https://github.com/xyflow/xyflow/tree/ecdac16/packages/core).
  This is behavior, not an assumption about a later React Flow version.

## What the current integration proves

`DependencyEdgesLayer` freezes React Flow's viewport at `1` and disables its
pan, wheel, pinch, node-drag, and selection behavior. `FlatGantt` then gives
React Flow an invisible anchor node for each linkable unit, using the
date-grid's bar position and width. Its custom `DependencyEdge` intentionally
ignores React Flow's computed `sourceX`, `sourceY`, `targetX`, and `targetY`;
it draws from duplicate `BarPos` values placed in edge data instead.

During a task drag, `useBarDrag.paintFrame` imperatively changes:

1. the real SVG bar and resize grip;
2. the React Flow node's CSS transform and width; and
3. the React Flow custom edge path's `d` attribute.

That is three render surfaces for one logical bar/link operation. The
implementation works for a static render, but its source-of-truth boundary is
already breached. A subsequent React render is relied on to overwrite the
direct mutations.

React Flow's source makes the risk concrete: it records handle bounds from
DOM measurements in its internal store, while this Gantt moves anchor DOM
nodes without updating that store. Calling `useUpdateNodeInternals` would
measure again on an animation frame, but would still require maintaining the
duplicate anchors and their positions every drag frame. It repairs a symptom,
not the ownership split.

## Collapse, drag, and zoom assessment

| Situation | Can the current split render it? | Robust without imperative sync? | Why |
| --- | --- | --- | --- |
| Static visible bars | Yes | Mostly | Both layers receive the same computed bounds during React render. |
| Collapsed descendants | Partly | No | The app projects hidden endpoints to an ancestor for routing but must retain a separate invisible React Flow node because React Flow requires source/target node ids. Visible handles and routed endpoints now follow different rules. |
| Live move/resize | Yes, with current patching | No | The SVG bar moves outside React; React Flow's DOM node, cached handle geometry, and edge DOM must be manually chased. |
| Cursor-anchored Gantt zoom | Yes, after a render | No | The chart changes day width and native scroll while React Flow's own transform remains `1`. Every anchor/node/path has to be regenerated from external grid geometry. |
| Direct link creation | Yes | Yes, if React Flow owns nodes; otherwise no | `Handle`/`onConnect` is sound when its own nodes are the geometry. In the overlay it inherits stale/borrowed anchor ambiguity. |

## Smallest safe boundary

Keep these existing owners unchanged:

- `schedule.ts`: dates, dependency validity, cascade calculation.
- `layout.ts`, `barPosForRow`, and `resolveVisibleRow`: visible row and date
  geometry, including the collapsed-parent projection rule.
- `FlatGantt` / `Bar` / `useBarDrag`: SVG bars, resize/move behavior, native
  scroll and the cursor-anchored day-width zoom.

Move only this responsibility out of React Flow and into the existing SVG:

- dependency and milestone paths;
- small SVG link handles on bars that are genuinely visible;
- the one temporary line and target highlight used while dragging a link;
- pointer capture and the existing `state.addLink` call on a valid drop.

The path functions (`elbowPath`, `milestonePath`) are already plain SVG path
functions and can remain as-is. The integration-specific pieces to delete are
the `flowNodes`/`flowEdges` projection, `DependencyEdgesLayer`, `Handle`, and
the React Flow DOM queries in `paintFrame`. This removes the duplicated
geometry instead of introducing a third synchronisation helper.

## Decision implication

The v1 dependency policy chose React Flow because the production product had
proven drag-to-connect prior art. The v2 spike exposes a different constraint:
this is a date-grid chart, not a free-positioned node canvas. Reversing that
renderer decision here is justified if the implementation keeps the direct
link gesture and preserves the same dependency validation; it is not a reason
to replace the schedule or row model.

Before implementation, confirm the direct-link affordance against the
competitor screenshot evidence and define one manual browser scenario: drag a
visible bar while a nested branch is collapsed, then create and remove a link
after zooming. That scenario exercises the exact boundary this research
addresses.
