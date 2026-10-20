"use client";

// Ported from prototype/app.js's renderChrome() risk list.
// Critical/warning/expired get a coloured pill; informational findings (the
// weekend-landing flag, availability pushes) get a plain, quiet pill — they
// must not visually compete with the three higher severities.

import { Badge, Paper, Stack, Text } from "@mantine/core";
import type { ScheduleResult } from "@/lib/engine/types";

const SEV_ORDER = ["expired", "critical", "warning", "info"];
const SEV_COLOR: Record<string, string> = {
  expired: "orange",
  critical: "red",
  warning: "yellow",
  info: "gray",
};

export function RiskPanel({ sched }: { sched: ScheduleResult }) {
  const risks = [...sched.risks].sort(
    (a, b) => SEV_ORDER.indexOf(a.sev) - SEV_ORDER.indexOf(b.sev),
  );
  return (
    <Paper withBorder p="sm" radius="md">
      <Text fw={600} size="sm" mb="xs">
        Risks
      </Text>
      <Stack gap={6}>
        {risks.length === 0 && (
          <Text size="xs" c="dimmed">
            No risks.
          </Text>
        )}
        {risks.map((r, i) => (
          <div key={i} style={{ display: "flex", gap: 6, alignItems: "baseline" }}>
            <Badge size="xs" color={SEV_COLOR[r.sev]} variant={r.sev === "info" ? "outline" : "filled"}>
              {r.sev}
            </Badge>
            <Text size="xs">
              <b>{r.rule}</b> — {r.msg}
            </Text>
          </div>
        ))}
        {Object.keys(sched.summary.notify).length > 0 && (
          <div style={{ display: "flex", gap: 4, alignItems: "baseline", marginTop: 4 }}>
            <Badge size="xs" variant="outline" color="blue">
              update
            </Badge>
            <Text size="xs">
              {Object.entries(sched.summary.notify)
                .map(([k, v]) => `${k}: ${v.join("; ")}`)
                .join(" · ")}
            </Text>
          </div>
        )}
      </Stack>
    </Paper>
  );
}
