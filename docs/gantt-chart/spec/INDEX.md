# Spec, versioned by iteration

Each iteration gets its own folder here — `v1/`, `v2/`, and so on. A version folder is a frozen, complete snapshot of the spec as it stood for that iteration, not a diff against the one before it. The point: once `v2` exists and changes something `v1` decided, `v1/` still reads exactly the way it did when it was the live plan — nobody has to reconstruct "what did we actually say back then" from git blame across a file that's been edited fifty times since.

## Versions

| Version | Scope |
| --- | --- |
| [v1](./v1/spec.md) | The step/stage/task work model, the scenario engine, risk severity, and everything decided across the grilling sessions — built as a standalone Next.js prototype (`app/`, tagged v0) on fake data, no backend wiring |
| [v2](./v2/spec.md) | Arbitrary-depth nesting with rolled-up bars on collapse, sprints as calendar bands instead of container rows, a human-readable reason model for schedule changes, a rule-driven "Blocked" model beyond date overlap, and pinch-to-zoom — triggered by PM/user feedback on the running v1 app and a code-level review of v1 itself. No tickets written yet. |

## The rule for starting a new version

When an iteration's scope is actually settled and work begins on the next one, copy the current spec folder to `vN+1/` as the starting point, then edit forward from there — don't keep editing `vN/` in place once `vN+1/` exists. If `vN+1/` reverses a `vN` decision, say so plainly in `vN+1/` ("this replaces vN's X, because Y") the same way corrections have been handled inline up to now — the new version is where the correction lives, not a rewrite of the old one pretending it was always this way.

A version folder doesn't need to repeat everything from scratch if nothing changed — "unchanged from v1, see that file" is a legitimate line in a later version's doc. The bar is: someone should be able to open `v1/` after `v3` exists and still understand what `v1` actually committed to, without needing `v2` or `v3` open at the same time to make sense of it.

## What doesn't get versioned this way

The research that the spec is built on — `../00-discovery-and-scoping.md`, `../01-feature-plan.md`, `../competitors/` — isn't iteration-scoped. It's one-time investigation that informs every iteration, not a plan for a specific one, so it stays at the top level and gets updated in place (with corrections noted inline, as already happened a few times) rather than forked per version.
