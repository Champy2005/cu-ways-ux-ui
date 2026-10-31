import { test } from "vitest";
import assert from "node:assert/strict";
import { SCENARIOS, SCENARIO_IDS } from "./scenarios.mjs";
import {
  canShowProofForm,
  canSubmitProof,
  createDemoState,
  isValidProofUrl,
  reduceDemoState,
} from "./model.mjs";

const step = (state, type, values = {}) =>
  reduceDemoState(state, { type, ...values });

test("the canonical model covers every retained US-026 state and every transition target", () => {
  assert.equal(SCENARIO_IDS.length, 14);
  assert.deepEqual(SCENARIO_IDS, [
    "A01",
    "A02",
    "A03",
    "A04",
    "A05",
    "A06",
    "B01",
    "B02",
    "B03",
    "B04",
    "C01",
    "C02",
    "C03",
    "C04",
  ]);
  const known = new Set(SCENARIO_IDS);
  for (const scenario of SCENARIOS) {
    for (const next of scenario.next)
      assert.ok(known.has(next), `${scenario.id} -> ${next}`);
  }
});

test("URL validation accepts full HTTP(S) URLs and rejects missing, malformed, and non-web schemes", () => {
  assert.equal(isValidProofUrl("https://example.com/proof"), true);
  assert.equal(isValidProofUrl("http://example.com/proof"), true);
  for (const value of [
    "",
    "ftp://example.com/proof",
    "https://",
    "https://example.com/a b",
    "javascript:alert(1)",
  ]) {
    assert.equal(isValidProofUrl(value), false, value);
  }
});

test("confirmed save creates a Proof row with URL and timestamp only after the simulated response", () => {
  let state = createDemoState("A02");
  state = step(state, "submit", { outcome: "confirmed" });
  assert.equal(state.scenarioId, "A03");
  assert.equal(state.pending, "save");
  assert.equal(state.serverRows.length, 0);
  assert.equal(canSubmitProof(state), false);

  state = step(state, "resolve-save");
  assert.equal(state.scenarioId, "A04");
  assert.equal(state.pending, null);
  assert.equal(state.draft, "");
  assert.equal(state.rows.length, 1);
  assert.equal(state.rows[0].attachment_type, "Proof");
  assert.equal(state.rows[0].url, "https://example.com/proof/campus-dining");
  assert.ok(Date.parse(state.rows[0].upload_at));
});

test("invalid URL retains the draft, sets an inline error state, and creates no row", () => {
  let state = createDemoState("A02");
  state = step(state, "draft", { value: "ftp://example.com/file" });
  state = step(state, "submit");
  assert.equal(state.scenarioId, "B01");
  assert.equal(state.draft, "ftp://example.com/file");
  assert.match(state.fieldError, /HTTP or HTTPS/);
  assert.equal(state.serverRows.length, 0);
  assert.equal(canSubmitProof(state), true);
});

test("type rejection preserves the draft and requires an explicit form reopen", () => {
  let state = createDemoState("A02");
  state = step(state, "submit", { outcome: "type-rejected" });
  state = step(state, "resolve-save");
  assert.equal(state.scenarioId, "B02");
  assert.equal(state.draft, "https://example.com/proof/campus-dining");
  assert.equal(state.rows.length, 0);
  assert.equal(canShowProofForm(state), false);
  state = step(state, "reopen-form");
  assert.equal(state.scenarioId, "A02");
  assert.equal(state.draft, "https://example.com/proof/campus-dining");
  assert.equal(canShowProofForm(state), true);
});

test("unknown committed save stays hidden until a successful reconciliation read", () => {
  let state = createDemoState("A02");
  state = step(state, "submit", { outcome: "unknown-saved" });
  state = step(state, "resolve-save");
  assert.equal(state.scenarioId, "B03");
  assert.equal(state.serverRows.length, 1);
  assert.equal(state.rows.length, 0);
  assert.equal(canShowProofForm(state), false);

  state = step(state, "check-saved");
  assert.equal(state.pending, "check");
  state = step(state, "resolve-check", { outcome: "available" });
  assert.equal(state.scenarioId, "A04");
  assert.equal(state.rows.length, 1);
  assert.equal(state.draft, "");
});

