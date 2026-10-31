// Migrated pure scenario reducer; owns fixture transitions, not presentation.
import { FIXTURES, SCENARIO_BY_ID } from "./scenarios.mjs";

const SCENARIOS_WITH_FORM = new Set(["A01", "A02", "A03", "A05", "B01", "B04"]);

function proof(id, url, uploadedAt) {
  return { id, attachment_type: "Proof", url, upload_at: uploadedAt };
}

function sortNewest(rows) {
  return [...rows].sort(
    (a, b) => Date.parse(b.upload_at) - Date.parse(a.upload_at),
  );
}

export function isValidProofUrl(value) {
  const text = String(value ?? "").trim();
  if (!text || /\s/.test(text)) return false;
  try {
    const url = new URL(text);
    return ["http:", "https:"].includes(url.protocol) && Boolean(url.hostname);
  } catch {
    return false;
  }
}

function createBase(fixtureId) {
  const fixture = FIXTURES[fixtureId] ?? FIXTURES.standard;
  return {
    scenarioId: "A01",
    fixtureId: FIXTURES[fixtureId] ? fixtureId : "standard",
    job: {
      id: fixture.jobId,
      title: fixture.jobTitle,
      status: fixture.jobStatus,
    },
    reportedStatus: null,
    draft: "",
    rows: [],
    serverRows: [],
    pending: null,
    pendingSaveOutcome: "confirmed",
    pendingSavedRow: null,
    checkingUnavailable: false,
    listStatus: "ready",
    fieldError: "",
    feedback: null,
    view: "job",
  };
}

export function createDemoState(scenarioId = "A01", options = {}) {
  const selected = SCENARIO_BY_ID[scenarioId] ? scenarioId : "A01";
  const fixtureId = FIXTURES[options.fixtureId]
    ? options.fixtureId
    : "standard";
  const fixture = FIXTURES[fixtureId];
  const one = proof("proof-1", fixture.initialUrl, fixture.uploadAt);
  const two = proof("proof-2", fixture.secondUrl, fixture.secondUploadAt);
  const state = createBase(fixtureId);

  switch (selected) {
    case "A02":
      state.draft = fixture.initialUrl;
      break;
    case "A03":
      state.draft = fixture.initialUrl;
      state.pending = "save";
      state.pendingSaveOutcome = options.saveOutcome ?? "confirmed";
      break;
    case "A04":
      state.rows = [one];
      state.serverRows = [one];
      break;
    case "A05":
      state.rows = [one];
      state.serverRows = [one];
      break;
    case "A06":
      state.rows = sortNewest([one, two]);
      state.serverRows = sortNewest([one, two]);
      break;
    case "B01":
      state.draft = "ftp://example.com/proof";
      state.fieldError = "Enter a full HTTP or HTTPS address.";
      break;
    case "B02":
      state.draft = fixture.initialUrl;
      state.feedback = "type-rejected";
      break;
    case "B03": {
      state.draft = fixture.initialUrl;
      const reconciliationResult = options.reconciliationResult ?? "miss";
      if (reconciliationResult === "found") {
        state.pendingSavedRow = proof(
          "proof-pending",
          fixture.initialUrl,
          fixture.uploadAt,
        );
        state.serverRows = [state.pendingSavedRow];
      }
      state.checkingUnavailable = reconciliationResult === "unavailable";
      if (state.checkingUnavailable) state.feedback = "check-unavailable";
      break;
    }
    case "B04":
      state.draft = fixture.initialUrl;
      break;
    case "C01":
      state.listStatus = "failed";
      state.feedback = "list-unavailable";
      break;
    case "C02":
      state.reportedStatus = "Completed";
      state.feedback = "status-changed";
      break;
    case "C03":
      state.job = null;
      state.draft = "";
      state.rows = [];
      state.serverRows = [];
      state.pendingSavedRow = null;
      state.feedback = null;
      break;
    case "C04":
      state.listStatus = "loading";
      state.pending = "read";
      break;
    default:
      break;
  }
  state.scenarioId = selected;
  return state;
}

function nextProof(state, url) {
  const fixture = FIXTURES[state.fixtureId];
  const index = state.serverRows.length;
  const timestamp = new Date(
    Date.parse(fixture.uploadAt) + index * 1000,
  ).toISOString();
  return proof(`proof-${index + 1}`, url, timestamp);
}

function withAccessRevoked(state) {
  return {
    ...state,
    scenarioId: "C03",
    job: null,
    reportedStatus: null,
    draft: "",
    rows: [],
    serverRows: [],
    pending: null,
    pendingSavedRow: null,
    listStatus: "ready",
    fieldError: "",
    feedback: null,
    view: "job",
  };
}

