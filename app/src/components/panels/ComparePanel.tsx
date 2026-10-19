"use client";

// Ported from prototype/app.js's renderCompare() — the multi-scenario
// side-by-side scorecard (slip, spills, risk, readiness against gates).

import { Paper, Table, Text } from "@mantine/core";
import { computeSchedule, emptyOverlay, type ScheduleContext } from "@/lib/engine/schedule";
import type { Scenario } from "@/lib/engine/types";

export function ComparePanel({
  ctx,
  scenarios,
  asOf,
}: {
  ctx: ScheduleContext;
  scenarios: Scenario[];
  asOf: string;
}) {
  const baseline = computeSchedule(ctx, emptyOverlay(), asOf, null).units;
  const cols = scenarios.map((s) => ({
    s,
    sm: computeSchedule(ctx, s.ov, asOf, baseline).summary,
  }));

  const rows: [string, (c: (typeof cols)[number]) => string][] = [
    ["Steps moved (tasks)", (c) => `${c.sm.moved} (${c.sm.movedTasks})`],
    ["Max slip (days)", (c) => String(c.sm.maxSlip)],
    ["Sprint spills", (c) => String(c.sm.spills)],
    ["Critical / expired", (c) => String(c.sm.critical + c.sm.expired)],
    ["Warnings", (c) => String(c.sm.warning)],
    ["Informational", (c) => String(c.sm.info)],
    ["Stakeholders to update", (c) => Object.keys(c.sm.notify).join(", ") || "—"],
    ["Sprints over capacity", (c) => c.sm.overSprints.join(", ") || "none"],
    ["Overcommitted person-sprints", (c) => String(c.sm.overCells)],
    ["Idle person-days", (c) => String(c.sm.idleDays)],
    ["Waiting days between steps", (c) => String(c.sm.gapDays)],
  ];

  return (
    <Paper withBorder p="sm" radius="md">
      <Text fw={600} size="sm" mb="xs">
        Compare scenarios
      </Text>
      <Table fz="xs">
        <Table.Thead>
          <Table.Tr>
            <Table.Th></Table.Th>
            {cols.map((c) => (
              <Table.Th key={c.s.id}>{c.s.name}</Table.Th>
            ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map(([label, f]) => (
            <Table.Tr key={label}>
              <Table.Th>{label}</Table.Th>
              {cols.map((c) => (
                <Table.Td key={c.s.id}>{f(c)}</Table.Td>
              ))}
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Paper>
  );
}
