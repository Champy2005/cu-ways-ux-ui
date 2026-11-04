import { createDemoState, transitionDemo } from "./model.mjs";
import { FIXTURES } from "./scenarios.mjs";
import { mockJobRecord, mockReadStatus } from "./records.mjs";

type View = ReturnType<typeof createDemoState> & { offlineNotice?: boolean };
export type JobEvent = { type: string; [key: string]: unknown };
export type StartTask = { jobId: number; requestId: number; snapshot: View };
type Result = {
  jobId: number;
  title: string;
  body?: string;
  tone: "success" | "warning";
};
type Memory = {
  confirmedStatuses: Map<number, string>;
  starts: Map<number, StartTask>;
  uncertainStarts: Set<number>;
  backgroundResult: Result | null;
  readMode: "record" | "configured";
};
export type JobsController = View & Memory;
export type RecordStatus =
  "Accepted" | "In Progress" | "Completed" | "Cancelled";
export type JobsPreview = {
  scenario?: string;
  fixture?: string;
  jobId?: number;
  filter?: string;
  page?: number;
  readStatus?: RecordStatus;
  pendingRequest?: number;
  needsCheck?: boolean;
};
const memoryKeys = [
  "confirmedStatuses",
  "starts",
  "uncertainStarts",
  "backgroundResult",
  "readMode",
];
function memoryOnly(memory: Memory): Memory {
  return {
    confirmedStatuses: memory.confirmedStatuses,
    starts: memory.starts,
    uncertainStarts: memory.uncertainStarts,
    backgroundResult: memory.backgroundResult,
    readMode: memory.readMode,
  };
}