export function reduceDemoState(state, event) {
  if (!state || !event?.type) return state;

  switch (event.type) {
    case "timeout": {
      if (!state.pending) return state;
      if (state.pending === "save")
        return {
          ...state,
          scenarioId: "B03",
          pending: null,
          pendingSavedRow: null,
          feedback: "save-unknown",
        };
      if (state.pending === "check")
        return {
          ...state,
          scenarioId: "B03",
          pending: null,
          feedback: "check-unavailable",
          checkingUnavailable: true,
        };
      if (state.pending === "refresh")
        return { ...state, pending: null, feedback: "status-changed" };
      return {
        ...state,
        scenarioId: "C01",
        pending: null,
        listStatus: "failed",
        feedback: "list-unavailable",
      };
    }
    case "select-scenario":
      return createDemoState(event.scenarioId, event.options);
    case "reset":
      return createDemoState("A01", event.options);
    case "draft": {
      if (
        !state.job ||
        state.pending ||
        state.job.status !== "In Progress" ||
        state.listStatus !== "ready"
      )
        return state;
      const scenarioId = ["A01", "B01"].includes(state.scenarioId)
        ? String(event.value ?? "").trim()
          ? "A02"
          : "A01"
        : state.scenarioId;
      return {
        ...state,
        scenarioId,
        draft: String(event.value ?? ""),
        fieldError: "",
        feedback: null,
      };
    }
    case "submit": {
      if (
        !state.job ||
        state.pending ||
        state.job.status !== "In Progress" ||
        state.listStatus !== "ready" ||
        !SCENARIOS_WITH_FORM.has(state.scenarioId)
      )
        return state;
      if (!isValidProofUrl(state.draft)) {
        return {
          ...state,
          scenarioId: "B01",
          fieldError: state.draft.trim()
            ? "Enter a full HTTP or HTTPS address."
            : "Enter a delivery URL.",
          feedback: null,
        };
      }
      return {
        ...state,
        scenarioId: "A03",
        pending: "save",
        pendingSaveOutcome: event.outcome ?? "confirmed",
        fieldError: "",
        feedback: null,
      };
    }
    case "resolve-save": {
      if (state.pending !== "save") return state;
      const outcome = event.outcome ?? state.pendingSaveOutcome;
      const next = { ...state, pending: null, feedback: null };
      if (outcome === "type-rejected")
        return { ...next, scenarioId: "B02", feedback: "type-rejected" };
      if (outcome === "unknown-saved") {
        const row = nextProof(state, state.draft);
        return {
          ...next,
          scenarioId: "B03",
          pendingSavedRow: row,
          serverRows: sortNewest([...state.serverRows, row]),
        };
      }
      if (outcome === "unknown-miss")
        return { ...next, scenarioId: "B03", pendingSavedRow: null };
      if (outcome === "job-completed") {
        return {
          ...next,
          scenarioId: "C02",
          reportedStatus: "Completed",
          feedback: "status-changed",
        };
      }
      if (outcome === "access-revoked") return withAccessRevoked(next);
      const row = nextProof(state, state.draft);
      const rows = sortNewest([...state.serverRows, row]);
      return {
        ...next,
        scenarioId: rows.length > 1 ? "A06" : "A04",
        draft: "",
        rows,
        serverRows: rows,
        pendingSavedRow: null,
        feedback: "save-confirmed",
      };
    }
    case "reopen-form":
      if (
        state.scenarioId !== "B02" ||
        !state.job ||
        state.job.status !== "In Progress"
      )
        return state;
      return { ...state, scenarioId: "A02", feedback: null, fieldError: "" };
    case "add-another":
      if (
        !["A04", "A06"].includes(state.scenarioId) ||
        !state.job ||
        state.job.status !== "In Progress"
      )
        return state;
      return {
        ...state,
        scenarioId: "A05",
        draft: "",
        feedback: null,
        fieldError: "",
      };
    case "check-saved":
      if (state.scenarioId !== "B03" || state.pending) return state;
      return { ...state, pending: "check", feedback: null };
    case "resolve-check": {
      if (state.pending !== "check") return state;
      if (event.outcome === "unavailable") {
        return {
          ...state,
          scenarioId: "B03",
          pending: null,
          checkingUnavailable: true,
          feedback: "check-unavailable",
        };
      }
      if (
        state.pendingSavedRow &&
        state.serverRows.some((row) => row.id === state.pendingSavedRow.id)
      ) {
        const rows = sortNewest(state.serverRows);
        return {
          ...state,
          scenarioId: rows.length > 1 ? "A06" : "A04",
          pending: null,
          checkingUnavailable: false,
          feedback: "proof-confirmed",
          draft: "",
          rows,
        };
      }
      return {
        ...state,
        scenarioId: "B04",
        pending: null,
        checkingUnavailable: false,
        feedback: "confirmed-miss",
      };
    }
    case "retry-save":
      if (state.scenarioId !== "B04") return state;
      return reduceDemoState(state, { type: "submit", outcome: event.outcome });
    case "retry-list":
      if (state.scenarioId !== "C01") return state;
      return {
        ...state,
        scenarioId: "C04",
        listStatus: "loading",
        pending: "read",
        feedback: null,
      };
    case "resolve-list": {
      if (state.pending !== "read") return state;
      if (event.outcome === "failed") {
        return {
          ...state,
          scenarioId: "C01",
          pending: null,
          listStatus: "failed",
          feedback: "list-unavailable",
        };
      }
      const rows = sortNewest(state.serverRows);
      return {
        ...state,
        scenarioId: rows.length ? "A06" : "A01",
        pending: null,
        listStatus: "ready",
        rows,
        feedback: null,
      };
    }
    case "refresh-status":
      if (state.scenarioId !== "C02" || !state.job || state.pending)
        return state;
      return { ...state, pending: "refresh", feedback: null };
    case "resolve-status": {
      if (state.pending !== "refresh") return state;
      const job = { ...state.job, status: state.reportedStatus ?? "Completed" };
      const rows = sortNewest(state.serverRows);
      return {
        ...state,
        scenarioId: "A06",
        pending: null,
        job,
        reportedStatus: null,
        rows,
        listStatus: "ready",
        feedback: null,
      };
    }
    case "go-to-jobs":
      return { ...state, view: "jobs" };
    case "open-job":
      if (state.view !== "jobs" || !state.job) return state;
      return { ...state, view: "job" };
    default:
      return state;
  }
}

export function canShowProofForm(state) {
  return Boolean(
    state?.view === "job" &&
    state.job &&
    state.job.status === "In Progress" &&
    state.listStatus === "ready" &&
    SCENARIOS_WITH_FORM.has(state.scenarioId),
  );
}

export function canSubmitProof(state) {
  return canShowProofForm(state) && !state.pending;
}
