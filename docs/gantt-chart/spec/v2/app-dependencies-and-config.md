# Standalone app — dependency and config policy, v2

Unchanged from [`v1/app-dependencies-and-config.md`](../v1/app-dependencies-and-config.md) except for the Gantt-specific React Flow reversal below — no new package is needed for anything this round proposes.

## Zoom needs no new package

v2's pinch-to-zoom requirement (DECIDED) and the continuous-zoom-with-presets design (PROPOSED) are both implementable with the prototype's own original approach: a native `wheel` event listener with `{ passive: false }` so `preventDefault()` can actually stop the browser's own page-zoom, triggered on `ctrlKey || metaKey`, driving a plain numeric day-width value through the same `DW`-consuming call sites that already exist (`layout.ts`, `Bar.tsx`, the native dependency-path layer, and the axis header in `FlatGantt.tsx`) — turning `DW` from a constant into state, not introducing a zoom/pan library.

**Pinch-gesture browser evidence, mixed, added 2026-10-21:** a W3C mailing-list report states that on Chrome and Firefox, a trackpad pinch gesture arrives as a `wheel` event with `ctrlKey` set — the same mechanism the prototype's own listener already relies on. Source: [W3C public-webapps mailing list, Oct 2024](https://lists.w3.org/Archives/Public/public-webapps-github/2024Oct/0088.html). An older, separate report states Safari instead dispatched its own proprietary `gesture*` events for pinch, not a `wheel` event at all. Source: [d3-zoom issue #229](https://github.com/d3/d3-zoom/issues/229). These two sources don't agree on Safari's current behavior, and neither is a screenshot or a firsthand test in this repo — **mark Safari as "test it" before relying on the `ctrlKey`-wheel approach there**, and keep a native `gesturechange` listener as the fallback path if testing shows Safari needs it (a browser API, not a new package, so this doesn't change the dependency table above either way).

## Everything else

The full reused-and-pinned table, the "why pin exactly" reasoning, the two transitive-dependency additions (`dayjs`, `autoprefixer`), the `@mantine/core`/`@mantine/dates` peer-dependency mismatch note, and the config-reuse section all carry forward unchanged — see [`v1/app-dependencies-and-config.md`](../v1/app-dependencies-and-config.md) for the full detail. If a new package is actually proposed for a later v2 ticket (none is, as of this writing), it gets pinned to the exact version already in `databonder-enterprise-search`'s `UI/package.json`, per the same policy, and documented here with why, the same as every entry in the v1 table already is.

## React Flow leaves this Gantt, not the destination product

**DECIDED 2026-10-21; implemented by ticket 01:** the standalone Gantt replaces its React Flow overlay with native SVG dependency paths and pointer-captured direct linking. This reverses v1's Gantt-specific integration decision, not the destination product's broader use of `reactflow` for `WorkflowDesigner`. Primary-source React Flow analysis plus public DHTMLX/Frappe/Bryntum evidence is recorded in [`../../wayfinding/reactflow-rendering-boundary/`](../../wayfinding/reactflow-rendering-boundary/map.md). Ticket 01 removed the last Gantt import and removed `reactflow` from this standalone app's `package.json` and lockfile; no replacement package was added.
