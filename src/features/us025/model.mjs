// Migrated pure scenario reducer; owns fixture transitions, not presentation.
import { SCENARIO_BY_ID, FIXTURES } from "./scenarios.mjs";

const pendingIds = new Set(["C03", "C04", "C05"]);
const privateDataIds = new Set(["D06", "D07", "D10", "R08", "R09"]);
const listFilters = new Set([
  "active",
  "Accepted",
  "In Progress",
  "Completed",
  "Cancelled",
  "all",
]);

function statusForScenario(id, fixture) {
  if (["D04", "C07", "R02", "R05", "R14"].includes(id)) return "In Progress";
  if (id === "R06")
    return fixture.status === "Cancelled" ? "Cancelled" : "Completed";
  if (id === "D05")
    return ["Completed", "Cancelled"].includes(fixture.status)
      ? fixture.status
      : "Completed";
  if (id === "R03" || id === "R11" || id === "C01" || id === "C02")
    return "Accepted";
  return SCENARIO_BY_ID[id]?.status ?? null;
}

function createState(scenarioId, fixtureName, counts = {}) {
  const scenario = SCENARIO_BY_ID[scenarioId] ?? SCENARIO_BY_ID.L02;
  const fixture = FIXTURES[fixtureName] ?? FIXTURES.standard;
  const id = scenario.id;
  const inFlight = pendingIds.has(id);
  const knownStatus =
    statusForScenario(id, fixture) !== null &&
    !["D01", "D03", "D08", "C08", "R01", "R04", "R11", "R12", "R13"].includes(
      id,
    ) &&
    !privateDataIds.has(id);
  const lastConfirmedStatus = privateDataIds.has(id)
    ? null
    : ["D01", "D03", "D08", "C08"].includes(id)
      ? (counts.lastConfirmedStatus ?? null)
      : ["R01", "R04", "R11", "R12"].includes(id)
        ? "Accepted"
        : statusForScenario(id, fixture);
  return {
    scenarioId: id,
    fixtureName: FIXTURES[fixtureName] ? fixtureName : "standard",
    route: id.startsWith("L") || id === "C06" ? "list" : "detail",
    jobId: counts.jobId ?? fixture.jobId,
    optionalMissingJobId:
      counts.optionalMissingJobId ??
      (scenario.optionalMissing ? (counts.jobId ?? fixture.jobId) : null),
    returnFocusToJob: counts.returnFocusToJob ?? false,
    demoSignInComplete: counts.demoSignInComplete ?? false,
    jobStatus: knownStatus ? statusForScenario(id, fixture) : null,
    lastConfirmedStatus,
    statusKnown: knownStatus,
    privateDataVisible: !privateDataIds.has(id),
    confirmationOpen: id === "C01" || (inFlight && id !== "C05"),
    pending: inFlight,
    unknownOutcome: id === "R01" || id === "R04",
    startRequestResolved: !inFlight,
    safeReturnCheckRequired: id === "C06",
    pendingDismissalBlocked: false,
    listFilter:
      counts.listFilter ??
      (id === "L04" ? "all" : id === "L05" ? "Completed" : "active"),
    page: counts.page ?? 1,
    startPostCount: counts.startPostCount ?? 0,
    focusTarget: id === "C01" ? "cancel" : null,
    requestId: counts.requestId ?? 0,
  };
}

const carry = (state, requestId = state.requestId) => ({
  jobId: state.jobId,
  optionalMissingJobId: state.optionalMissingJobId,
  returnFocusToJob: state.returnFocusToJob,
  demoSignInComplete: state.demoSignInComplete,
  listFilter: state.listFilter,
  page: state.page,
  startPostCount: state.startPostCount,
  requestId,
  lastConfirmedStatus: state.statusKnown
    ? state.jobStatus
    : state.lastConfirmedStatus,
});

export function createDemoState(options = {}) {
  const {
    scenarioId = "L02",
    fixtureName = "standard",
    listFilter,
    page,
    jobId,
    ...counts
  } = options ?? {};
  return createState(scenarioId, fixtureName, {
    ...counts,
    listFilter,
    page,
    jobId,
  });
}

