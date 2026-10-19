"use client";

// Ported from prototype/app.js's fillPop() editable popover, rebuilt as a
// Mantine Popover. "Depends on"/"Blocks" renamed to "Blocked by"/"Blocking"
// per docs/gantt-chart/02-spec-roadmap-simulation.md.

import { useState } from "react";
import {
  Button,
  Group,
  NumberInput,
  Popover,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
  ActionIcon,
  Badge,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { IconX } from "./IconX";
import { wouldCycle, type ScheduleContext } from "@/lib/engine/schedule";
import { fmt, parseISO, toISO } from "@/lib/engine/date-utils";
import type { ScheduleResult } from "@/lib/engine/types";
import { useRoadmapStore } from "@/lib/store/useRoadmapStore";

export function StepEditor(props: {
  uid: string;
  x: number;
  y: number;
  ctx: ScheduleContext;
  sched: ScheduleResult;
  onClose: () => void;
}) {
  const { uid, ctx, sched } = props;
  const step = ctx.stepByUid[uid];
  const task = ctx.taskById[step.taskId];
  const s = sched.units[uid];
  const editOverlay = useRoadmapStore((st) => st.editOverlay);
  const addLink = useRoadmapStore((st) => st.addLink);
  const removeLink = useRoadmapStore((st) => st.removeLink);
  const activeScenario = useRoadmapStore((st) => st.activeScenario);
  const [stakeholdersDraft, setStakeholdersDraft] = useState(step.stakeholders.join(", "));
  const [noteDraft, setNoteDraft] = useState(() => activeScenario().ov.notes[uid] ?? "");

  if (!s) return null;

  const incoming = [...sched.deps[uid]].filter((p) => p !== step.prevUid);
  const outgoing = ctx.steps
    .filter((x) => sched.deps[x.uid].has(uid) && x.prevUid !== uid)
    .map((x) => x.uid);
  const candidates = ctx.steps.filter(
    (x) =>
      x.taskId !== step.taskId &&
      !sched.deps[uid].has(x.uid) &&
      !wouldCycle(sched.deps, x.uid, uid),
  );
  const personOptions = Object.entries(ctx.people).map(([value, label]) => ({ value, label }));
  const label = (u: string) => {
    const st = ctx.stepByUid[u];
    return `${st.taskId} ${ctx.stageById[st.stage].label.split(" ")[0]}·${st.name}`;
  };

  return (
    <Popover opened withinPortal position="right-start" offset={10} onClose={props.onClose}>
      <Popover.Target>
        <div style={{ position: "fixed", left: props.x, top: props.y, width: 1, height: 1 }} />
      </Popover.Target>
      <Popover.Dropdown w={340}>
        <Group justify="space-between" mb={4}>
          <Text fw={600} size="sm">
            {task.id} · {ctx.stageById[step.stage].label} · {step.name}
          </Text>
          <ActionIcon size="sm" variant="subtle" onClick={props.onClose}>
            <IconX />
          </ActionIcon>
        </Group>
        <Text size="xs" c="dimmed" mb="sm">
          {task.name}
        </Text>
        <Stack gap="xs">
          <DateInput
            label="Start"
            size="xs"
            value={s.start}
            onChange={(v) => {
              if (!v) return;
              const d = typeof v === "string" ? parseISO(v) : v;
              editOverlay(`${label(uid)} start → ${fmt(d)}`, (ov) => {
                ov.starts[uid] = toISO(d);
              });
            }}
          />
          <NumberInput
            label="Duration (days)"
            size="xs"
            min={1}
            max={40}
            value={s.durationDays}
            onChange={(v) => {
              const n = Math.max(1, Number(v) || 1);
              editOverlay(`${label(uid)} ${s.durationDays}d → ${n}d`, (ov) => {
                ov.durations[uid] = n;
              });
            }}
          />
          <Text size="xs" c="dimmed">
            Ends {fmt(s.end)}
            {s.slip ? ` · ${s.slip > 0 ? "+" : ""}${s.slip}d vs plan` : ""}
          </Text>
          {/* TODO: reassignment via dragging a step onto a different person's
              lane (react-dnd) is a documented follow-up per
              docs/gantt-chart/03-app-dependencies-and-config.md. v0 supports
              reassignment only through this dropdown. */}
          <Select
            label={step.review ? "Reviewer (works this step)" : "Assignee"}
            size="xs"
            data={personOptions}
            value={step.assignee}
            onChange={(v) => {
              if (!v) return;
              editOverlay(`${label(uid)} ${step.review ? "reviewer" : "assignee"} → ${ctx.people[v]}`, (ov) => {
                ov.people[uid] = { ...(ov.people[uid] ?? {}), assignee: v };
              });
            }}
          />
          {!step.review && (
            <Select
              label="Reviewer"
              size="xs"
              clearable
              data={personOptions}
              value={step.reviewer}
              onChange={(v) => {
                editOverlay(`${label(uid)} reviewer → ${v ? ctx.people[v] : "none"}`, (ov) => {
                  ov.people[uid] = { ...(ov.people[uid] ?? {}), reviewer: v || null };
                });
              }}
            />
          )}
          <TextInput
            label="Update / ask (stakeholders)"
            size="xs"
            value={stakeholdersDraft}
            onChange={(e) => setStakeholdersDraft(e.currentTarget.value)}
            onBlur={() => {
              const list = stakeholdersDraft.split(",").map((x) => x.trim()).filter(Boolean);
              editOverlay(`${label(uid)} stakeholders → ${list.join(", ") || "none"}`, (ov) => {
                ov.people[uid] = { ...(ov.people[uid] ?? {}), stakeholders: list };
              });
            }}
          />

          <Text size="xs" fw={600} mt={4}>
            Blocked by
          </Text>
          <Stack gap={4}>
            {step.prevUid && (
              <Badge variant="light" size="sm">
                {label(step.prevUid)} (previous step)
              </Badge>
            )}
            {incoming.map((p) => (
              <Group key={p} gap={4} wrap="nowrap">
                <Badge variant="light" size="sm" style={{ flex: 1 }}>
                  {label(p)}
                </Badge>
                <ActionIcon size="xs" variant="subtle" color="red" onClick={() => removeLink(p, uid)}>
                  <IconX />
                </ActionIcon>
              </Group>
            ))}
            <Select
              size="xs"
              placeholder="+ add dependency…"
              data={candidates.map((c) => ({ value: c.uid, label: label(c.uid) }))}
              value={null}
              onChange={(from) => from && addLink(from, uid)}
              searchable
            />
          </Stack>

          <Text size="xs" fw={600} mt={4}>
            Blocking
          </Text>
          <Text size="xs" c="dimmed">
            {outgoing.length ? outgoing.map(label).join(", ") : "—"}
          </Text>

          <Textarea
            label="Note"
            size="xs"
            placeholder="Why this changed; goes to the decision record on commit"
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.currentTarget.value)}
            onBlur={() => {
              if (noteDraft === (activeScenario().ov.notes[uid] ?? "")) return;
              editOverlay(`${label(uid)} note updated`, (ov) => {
                ov.notes[uid] = noteDraft;
              });
            }}
          />

          {s.risks.length > 0 && (
            <Stack gap={2}>
              {s.risks.map((r, i) => (
                <Text key={i} size="xs" c={r.sev === "info" ? "dimmed" : "red"}>
                  {r.sev}: {r.msg}
                </Text>
              ))}
            </Stack>
          )}

          <Group justify="space-between" mt="xs">
            <Button
              size="xs"
              variant="subtle"
              onClick={() =>
                editOverlay(`${label(uid)} reset`, (ov) => {
                  delete ov.starts[uid];
                  delete ov.durations[uid];
                  delete ov.people[uid];
                })
              }
            >
              Reset step
            </Button>
            <Button size="xs" onClick={props.onClose}>
              Done
            </Button>
          </Group>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
