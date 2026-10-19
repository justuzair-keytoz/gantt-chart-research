"use client";

import { List, Paper, Text } from "@mantine/core";
import type { Scenario } from "@/lib/engine/types";

export function ChangesPanel({ scenario }: { scenario: Scenario }) {
  const changes = scenario.ov.changes;
  return (
    <Paper withBorder p="sm" radius="md">
      <Text fw={600} size="sm" mb="xs">
        Changes in {scenario.name}
      </Text>
      {changes.length === 0 ? (
        <Text size="xs" c="dimmed">
          {scenario.locked
            ? "Baseline is read-only. Create a scenario, or drag a step and one is created for you."
            : "No changes yet."}
        </Text>
      ) : (
        <List size="xs" spacing={2}>
          {changes.map((c, i) => (
            <List.Item key={i}>{c}</List.Item>
          ))}
        </List>
      )}
    </Paper>
  );
}
