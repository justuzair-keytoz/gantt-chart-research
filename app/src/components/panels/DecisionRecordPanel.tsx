"use client";

import { Badge, Paper, Stack, Text } from "@mantine/core";
import type { DecisionRecordEntry } from "@/lib/engine/types";

export function DecisionRecordPanel({ decisions }: { decisions: DecisionRecordEntry[] }) {
  return (
    <Paper withBorder p="sm" radius="md">
      <Text fw={600} size="sm" mb="xs">
        Decision record
      </Text>
      <Stack gap={6}>
        {decisions.length === 0 && (
          <Text size="xs" c="dimmed">
            Nothing committed yet.
          </Text>
        )}
        {decisions.map((d) => (
          <div key={d.n}>
            <Badge size="xs" variant="outline" mr={4}>
              D{d.n}
            </Badge>
            <Text size="xs" span fw={600}>
              {d.title}
            </Text>
            <Text size="xs" c="dimmed">
              {d.why || "no reason given"} · {d.when}
            </Text>
          </div>
        ))}
      </Stack>
    </Paper>
  );
}
