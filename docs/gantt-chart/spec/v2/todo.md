# v2 — still open, needs more ideation/research/engineering before it can be ticketed

Temporary working doc, not part of the versioned spec proper — tracks what's genuinely unresolved so it doesn't get silently assumed while the clear-to-build items move ahead in parallel. Each item names what's blocking it and what kind of pass would unblock it. See `spec/v2/spec.md` for the full decision record these all trace back to.

## Needs a direct decision from the project owner (grilling)

- **Does a sprint keep its own row in the tree, in addition to the new calendar band?** Blocks scoping the sprint-bands work precisely — built the additive-band version in the meantime (band only, row untouched), see `CHANGELOG.md`.
- **Concrete example of "nobody assigned but overlapping."** Can't write this Blocked rule precisely without one.
- **Handoff checkpoint shape** — named step, percentage, or day offset. Recommended: named step (reuses nesting). Not confirmed.
- **Contacts vs. `watchers` vs. `stakeholders`** — recommended resolving the older `watchers`/`stakeholders` ambiguity first, then deciding if Contacts is a third thing or a rename of one of those two.
- **Per-rule behavior for the Blocked table** — which rules block outright, which warn-and-allow-with-reason, which just flag. Table exists (`spec.md`), behaviors don't yet.
- **Stage-dependency multi-predecessor expansion** — the single-predecessor case has a clear precedent (MS Project); more than one gating stage feeding the same dependent stage isn't designed against a concrete case yet.

## Confirmed bugs, not yet fixed

- **Dependency/milestone lines converge on the wrong point, or don't converge at all, leaving dangling line fragments when rows are collapsed — screenshot-confirmed, still broken after one fix attempt.** A first attempt (making a collapsed-ancestor's connect-handle dot invisible) was real and correct on its own terms but did not resolve this — confirmed by the project owner re-testing, not assumed fixed. Re-reading `app/src/components/FlatGantt/resolveLinkEndpoint.ts`'s `resolveVisibleRow()` after seeing the actual screenshots found a second, more likely root cause: it only climbs **one** level — a hidden step's row, then `${sprintId}::${taskId}`, then the sprint row — with no awareness of this round's new arbitrary-depth task nesting, where a nested task's real row id is `${parentRowId}::${childId}`, potentially several segments deep (see `layout.ts`'s `buildTaskSubtree`). For any step belonging to a *nested* (non-root) task, this function has no way to construct that id and falls straight through to the sprint-level fallback, skipping every intermediate parent-task row — which would produce exactly the kind of "line terminates at the wrong level" artifact in the screenshots, for the new nested example (`OAK-200`/`201`/`202`) specifically. **Not fully confirmed as the whole story**: the screenshots show several near-duplicate, slightly-offset bracket/elbow shapes stacked close together, which is more visual clutter than the 2-3 new nested steps alone would obviously explain — there may be a second, separate dedup gap beyond the nesting-unaware climb. Needs either a real browser to actually watch this render, or a careful trace of `FlatGantt.tsx`'s `flowEdges` grouping logic against the *specific* collapsed state shown in the screenshots, not another guess from first principles.

## Needs a research or engineering pass, not a conversation

- **Safari's pinch-gesture behavior** — zoom itself is now built (ctrl/meta-wheel, anchored, ported from the prototype — see `CHANGELOG.md`), but the evidence on Safari specifically is contradictory (see `app-dependencies-and-config.md`'s citation); needs someone to actually test a trackpad pinch in Safari, not another doc search.
- **`ruleengine/`'s actual rule-definition format** (`databonder-enterprise-search`, read-only) — confirmed to exist this round, not read in depth. Worth a real read before the Blocked-rules table gets built to match its shape, not just assumed compatible.
- **Reason-chip taxonomy and the `causedBy` inheritance UI** — the visual language for *spill* is now pinned down (the project owner's mockup), but the actual reason-entry interaction (the chip picker, where/how a reason gets attached, what "required past a hard edge" looks like as a flow) isn't designed yet.
- **Rolled-up segment merge/crowding thresholds** — "segments merge where they overlap, a crowded group shows a state pill instead" is the principle; the actual threshold and merge rule aren't specified.
- **Commitment/position data shape** — whether "committed sprint" is a new stored relation or a frozen snapshot taken at some commit-like point isn't decided, independent of the rendering (which is clear, see the project owner's mockup).

## Status

Nothing in this file should be read as decided. As each item resolves, it moves into `spec.md` proper (as a DECIDED line, replacing its PROPOSED/OPEN marker) and gets struck from here — this file empties out over time, it doesn't grow a parallel permanent record.