function result(state, effects = [], extras = {}) {
  return { state, effects, ...extras };
}

export function transitionDemo(state, event) {
  const type = event?.type;
  const scenario = SCENARIO_BY_ID[state.scenarioId];
  const fixture = FIXTURES[state.fixtureName] ?? FIXTURES.standard;

  if (type === "SELECT_SCENARIO") {
    return result(
      createState(event.scenarioId, event.fixtureName ?? state.fixtureName, {
        startPostCount: state.startPostCount,
        requestId: state.requestId,
      }),
    );
  }

  if (type === "SELECT_FIXTURE") {
    const next = createState(state.scenarioId, event.fixtureName, {
      startPostCount: state.startPostCount,
      requestId: state.requestId,
    });
    return result(next);
  }

  if (type === "OPEN_JOB") {
    const selectedJobId =
      Number.isSafeInteger(Number(event.jobId)) && Number(event.jobId) > 0
        ? Number(event.jobId)
        : state.jobId;
    const returningAfterSignIn = state.demoSignInComplete;
    const next = createState("D01", state.fixtureName, {
      ...carry(state, state.requestId + 1),
      jobId: selectedJobId,
      lastConfirmedStatus:
        selectedJobId === state.jobId ? state.lastConfirmedStatus : null,
      returnFocusToJob: !returningAfterSignIn,
      demoSignInComplete: false,
    });
    next.safeReturnCheckRequired = false;
    return result(next, [
      {
        method: "GET",
        path: `/api/v1/me/marketer-jobs/${selectedJobId}`,
        result: "200 mock read",
        reason: "Authoritative hired-job detail fixture.",
      },
    ]);
  }

  if (type === "OPEN_CONFIRM") {
    if (state.scenarioId === "R11")
      return result({ ...state, offlineNotice: true, focusTarget: "dialog" });
    const allowedSource = ["D02", "D09", "C02", "R03"].includes(
      state.scenarioId,
    );
    if (!allowedSource || !state.statusKnown || state.jobStatus !== "Accepted")
      return result(state, [], {
        ignored: "Start is only available for a verified Accepted job.",
      });
    const next = createState("C01", state.fixtureName, carry(state));
    next.focusTarget = "cancel";
    return result(next);
  }

  if (
    type === "CANCEL_CONFIRM" ||
    type === "ESCAPE" ||
    type === "OUTSIDE_PRESS"
  ) {
    if (state.offlineNotice)
      return result({ ...state, offlineNotice: false, focusTarget: "start" });
    if (!state.confirmationOpen) return result(state);
    if (state.pending) {
      const next = {
        ...state,
        pendingDismissalBlocked: false,
        confirmationOpen: false,
        focusTarget: "progress",
      };
      return result(next, [], { restoreFocus: "progress" });
    }
    if (state.scenarioId === "C01") {
      const next = createState("C02", state.fixtureName, carry(state));
      next.focusTarget = "start";
      return result(next, [], { restoreFocus: "start" });
    }
    return result(state);
  }

  if (type === "CONFIRM_START") {
    if (
      state.pending ||
      (state.startPostCount > 0 && !state.startRequestResolved)
    ) {
      return result(state, [], {
        ignored: "A start request is already in flight.",
      });
    }
    if (
      state.scenarioId !== "C01" ||
      !state.confirmationOpen ||
      state.jobStatus !== "Accepted" ||
      !state.statusKnown
    ) {
      return result(state, [], {
        ignored: "A fresh confirmation is required before starting.",
      });
    }
    const next = {
      ...state,
      scenarioId: "C03",
      pending: true,
      confirmationOpen: true,
      unknownOutcome: false,
      startRequestResolved: false,
      pendingDismissalBlocked: false,
      focusTarget: "dialog",
      startPostCount: state.startPostCount + 1,
      requestId: state.requestId + 1,
    };
    return result(next, [
      {
        method: "POST",
        path: `/api/v1/me/marketer-jobs/${state.jobId}/start`,
        result: "pending mock write",
        reason: "One explicit confirmation; no automatic retry.",
      },
    ]);
  }

  if (type === "REOPEN_PROGRESS" && state.pending)
    return result({ ...state, confirmationOpen: true, focusTarget: "dialog" });

  if (type === "SHOW_SLOW") {
    if (!state.pending) return result(state);
    return result({ ...state, scenarioId: "C04" });
  }

  if (type === "ESCAPE" || type === "OUTSIDE_PRESS") return result(state);

  if (type === "RESOLVE_START") {
    if (!state.pending)
      return result(state, [], {
        ignored: "There is no pending mock start request.",
      });
    const outcome = event.outcome ?? "started";
    const refresh = event.refreshOutcome ?? "in-progress";
    const counts = carry(state, state.requestId + 1);

    if (outcome === "started") {
      const next = createState(
        refresh === "failed" ? "R14" : "C07",
        state.fixtureName,
        counts,
      );
      next.jobStatus = "In Progress";
      next.lastConfirmedStatus = "In Progress";
      next.focusTarget = "detail-heading";
      return result(next, [
        {
          method: "MOCK",
          path: "start response",
          result: "200 outcome=started",
          reason: "The fixture confirms Accepted → In Progress.",
        },
        {
          method: "GET",
          path: `/api/v1/me/marketer-jobs/${state.jobId}`,
          result: refresh === "failed" ? "network error" : "200 mock read",
          reason:
            "Background refresh; confirmed status remains In Progress if this read fails.",
        },
      ]);
    }

    if (outcome === "already_in_progress") {
      const next = createState("R05", state.fixtureName, counts);
      next.focusTarget = "detail-heading";
      return result(next, [
        {
          method: "MOCK",
          path: "start response",
          result: "200 outcome=already_in_progress",
          reason: "Authorized repeat success; no extra transition.",
        },
      ]);
    }

    if (outcome === "unknown") {
      const next = createState("R01", state.fixtureName, counts);
      next.unknownOutcome = true;
      next.lastConfirmedStatus = "Accepted";
      next.statusKnown = false;
      return result(next, [
        {
          method: "MOCK",
          path: "start response",
          result: "timeout / response unknown",
          reason: "The request may have committed.",
        },
        {
          method: "GET",
          path: `/api/v1/me/marketer-jobs/${state.jobId}`,
          result: "pending mock read",
          reason: "Reconcile state; never automatically repeat POST.",
        },
      ]);
    }

    if (outcome === "rejected") {
      const next = createState(
        refresh === "failed" ? "R12" : "C08",
        state.fixtureName,
        counts,
      );
      next.lastConfirmedStatus = "Accepted";
      next.statusKnown = false;
      next.jobStatus = null;
      next.focusTarget = "detail-heading";
      return result(next, [
        {
          method: "MOCK",
          path: "start response",
          result: "409 job_not_startable (known rejection)",
          reason: "This mock rejection confirms no mutation.",
        },
        {
          method: "GET",
          path: `/api/v1/me/marketer-jobs/${state.jobId}`,
          result: refresh === "failed" ? "network error" : "200 mock read",
          reason: "A fresh read is required before another confirmation.",
        },
      ]);
    }

    if (outcome === "forbidden") {
      const next = createState("R07", state.fixtureName, counts);
      next.focusTarget = "detail-heading";
      return result(next, [
        {
          method: "MOCK",
          path: "start response",
          result: "403 forbidden",
          reason: "Read access remains independently valid in this fixture.",
        },
      ]);
    }

    if (outcome === "session_expired") {
      const next = createState("R09", state.fixtureName, counts);
      next.privateDataVisible = false;
      next.jobStatus = null;
      return result(next, [
        {
          method: "MOCK",
          path: "start response",
          result: "401 session expired",
          reason:
            "Private details are cleared; sign-in return requires a new GET.",
        },
      ]);
    }

    if (outcome === "invalid") {
      const next = createState("R10", state.fixtureName, counts);
      return result(next, [
        {
          method: "MOCK",
          path: "start response",
          result: "409 job_not_ready",
          reason: "No raw error metadata is disclosed.",
        },
      ]);
    }

    const terminal =
      event.terminalStatus === "Cancelled" ? "Cancelled" : "Completed";
    const next = createState("R06", state.fixtureName, counts);
    next.jobStatus = terminal;
    next.lastConfirmedStatus = terminal;
    return result(next, [
      {
        method: "MOCK",
        path: "start response",
        result: `409 terminal_state (${terminal})`,
        reason: "The current terminal state is read-only.",
      },
    ]);
  }

  if (type === "RECONCILE") {
    if (!state.unknownOutcome && !["R04", "R13"].includes(state.scenarioId))
      return result(state, [], {
        ignored: "Refresh is a read only; it never resends a start request.",
      });
    const status = event.status ?? "failed";
    const counts = carry(state, state.requestId + 1);
    const getEffect = {
      method: "GET",
      path: `/api/v1/me/marketer-jobs/${state.jobId}`,
      result: status === "failed" ? "network error" : "200 mock read",
      reason: "Explicit authoritative refresh; no start POST is repeated.",
    };
    if (status === "in-progress") {
      const next = createState("R02", state.fixtureName, counts);
      return result(next, [getEffect]);
    }
    if (status === "accepted") {
      const next = createState("R03", state.fixtureName, counts);
      next.lastConfirmedStatus = "Accepted";
      return result(next, [getEffect]);
    }
    if (status === "completed" || status === "cancelled") {
      const next = createState("R06", state.fixtureName, counts);
      next.jobStatus = status === "cancelled" ? "Cancelled" : "Completed";
      next.lastConfirmedStatus = next.jobStatus;
      return result(next, [getEffect]);
    }
    if (status === "unavailable") {
      const next = createState("R08", state.fixtureName, counts);
      return result(next, [getEffect]);
    }
    if (status === "session_expired") {
      const next = createState("R09", state.fixtureName, counts);
      return result(next, [getEffect]);
    }
    if (status === "invalid") {
      const next = createState("R10", state.fixtureName, counts);
      return result(next, [getEffect]);
    }
    const next = createState("R04", state.fixtureName, counts);
    next.lastConfirmedStatus = state.lastConfirmedStatus;
    next.statusKnown = false;
    next.jobStatus = null;
    next.unknownOutcome = true;
    return result(next, [getEffect]);
  }

  if (type === "NAVIGATE_AWAY") {
    if (!state.pending)
      return result(createState("L02", state.fixtureName, carry(state)));
    const next = createState("C06", state.fixtureName, carry(state));
    next.safeReturnCheckRequired = true;
    next.pending = false;
    next.confirmationOpen = false;
    next.startRequestResolved = false;
    return result(next, [
      {
        method: "NAVIGATION",
        path: "/marketer/jobs",
        result: "allowed",
        reason:
          "No beforeunload trap; return path stores no automatic POST intent.",
      },
    ]);
  }

  if (type === "BACK_TO_LIST") {
    if (state.scenarioId === "D07")
      return result(state, [], {
        ignored: "Marketer access is required before viewing private jobs.",
      });
    if (["D10", "R09"].includes(state.scenarioId) && !state.demoSignInComplete)
      return result(state, [], {
        ignored: "Sign in before viewing private jobs.",
      });
    const next = createState("L02", state.fixtureName, carry(state));
    next.focusTarget = state.returnFocusToJob ? "return-job" : "page-heading";
    return result(next, [
      {
        method: "NAVIGATION",
        path: "/marketer/jobs",
        result: "local mock route",
        reason: "Return to the list with the current filter and page.",
      },
    ]);
  }

  if (type === "SIGN_IN") {
    const next = createState("D10", state.fixtureName, carry(state));
    next.privateDataVisible = false;
    next.jobStatus = null;
    next.demoSignInComplete = true;
    return result(next, [
      {
        method: "NAVIGATION",
        path: `/sign-in?returnTo=${encodeURIComponent(`/marketer/jobs/${state.jobId}`)}`,
        result: "same-origin mock route",
        reason: "On return, fetch details again; no start intent is replayed.",
      },
    ]);
  }

  if (type === "CHANGE_FILTER" || type === "CHANGE_PAGE") {
    if (type === "CHANGE_FILTER" && !listFilters.has(event.filter))
      return result(state, [], {
        ignored: "Choose a supported job status filter.",
      });
    const next = {
      ...state,
      scenarioId: "L08",
      route: "list",
      listFilter: type === "CHANGE_FILTER" ? event.filter : state.listFilter,
      page:
        type === "CHANGE_FILTER" ? 1 : Math.max(1, event.page ?? state.page),
    };
    return result(next, [
      {
        method: "GET",
        path: `/api/v1/me/marketer-jobs?status=${encodeURIComponent(next.listFilter)}&page=${next.page}&page_size=20`,
        result: "200 mock list read",
        reason:
          "Filter changes reset page; the list has no inline Start action.",
      },
    ]);
  }

  if (type === "RETRY_LIST") {
    const status = "200 mock list read";
    const next = createState(
      "L02",
      state.fixtureName,
      carry(state, state.requestId + 1),
    );
    return result(next, [
      {
        method: "GET",
        path: `/api/v1/me/marketer-jobs?status=${encodeURIComponent(state.listFilter)}&page=${state.page}&page_size=20`,
        result: status,
        reason: "Mock list retry; no API request is made.",
      },
    ]);
  }

  if (type === "REFRESH_DETAIL") {
    if (state.scenarioId === "R12") {
      const next = createState(
        "C08",
        state.fixtureName,
        carry(state, state.requestId + 1),
      );
      return result(next, [
        {
          method: "GET",
          path: `/api/v1/me/marketer-jobs/${state.jobId}`,
          result: "pending mock read",
          reason:
            "A known rejected start needs a fresh read, never ambiguous-outcome recovery or another POST.",
        },
      ]);
    }
    if (state.scenarioId === "R01" || state.scenarioId === "R04") {
      return transitionDemo(state, {
        type: "RECONCILE",
        status: event.status ?? "failed",
      });
    }
    const next = createState(
      "D01",
      state.fixtureName,
      carry(state, state.requestId + 1),
    );
    return result(next, [
      {
        method: "GET",
        path: `/api/v1/me/marketer-jobs/${state.jobId}`,
        result: "pending mock read",
        reason: "Refresh reads current state and does not start work.",
      },
    ]);
  }

  if (type === "DETAIL_READ_RESULT") {
    if (state.scenarioId === "D01" || state.scenarioId === "C08") {
      const status = event.status;
      const counts = carry(state);
      if (status === "failed") {
        const target =
          state.scenarioId === "C08"
            ? "R12"
            : state.lastConfirmedStatus === "In Progress"
              ? "R14"
              : "D03";
        const next = createState(target, state.fixtureName, counts);
        next.lastConfirmedStatus = state.lastConfirmedStatus;
        return result(next);
      }
      if (status === "in-progress")
        return result(createState("D04", state.fixtureName, counts));
      if (status === "completed" || status === "cancelled") {
        const next = createState("D05", state.fixtureName, counts);
        next.jobStatus = status === "cancelled" ? "Cancelled" : "Completed";
        next.lastConfirmedStatus = next.jobStatus;
        return result(next);
      }
      if (status === "unavailable")
        return result(createState("D06", state.fixtureName, counts));
      if (status === "session_expired")
        return result(createState("D10", state.fixtureName, counts));
      if (status === "invalid")
        return result(createState("D08", state.fixtureName, counts));
      return result(
        createState(
          status === "accepted" ? "D02" : "D08",
          state.fixtureName,
          counts,
        ),
      );
    }
    return transitionDemo(state, {
      type: "RECONCILE",
      status: event.status ?? "failed",
    });
  }

  return result(state, [], {
    ignored: scenario
      ? `No action for ${type ?? "unknown event"} in ${scenario.id}.`
      : "Unknown scenario.",
  });
}
