"use client";

// Ported from prototype/app.js's "gaps" list (waits of 2+ days between
// consecutive steps in a task's chain) in renderChrome().

import { Badge, Paper, Stack, Text } from "@mantine/core";
import type { ScheduleContext } from "@/lib/engine/schedule";
import { unitLabel } from "@/lib/engine/schedule";
import type { ScheduleResult } from "@/lib/engine/types";

export function EfficiencyGapsPanel({ ctx, sched }: { ctx: ScheduleContext; sched: ScheduleResult }) {
  const gaps = sched.wl.gaps.slice(0, 6);
  return (
    <Paper withBorder p="sm" radius="md">
      <Text fw={600} size="sm" mb="xs">
        Efficiency gaps
      </Text>
      <Stack gap={6}>
        {gaps.length === 0 && (
          <Text size="xs" c="dimmed">
            No waits of two days or more between steps.
          </Text>
        )}
        {gaps.map((g, i) => (
          <div key={i} style={{ display: "flex", gap: 6, alignItems: "baseline" }}>
            <Badge size="xs" color={g.days >= 5 ? "yellow" : "gray"}>
              {g.days}d wait
            </Badge>
            <Text size="xs">
              <b>{g.task}</b> between {unitLabel(ctx, g.fromUid)} and {unitLabel(ctx, g.toUid)}: {g.why}
            </Text>
          </div>
        ))}
      </Stack>
    </Paper>
  );
}
