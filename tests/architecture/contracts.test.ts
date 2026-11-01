import { describe, test, expect } from "vitest";
import { ESLint } from "eslint";
import stylelint from "stylelint";
import { features, scenarios } from "../../src/fixtures/catalog";
import * as completion from "../../src/features/us027/model.mjs";
import * as cancellation from "../../src/features/us028/model.mjs";
import * as jobs from "../../src/features/us025/model.mjs";
import * as profile from "../../src/features/us034/model.mjs";

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
  test("each completion prerequisite blocks dispatch, including late proof removal", () => {
    for (const id of ["A01", "B01", "B02", "B03", "B04"]) {
      const blocked = completion.reduce(completion.seed(id), {
        type: "complete",
      });
      expect(blocked.modal).toBe("blocked");
      expect(
        completion.reduce(blocked, { type: "confirm" }).pending,
      ).toBeNull();
    }
    const raced = completion.reduce(completion.seed("A05"), {
      type: "resolve",
      outcome: "proof-missing",
    });
    expect(raced.status).toBe("In Progress");
    expect(raced.proof).toBe(0);
    expect(raced.modal).toBe("blocked");
  });
  test("Paid/Completed cancellation races preserve related records", () => {
    for (const outcome of ["paid", "completed"]) {
      const raced = cancellation.reduce(cancellation.seed("A05"), {
        type: "resolve",
        outcome,
      });
      expect(cancellation.eligible(raced)).toBe(false);
      expect(raced.requests).toBe(2);
      expect(raced.offers).toBe(3);
      expect(raced.status).not.toBe("Cancelled");
    }
    const success = cancellation.reduce(cancellation.seed("A05"), {
      type: "resolve",
      outcome: "success",
    });
    expect(success.requests).toBe(0);
    expect(success.offers).toBe(0);
    expect(success.status).toBe("Cancelled");
  });
  test("review aggregation and pagination exclude invalid records and remain bounded", () => {
    expect(profile.summary(profile.seed("B01").rows).count).toBe(7);
    expect(
      profile
        .qualifying(profile.seed("B01").rows)
        .some((r: { id: number }) => r.id >= 97),
    ).toBe(false);
    expect(profile.summary([]).average).toBeNull();
    let state = profile.seed("A01");
    for (let i = 0; i < 10; i++)
      state = profile.reduce(state, { type: "next" });
    expect(state.page).toBe(3);
    state = profile.reduce(state, { type: "filter", filter: "1" });
    expect(state.page).toBe(1);
    expect(
      profile
        .qualifying(state.rows)
        .filter((r: { rating: number }) => r.rating === 1),
    ).toHaveLength(0);
  });
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
  test("raw content links cannot fall back to browser purple", async () => {
    const [result] = await lint.lintText(
      'export const Bad=()=> <a href="https://example.com">Open brief</a>;',
      { filePath: "src/features/fixture.tsx" },
    );
    expect(result.messages.some((m) => m.ruleId === "cuways/ownership")).toBe(
      true,
    );
  });
  test("preview routes cannot leak back into reusable runtime components", async () => {
    const code = 'export const bad="?id=us025--l-02";';
    const [bad] = await lint.lintText(code, {
      filePath: "src/design-system/components/fixture.tsx",
    });
    const [adapter] = await lint.lintText(code, {
      filePath: "src/features/shared/fixture.tsx",
    });
    expect(bad.messages.some((m) => m.ruleId === "cuways/ownership")).toBe(
      true,
    );
    expect(adapter.messages.some((m) => m.ruleId === "cuways/ownership")).toBe(
      false,
    );
  });
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
  test("unmarked styled lifecycle markup fails canonical ownership", async () => {
    const [result] = await lint.lintText(
      'export function Bad(){return <span className="badge">Accepted</span>}',
      { filePath: "src/features/us026/fixture.tsx" },
    );
    expect(result.messages.some((m) => m.ruleId === "cuways/ownership")).toBe(
      true,
    );
  });
  test("cross-feature private imports fail", async () => {
    const [result] = await lint.lintText(
      'import {seed} from "../us027/model.mjs"; export const leak=seed;',
      { filePath: "src/features/us026/fixture.tsx" },
    );
    expect(result.messages.some((m) => m.ruleId === "cuways/ownership")).toBe(
      true,
    );
  });
  test("inline semantic-token and inherited-font overrides fail without banning layout", async () => {
    const [result] = await lint.lintText(
      'export function Bad(){return <div style={{["--status-info-fill"]:"red",fontFamily:"serif",display:"grid"}}><LifecycleBadge status="Accepted"/></div>}',
      { filePath: "src/features/us026/fixture.tsx" },
    );
    expect(
      result.messages.filter((m) => m.ruleId === "cuways/ownership"),
    ).toHaveLength(2);
  });
  test("typed inline palette overrides fail ownership", async () => {
    const [result] = await lint.lintText(
      'import type {CSSProperties} from "react"; export function Bad(){return <div style={{["--status-info-fill"]:"red"} as CSSProperties}><LifecycleBadge status="Accepted"/></div>}',
      { filePath: "src/features/us026/fixture.tsx" },
    );
    expect(result.messages.some((m) => m.ruleId === "cuways/ownership")).toBe(
      true,
    );
  });
  test("job-list deadline has a read-recovery transition", () => {
    const state = jobs.createDemoState({ scenarioId: "L01" });
    const failed = jobs.transitionDemo(state, {
      type: "LIST_READ_FAILED",
    }).state;
    expect(failed.scenarioId).toBe("L06");
    expect(
      jobs.transitionDemo(failed, { type: "RETRY_LIST" }).state.scenarioId,
    ).toBe("L02");
  });
  test("feature descendant repaint and protected token redefinition fail", async () => {
    const result = await stylelint.lint({
      code: ".wrapper span {color:var(--text-muted)} .wrapper {--status-success-ink:red}",
      codeFilename: "src/features/us026/fixture.module.css",
      configFile: "stylelint.config.mjs",
    });
    expect(result.errored).toBe(true);
    expect(result.results[0].warnings.map((w) => w.rule)).toContain(
      "selector-max-type",
    );
    expect(result.results[0].warnings.map((w) => w.rule)).toContain(
      "property-disallowed-list",
    );
  });
  test("border and outline shorthand colors require semantic values", async () => {
    const result = await stylelint.lint({
      code: ".box {border:1px solid #ff0000;outline:2px solid #00ff00}",
      codeFilename: "src/features/us026/fixture.module.css",
      configFile: "stylelint.config.mjs",
    });
    expect(result.errored).toBe(true);
    expect(
      result.results[0].warnings.filter(
        (w) => w.rule === "declaration-property-value-disallowed-list",
      ),
    ).toHaveLength(2);
  });
});
