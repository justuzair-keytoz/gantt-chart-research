"use client";

// Ported from prototype/app.js's commit modal, rebuilt as a Mantine Modal.
// NEW vs. the prototype: warns before discarding an uncommitted sibling
// scenario by name and requires explicit confirmation, per
// docs/gantt-chart/02-spec-roadmap-simulation.md ("Committing a scenario
// warns before discarding any sibling scenario that hasn't itself been
// committed" — the prototype silently wiped siblings on commit).

import { useState } from "react";
import { Alert, Button, Checkbox, Group, List, Modal, Text, Textarea } from "@mantine/core";
import type { ScheduleContext } from "@/lib/engine/schedule";
import type { ScheduleResult } from "@/lib/engine/types";
import { useRoadmapStore } from "@/lib/store/useRoadmapStore";

export function CommitDialog(props: {
  opened: boolean;
  onClose: () => void;
  ctx: ScheduleContext;
  sched: ScheduleResult;
}) {
  const activeScenario = useRoadmapStore((s) => s.activeScenario);
  const commitScenario = useRoadmapStore((s) => s.commitScenario);
  const siblingsToDiscard = useRoadmapStore((s) => s.siblingsToDiscard);
  const [reason, setReason] = useState("");
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  if (!props.opened) return null;

  const sc = activeScenario();
  const siblings = siblingsToDiscard();
  const { ctx, sched } = props;
  const moved = ctx.steps.filter((u) => sched.units[u.uid].moved);
  const movedTasks = [...new Set(moved.map((u) => u.taskId))];
  const linkChanges = sc.ov.addLinks.length + sc.ov.rmLinks.length;
  const notify = Object.keys(sched.summary.notify);

  const canCommit = reason.trim().length > 0 && (siblings.length === 0 || confirmDiscard);

  return (
    <Modal
      opened={props.opened}
      onClose={props.onClose}
      title={`Commit ${sc.name} to the plan`}
      size="md"
    >
      <List size="sm" spacing={4} mb="sm">
        <List.Item>
          {moved.length} step date changes across {movedTasks.length} tasks (
          {movedTasks.join(", ") || "none"})
        </List.Item>
        <List.Item>
          {linkChanges} dependency link changes · {Object.keys(sc.ov.bounds).length} sprint
          boundary changes · {sc.ov.out.length} availability notes
        </List.Item>
        <List.Item>Stakeholders to update: {notify.join(", ") || "none"}</List.Item>
        <List.Item>
          Risks after commit: {sched.summary.critical + sched.summary.expired} critical,{" "}
          {sched.summary.warning} warnings
        </List.Item>
      </List>

      {siblings.length > 0 && (
        <Alert color="orange" title="This will discard other scenarios" mb="sm">
          <Text size="sm" mb="xs">
            Committing <b>{sc.name}</b> will discard{" "}
            <b>{siblings.map((s) => s.name).join(", ")}</b>, which{" "}
            {siblings.length > 1 ? "haven't" : "hasn't"} been committed. Their edits will be lost.
          </Text>
          <Checkbox
            label={`I understand, discard ${siblings.map((s) => s.name).join(", ")}`}
            checked={confirmDiscard}
            onChange={(e) => setConfirmDiscard(e.currentTarget.checked)}
          />
        </Alert>
      )}

      <Textarea
        label="Reason"
        required
        placeholder="Why this change — lands on every touched task's decision record"
        value={reason}
        onChange={(e) => setReason(e.currentTarget.value)}
        autosize
        minRows={2}
        mb="sm"
      />

      <Group justify="end">
        <Button variant="default" onClick={props.onClose}>
          Cancel
        </Button>
        <Button
          disabled={!canCommit}
          onClick={() => {
            commitScenario(reason.trim());
            setReason("");
            setConfirmDiscard(false);
            props.onClose();
          }}
        >
          Commit
        </Button>
      </Group>
    </Modal>
  );
}