function viewOnly(state: JobsController): View {
  const view = { ...state } as Record<string, unknown>;
  for (const key of memoryKeys) delete view[key];
  return view as View;
}
function remember(view: View, memory: Memory): JobsController {
  const status = view.jobStatus;
  const record = mockJobRecord(
    FIXTURES[view.fixtureName as keyof typeof FIXTURES],
    view.jobId,
  );
  if (
    view.statusKnown &&
    record &&
    ["Accepted", "In Progress", "Completed", "Cancelled"].includes(status) &&
    memory.confirmedStatuses.get(view.jobId) !== status
  ) {
    memory = {
      ...memory,
      confirmedStatuses: new Map(memory.confirmedStatuses).set(
        view.jobId,
        status,
      ),
    };
  }
  return { ...view, ...memoryOnly(memory) };
}
/** Per-visit mock transport state survives changes of visible list/detail scene. */
export function createJobsController(view: View): JobsController {
  return remember(view, {
    confirmedStatuses: new Map(),
    starts: view.pending
      ? new Map([
          [
            view.jobId,
            { jobId: view.jobId, requestId: view.requestId, snapshot: view },
          ],
        ])
      : new Map(),
    uncertainStarts: new Set(view.unknownOutcome ? [view.jobId] : []),
    backgroundResult: null,
    readMode: ["R01", "R13", "C08"].includes(view.scenarioId)
      ? "configured"
      : "record",
  });
}
/** These inputs select fictional read results, never application authority. */
export function createJobsPreview({
  scenario = "L02",
  fixture = "standard",
  jobId,
  filter,
  page,
  readStatus,
  pendingRequest,
  needsCheck,
}: JobsPreview): JobsController {
  const counts = {
    listFilter:
      filter &&
      [
        "active",
        "all",
        "Accepted",
        "In Progress",
        "Completed",
        "Cancelled",
      ].includes(filter)
        ? filter
        : undefined,
    page:
      page !== undefined && Number.isSafeInteger(page) && page > 0
        ? page
        : undefined,
  };
  if (jobId === undefined)
    return createJobsController(
      createDemoState({
        scenarioId: scenario,
        fixtureName: fixture,
        ...counts,
      }),
    );
  const initial = createDemoState({
    scenarioId: "D01",
    fixtureName: fixture,
    jobId,
    ...counts,
  });
  const record = mockJobRecord(
    FIXTURES[initial.fixtureName as keyof typeof FIXTURES],
    jobId,
  );
  if (
    record &&
    pendingRequest !== undefined &&
    Number.isSafeInteger(pendingRequest) &&
    pendingRequest >= 0
  )
    return createJobsController(
      createDemoState({
        scenarioId: "C05",
        fixtureName: initial.fixtureName,
        jobId,
        ...counts,
        requestId: pendingRequest,
        startPostCount: 1,
      }),
    );
  if (record && needsCheck)
    return createJobsController(
      createDemoState({
        scenarioId: "R01",
        fixtureName: initial.fixtureName,
        jobId,
        ...counts,
        startPostCount: 1,
      }),
    );
  const override =
    readStatus &&
    ["Accepted", "In Progress", "Completed", "Cancelled"].includes(readStatus)
      ? readStatus
      : record?.status;
  return createJobsController(
    transitionDemo(initial, {
      type: "DETAIL_READ_RESULT",
      status: mockReadStatus(record && { ...record, status: override }),
    }).state,
  );
}
function visibleSnapshot(state: JobsController, task: StartTask): View {
  return {
    ...task.snapshot,
    listFilter: state.listFilter,
    page: state.page,
    startPostCount: Math.max(
      state.startPostCount,
      task.snapshot.startPostCount,
    ),
    requestId: Math.max(state.requestId, task.snapshot.requestId),
  };
}
export function reduceJobsController(
  state: JobsController,
  event: JobEvent,
): JobsController {
  if (event.type === "SETTLE_START") {
    const task = state.starts.get(Number(event.jobId));
    if (!task || task.requestId !== event.requestId) return state;
    const outcome = String(event.outcome ?? "started");
    const resolved = transitionDemo(visibleSnapshot(state, task), {
      type: "RESOLVE_START",
      outcome,
    }).state;
    const starts = new Map(state.starts);
    starts.delete(task.jobId);
    const uncertainStarts = new Set(state.uncertainStarts);
    if (outcome === "unknown") uncertainStarts.add(task.jobId);
    else uncertainStarts.delete(task.jobId);
    let next = viewOnly(state);
    if (
      (state.route === "detail" && state.jobId === task.jobId) ||
      !resolved.privateDataVisible
    )
      next = resolved;
    else if (state.route === "list")
      next = {
        ...next,
        scenarioId: outcome === "unknown" ? "C06" : "L02",
        pending: false,
        confirmationOpen: false,
        safeReturnCheckRequired: outcome === "unknown",
      };
    const success = ["started", "already_in_progress"].includes(outcome);
    const memory: Memory = {
      ...state,
      starts,
      uncertainStarts,
      backgroundResult: {
        jobId: task.jobId,
        title: success
          ? state.route === "detail" && state.jobId === task.jobId
            ? "Job started"
            : `Job #${task.jobId} started`
          : outcome === "unknown"
            ? "Start result not confirmed"
            : "Job could not start",
        body: success ? undefined : "Open the job to check its status.",
        tone: success ? "success" : "warning",
      },
      readMode: outcome === "unknown" ? "configured" : state.readMode,
    };
    return remember(next, {
      ...memory,
      confirmedStatuses: remember(resolved, memory).confirmedStatuses,
    });
  }
  if (event.type === "REOPEN_OPERATION" || event.type === "OPEN_JOB") {
    const task = state.starts.get(Number(event.jobId ?? state.jobId));
    if (task)
      return remember(
        {
          ...visibleSnapshot(state, task),
          confirmationOpen: event.type === "REOPEN_OPERATION",
          focusTarget:
            event.type === "REOPEN_OPERATION" ? "dialog" : "progress",
        },
        state,
      );
  }
  // A detail read cannot make the same unresolved write startable again.
  if (
    ["DETAIL_READ_RESULT", "OPEN_CONFIRM", "CONFIRM_START"].includes(
      event.type,
    ) &&
    state.starts.has(state.jobId)
  )
    return state;
  let next = transitionDemo(viewOnly(state), event).state;
  if (
    next.fixtureName !== state.fixtureName ||
    ["SELECT_FIXTURE", "SELECT_SCENARIO"].includes(event.type)
  )
    return createJobsController(next);
  let memory: Memory = state;
  if (event.type === "CONFIRM_START" && next.pending && !state.pending) {
    memory = {
      ...memory,
      starts: new Map(state.starts).set(next.jobId, {
        jobId: next.jobId,
        requestId: next.requestId,
        snapshot: next,
      }),
      backgroundResult: null,
    };
  }
  if (["DETAIL_READ_RESULT", "RECONCILE"].includes(event.type)) {
    const uncertainStarts = new Set(state.uncertainStarts);
    if (
      [
        "accepted",
        "in-progress",
        "completed",
        "cancelled",
        "unavailable",
        "session_expired",
        "invalid",
      ].includes(String(event.status))
    )
      uncertainStarts.delete(next.jobId);
    memory = { ...memory, uncertainStarts, readMode: "record" };
  } else if (event.type === "REFRESH_DETAIL")
    memory = { ...memory, readMode: "configured" };
  else if (event.type === "OPEN_JOB")
    memory = {
      ...memory,
      backgroundResult: null,
      readMode: state.uncertainStarts.has(next.jobId) ? "configured" : "record",
    };
  if (next === state) next = viewOnly(state);
  return remember(next, memory);
}
