import { describe, test, expect } from "vitest";
import { ESLint } from "eslint";
import { features, scenarios } from "../../src/fixtures/catalog";
import * as completion from "../../src/features/us027/model.mjs";
import * as cancellation from "../../src/features/us028/model.mjs";
import * as jobs from "../../src/features/us025/model.mjs";

describe("scenario coverage", () => {
  test("preserves every legacy identity without duplicates", () => {
    expect(Object.values(features).map((rows) => rows.length)).toEqual([
      41, 14, 14, 15, 10,
    ]);
    expect(scenarios).toHaveLength(94);
    expect(new Set(scenarios.map((s) => s.storyId)).size).toBe(94);
    for (const s of scenarios) {
      expect(s.expected).toBeTruthy();
      expect(s.storyId).toMatch(/^us\d+--[a-z]-\d+$/);
    }
  });
  test("known presentation conflict is resolved", () =>
    expect(features["026"][0].expected).toContain("separate content dialog"));
});
describe("operation guards", () => {
  for (const [name, model] of [
    ["complete", completion],
    ["cancel-job", cancellation],
  ] as const) {
    test(`${name}: dismissal preserves pending work and duplicate submission is ignored`, () => {
      let s = model.seed("A04");
      s = model.reduce(s, { type: "confirm" });
      const hidden = model.reduce(s, { type: "dismiss" });
      expect(hidden.pending).toBe(s.pending);
      expect(hidden.modal).toBeNull();
      expect(model.reduce(hidden, { type: "confirm" })).toEqual(hidden);
      expect(model.reduce(hidden, { type: "reopen" }).modal).toBe("confirm");
    });
    test(`${name}: unknown outcome requires read reconciliation`, () => {
      let s = model.seed("A05");
      s = model.reduce(s, { type: "resolve", outcome: "unknown" });
      expect(model.reduce(s, { type: name })).toEqual(s);
      s = model.reduce(s, { type: "check" });
      s = model.reduce(s, { type: "resolve", read: "missing" });
      expect(s.message).toBe("unchanged");
    });
  }
  test("job-start dismissal preserves one in-flight request", () => {
    let s = jobs.createDemoState({ scenarioId: "C01" });
    s = jobs.transitionDemo(s, { type: "CONFIRM_START" }).state;
    s = jobs.transitionDemo(s, { type: "CANCEL_CONFIRM" }).state;
    expect(s.pending).toBe(true);
    expect(s.confirmationOpen).toBe(false);
    expect(
      jobs.transitionDemo(s, { type: "CONFIRM_START" }).state.startPostCount,
    ).toBe(1);
  });
});
describe("ownership negative fixtures", () => {
  const lint = new ESLint();
  test("feature paint overrides and duplicate protected markup fail", async () => {
    const results = await lint.lintText(
      'export function Bad(){return <><LifecycleBadge status="Accepted" style={{color:"red"}}/><span data-ui="LifecycleBadge">Accepted</span></>}',
      { filePath: "src/features/fixture.tsx" },
    );
    expect(
      results[0].messages.filter((m) => m.ruleId === "cuways/ownership"),
    ).toHaveLength(2);
  });
  test("legitimate external layout is allowed", async () => {
    const results = await lint.lintText(
      'export function Good(){return <div style={{display:"grid",gap:16}}><LifecycleBadge status="Accepted"/></div>}',
      { filePath: "src/features/fixture.tsx" },
    );
    expect(
      results[0].messages.filter((m) => m.ruleId === "cuways/ownership"),
    ).toHaveLength(0);
  });
});
