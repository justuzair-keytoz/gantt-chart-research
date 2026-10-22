# Gantt spike glossary

## Visible endpoint

The row or bar that represents a dependency endpoint in the current expanded/collapsed tree. A hidden child's endpoint projects to its nearest visible ancestor; it is not independently inferred by the dependency renderer.

## Dependency renderer

The timeline-surface mechanism that draws a dependency path, exposes its hit target, and runs the direct link gesture. It consumes visible endpoints and does not own dates, hierarchy, or scheduling validity.

## Linkable step

A visible scheduled step bar whose UID exists in the scheduling engine's dependency graph. It may start or receive a direct link. A plain task roll-up, sprint, or milestone is not linkable until group-level dependency semantics are explicitly designed.

## Source port

The persistent SVG pointer target immediately beyond a linkable step bar's resize grip. Its visible ring is feedback only; the larger transparent hit area remains mounted so a hover transition cannot make a direct-link gesture disappear.