test("unknown missed save requires a read before an explicit retry; a failed read never enables save", () => {
  let state = createDemoState("A02");
  state = step(state, "submit", { outcome: "unknown-miss" });
  state = step(state, "resolve-save");
  assert.equal(state.scenarioId, "B03");
  assert.equal(canSubmitProof(state), false);

  state = step(state, "check-saved");
  state = step(state, "resolve-check", { outcome: "unavailable" });
  assert.equal(state.scenarioId, "B03");
  assert.equal(state.feedback, "check-unavailable");
  assert.equal(canSubmitProof(state), false);

  state = step(state, "check-saved");
  state = step(state, "resolve-check", { outcome: "available" });
  assert.equal(state.scenarioId, "B04");
  assert.equal(state.draft, "https://example.com/proof/campus-dining");
  assert.equal(canSubmitProof(state), true);

  state = step(state, "retry-save", { outcome: "confirmed" });
  assert.equal(state.scenarioId, "A03");
  assert.equal(state.pending, "save");
});

test("failed initial read is not an empty list and retry can recover to the loaded empty state", () => {
  let state = createDemoState("C04");
  assert.equal(canShowProofForm(state), false);
  state = step(state, "resolve-list", { outcome: "failed" });
  assert.equal(state.scenarioId, "C01");
  assert.equal(state.listStatus, "failed");
  assert.equal(canShowProofForm(state), false);

  state = step(state, "retry-list");
  state = step(state, "resolve-list", { outcome: "available" });
  assert.equal(state.scenarioId, "A01");
  assert.equal(state.listStatus, "ready");
  assert.equal(canShowProofForm(state), true);
});

test("changed job status disables the form, then refresh shows completed context without an add action", () => {
  let state = createDemoState("A02");
  state = step(state, "submit", { outcome: "job-completed" });
  state = step(state, "resolve-save");
  assert.equal(state.scenarioId, "C02");
  assert.equal(state.job.status, "In Progress");
  assert.equal(state.reportedStatus, "Completed");
  assert.equal(canShowProofForm(state), false);

  state = step(state, "refresh-status");
  state = step(state, "resolve-status");
  assert.equal(state.scenarioId, "A06");
  assert.equal(state.job.status, "Completed");
  assert.equal(canShowProofForm(state), false);
  assert.equal(step(state, "add-another").scenarioId, "A06");
});

test("access denial removes all private job, proof, and draft data before returning to My Jobs", () => {
  let state = createDemoState("A02");
  state = step(state, "submit", { outcome: "access-revoked" });
  state = step(state, "resolve-save");
  assert.equal(state.scenarioId, "C03");
  assert.equal(state.job, null);
  assert.equal(state.draft, "");
  assert.deepEqual(state.rows, []);
  assert.deepEqual(state.serverRows, []);
  assert.equal(canShowProofForm(state), false);
  state = step(state, "go-to-jobs");
  assert.equal(state.view, "jobs");
});

test("adding another proof preserves older rows and latest confirmed rows sort newest first", () => {
  let state = createDemoState("A04");
  state = step(state, "add-another");
  assert.equal(state.scenarioId, "A05");
  assert.equal(state.rows.length, 1);
  state = step(state, "draft", { value: "https://example.com/proof/second" });
  state = step(state, "submit", { outcome: "confirmed" });
  state = step(state, "resolve-save");
  assert.equal(state.scenarioId, "A06");
  assert.equal(state.rows.length, 2);
  assert.ok(
    Date.parse(state.rows[0].upload_at) >= Date.parse(state.rows[1].upload_at),
  );
});
