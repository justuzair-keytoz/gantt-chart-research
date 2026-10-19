"use client";

// Ported from prototype/app.js's workload table in renderChrome().

import { Paper, Table, Text } from "@mantine/core";
import type { ScheduleResult } from "@/lib/engine/types";

export function WorkloadPanel({ sched }: { sched: ScheduleResult }) {
  const { table } = sched.wl;
  return (
    <Paper withBorder p="sm" radius="md">
      <Text fw={600} size="sm" mb="xs">
        Workload
      </Text>
      <Table fz="xs" striped>
        <Table.Thead>
          <Table.Tr>
            <Table.Th></Table.Th>
            {sched.sprints.map((s) => (
              <Table.Th key={s.id}>{s.name.replace("Sprint ", "S")}</Table.Th>
            ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {table.map((row) => (
            <Table.Tr key={row.p}>
              <Table.Th>{row.name}</Table.Th>
              {row.cells.map((c, i) => {
                const over = c.over > 0 || c.util > 100;
                const under = c.util < 50;
                const color = c.avail === 0 ? "#9ca3af" : over ? "#b91c1c" : under ? "#b45309" : "#15803d";
                return (
                  <Table.Td key={i} style={{ color }} title={`${c.load} step-days over ${c.avail} available`}>
                    {c.avail === 0 ? "out" : `${c.util}%`}
                    {c.over ? " ⚠" : ""}
                  </Table.Td>
                );
              })}
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      <Text size="xs" c="dimmed" mt={4}>
        % = step-days assigned ÷ working days available. Over 100% or two steps on one day =
        overcommitted; under 50% = undercommitted.
      </Text>
    </Paper>
  );
}
