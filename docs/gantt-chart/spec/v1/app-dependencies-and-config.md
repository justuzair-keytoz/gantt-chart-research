# Standalone app — dependency and config policy

What this covers: which packages and config the standalone prototype app reuses from `databonder-enterprise-search`'s real `UI/`, pinned to exact versions, and why. The point of this document is that when the prototype moves into the real app, the dependency story should already match — nothing here should need re-justifying at that point.

## Why pin exactly, not loosely

Every reused package below is pinned to the **exact version** found in `UI/package.json` — not `^` or `~` ranges. The goal of building this prototype outside `databonder` was never to end up on a different version of React or Mantine than the app it's going to live in; drifting even a minor version apart just reintroduces a compatibility problem at the exact moment this is supposed to port cleanly. A pinned match means the eventual move is "copy the component in," not "resolve a version conflict first."

## Reused, pinned to the exact version in `UI/package.json`

| Package | Version | Why it's reused rather than reinvented |
| --- | --- | --- |
| `next` | 14.2.3 | The actual destination framework. No reason to prototype in anything else. |
| `react` / `react-dom` | 18 | Comes with Next 14.2.3; no choice to make here. |
| `typescript` | 5 | Same reasoning as Next — this is what the port target uses. |
| `zustand` | 4.5.4 | Already the state-management choice in `UI/`. The scenario/overlay model (baseline, active scenario, scenario list) maps onto a Zustand store directly — no reason to introduce Redux, Jotai, or hand-rolled context for this. |
| `@mantine/core`, `@mantine/hooks`, `@mantine/dates`, `@mantine/form`, `@mantine/modals`, `@mantine/notifications` | 7.10.1 / 8.2.7 (dates) | UI chrome — buttons, the commit dialog, the step editor popover, toasts. Building these from scratch in the prototype just to rebuild them in Mantine during the port would be pure waste. |
| `tailwindcss` | 3.4.1 | Confirmed actually in use alongside Mantine (bridged via `postcss-preset-mantine`) — corrects an earlier assumption in this research that the stack was Mantine-only. Utility classes for layout/spacing; Mantine components for anything stateful or interactive. |
| `ag-grid-community`, `ag-grid-react` | 33.0.1 | Already used for the existing Table view. **Not** used for the Gantt's sticky sidebar/tree (see `spec.md` — Tree Data and column pinning are Enterprise-only, and this app runs Community, confirmed via `UI/package.json` with no `ag-grid-enterprise` package and no `LicenseManager.setLicenseKey` call anywhere). Pinned here only in case any other part of the prototype ends up needing a plain data grid. |
| `reactflow` | 11.11.4 | Already used in a real feature (`WorkflowDesigner` — a node/edge diagram editor with custom node types under `UI/src/component/WorkflowDesigner/`). This is proven, working prior art in this exact codebase for "draw a connecting line between two things by dragging," which is exactly our dependency-link requirement (step↔step, task↔task, task↔sprint/milestone). **Committed, not a toss-up**: the v0 build tried wiring it in and found it genuinely awkward — reactflow wants to own node positioning itself, and our lines need to follow bars that live on a date-driven grid, not wherever reactflow would place them — so v0 shipped with a small hand-rolled SVG line-drawing function instead, as an explicitly temporary stand-in. The decision is to push through that integration difficulty anyway, specifically because the alternative is maintaining a second, bespoke line-drawing system indefinitely instead of one shared, already-proven library. The hand-rolled version in v0 is the thing being replaced, not the new plan. |
| `react-dnd`, `react-dnd-html5-backend` | 16.0.1 | Already used in `TaskManager` and `Kanban` for drag-and-drop. Relevant specifically for **reassignment** drag — dropping a step onto a different person's lane (R30) — which is a discrete pick-up/drop-zone interaction, exactly react-dnd's shape. **Not** used for the reschedule drag (dragging a bar along the continuous date axis) — that interaction needs raw pixel-to-date math mid-gesture, which plain pointer events handle better than a drop-zone library; see the "React porting risk" findings below. |
| `eslint` 8, `eslint-config-next`, `eslint-config-prettier`, `eslint-plugin-react`, `eslint-plugin-react-hooks`, etc. | exact versions in `UI/package.json` | Copied wholesale, not reinvented. Costs nothing, avoids a conformance gap at port time, and the spec already commits to testing the scheduling core as pure functions — consistent lint/type config from day one supports that. |

## New packages added for this prototype that aren't in `databonder` today

Two showed up once the app was actually scaffolded and installed — not speculative additions, both required to make `npm install`/`npm run build` succeed at all:

| Package | Version | Why it's needed |
| --- | --- | --- |
| `dayjs` | 1.11.11 | A transitive requirement of `@mantine/dates@8.2.7`. Not a deliberate choice, just what that package needs underneath — `databonder`'s own `UI/package.json` ends up with the same dependency for the same reason. |
| `autoprefixer` | 10.4.19 | Required by the `postcss-preset-mantine` + Tailwind pipeline to actually run `next build`. Standard PostCSS tooling, not a feature decision. |

Everything else — no Gantt library, no new state management, no new drag library beyond what was already pinned — held exactly as planned. Both of the above are the kind of dependency-of-a-dependency that doesn't show up until you actually try to install, which is exactly why this table says "as of this writing" rather than claiming to be complete in advance.

## A real version conflict, not a mistake

`@mantine/core@7.10.1` and `@mantine/dates@8.2.7` — both pinned exactly as `databonder`'s own `UI/package.json` has them — don't actually satisfy each other's peer-dependency requirements (`@mantine/dates@8.2.7` expects `@mantine/core@8.2.7`). This isn't a porting mistake; `databonder`'s own `package.json` has the identical mismatch, pinned the identical way. A fresh `npm install` needs `legacy-peer-deps=true` (set in `app/.npmrc`) to get past it. Worth flagging rather than silently working around: this version gap already exists in the real app today and should probably get resolved there independently of this feature, not just papered over here.

## Config reused, not reinvented

- **Mantine theme** (`UI/src/component/Providers/Providers.tsx`) — the `myBlue` primary color and the `MantineProvider`/`Providers` wrapping pattern are reused directly, not re-derived. The prototype's own severity-tier colors (critical/warning/expired/informational) are a separate concern from the brand theme and don't need to fight it — they're semantic status colors, not primary-brand colors, so they stay close to what the prototype already has (`--crit`, `--warn`, `--exp` custom properties) rather than being forced into Mantine's color system where they don't conceptually belong.
- **Tailwind color tokens** (`UI/tailwind.config.ts`) — named tokens like `neutral-light`, `divider-light`, `secondary-light`, `text-muted` are reused for layout/chrome (borders, muted text, background bands) instead of inventing new arbitrary hex values for the same visual roles.
- **Not reused wholesale:** the full Tailwind `content` glob paths, since the prototype app has its own folder structure — only the `theme.extend.colors` token values get carried over, not the build configuration around them.

## What this means for the port later

When this prototype moves into `databonder-enterprise-search` for real, the dependency diff should be close to empty — same Next.js version, same Mantine version, same Zustand, same ag-grid tier, same reactflow and react-dnd already in the app for unrelated features. The actual porting work is moving components and the store into the real app's folder structure and wiring real Strapi data instead of the mock data described in `data-shape-mapping.md` — not resolving a pile of version conflicts or deciding, after the fact, which of two drag libraries to standardize on.
