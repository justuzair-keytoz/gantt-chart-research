import assert from "node:assert/strict";
import test from "node:test";

import { migrateExpandedRowIds } from "./expandedRows.ts";

const sprintIds = ["s7", "s8"];
const rootIds = ["TASK-A", "TASK-B"];

test("migrates legacy sprint-prefixed expansion ids without reopening a collapsed tree", () => {
  assert.deepEqual(migrateExpandedRowIds([], sprintIds, rootIds), []);
  assert.deepEqual(migrateExpandedRowIds(["s7"], sprintIds, rootIds), rootIds);
  assert.deepEqual(
    migrateExpandedRowIds(["s7::TASK-A::CHILD"], sprintIds, rootIds),
    ["TASK-A::CHILD"],
  );
  assert.deepEqual(
    migrateExpandedRowIds(["__unscheduled::TASK-B"], sprintIds, rootIds),
    ["TASK-B"],
  );
});
