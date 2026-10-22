/** Converts the former `<sprint>::<task>` expansion paths to task-only ids. */
export function migrateExpandedRowIds(
  expanded: string[],
  sprintIds: string[],
  rootIds: string[],
): string[] {
  const prefixes = new Set([...sprintIds, "__unscheduled"]);
  const openedSprint = expanded.some((id) => prefixes.has(id));
  return Array.from(
    new Set(
      expanded
        .map((id) => {
          const [prefix, ...rest] = id.split("::");
          return prefixes.has(prefix) ? rest.join("::") : id;
        })
        .filter(Boolean)
        .concat(openedSprint ? rootIds : []),
    ),
  );
}
