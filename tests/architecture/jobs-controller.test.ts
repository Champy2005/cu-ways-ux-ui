import { expect, test } from "vitest";
import { createDemoState } from "../../src/features/us025/model.mjs";
import {
  createJobsController,
  createJobsPreview,
  reduceJobsController as step,
} from "../../src/features/us025/controller";
import { FIXTURES } from "../../src/features/us025/scenarios.mjs";
import {
  mockJobRecords,
  mockReadStatus,
} from "../../src/features/us025/records.mjs";

const initial = (scenarioId = "C01") =>
  createJobsController(createDemoState({ scenarioId }));
test("confirmed start survives list navigation, reopening and authoritative record read", () => {
  let state = step(initial(), { type: "CONFIRM_START" });
  const task = state.starts.get(41)!;
  state = step(state, {
    type: "SETTLE_START",
    jobId: 41,
    requestId: task.requestId,
    outcome: "started",
  });
  state = step(state, { type: "BACK_TO_LIST" });
  const record = mockJobRecords(
    FIXTURES.standard,
    state.confirmedStatuses,
  ).find((row: { id: number }) => row.id === 41);
  expect(record.status).toBe("In Progress");
  state = step(state, { type: "OPEN_JOB", jobId: 41 });
  state = step(state, {
    type: "DETAIL_READ_RESULT",
    status: mockReadStatus(record),
  });
  expect(state.jobStatus).toBe("In Progress");
  expect(state.scenarioId).toBe("D04");
  expect(state.startPostCount).toBe(1);
});
test("navigation retains dispatched work and pending reopen cannot duplicate it", () => {
  let state = step(initial(), { type: "CONFIRM_START" });
  const task = state.starts.get(41)!;
  state = step(state, { type: "NAVIGATE_AWAY" });
  expect(state.route).toBe("list");
  expect(state.pending).toBe(false);
  expect(state.starts.get(41)).toBe(task);
  state = step(state, { type: "OPEN_JOB", jobId: 41 });
  expect(state.pending).toBe(true);
  state = step(state, { type: "DETAIL_READ_RESULT", status: "accepted" });
  state = step(state, { type: "OPEN_CONFIRM" });
  state = step(state, { type: "CONFIRM_START" });
  expect(state.startPostCount).toBe(1);
  expect(state.starts.size).toBe(1);
});
test("late result updates its job without replacing another visible job", () => {
  let state = step(initial(), { type: "CONFIRM_START" });
  const task = state.starts.get(41)!;
  state = step(state, { type: "NAVIGATE_AWAY" });
  state = step(state, { type: "OPEN_JOB", jobId: 60 });
  state = step(state, { type: "DETAIL_READ_RESULT", status: "accepted" });
  state = step(state, {
    type: "SETTLE_START",
    jobId: 41,
    requestId: task.requestId,
    outcome: "started",
  });
  expect(state.jobId).toBe(60);
  expect(state.jobStatus).toBe("Accepted");
  expect(state.confirmedStatuses.get(41)).toBe("In Progress");
  expect(state.backgroundResult?.jobId).toBe(41);
});
test("unknown result stays guarded until reconciliation; stale results cannot settle it twice", () => {
  let state = step(initial(), { type: "CONFIRM_START" });
  const task = state.starts.get(41)!;
  state = step(state, {
    type: "SETTLE_START",
    jobId: 41,
    requestId: task.requestId + 1,
    outcome: "started",
  });
  expect(state.starts.size).toBe(1);
  state = step(state, {
    type: "SETTLE_START",
    jobId: 41,
    requestId: task.requestId,
    outcome: "unknown",
  });
  expect(state.unknownOutcome).toBe(true);
  expect(state.uncertainStarts.has(41)).toBe(true);
  expect(step(state, { type: "CONFIRM_START" }).startPostCount).toBe(1);
  const settled = step(state, {
    type: "DETAIL_READ_RESULT",
    status: "in-progress",
  });
  expect(settled.uncertainStarts.has(41)).toBe(false);
  expect(settled.jobStatus).toBe("In Progress");
  expect(
    step(settled, {
      type: "SETTLE_START",
      jobId: 41,
      requestId: task.requestId,
      outcome: "started",
    }),
  ).toBe(settled);
});
test("fixture reset explicitly discards authoring operations, without leaking records", () => {
  const pending = step(initial(), { type: "CONFIRM_START" });
  const reset = step(pending, {
    type: "SELECT_SCENARIO",
    scenarioId: "L02",
    fixtureName: "long",
  });
  expect(reset.starts.size).toBe(0);
  expect(reset.confirmedStatuses.size).toBe(0);
});
test("native detail destinations preserve visible mock context without inventing access", () => {
  const confirmed = createJobsPreview({ jobId: 41, readStatus: "In Progress" });
  expect(confirmed.jobStatus).toBe("In Progress");
  expect(confirmed.startPostCount).toBe(0);
  const pending = createJobsPreview({ jobId: 41, pendingRequest: 7 });
  expect(pending.starts.get(41)?.requestId).toBe(7);
  expect(pending.confirmationOpen).toBe(false);
  expect(step(pending, { type: "CONFIRM_START" }).startPostCount).toBe(1);
  const unknown = createJobsPreview({ jobId: 41, needsCheck: true });
  expect(unknown.unknownOutcome).toBe(true);
  expect(unknown.readMode).toBe("configured");
  const unavailable = createJobsPreview({
    jobId: 999,
    readStatus: "Accepted",
    pendingRequest: 7,
    needsCheck: true,
  });
  expect(unavailable.privateDataVisible).toBe(false);
  expect(unavailable.starts.size).toBe(0);
  expect(createJobsPreview({ scenario: "L04" }).listFilter).toBe("all");
});
